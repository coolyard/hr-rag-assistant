import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
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

import { DOCUMENTS_DIR } from './document-loader.service';
import { DocumentUploadService } from './document-upload.service';

interface DocumentItem {
  id: string;
  filename: string;
  title: string;
  category: string;
  categoryName: string;
  updatedAt: string;
}

const FILENAME_TO_SLUG: Record<string, string> = {
  '年假制度.md': 'annual-leave',
  '员工福利.md': 'employee-welfare',
  '报销流程.md': 'reimbursement',
  '晋升规则.md': 'promotion-rules',
  '考勤制度.md': 'attendance',
};

const SLUG_TO_FILENAME: Record<string, string> = Object.fromEntries(
  Object.entries(FILENAME_TO_SLUG).map(([k, v]) => [v, k]),
);

@Controller('api/documents')
export class DocumentController {
  constructor(
    private readonly vectorStore: VectorStoreService,
    private readonly uploadService: DocumentUploadService,
  ) {}

  @Get()
  list(): { documents: DocumentItem[]; total: number } {
    const allResults = this.vectorStore.getAll();

    const seen = new Set<string>();
    const documents: DocumentItem[] = [];

    for (const result of allResults) {
      const name = result.documentName;
      if (seen.has(name)) {
        continue;
      }
      seen.add(name);

      let updatedAt = new Date().toISOString();
      try {
        const info = this.uploadService.getFileInfo(name);
        updatedAt = info.updatedAt;
      } catch {
        // file might have been deleted
      }

      documents.push({
        id: FILENAME_TO_SLUG[name] ?? name,
        filename: name,
        title: result.documentTitle,
        category: result.category,
        categoryName: result.categoryName,
        updatedAt,
      });
    }

    return { documents, total: documents.length };
  }

  @Get(':id')
  get(@Param('id') id: string): { id: string; filename: string; title: string; content: string } {
    const filename = SLUG_TO_FILENAME[id] ?? `${id}.md`;
    const filePath = resolve(DOCUMENTS_DIR, filename);

    let content: string;
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch {
      throw new NotFoundException('文档不存在');
    }

    const docResults = this.vectorStore
      .getAll()
      .filter((r) => r.documentName === filename);
    const title = docResults.length > 0 ? docResults[0].documentTitle : filename;

    return { id, filename, title, content };
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
