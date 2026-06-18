import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'node:crypto';
import { EmergencyOfferStatus, EmergencyRequestStatus } from '@prisma/client';
import { PrismaService } from '@/prisma';
import { PanicButtonAppointmentsService } from './panic-button-appointments.service';
import { EMERGENCY_EVENTS } from './constants/panic-button.constants';
import { PanicButtonTimeoutsService } from './panic-button-timeouts.service';
import { PanicButtonOfferRepository } from './repositories/panic-button-offer.repository';
import { PanicButtonProfessionalRepository } from './repositories/panic-button-professional.repository';
import { PanicButtonRequestRepository } from './repositories/panic-button-request.repository';

@Injectable()
export class PanicButtonDispatchService {
  private readonly panicButtonOfferTimeoutMs = Number(
    process.env.PANIC_OFFER_TIMEOUT_MS ??
      process.env.EMERGENCY_OFFER_TIMEOUT_MS ??
      15 * 1000,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly panicButtonAppointmentsService: PanicButtonAppointmentsService,
    private readonly panicButtonRequestRepository: PanicButtonRequestRepository,
    private readonly panicButtonOfferRepository: PanicButtonOfferRepository,
    private readonly panicButtonProfessionalRepository: PanicButtonProfessionalRepository,
    private readonly panicButtonTimeoutsService: PanicButtonTimeoutsService,
  ) {}

  async tryDispatchNextProfessional(requestId: string, reason: string) {
    const request = await this.panicButtonRequestRepository.findById(requestId);

    if (!request) {
      return null;
    }

    if (request.expiresAt.getTime() <= Date.now()) {
      await this.eventEmitter.emitAsync(EMERGENCY_EVENTS.REQUEST_TIMEOUT_TRIGGERED, {
        requestId,
        occurredAt: new Date(),
      });
      return null;
    }

    const requestCanReceiveOffers =
      request.status === EmergencyRequestStatus.SEARCHING ||
      request.status === EmergencyRequestStatus.OFFER_PENDING;

    if (!requestCanReceiveOffers) {
      return null;
    }

    const existingPendingOffer = request.offers.find(
      (offer) => offer.status === EmergencyOfferStatus.PENDING,
    );

    if (existingPendingOffer) {
      return existingPendingOffer;
    }

    const excludedProfessionalIds = request.offers.map(
      (offer) => offer.professionalId,
    );

    while (true) {
      const professional =
        await this.panicButtonProfessionalRepository.findNextEligibleProfessional(
          excludedProfessionalIds,
        );

      if (!professional) {
        if (request.status !== EmergencyRequestStatus.SEARCHING) {
          await this.prisma.emergencyRequest.updateMany({
            where: {
              id: request.id,
              status: EmergencyRequestStatus.OFFER_PENDING,
            },
            data: {
              status: EmergencyRequestStatus.SEARCHING,
            },
          });
        }

        await this.eventEmitter.emitAsync(EMERGENCY_EVENTS.SEARCHING, {
          requestId: request.id,
          patientId: request.patientId,
          status: EmergencyRequestStatus.SEARCHING,
          reason,
          occurredAt: new Date(),
        });

        return null;
      }

      excludedProfessionalIds.push(professional.userId);

      const offerId = randomUUID();
      const expiresAt = new Date(Date.now() + this.panicButtonOfferTimeoutMs);
      const nextAttemptNumber = request.offers.length + 1;

      const createdOffer = await this.prisma.$transaction(async (tx) => {
        const reserved =
          await this.panicButtonProfessionalRepository.reserveProfessionalForOffer(
            tx,
            professional.userId,
            offerId,
          );

        if (reserved.count === 0) {
          return null;
        }

        const updatedRequest = await tx.emergencyRequest.updateMany({
          where: {
            id: request.id,
            status: {
              in: [
                EmergencyRequestStatus.SEARCHING,
                EmergencyRequestStatus.OFFER_PENDING,
              ],
            },
          },
          data: {
            status: EmergencyRequestStatus.OFFER_PENDING,
          },
        });

        if (updatedRequest.count === 0) {
          await this.panicButtonProfessionalRepository.releaseProfessionalFromOffer(
            tx,
            professional.userId,
            offerId,
          );
          return null;
        }

        const createdOffer = await this.panicButtonOfferRepository.create(tx, {
          id: offerId,
          emergencyRequestId: request.id,
          professionalId: professional.userId,
          attemptNumber: nextAttemptNumber,
          expiresAt,
        });

        await this.panicButtonAppointmentsService.createForEmergencyRequest(tx, {
          emergencyRequestId: request.id,
          patientId: request.patientId,
          professionalId: professional.userId,
        });

        return createdOffer;
      });

      if (!createdOffer) {
        continue;
      }

      this.panicButtonTimeoutsService.scheduleOfferExpiration(
        createdOffer.id,
        createdOffer.expiresAt,
      );

      await this.eventEmitter.emitAsync(EMERGENCY_EVENTS.OFFER_CREATED, {
        requestId: request.id,
        offerId: createdOffer.id,
        patientId: request.patientId,
        professionalId: createdOffer.professionalId,
        attemptNumber: createdOffer.attemptNumber,
        expiresAt: createdOffer.expiresAt,
        occurredAt: new Date(),
      });

      return createdOffer;
    }
  }

  async tryDispatchOldestSearchingRequest(reason: string) {
    const request =
      await this.panicButtonRequestRepository.findOldestSearchingRequest();

    if (!request) {
      return null;
    }

    return this.tryDispatchNextProfessional(request.id, reason);
  }
}
