import { Controller, Get, Post, Patch, Delete, Param, Body, Req } from '@nestjs/common';
import type { Request } from 'express';

import type { UserPayload } from '@/auth/auth.interface';
import { ConversationStoreService } from '@/chat/conversation-store.service';

@Controller('api/conversations')
export class ConversationController {
  constructor(private readonly store: ConversationStoreService) {}

  @Get()
  async list(@Req() req: Request) {
    const user = req.user as UserPayload;
    return this.store.findConversationsByUser(user.sub);
  }

  @Post()
  async create(@Req() req: Request) {
    const user = req.user as UserPayload;
    return this.store.createConversation('新对话', user.sub);
  }

  @Patch(':id')
  async rename(@Param('id') id: string, @Body('title') title: string) {
    await this.store.updateConversationTitle(id, title);
    return { success: true };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.store.deleteConversation(id);
    return { success: true };
  }

  @Get(':id/messages')
  async messages(@Param('id') id: string) {
    return this.store.getMessages(id);
  }
}
