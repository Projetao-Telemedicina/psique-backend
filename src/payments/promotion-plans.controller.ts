import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '@/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { CreatePromotionPlanDto } from './dto/create-promotion-plan.dto';
import { PromotionPlansService } from './promotion-plans.service';
import {
  CreatePromotionPlanApiDocs,
  GetPromotionPlanByIdApiDocs,
  GetPromotionPlansApiDocs,
  PromotionPlansApiTags,
} from './swagger';

@PromotionPlansApiTags()
@Controller('promotion-plans')
export class PromotionPlansController {
  constructor(private readonly promotionPlansService: PromotionPlansService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @CreatePromotionPlanApiDocs()
  create(@Body() dto: CreatePromotionPlanDto) {
    return this.promotionPlansService.createPlan(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROFESSIONAL)
  @GetPromotionPlansApiDocs()
  findAll() {
    return this.promotionPlansService.listActivePlans();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROFESSIONAL)
  @GetPromotionPlanByIdApiDocs()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.promotionPlansService.getActivePlanById(id);
  }
}
