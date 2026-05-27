import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma';
import { PrismaClientLike } from './panic-button-prisma.types';
import {
  EmergencyRequestStatus,
  Prisma,
} from '@prisma/client';

const emergencyRequestInclude = {
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
  matchedProfessional: {
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
  offers: {
    orderBy: {
      attemptNumber: 'asc',
    },
    include: {
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
    },
  },
} satisfies Prisma.EmergencyRequestInclude;

@Injectable()
export class PanicButtonRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    patientId: string;
    notes?: string;
    expiresAt: Date;
  }) {
    return this.prisma.emergencyRequest.create({
      data,
      include: emergencyRequestInclude,
    });
  }

  findActiveByPatientId(patientId: string) {
    return this.prisma.emergencyRequest.findFirst({
      where: {
        patientId,
        status: {
          in: [
            EmergencyRequestStatus.SEARCHING,
            EmergencyRequestStatus.OFFER_PENDING,
          ],
        },
      },
      include: emergencyRequestInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  findById(id: string) {
    return this.prisma.emergencyRequest.findUnique({
      where: { id },
      include: emergencyRequestInclude,
    });
  }

  findOldestSearchingRequest() {
    return this.prisma.emergencyRequest.findFirst({
      where: {
        status: EmergencyRequestStatus.SEARCHING,
      },
      include: emergencyRequestInclude,
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  findOpenRequestsForRecovery() {
    return this.prisma.emergencyRequest.findMany({
      where: {
        status: {
          in: [
            EmergencyRequestStatus.SEARCHING,
            EmergencyRequestStatus.OFFER_PENDING,
          ],
        },
      },
      select: {
        id: true,
        expiresAt: true,
      },
    });
  }

  markAsSearching(prisma: PrismaClientLike, requestId: string) {
    return prisma.emergencyRequest.update({
      where: { id: requestId },
      data: {
        status: EmergencyRequestStatus.SEARCHING,
      },
      include: emergencyRequestInclude,
    });
  }

  markAsOfferPending(prisma: PrismaClientLike, requestId: string) {
    return prisma.emergencyRequest.update({
      where: { id: requestId },
      data: {
        status: EmergencyRequestStatus.OFFER_PENDING,
      },
      include: emergencyRequestInclude,
    });
  }

  markAsMatched(
    prisma: PrismaClientLike,
    requestId: string,
    professionalId: string,
  ) {
    const matchedAt = new Date();

    return prisma.emergencyRequest.update({
      where: { id: requestId },
      data: {
        status: EmergencyRequestStatus.MATCHED,
        matchedProfessionalId: professionalId,
        matchedAt,
        closedAt: matchedAt,
      },
      include: emergencyRequestInclude,
    });
  }

  markAsExpired(prisma: PrismaClientLike, requestId: string) {
    const closedAt = new Date();

    return prisma.emergencyRequest.update({
      where: { id: requestId },
      data: {
        status: EmergencyRequestStatus.EXPIRED,
        closedAt,
      },
      include: emergencyRequestInclude,
    });
  }

  markAsCancelled(prisma: PrismaClientLike, requestId: string) {
    const cancelledAt = new Date();

    return prisma.emergencyRequest.update({
      where: { id: requestId },
      data: {
        status: EmergencyRequestStatus.CANCELLED,
        cancelledAt,
        closedAt: cancelledAt,
      },
      include: emergencyRequestInclude,
    });
  }
}
