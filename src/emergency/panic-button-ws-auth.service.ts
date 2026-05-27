import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { PrismaService } from '@/prisma';
import { getRequiredEnv } from '@/auth/auth-env';

type JwtPayload = {
  sub: string;
  email: string;
  role: string;
};

type AuthenticatedSocketUser = {
  id: string;
  email: string;
  role: string;
  status: string;
  name: string;
};

@Injectable()
export class PanicButtonWsAuthService {
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
      throw new UnauthorizedException('Token invalido no handshake do socket.');
    }

    const persistedToken = await this.prisma.token.findUnique({
      where: {
        userId: payload.sub,
      },
    });

    if (!persistedToken || persistedToken.jwt !== rawToken) {
      throw new UnauthorizedException(
        'Token do socket nao corresponde a sessao ativa.',
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
      throw new UnauthorizedException('Usuario do socket nao encontrado.');
    }

    return user;
  }
}
