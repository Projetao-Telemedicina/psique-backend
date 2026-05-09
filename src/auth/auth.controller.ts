import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CreateUserDto } from '@/users/dto/create-user.dto';
import { TokenService } from '@/tokens/tokens.service';
import { AuthService } from './auth.service';
import { Roles } from './decorators/roles.decorator';
import { LoginDto } from './dto/login.dto';
import { RevokeTokensDto } from './dto/revoke-tokens.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import {
  AuthControllerApiTags,
  LoginAuthApiDocs,
  MeAuthApiDocs,
  RefreshAuthApiDocs,
  RegisterAuthApiDocs,
  RevokeAuthApiDocs,
} from './swagger/index';

type AuthenticatedRequest = {
  user: unknown;
};

@AuthControllerApiTags()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
  ) {}

  @Post('register')
  @RegisterAuthApiDocs()
  register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @LoginAuthApiDocs()
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @RefreshAuthApiDocs()
  refresh(@Headers('authorization') authorization?: string) {
    return this.tokenService.refreshTokens(this.extractBearerToken(authorization));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @MeAuthApiDocs()
  me(@Req() request: AuthenticatedRequest) {
    return request.user;
  }

  @Post('revoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @RevokeAuthApiDocs()
  async revoke(@Body() dto: RevokeTokensDto) {
    await this.tokenService.revokeAll(dto.userId);

    return { revoked: true };
  }

  private extractBearerToken(authorization?: string): string {
    if (!authorization) {
      throw new UnauthorizedException('Header Authorization ausente');
    }

    const [scheme, token, extra] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token || extra) {
      throw new UnauthorizedException('Formato do header Authorization invalido');
    }

    return token;
  }
}

