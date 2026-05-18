import { Injectable, Logger } from '@nestjs/common';

import type { Message } from '@/chat/chat.interface';
import { ChatService } from '@/chat/chat.service';
import { EmbeddingService } from '@/embed/embed.service';
import { LLMService } from '@/llm/llm.service';
import { HR_KEYWORDS, KeywordSearchService } from '@/rag/keyword-search.service';
import type {
  MergedResult,
  RAGSearchResult,
  SourceCitation,
  StreamChunk,
} from '@/rag/rag.interface';
import { VectorStoreService } from '@/vector/vector-store.service';

const VECTOR_TOP_K = 3;
const KEYWORD_TOP_K = 3;
const MERGE_TOP_K = 3;
const SIMILARITY_THRESHOLD = 0.5;
const VECTOR_WEIGHT = 0.4;
const KEYWORD_WEIGHT = 0.6;

const SYSTEM_PROMPT_TEMPLATE = `你是企业 HR 助手，专门回答员工关于公司制度、政策和流程的问题。

## 核心规则
1. 【知识边界】你只能基于以下检索到的 HR 文档片段回答问题，禁止引用外部知识或推测。
2. 【准确性优先】如果文档片段无法完整回答问题，或你不确定，必须明确告知"根据现有 HR 文档，无法确认该问题的答案"。
3. 【来源引用】每个回答必须标注来源文档名称（如"《年假制度》"）。
4. 【隐私保护】涉及**他人**隐私（如具体员工姓名、工资数字）的问题，拒绝回答并提示联系 HR。
5. 【个人数据】如果下方提供了"当前用户个人信息"，用户询问自己的数据时（如"我有多少天年假"），优先基于个人数据回答，并用文档片段补充制度依据。
6. 【语气】使用中文，语气专业、简洁、友好。

## 检索到的文档片段
{{retrieved_chunks}}

## 当前用户个人信息（仅在询问个人相关问题时提供）
{{user_profile}}

## 对话历史
{{conversation_history}}

## 当前问题
{{user_question}}

请基于以上文档片段回答问题。如果文档片段为空或无关，请直接返回拒绝话术。`;

const MAX_TOKENS_ESTIMATE = 28000;

export const REJECTION_PHRASE =
  '根据现有 HR 文档，无法确认该问题的答案。建议联系 HR 部门获取准确信息。';

