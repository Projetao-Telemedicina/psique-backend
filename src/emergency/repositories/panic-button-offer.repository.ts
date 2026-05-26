import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma';
import { PrismaClientLike } from './panic-button-prisma.types';
import {
  EmergencyOfferStatus,
  Prisma,
} from '@prisma/client';

const emergencyOfferInclude = {
  professional: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          role: true,
          status: true,
        },
      },
    },
  },
  emergencyRequest: {
    include: {
      patient: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true,
              status: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.EmergencyOfferInclude;

@Injectable()
export class PanicButtonOfferRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    prisma: PrismaClientLike,
    data: {
      id: string;
      emergencyRequestId: string;
      professionalId: string;
      attemptNumber: number;
      expiresAt: Date;
    },
  ) {
    return prisma.emergencyOffer.create({
      data,
      include: emergencyOfferInclude,
    });
  }

  findById(id: string) {
    return this.prisma.emergencyOffer.findUnique({
      where: { id },
      include: emergencyOfferInclude,
    });
  }

  findPendingOffersForRecovery() {
    return this.prisma.emergencyOffer.findMany({
      where: {
        status: EmergencyOfferStatus.PENDING,
      },
      select: {
        id: true,
        expiresAt: true,
      },
    });
  }

  updateStatus(
    prisma: PrismaClientLike,
    offerId: string,
    data: {
      status: EmergencyOfferStatus;
      rejectionReason?: string | null;
    },
  ) {
    return prisma.emergencyOffer.update({
      where: { id: offerId },
      data: {
        status: data.status,
        rejectionReason: data.rejectionReason ?? null,
        respondedAt: new Date(),
      },
      include: emergencyOfferInclude,
    });
  }

  cancelPendingOffersByRequestId(
    prisma: PrismaClientLike,
    requestId: string,
    nextStatus: EmergencyOfferStatus,
  ) {
    return prisma.emergencyOffer.updateMany({
      where: {
        emergencyRequestId: requestId,
        status: EmergencyOfferStatus.PENDING,
      },
      data: {
        status: nextStatus,
        respondedAt: new Date(),
      },
    });
  }
}
