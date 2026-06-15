import { Controller, Delete, Get, Logger, Param, Post, Body, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

import type { AskRequest, AskStreamChunk } from '@/ask/ask.interface';
import type { UserPayload } from '@/auth/auth.interface';
import { ChatService } from '@/chat/chat.service';
import { RAGService } from '@/rag/rag.service';

const HEARTBEAT_INTERVAL = 15000;

@Controller('api/ask')
export class AskController {
  private readonly logger = new Logger(AskController.name);

  constructor(
    private readonly ragService: RAGService,
    private readonly chatService: ChatService,
  ) {}

  @Post()
  async ask(@Body() body: AskRequest, @Req() req: Request, @Res() res: Response): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, HEARTBEAT_INTERVAL);

    req.on('close', () => {
      clearInterval(heartbeat);
    });

    try {
      const user = req.user as UserPayload;
      const stream = this.ragService.orchestrate(body.question, body.conversationId, user.sub);

      for await (const chunk of stream) {
        const data: AskStreamChunk = {
          chunk: chunk.token,
          done: chunk.done,
          status: chunk.status,
          reasoning: chunk.reasoning,
          followUps: chunk.followUps,
          sources: chunk.sources,
          confidenceLevel: chunk.confidenceLevel,
          hallucinationWarning: chunk.hallucinationWarning,
          error: chunk.error,
          conversationId: body.conversationId,
        };
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`SSE stream error: ${message}`);
      const data: AskStreamChunk = {
        chunk: '',
        done: true,
        error: '系统错误，请稍后重试',
        conversationId: body.conversationId,
      };
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } finally {
      clearInterval(heartbeat);
      res.end();
    }
  }

  @Get('history/:conversationId')
  getHistory(@Param('conversationId') conversationId: string) {
    const messages = this.chatService.getHistory(conversationId);
    return { conversationId, messages };
  }

  @Delete('history/:conversationId')
  clearHistory(@Param('conversationId') conversationId: string) {
    this.logger.log(`Clearing history for conversation: ${conversationId}`);
    return { success: true, conversationId };
  }
}
