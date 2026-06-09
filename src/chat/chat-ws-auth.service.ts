import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { getRequiredEnv } from '@/auth/auth-env';
import { PrismaService } from '@/prisma';

type JwtPayload = {
  sub: string;
  email: string;
  role: string;
};

export type AuthenticatedSocketUser = {
  id: string;
  email: string;
  role: string;
  status: string;
  name: string;
};

@Injectable()
export class ChatWsAuthService {
  private readonly jwtSecret = getRequiredEnv('JWT_SECRET');

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async authenticate(client: Socket): Promise<AuthenticatedSocketUser> {
    const handshakeAuth = client.handshake.auth as { token?: unknown };
    const authToken = handshakeAuth.token;
    const authorizationHeader = client.handshake.headers.authorization;
    const rawToken =
      typeof authToken === 'string'
        ? authToken
        : authorizationHeader?.replace(/^Bearer\s+/i, '');

    if (!rawToken) {
      throw new UnauthorizedException('Token ausente no handshake do socket.');
    }

    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(rawToken, {
        secret: this.jwtSecret,
      });
    } catch {
      throw new UnauthorizedException('Token inválido no handshake do socket.');
    }

    const persistedToken = await this.prisma.token.findUnique({
      where: {
        userId: payload.sub,
      },
    });

    if (!persistedToken || persistedToken.jwt !== rawToken) {
      throw new UnauthorizedException(
        'Token do socket não corresponde à sessão ativa.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        name: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário do socket não encontrado.');
    }

    return user;
  }
}
