import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma';
import { PrismaClientLike } from './panic-button-prisma.types';
import {
  OnlineStatus,
  ProfessionalApprovalStatus,
  Role,
  UserStatus,
} from '@prisma/client';

@Injectable()
export class PanicButtonProfessionalRepository {
  constructor(private readonly prisma: PrismaService) {}

  findNextEligibleProfessional(excludedProfessionalIds: string[]) {
    return this.prisma.professionalProfile.findFirst({
      where: {
        user: {
          role: Role.PROFESSIONAL,
          status: UserStatus.ACTIVE,
        },
        approvalStatus: ProfessionalApprovalStatus.APPROVED,
        onlineStatus: OnlineStatus.ONLINE,
        availableForEmergency: true,
        activeEmergencyOfferId: null,
        userId: {
          notIn: excludedProfessionalIds,
        },
      },
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
      orderBy: [
        { createdAt: 'asc' },
        { userId: 'asc' },
      ],
    });
  }

  reserveProfessionalForOffer(
    prisma: PrismaClientLike,
    professionalId: string,
    offerId: string,
  ) {
    return prisma.professionalProfile.updateMany({
      where: {
        userId: professionalId,
        approvalStatus: ProfessionalApprovalStatus.APPROVED,
        onlineStatus: OnlineStatus.ONLINE,
        availableForEmergency: true,
        activeEmergencyOfferId: null,
        user: {
          status: UserStatus.ACTIVE,
        },
      },
      data: {
        activeEmergencyOfferId: offerId,
      },
    });
  }

  releaseProfessionalFromOffer(
    prisma: PrismaClientLike,
    professionalId: string,
    offerId: string,
  ) {
    return prisma.professionalProfile.updateMany({
      where: {
        userId: professionalId,
        activeEmergencyOfferId: offerId,
      },
      data: {
        activeEmergencyOfferId: null,
      },
    });
  }

  markProfessionalBusyAfterAcceptance(
    prisma: PrismaClientLike,
    professionalId: string,
    offerId: string,
  ) {
    return prisma.professionalProfile.updateMany({
      where: {
        userId: professionalId,
        activeEmergencyOfferId: offerId,
      },
      data: {
        activeEmergencyOfferId: null,
        availableForEmergency: false,
      },
    });
  }
}
