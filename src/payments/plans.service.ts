import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma';
import { CreatePlanDto } from './dto/create-plan.dto';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async createPlan(dto: CreatePlanDto) {
    try {
      return await this.prisma.plan.create({
        data: {
          name: dto.name,
          description: dto.description,
          priceCents: dto.priceCents,
          billingCycle: dto.billingCycle,
          benefits: dto.benefits,
          stripeProductId: dto.stripeProductId,
          stripePriceId: dto.stripePriceId,
        },
      });
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Já existe um plano cadastrado com este Stripe Product ID ou Stripe Price ID.',
        );
      }

      throw error;
    }
  }

  async listActivePlans() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: [{ priceCents: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async getActivePlanById(planId: string) {
    const plan = await this.prisma.plan.findFirst({
      where: {
        id: planId,
        isActive: true,
      },
    });

    if (!plan) {
      throw new NotFoundException('Plano não encontrado.');
    }

    return plan;
  }
}
