import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '@/prisma';
import { UsersService } from '@/users/users.service';
import { getRequiredEnv } from '../auth-env';

type JwtPayload = {
  sub: string;
  email: string;
  role: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      passReqToCallback: true,
      secretOrKey: getRequiredEnv('JWT_SECRET'),
    });
  }

  async validate(request: Request, payload: JwtPayload) {
    try {
      const accessToken = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
      const persistedToken = await this.prisma.token.findUnique({
        where: { userId: payload.sub },
      });

      if (!accessToken || !persistedToken || persistedToken.jwt !== accessToken) {
        throw new UnauthorizedException();
      }

      const user = await this.usersService.getById(payload.sub);

      if (!user) {
        throw new UnauthorizedException();
      }

      return user;
    } catch {
      throw new UnauthorizedException();
    }
  }
}

