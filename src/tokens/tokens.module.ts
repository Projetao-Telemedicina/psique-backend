import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '@/prisma/index';
import { TokenService } from './tokens.service';

@Module({
  imports: [JwtModule, PrismaModule],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokensModule {}

