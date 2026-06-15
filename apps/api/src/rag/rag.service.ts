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
import { validateAnswer } from '@/rag/rag.validator';
import { UserProfileService } from '@/user-profile/user-profile.service';
import { VectorStoreService } from '@/vector/vector-store.service';

const VECTOR_TOP_K = 3;
const KEYWORD_TOP_K = 3;
const MERGE_TOP_K = 3;
const SIMILARITY_THRESHOLD = 0.5;
const VECTOR_WEIGHT = 0.4;
const KEYWORD_WEIGHT = 0.6;
const HIGH_CONFIDENCE_THRESHOLD = 0.8;

const SYSTEM_PROMPT_TEMPLATE = `你是企业 HR 助手，专门回答员工关于公司制度、政策和流程的问题。

## 核心规则
1. 【知识边界】你只能基于以下检索到的 HR 文档片段和当前用户个人信息回答问题，禁止引用外部知识或推测。
2. 【准确性优先】如果文档片段和个人信息都无法完整回答问题，或你不确定，必须明确告知"根据现有 HR 文档，无法确认该问题的答案"。
3. 【来源引用】如果回答引用了文档内容，必须标注来源文档名称（如"《年假制度》"）。
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

请基于以上文档片段和用户个人信息回答问题。如果既无相关文档片段，也无用户个人信息，请直接返回拒绝话术。`;

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
    private readonly userProfileService: UserProfileService,
  ) {}

  async *orchestrate(
    query: string,
    conversationId?: string,
    userId?: string,
  ): AsyncIterable<StreamChunk> {
    const conv = await this.chatService.getOrCreateConversation(conversationId);
    await this.chatService.addUserMessage(conv.id, query);

    let merged: MergedResult[];
    try {
      const vectorResults = await this.vectorSearch(query, VECTOR_TOP_K);
      yield { token: '', done: false, status: '正在检索相关文档...' };
      yield {
        token: '',
        done: false,
        reasoning: '正在启动向量语义检索，查找与问题最相关的文档片段...',
      };
      const allChunks = this.vectorStore.getAll();
      yield { token: '', done: false, reasoning: '正在进行关键词精确匹配，补充制度规则类文档...' };
      const keywordResults = this.keywordSearch.search(query, allChunks, KEYWORD_TOP_K);
      merged = this.mergeResults(vectorResults, keywordResults, MERGE_TOP_K);
      yield {
        token: '',
        done: false,
        reasoning: `检索完成：向量检索返回 ${String(vectorResults.length)} 条，关键词检索返回 ${String(keywordResults.length)} 条，合并去重后得到 ${String(merged.length)} 条相关文档。`,
      };
      yield { token: '', done: false, status: `找到 ${String(merged.length)} 条匹配，正在分析...` };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`RAG retrieval failed: ${message}`);
      yield { token: '抱歉，系统出现错误，请稍后重试。', done: true, confidenceLevel: 'low' };
      return;
    }

    let userProfileText = '（未提供）';
    let hasPersonalData = false;
    if (userId) {
      const isPersonal = this.userProfileService.isPersonalQuery(query);
      if (isPersonal) {
        const profile = this.userProfileService.getProfile(userId);
        if (profile) {
          userProfileText = this.userProfileService.formatForPrompt(profile);
          hasPersonalData = true;
          this.logger.log(`Personal data injected for user ${userId}`);
          yield {
            token: '',
            done: false,
            reasoning: `已匹配到用户个人信息：${profile.realName}，${profile.department} ${profile.position}，年假剩余 ${String(profile.annualLeaveRemaining)} 天。`,
          };
        }
      }
    }

    if (this.shouldReject(merged, query, hasPersonalData)) {
      this.logger.log(`Query rejected (below threshold or filtered): ${query}`);
      yield { token: '', done: false, reasoning: '检索到的文档相似度过低，无法提供可靠回答。' };
      await this.chatService.addAssistantMessage(conv.id, REJECTION_PHRASE);
      yield { token: REJECTION_PHRASE, done: true, confidenceLevel: 'low' };
      return;
    }

    const history = await this.chatService.getHistory(conv.id);

    const prompt = this.buildPrompt(query, merged, history, userProfileText);

    const sources = this.buildSources(merged);

    yield { token: '', done: false, status: '正在生成回答...' };
    yield {
      token: '',
      done: false,
      reasoning: '已构建提示词（包含检索文档 + 用户个人信息 + 对话历史），正在调用 LLM 生成回答...',
    };

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
        await this.chatService.addAssistantMessage(conv.id, fullAnswer);
      }
      yield { token: '', done: true, error: message, confidenceLevel: 'low' };
      return;
    }

    try {
      const followUps = await this.generateFollowUps(query, fullAnswer);
      if (followUps.length > 0) {
        yield { token: '', done: false, status: '正在推测您可能想问...' };
        yield { token: '', done: false, followUps };
      }
    } catch (error) {
      this.logger.warn(`Follow-up generation failed: ${String(error)}`);
    }

    const validation = validateAnswer(fullAnswer, merged);
    const confidenceLevel = this.getConfidenceLevel(merged[0]?.hybridScore ?? 0);

    await this.chatService.addAssistantMessage(conv.id, fullAnswer, sources);
    this.logger.log(
      `RAG orchestration complete for query "${query}": ${String(merged.length)} sources, confidence=${confidenceLevel}`,
    );
    yield {
      token: '',
      done: true,
      sources,
      confidenceLevel,
      hallucinationWarning: validation.passed ? undefined : '回答包含未在文档中验证的数据，请核实',
    };
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

  private shouldReject(results: MergedResult[], query: string, hasPersonalData = false): boolean {
    if (!hasPersonalData) {
      if (results.length === 0 || results[0].hybridScore < SIMILARITY_THRESHOLD) {
        return true;
      }

      const hasKeywordMatch = results.some((r) => r.sources.includes('keyword'));
      const bestVectorScore =
        results.filter((r) => r.sources.includes('vector')).map((r) => r.similarity)[0] || 0;
      if (!hasKeywordMatch && bestVectorScore < SIMILARITY_THRESHOLD) {
        return true;
      }

      const hrRelatedKeywords = [...HR_KEYWORDS, '公司', '制度', '政策', '流程', '规定'];
      const isHrRelated = hrRelatedKeywords.some((kw) => query.includes(kw));
      if (!isHrRelated && results[0].hybridScore < 0.6) {
        return true;
      }
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
    return secretPatterns.some((p) => p.test(query));
  }

  private buildPrompt(
    query: string,
    chunks: MergedResult[],
    history: Message[],
    userProfileText: string,
  ): string {
    const formattedChunks = this.formatChunks(chunks);
    const formattedHistory = this.formatHistory(history);

    let prompt = SYSTEM_PROMPT_TEMPLATE.replace('{{retrieved_chunks}}', formattedChunks)
      .replace('{{user_profile}}', userProfileText)
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
        .replace('{{user_profile}}', userProfileText)
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
          .replace('{{user_profile}}', userProfileText)
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
    if (hybridScore > HIGH_CONFIDENCE_THRESHOLD) {
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
      similarity: r.hybridScore,
    }));
  }

  private async generateFollowUps(query: string, answer: string): Promise<string[]> {
    const prompt = `用户刚问了 HR 相关问题："${query}"，AI 回答："${answer.slice(0, 500)}"

请根据上下文推测用户接下来可能想问的 3 个相关问题。要求：
1. 问题要具体，与 HR 制度和福利相关
2. 每个问题一行，不要编号，不要其他文字
3. 问题用中文`;

    let output = '';
    try {
      for await (const token of this.llmService.generate(prompt)) {
        output += token;
      }
    } catch {
      return [];
    }

    return output
      .split('\n')
      .map((line) => line.replace(/^[\d.\s、-]+/, '').trim())
      .filter((line) => line.length > 5 && (line.includes('？') || line.includes('?')))
      .slice(0, 3);
  }
}
