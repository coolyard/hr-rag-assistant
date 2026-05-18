import { Module } from '@nestjs/common';

import { ChatService } from '@/chat/chat.service';
import { ConversationStoreService } from '@/chat/conversation-store.service';

@Module({
  providers: [ConversationStoreService, ChatService],
  exports: [ChatService],
})
export class ChatModule {}
