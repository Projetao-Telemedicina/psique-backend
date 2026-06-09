import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { PrismaService } from '@/prisma';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatWsAuthService } from './chat-ws-auth.service';

@Module({
  imports: [AuthModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatGateway,
    ChatWsAuthService,
    PrismaService,
  ],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
