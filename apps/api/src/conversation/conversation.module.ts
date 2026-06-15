import { Module } from '@nestjs/common';

import { ConversationStoreService } from '@/chat/conversation-store.service';

import { ConversationController } from './conversation.controller';

@Module({
  controllers: [ConversationController],
  providers: [ConversationStoreService],
})
export class ConversationModule {}
