import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PanicButtonPresenceService } from './panic-button-presence.service';
import { PanicButtonWsAuthService } from './panic-button-ws-auth.service';

type SocketUser = {
  id: string;
  email: string;
  role: string;
  status: string;
  name: string;
};

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class PanicButtonRealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(PanicButtonRealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly panicButtonPresenceService: PanicButtonPresenceService,
    private readonly panicButtonWsAuthService: PanicButtonWsAuthService,
  ) {}

  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      const user = await this.panicButtonWsAuthService.authenticate(client);

      client.data.user = user satisfies SocketUser;
      client.join(this.getUserRoom(user.id));
      this.panicButtonPresenceService.register(user.id, client.id);

      this.logger.debug(`Socket conectado: user=${user.id} socket=${client.id}`);
    } catch (error) {
      this.logger.warn(
        error instanceof Error ? error.message : 'Falha ao autenticar socket.',
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    const user = client.data.user as SocketUser | undefined;

    if (!user) {
      return;
    }

    this.panicButtonPresenceService.unregister(user.id, client.id);
    this.logger.debug(
      `Socket desconectado: user=${user.id} socket=${client.id}`,
    );
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(this.getUserRoom(userId)).emit(event, payload);
  }

  emitToUsers(userIds: string[], event: string, payload: unknown) {
    for (const userId of userIds) {
      this.emitToUser(userId, event, payload);
    }
  }

  private getUserRoom(userId: string) {
    return `user:${userId}`;
  }
}