@Injectable()
export class RAGService {
  private readonly logger = new Logger(RAGService.name);

  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStore: VectorStoreService,
    private readonly keywordSearch: KeywordSearchService,
    private readonly chatService: ChatService,
    private readonly llmService: LLMService,
  ) {}

  async *orchestrate(query: string, conversationId?: string): AsyncIterable<StreamChunk> {
    const conv = this.chatService.getOrCreateConversation(conversationId);
    this.chatService.addUserMessage(conv.id, query);

    let merged: MergedResult[];
    try {
      const vectorResults = await this.vectorSearch(query, VECTOR_TOP_K);
      const allChunks = this.vectorStore.getAll();
      const keywordResults = this.keywordSearch.search(query, allChunks, KEYWORD_TOP_K);
      merged = this.mergeResults(vectorResults, keywordResults, MERGE_TOP_K);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`RAG retrieval failed: ${message}`);
      yield { token: '抱歉，系统出现错误，请稍后重试。', done: true, confidenceLevel: 'low' };
      return;
    }

    if (this.shouldReject(merged, query)) {
      this.logger.log(`Query rejected (below threshold or filtered): ${query}`);
      this.chatService.addAssistantMessage(conv.id, REJECTION_PHRASE);
      yield { token: REJECTION_PHRASE, done: true, confidenceLevel: 'low' };
      return;
    }

    const history = this.chatService.getHistory(conv.id);
    const prompt = this.buildPrompt(query, merged, history);

    const sources = this.buildSources(merged);
    const confidenceLevel = this.getConfidenceLevel(merged[0].hybridScore);

    let fullAnswer = '';
    try {
      for await (const token of this.llmService.generate(prompt)) {
        fullAnswer += token;
        yield { token, done: false };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`LLM generation failed: ${message}`);
      if (fullAnswer.length > 0) {
        this.chatService.addAssistantMessage(conv.id, fullAnswer);
      }
      yield { token: '', done: true, error: message, confidenceLevel: 'low' };
      return;
    }

    this.chatService.addAssistantMessage(conv.id, fullAnswer, sources);
    this.logger.log(
      `RAG orchestration complete for query "${query}": ${String(merged.length)} sources, confidence=${confidenceLevel}`,
    );
    yield { token: '', done: true, sources, confidenceLevel };
  }

  private async vectorSearch(query: string, topK: number): Promise<RAGSearchResult[]> {
    const queryEmbedding = await this.embeddingService.embed(query);
    const results = this.vectorStore.search(queryEmbedding, topK);

    return results.map((r) => ({
      ...r,
      source: 'vector' as const,
      normalizedScore: r.similarity,
    }));
  }

  private mergeResults(
    vectorResults: RAGSearchResult[],
    keywordResults: RAGSearchResult[],
    topK: number,
  ): MergedResult[] {
    const merged = new Map<string, MergedResult>();

    for (const r of vectorResults) {
      merged.set(r.chunkId, {
        ...r,
        hybridScore: r.normalizedScore * VECTOR_WEIGHT,
        sources: ['vector'],
      });
    }

    for (const r of keywordResults) {
      const existing = merged.get(r.chunkId);
      if (existing) {
        existing.hybridScore += r.normalizedScore * KEYWORD_WEIGHT;
        existing.sources.push('keyword');
      } else {
        merged.set(r.chunkId, {
          ...r,
          hybridScore: r.normalizedScore * KEYWORD_WEIGHT,
          sources: ['keyword'],
        });
      }
    }

    return Array.from(merged.values())
      .sort((a, b) => b.hybridScore - a.hybridScore)
      .slice(0, topK);
  }

  private shouldReject(results: MergedResult[], query: string): boolean {
    if (results.length === 0 || results[0].hybridScore < SIMILARITY_THRESHOLD) {
      return true;
    }

    const hasKeywordMatch = results.some((r) => r.sources.includes('keyword'));
    const bestVectorScore =
      results.filter((r) => r.sources.includes('vector')).map((r) => r.similarity)[0] || 0;
    if (!hasKeywordMatch && bestVectorScore < SIMILARITY_THRESHOLD) {
      return true;
    }

    const privacyPatterns: RegExp[] = [
      /[一-龥]{2,4}的(工资|薪资|薪酬|收入)/,
      /(张三|李四|王五)的(工资|薪资)/,
      /具体员工/,
    ];
    if (privacyPatterns.some((p) => p.test(query))) {
      return true;
    }

    const secretPatterns: RegExp[] = [/裁员/, /收购|并购/, /季度财报.*未公布/];
    if (secretPatterns.some((p) => p.test(query))) {
      return true;
    }

    const hrRelatedKeywords = [...HR_KEYWORDS, '公司', '制度', '政策', '流程', '规定'];
    const isHrRelated = hrRelatedKeywords.some((kw) => query.includes(kw));
    if (!isHrRelated && results[0].hybridScore < 0.6) {
      return true;
    }

    return false;
  }

  private buildPrompt(query: string, chunks: MergedResult[], history: Message[]): string {
    const formattedChunks = this.formatChunks(chunks);
    const formattedHistory = this.formatHistory(history);

    let prompt = SYSTEM_PROMPT_TEMPLATE.replace('{{retrieved_chunks}}', formattedChunks)
      .replace('{{user_profile}}', '（未提供）')
      .replace('{{conversation_history}}', formattedHistory)
      .replace('{{user_question}}', query);

    const totalTokens =
      this.estimateTokens(prompt) +
      this.estimateTokens(formattedHistory) +
      this.estimateTokens(formattedChunks) +
      this.estimateTokens(query);

    if (totalTokens > MAX_TOKENS_ESTIMATE) {
      const compressedHistory = this.formatHistory(history.slice(-6));
      prompt = SYSTEM_PROMPT_TEMPLATE.replace('{{retrieved_chunks}}', formattedChunks)
        .replace('{{user_profile}}', '（未提供）')
        .replace('{{conversation_history}}', compressedHistory)
        .replace('{{user_question}}', query);

      const newTotal =
        this.estimateTokens(prompt) +
        this.estimateTokens(compressedHistory) +
        this.estimateTokens(formattedChunks) +
        this.estimateTokens(query);

      if (newTotal > MAX_TOKENS_ESTIMATE) {
        const minimalHistory = this.formatHistory(history.slice(-2));
        prompt = SYSTEM_PROMPT_TEMPLATE.replace('{{retrieved_chunks}}', formattedChunks)
          .replace('{{user_profile}}', '（未提供）')
          .replace('{{conversation_history}}', minimalHistory)
          .replace('{{user_question}}', query);
      }
    }

    return prompt;
  }

  private formatChunks(chunks: MergedResult[]): string {
    if (chunks.length === 0) {
      return '（无相关文档片段）';
    }

    return chunks
      .map(
        (c, i) =>
          `[片段 ${String(i + 1)}] 来源：《${c.documentTitle}》\n分类：${c.categoryName}\n内容：${c.content}\n相关性：${(c.hybridScore * 100).toFixed(1)}%`,
      )
      .join('\n---\n');
  }

  private formatHistory(messages: Message[]): string {
    const recent = messages.slice(-10);

    if (recent.length === 0) {
      return '（无历史对话）';
    }

    return recent
      .map((m) => {
        const role = m.role === 'user' ? '员工' : '助手';
        return `${role}：${m.content}`;
      })
      .join('\n');
  }

  private estimateTokens(text: string): number {
    return text.split('').reduce((sum, c) => sum + (c.charCodeAt(0) > 127 ? 1 : 0.5), 0);
  }

  private getConfidenceLevel(hybridScore: number): 'high' | 'medium' | 'low' {
    if (hybridScore > 0.8) {
      return 'high';
    }
    if (hybridScore >= SIMILARITY_THRESHOLD) {
      return 'medium';
    }
    return 'low';
  }

  private buildSources(results: MergedResult[]): SourceCitation[] {
    return results.map((r) => ({
      documentName: r.documentName,
      documentTitle: r.documentTitle,
      category: r.category,
      chunk: r.content,
      similarity: r.similarity,
    }));
  }
}
