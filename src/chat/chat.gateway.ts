import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Role } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import {
  AuthenticatedSocketUser,
  ChatWsAuthService,
} from './chat-ws-auth.service';
import { ChatService } from './chat.service';

type ChatSocketData = {
  user?: AuthenticatedSocketUser;
};

type ChatSocket = Socket<
  Record<string, never>,
  Record<string, never>,
  Record<string, never>,
  ChatSocketData
>;

@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly chatWsAuthService: ChatWsAuthService,
  ) {}

  async handleConnection(@ConnectedSocket() client: ChatSocket) {
    try {
      const user = await this.chatWsAuthService.authenticate(client);

      if (user.role !== Role.PATIENT && user.role !== Role.PROFESSIONAL) {
        throw new WsException(
          'Somente pacientes e profissionais podem se conectar ao chat.',
        );
      }

      client.data.user = user;
      await client.join(this.getUserRoom(user.id));

      this.logger.debug(`Socket do chat conectado: user=${user.id}`);
    } catch (error) {
      this.logger.warn(
        error instanceof Error
          ? error.message
          : 'Falha ao autenticar socket do chat.',
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(@ConnectedSocket() client: ChatSocket) {
    const user = client.data.user;

    if (!user) {
      return;
    }

    this.logger.debug(`Socket do chat desconectado: user=${user.id}`);
  }

  @SubscribeMessage('chat:join-room')
  async joinRoom(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() body: { roomId?: string },
  ) {
    const user = this.requireSocketUser(client);
    const roomId = body?.roomId;

    if (!roomId) {
      throw new WsException('O identificador da sala é obrigatório.');
    }

    await this.chatService.assertUserCanJoinRoom(roomId, user.id);
    await client.join(this.getChatRoom(roomId));

    return {
      ok: true,
      roomId,
    };
  }

  @SubscribeMessage('chat:leave-room')
  async leaveRoom(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() body: { roomId?: string },
  ) {
    const roomId = body?.roomId;

    if (!roomId) {
      throw new WsException('O identificador da sala é obrigatório.');
    }

    await client.leave(this.getChatRoom(roomId));

    return {
      ok: true,
      roomId,
    };
  }

  @SubscribeMessage('chat:send-message')
  async sendMessage(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() body: { roomId?: string; content?: string },
  ) {
    const user = this.requireSocketUser(client);
    const roomId = body?.roomId;

    if (!roomId) {
      throw new WsException('O identificador da sala é obrigatório.');
    }

    const message = await this.chatService.createTextMessage(
      roomId,
      user.id,
      body?.content ?? '',
    );

    await this.emitMessageCreated(roomId, message);

    return {
      ok: true,
      message,
    };
  }

  async emitMessageCreated(roomId: string, message: unknown) {
    this.server.to(this.getChatRoom(roomId)).emit('chat:message-created', message);

    const participantIds = await this.chatService.getRoomParticipantIds(roomId);
    for (const participantId of participantIds) {
      this.server
        .to(this.getUserRoom(participantId))
        .emit('chat:message-created', message);
    }
  }

  private requireSocketUser(client: ChatSocket) {
    const user = client.data.user;

    if (!user) {
      throw new WsException('Usuário do socket não autenticado.');
    }

    return user;
  }

  private getUserRoom(userId: string) {
    return `user:${userId}`;
  }

  private getChatRoom(roomId: string) {
    return `chat:${roomId}`;
  }
}
