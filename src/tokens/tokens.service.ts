import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@/prisma/index';
import { getRequiredEnv } from '@/auth/auth-env';

type RefreshPayload = {
  sub: string;
};

@Injectable()
export class TokenService {
  private readonly jwtSecret = getRequiredEnv('JWT_SECRET');
  private readonly jwtRefreshSecret = getRequiredEnv('JWT_REFRESH_SECRET');

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async createTokens(userId: string, email: string, role: Role) {
    const accessToken = await this.jwtService.signAsync(
      {
        sub: userId,
        email,
        role,
        jti: randomUUID(),
      },
      {
        secret: this.jwtSecret,
        expiresIn: '1h',
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: userId,
        jti: randomUUID(),
      },
      {
        secret: this.jwtRefreshSecret,
        expiresIn: '14d',
      },
    );

    await this.prisma.token.upsert({
      where: { userId },
      create: {
        userId,
        jwt: accessToken,
        refreshJwt: refreshToken,
      },
      update: {
        jwt: accessToken,
        refreshJwt: refreshToken,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(oldRefreshToken: string) {
    let payload: RefreshPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshPayload>(oldRefreshToken, {
        secret: this.jwtRefreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalido');
    }

    const persistedToken = await this.prisma.token.findUnique({
      where: { userId: payload.sub },
    });

    if (!persistedToken || persistedToken.refreshJwt !== oldRefreshToken) {
      throw new UnauthorizedException('Refresh token invalido');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Refresh token invalido');
    }

    await this.prisma.token.delete({
      where: { userId: payload.sub },
    });

    return this.createTokens(user.id, user.email, user.role);
  }

  async revokeAll(userId: string): Promise<void> {
    await this.prisma.token.deleteMany({
      where: { userId },
    });
  }
}
