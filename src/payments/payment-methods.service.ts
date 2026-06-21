import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma';
import { SavePaymentMethodDto } from './dto/save-payment-method.dto';
import { StripeService } from './stripe/stripe.service';

@Injectable()
export class PaymentMethodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  async createSetupIntent(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        stripeCustomerId: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const customerId = await this.ensureStripeCustomer(user);

    return this.stripeService.createSetupIntent(customerId);
  }

  async savePaymentMethod(userId: string, dto: SavePaymentMethodDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        stripeCustomerId: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const customerId = await this.ensureStripeCustomer(user);
    const existingPaymentMethod = await this.prisma.paymentMethod.findFirst({
      where: {
        userId,
        gatewayToken: dto.stripePaymentMethodId,
      },
    });

    if (existingPaymentMethod) {
      throw new ConflictException('Este método de pagamento já foi cadastrado.');
    }

    await this.stripeService.attachPaymentMethod(customerId, dto.stripePaymentMethodId);

    const details = await this.stripeService.getCardPaymentMethodDetails(
      dto.stripePaymentMethodId,
    );

    if (!details.last4) {
      throw new BadRequestException(
        'O método de pagamento informado não é compatível com cartão.',
      );
    }

    const shouldBeDefault =
      dto.isDefault === true ||
      (await this.prisma.paymentMethod.count({ where: { userId } })) === 0;

    const paymentMethod = await this.prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.paymentMethod.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }

      return tx.paymentMethod.create({
        data: {
          userId,
          type: 'CARD',
          gatewayToken: details.id,
          brand: details.brand,
          last4: details.last4,
          holderName: details.holderName,
          expiresMonth: details.expMonth,
          expiresYear: details.expYear,
          isDefault: shouldBeDefault,
        },
      });
    });

    if (shouldBeDefault) {
      await this.stripeService.updateDefaultPaymentMethod(customerId, details.id);
    }

    return paymentMethod;
  }

  async listMyPaymentMethods(userId: string) {
    return this.prisma.paymentMethod.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async removePaymentMethod(userId: string, paymentMethodId: string) {
    const paymentMethod = await this.prisma.paymentMethod.findFirst({
      where: {
        id: paymentMethodId,
        userId,
      },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Método de pagamento não encontrado.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    const nextDefaultPaymentMethod = await this.prisma.paymentMethod.findFirst({
      where: {
        userId,
        id: { not: paymentMethodId },
      },
      orderBy: { createdAt: 'asc' },
    });

    await this.stripeService.detachPaymentMethod(paymentMethod.gatewayToken);

    await this.prisma.$transaction(async (tx) => {
      await tx.paymentMethod.delete({
        where: { id: paymentMethodId },
      });

      if (paymentMethod.isDefault && nextDefaultPaymentMethod) {
        await tx.paymentMethod.update({
          where: { id: nextDefaultPaymentMethod.id },
          data: { isDefault: true },
        });
      }
    });

    if (user?.stripeCustomerId && paymentMethod.isDefault) {
      await this.stripeService.updateDefaultPaymentMethod(
        user.stripeCustomerId,
        nextDefaultPaymentMethod?.gatewayToken ?? null,
      );
    }

    return {
      id: paymentMethodId,
      removed: true,
    };
  }

  async getOwnedPaymentMethod(userId: string, paymentMethodId: string) {
    const paymentMethod = await this.prisma.paymentMethod.findFirst({
      where: {
        id: paymentMethodId,
        userId,
      },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Método de pagamento não encontrado.');
    }

    return paymentMethod;
  }

  async getStripeCustomerId(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        stripeCustomerId: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return this.ensureStripeCustomer(user);
  }

  private async ensureStripeCustomer(user: {
    id: string;
    name: string;
    email: string;
    stripeCustomerId: string | null;
  }) {
    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    const customer = await this.stripeService.createCustomer({
      email: user.email,
      name: user.name,
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }
}
