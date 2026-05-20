import { writeFileSync, statSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';

import { Injectable, Logger, BadRequestException } from '@nestjs/common';

import { DocumentLoader, DOCUMENTS_DIR } from '@/document/document-loader.service';
import { EmbeddingService } from '@/embed/embed.service';
import { VectorStoreService } from '@/vector/vector-store.service';
import type { DocumentMeta } from '@/vector/vector.interface';

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

@Injectable()
export class DocumentUploadService {
  private readonly logger = new Logger(DocumentUploadService.name);

  constructor(
    private readonly documentLoader: DocumentLoader,
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStore: VectorStoreService,
  ) {}

  saveFile(file: Express.Multer.File): string {
    const safeName = basename(file.originalname);
    const ext = extname(safeName).toLowerCase();

    if (ext !== '.md') {
      throw new BadRequestException('仅支持 .md 格式的文件');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('文件大小不能超过 1MB');
    }

    const destPath = resolve(DOCUMENTS_DIR, safeName);
    writeFileSync(destPath, file.buffer);

    this.logger.log(`[DocumentUpload] 保存文件: ${safeName} (${String(file.size)} bytes)`);

    return safeName;
  }

  async rebuildIndex(): Promise<{ chunks: number; docs: number }> {
    this.logger.log('[DocumentUpload] 开始重建索引...');

    this.vectorStore.clear();

    const { chunks, docCount } = this.documentLoader.loadDocuments();

    if (chunks.length === 0) {
      this.logger.warn('[DocumentUpload] 无文档可索引');
      return { chunks: 0, docs: 0 };
    }

    const texts = chunks.map((c) => c.content);
    const embeddings = await this.embeddingService.embedBatch(texts);

    for (let i = 0; i < chunks.length; i++) {
      const meta: DocumentMeta = {
        chunkId: chunks[i].id,
        content: chunks[i].content,
        documentName: chunks[i].documentName,
        documentTitle: chunks[i].documentTitle,
        category: chunks[i].category,
        categoryName: chunks[i].categoryName,
        heading: chunks[i].heading,
        charCount: chunks[i].charCount,
      };
      this.vectorStore.add(chunks[i].id, embeddings[i], meta);
    }

    this.vectorStore.logIndexSummary();
    this.logger.log(
      `[DocumentUpload] 索引重建完成: ${String(docCount)} 个文档, ${String(chunks.length)} 个片段`,
    );

    return { chunks: chunks.length, docs: docCount };
  }

  getFileInfo(filename: string): { size: number; createdAt: string; updatedAt: string } {
    const safeName = basename(filename);
    const filePath = resolve(DOCUMENTS_DIR, safeName);
    const stats = statSync(filePath);

    return {
      size: stats.size,
      createdAt: stats.birthtime.toISOString(),
      updatedAt: stats.mtime.toISOString(),
    };
  }
}
