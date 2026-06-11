import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
import { DistributeCouponDto } from './dto/distribute-coupon.dto';
import {
  ApplyCouponApiDocs,
  ClaimCouponApiDocs,
  CouponsApiTags,
  CreateCouponApiDocs,
  DistributeCouponApiDocs,
  GetAllCouponsApiDocs,
  GetCouponByIdApiDocs,
  ListMyCouponsApiDocs,
  RemoveCouponApiDocs,
  ReserveCouponApiDocs,
  UpdateCouponApiDocs,
} from './swagger/index';

type AuthenticatedRequest = {
  user: {
    id: string;
    role: Role;
  };
};

@CouponsApiTags()
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @CreateCouponApiDocs()
  create(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @GetAllCouponsApiDocs()
  findAll() {
    return this.couponsService.getAll();
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT)
  @ListMyCouponsApiDocs()
  listMyCoupons(@Req() request: AuthenticatedRequest) {
    return this.couponsService.listMyCoupons(request.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @GetCouponByIdApiDocs()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.couponsService.getById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UpdateCouponApiDocs()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.couponsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @RemoveCouponApiDocs()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.couponsService.remove(id);
  }

  @Post('apply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT)
  @ApplyCouponApiDocs()
  apply(
    @Body() dto: ApplyCouponDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.couponsService.applyCoupon(
      request.user.id,
      dto.userCouponId,
      dto.amountCents,
      dto.category,
    );
  }

  @Post(':id/claim')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT)
  @ClaimCouponApiDocs()
  claim(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.couponsService.claimPublicCoupon(request.user.id, id);
  }

  @Post(':id/distribute')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @DistributeCouponApiDocs()
  distribute(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DistributeCouponDto,
  ) {
    return this.couponsService.distributeCoupon(id, dto.targetUserId);
  }

  @Post(':id/reserve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT)
  @ReserveCouponApiDocs()
  reserve(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.couponsService.reserveCoupon(request.user.id, id);
  }
}
