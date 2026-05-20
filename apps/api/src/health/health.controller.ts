import { Controller, Get, HttpException, HttpStatus, Inject, Logger } from '@nestjs/common';
import axios from 'axios';

import { Public } from '@/auth/public.decorator';
import { LLM_CONFIG, type LLMConfig } from '@/llm/llm.config';

@Controller('api/health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(@Inject(LLM_CONFIG) private readonly llmConfig: LLMConfig) {}

  @Public()
  @Get()
  getHealth(): { status: string; timestamp: string; service: string; version: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'hr-rag-assistant-api',
      version: '0.1.0',
    };
  }

  @Public()
  @Get('ollama')
  async getOllamaHealth(): Promise<{
    status: string;
    models: string[];
    ollamaVersion: string;
  }> {
    try {
      const [tagsResponse, versionResponse] = await Promise.all([
        axios.get<{ models: Array<{ name: string }> }>(`${this.llmConfig.ollamaBaseUrl}/api/tags`, {
          timeout: 5000,
        }),
        axios.get<{ version: string }>(`${this.llmConfig.ollamaBaseUrl}/api/version`, {
          timeout: 5000,
        }),
      ]);

      const models = tagsResponse.data.models.map((m) => m.name);
      const ollamaVersion = versionResponse.data.version;

      return { status: 'ok', models, ollamaVersion };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Ollama health check failed: ${message}`);

      throw new HttpException(
        { status: 'error', message: 'Ollama 服务未连接' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
