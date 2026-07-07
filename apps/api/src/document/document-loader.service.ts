import { readdirSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { EmbeddingService } from '@/embed/embed.service';
import { KeywordSearchService } from '@/rag/keyword-search.service';
import { VectorStoreService } from '@/vector/vector-store.service';
import type { DocumentMeta } from '@/vector/vector.interface';

interface DocumentChunk {
  id: string;
  content: string;
  documentName: string;
  documentTitle: string;
  category: string;
  categoryName: string;
  heading: string;
  headingLevel: number;
  index: number;
  charCount: number;
}

interface CategoryDef {
  id: string;
  name: string;
  color: string;
  keywords: string[];
}

const CATEGORIES: CategoryDef[] = [
  { id: 'annual_leave', name: '年假', color: '#E3F2FD', keywords: ['年假', '休假'] },
  { id: 'reimbursement', name: '报销', color: '#E8F5E9', keywords: ['报销'] },
  { id: 'promotion', name: '晋升', color: '#FFF3E0', keywords: ['晋升', '升职'] },
  { id: 'attendance', name: '考勤', color: '#F3E5F5', keywords: ['考勤', '打卡'] },
  { id: 'welfare', name: '福利', color: '#FFFDE7', keywords: ['福利', '待遇'] },
];

const CUSTOM_CATEGORY: CategoryDef = {
  id: 'custom',
  name: '自定义',
  color: '#F5F5F5',
  keywords: [],
};

export const DOCUMENTS_DIR = resolve(__dirname, '../../../../docs/hr-documents');

const MAX_CHUNK_SIZE = 512;
const OVERLAP = 50;
const MIN_CHUNK_SIZE = 20;
const MAX_CHUNKS_PER_DOC = 10;

@Injectable()
export class DocumentLoader implements OnModuleInit {
  private readonly logger = new Logger(DocumentLoader.name);

  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStore: VectorStoreService,
    private readonly keywordSearch: KeywordSearchService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Starting document indexing...');

    const { chunks, docCount } = this.loadDocuments();

    if (chunks.length === 0) {
      this.logger.warn('No documents found to index');
      return;
    }

    const texts = chunks.map((c) => c.content);
    const embeddings = await this.embeddingService.embedBatch(texts);

    for (let i = 0; i < chunks.length; i++) {
      const meta = this.toDocumentMeta(chunks[i]);
      this.vectorStore.add(chunks[i].id, embeddings[i], meta);
    }

    this.vectorStore.logIndexSummary();

    // 构建 BM25 关键词索引
    const allChunks = this.vectorStore.getAll();
    this.keywordSearch.buildIndex(allChunks);

    this.logger.log(
      `已加载 ${String(docCount)} 个文档，共 ${String(chunks.length)} 个片段，已建立索引`,
    );
  }

  loadDocuments(): { chunks: DocumentChunk[]; docCount: number } {
    const docsDir = DOCUMENTS_DIR;
    this.logger.log(`[DocumentLoader] 扫描目录: ${docsDir}`);

    let files: string[];
    try {
      files = readdirSync(docsDir).filter((f) => f.endsWith('.md'));
    } catch {
      this.logger.warn(`[DocumentLoader] 目录不存在: ${docsDir}`);
      return { chunks: [], docCount: 0 };
    }

    this.logger.log(`[DocumentLoader] 发现 ${String(files.length)} 个 Markdown 文件`);

    const allChunks: DocumentChunk[] = [];

    for (const file of files) {
      const safeName = basename(file);
      const filePath = resolve(docsDir, safeName);

      let content: string;
      try {
        content = readFileSync(filePath, 'utf-8');
      } catch {
        this.logger.warn(`[DocumentLoader] 无法读取文件: ${safeName}`);
        continue;
      }

      if (content.trim().length === 0) {
        this.logger.warn(`[DocumentLoader] 空文件，跳过: ${safeName}`);
        continue;
      }

      const docTitle = this.extractTitle(content, safeName);
      const category = this.detectCategory(safeName);
      const chunkGlobals = {
        documentName: safeName,
        documentTitle: docTitle,
        category: category.id,
        categoryName: category.name,
      };

      const docChunks = this.splitDocument(content, chunkGlobals);
      allChunks.push(...docChunks);

      this.logger.log(
        `[DocumentLoader] 处理: ${safeName} → 分类: ${category.id}, ${String(docChunks.length)} chunks`,
      );
    }

    const docNames = new Set(allChunks.map((c) => c.documentName));

    this.logger.log(
      `[DocumentLoader] 总计: ${String(docNames.size)} 个文档, ${String(allChunks.length)} 个片段`,
    );

    return { chunks: allChunks, docCount: docNames.size };
  }

  private extractTitle(content: string, filename: string): string {
    const match = /^#\s+(.+)$/m.exec(content);
    return match ? match[1].trim() : filename.replace(/\.md$/u, '');
  }

  private detectCategory(filename: string): CategoryDef {
    const name = filename.toLowerCase();
    for (const cat of CATEGORIES) {
      if (cat.keywords.some((kw) => name.includes(kw))) {
        return cat;
      }
    }
    return CUSTOM_CATEGORY;
  }

  private splitDocument(
    content: string,
    globals: {
      documentName: string;
      documentTitle: string;
      category: string;
      categoryName: string;
    },
  ): DocumentChunk[] {
    const sections = content.split(/^##\s+/m).filter(Boolean);

    if (sections.length === 0) {
      const flat = this.splitBySize(content.trim(), MAX_CHUNK_SIZE, OVERLAP);
      return flat
        .filter((c) => c.length >= MIN_CHUNK_SIZE)
        .slice(0, MAX_CHUNKS_PER_DOC)
        .map((c, i) => this.buildChunk(c, globals, content.trim().slice(0, 40), i));
    }

    const chunks: DocumentChunk[] = [];

    for (const section of sections) {
      if (chunks.length >= MAX_CHUNKS_PER_DOC) {
        break;
      }

      const newlineIndex = section.indexOf('\n');
      const heading = newlineIndex > 0 ? section.slice(0, newlineIndex).trim() : section.trim();
      const body = newlineIndex > 0 ? section.slice(newlineIndex + 1).trim() : '';

      if (body.length <= MAX_CHUNK_SIZE) {
        const combined = `## ${heading}\n${body}`;
        if (combined.length >= MIN_CHUNK_SIZE) {
          chunks.push(this.buildChunk(combined, globals, heading, chunks.length));
        }
      } else {
        const subChunks = this.splitBySize(body, MAX_CHUNK_SIZE, OVERLAP);
        for (let i = 0; i < subChunks.length && chunks.length < MAX_CHUNKS_PER_DOC; i++) {
          const text = i === 0 ? `## ${heading}\n${subChunks[i]}` : subChunks[i];
          if (text.length >= MIN_CHUNK_SIZE) {
            chunks.push(this.buildChunk(text, globals, heading, chunks.length));
          }
        }
      }
    }

    return chunks;
  }

  private splitBySize(text: string, maxSize: number, overlap: number): string[] {
    const result: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + maxSize, text.length);
      result.push(text.substring(start, end));
      start = end - overlap;
    }

    return result;
  }

  private buildChunk(
    content: string,
    globals: {
      documentName: string;
      documentTitle: string;
      category: string;
      categoryName: string;
    },
    heading: string,
    index: number,
  ): DocumentChunk {
    const id = `${globals.category}-chunk-${String(index)}`;

    return {
      id,
      content: content.trim(),
      documentName: globals.documentName,
      documentTitle: globals.documentTitle,
      category: globals.category,
      categoryName: globals.categoryName,
      heading,
      headingLevel: 2,
      index,
      charCount: content.length,
    };
  }

  private toDocumentMeta(chunk: DocumentChunk): DocumentMeta {
    return {
      chunkId: chunk.id,
      content: chunk.content,
      documentName: chunk.documentName,
      documentTitle: chunk.documentTitle,
      category: chunk.category,
      categoryName: chunk.categoryName,
      heading: chunk.heading,
      charCount: chunk.charCount,
    };
  }
}
