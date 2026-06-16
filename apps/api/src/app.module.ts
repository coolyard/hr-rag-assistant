import { Module } from '@nestjs/common';

import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { AskModule } from '@/ask/ask.module';
import { AuthModule } from '@/auth/auth.module';
import { ChatModule } from '@/chat/chat.module';
import { ConversationModule } from '@/conversation/conversation.module';
import { DocumentModule } from '@/document/document.module';
import { EmbeddingModule } from '@/embed/embed.module';
import { HealthModule } from '@/health/health.module';
import { LLMModule } from '@/llm/llm.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { RagModule } from '@/rag/rag.module';
import { ToolModule } from '@/tool/tool.module';
import { UserProfileModule } from '@/user-profile/user-profile.module';
import { VectorModule } from '@/vector/vector.module';

@Module({
  imports: [
    AskModule,
    AuthModule,
    ChatModule,
    ConversationModule,
    DocumentModule,
    EmbeddingModule,
    PrismaModule,
    HealthModule,
    LLMModule,
    RagModule,
    ToolModule,
    UserProfileModule,
    VectorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
  exports: [],
})
export class AppModule {}
