import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma';
import { CreatePromotionPlanDto } from './dto/create-promotion-plan.dto';

@Injectable()
export class PromotionPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async createPlan(dto: CreatePromotionPlanDto) {
    return this.prisma.promotionPlan.create({
      data: {
        name: dto.name,
        description: dto.description,
        priceCents: dto.priceCents,
        durationDays: dto.durationDays,
      },
    });
  }

  async listActivePlans() {
    return this.prisma.promotionPlan.findMany({
      where: { isActive: true },
      orderBy: [
        { priceCents: 'asc' },
        { durationDays: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  async getActivePlanById(planId: string) {
    const plan = await this.prisma.promotionPlan.findFirst({
      where: {
        id: planId,
        isActive: true,
      },
    });

    if (!plan) {
      throw new NotFoundException('Plano de impulsionamento não encontrado.');
    }

    return plan;
  }
}
