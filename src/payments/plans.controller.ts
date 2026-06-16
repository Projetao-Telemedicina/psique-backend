import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '@/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { CreatePlanDto } from './dto/create-plan.dto';
import { PlansService } from './plans.service';
import {
  CreatePlanApiDocs,
  GetPlanByIdApiDocs,
  GetPlansApiDocs,
  PlansApiTags,
} from './swagger';

@PlansApiTags()
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @CreatePlanApiDocs()
  create(@Body() dto: CreatePlanDto) {
    return this.plansService.createPlan(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PATIENT)
  @GetPlansApiDocs()
  findAll() {
    return this.plansService.listActivePlans();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PATIENT)
  @GetPlanByIdApiDocs()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.plansService.getActivePlanById(id);
  }
}
