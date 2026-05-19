import { readFileSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';

import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { Roles } from '@/auth/roles.decorator';
import { RolesGuard } from '@/auth/roles.guard';
import { VectorStoreService } from '@/vector/vector-store.service';

import { DocumentUploadService } from './document-upload.service';

interface DocumentItem {
  id: string;
  filename: string;
  title: string;
  category: string;
  categoryName: string;
  chunkCount: number;
  size: number;
  createdAt: string;
  updatedAt: string;
}

@Controller('api/documents')
export class DocumentController {
  constructor(
    private readonly vectorStore: VectorStoreService,
    private readonly uploadService: DocumentUploadService,
  ) {}

  @Get()
  list(): { documents: DocumentItem[]; total: number } {
    const allResults = this.vectorStore.getAll();

    const docMap = new Map<string, DocumentItem>();

    for (const result of allResults) {
      const name = result.documentName;
      if (!docMap.has(name)) {
        let size = 0;
        let createdAt = new Date().toISOString();
        let updatedAt = new Date().toISOString();

        try {
          const info = this.uploadService.getFileInfo(name);
          size = info.size;
          createdAt = info.createdAt;
          updatedAt = info.updatedAt;
        } catch {
          // file might have been deleted
        }

        docMap.set(name, {
          id: encodeURIComponent(name),
          filename: name,
          title: result.documentTitle,
          category: result.category,
          categoryName: result.categoryName,
          chunkCount: 1,
          size,
          createdAt,
          updatedAt,
        });
      } else {
        const existing = docMap.get(name);
        if (existing) {
          existing.chunkCount += 1;
        }
      }
    }

    const documents = Array.from(docMap.values());

    return { documents, total: documents.length };
  }

  @Get(':id')
  get(@Param('id') id: string): { id: string; filename: string; title: string; content: string } {
    const filename = decodeURIComponent(id);
    const safeName = basename(filename);
    const ext = extname(safeName).toLowerCase();

    if (ext !== '.md') {
      throw new BadRequestException('仅支持 .md 格式的文件');
    }

    const filePath = resolve(process.cwd(), 'docs/hr-documents', safeName);

    let content: string;
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch {
      throw new NotFoundException('文档不存在');
    }

    const docResults = this.vectorStore
      .getAll()
      .filter((r) => r.documentName === safeName);
    const title = docResults.length > 0 ? docResults[0].documentTitle : safeName;

    return { id, filename: safeName, title, content };
  }

  @UseGuards(RolesGuard)
  @Roles('hr')
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File): Promise<{
    success: boolean;
    filename: string;
    indexResult: { chunks: number; docs: number };
  }> {
    const filename = this.uploadService.saveFile(file);
    const indexResult = await this.uploadService.rebuildIndex();

    return { success: true, filename, indexResult };
  }
}
