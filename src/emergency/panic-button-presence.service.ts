import { Injectable } from '@nestjs/common';

@Injectable()
export class PanicButtonPresenceService {
  private readonly socketsByUserId = new Map<string, Set<string>>();

  register(userId: string, socketId: string) {
    const sockets = this.socketsByUserId.get(userId) ?? new Set<string>();
    sockets.add(socketId);
    this.socketsByUserId.set(userId, sockets);
  }

  unregister(userId: string, socketId: string) {
    const sockets = this.socketsByUserId.get(userId);

    if (!sockets) {
      return;
    }

    sockets.delete(socketId);

    if (sockets.size === 0) {
      this.socketsByUserId.delete(userId);
      return;
    }

    this.socketsByUserId.set(userId, sockets);
  }

  getSocketIds(userId: string) {
    return Array.from(this.socketsByUserId.get(userId) ?? []);
  }
}
