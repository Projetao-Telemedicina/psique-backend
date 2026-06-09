import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EmergencyOfferStatus,
  EmergencyRequestStatus,
} from '@prisma/client';
import { PrismaService } from '@/prisma';
import { PanicButtonAppointmentsService } from './panic-button-appointments.service';
import { EMERGENCY_EVENTS } from './constants/panic-button.constants';
import { RejectPanicButtonOfferDto } from './dto/reject-panic-button-offer.dto';
import { PanicButtonTimeoutsService } from './panic-button-timeouts.service';
import { PanicButtonOfferRepository } from './repositories/panic-button-offer.repository';
import { PanicButtonProfessionalRepository } from './repositories/panic-button-professional.repository';
import { PanicButtonRequestRepository } from './repositories/panic-button-request.repository';

@Injectable()
export class PanicButtonOffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly panicButtonAppointmentsService: PanicButtonAppointmentsService,
    private readonly panicButtonOfferRepository: PanicButtonOfferRepository,
    private readonly panicButtonRequestRepository: PanicButtonRequestRepository,
    private readonly panicButtonProfessionalRepository: PanicButtonProfessionalRepository,
    private readonly panicButtonTimeoutsService: PanicButtonTimeoutsService,
  ) {}

  async acceptOffer(offerId: string, professionalId: string) {
    const offer = await this.panicButtonOfferRepository.findById(offerId);

    if (!offer || offer.professionalId !== professionalId) {
      throw new NotFoundException('Oferta do botão do pânico não encontrada.');
    }

    if (offer.status !== EmergencyOfferStatus.PENDING) {
      throw new ConflictException(
        'Esta oferta do botão do pânico não está mais pendente.',
      );
    }

    if (offer.emergencyRequest.status !== EmergencyRequestStatus.OFFER_PENDING) {
      throw new ConflictException(
        'O acionamento do botão do pânico não está aguardando resposta.',
      );
    }

    const updatedOffer = await this.prisma.$transaction(async (tx) => {
      const acceptedOffer = await this.panicButtonOfferRepository.updateStatus(
        tx,
        offerId,
        {
          status: EmergencyOfferStatus.ACCEPTED,
        },
      );

      await this.panicButtonRequestRepository.markAsMatched(
        tx,
        offer.emergencyRequestId,
        professionalId,
      );

      await this.panicButtonProfessionalRepository.markProfessionalBusyAfterAcceptance(
        tx,
        professionalId,
        offerId,
      );

      return acceptedOffer;
    });

    this.panicButtonTimeoutsService.cancelOfferExpiration(offerId);
    this.panicButtonTimeoutsService.cancelRequestExpiration(
      offer.emergencyRequestId,
    );

    await this.eventEmitter.emitAsync(EMERGENCY_EVENTS.OFFER_ACCEPTED, {
      requestId: offer.emergencyRequestId,
      offerId,
      patientId: offer.emergencyRequest.patientId,
      professionalId,
      occurredAt: new Date(),
    });

    await this.eventEmitter.emitAsync(EMERGENCY_EVENTS.MATCHED, {
      requestId: offer.emergencyRequestId,
      offerId,
      patientId: offer.emergencyRequest.patientId,
      professionalId,
      occurredAt: new Date(),
    });

    return updatedOffer;
  }

  async rejectOffer(
    offerId: string,
    professionalId: string,
    dto: RejectPanicButtonOfferDto,
  ) {
    const offer = await this.panicButtonOfferRepository.findById(offerId);

    if (!offer || offer.professionalId !== professionalId) {
      throw new NotFoundException('Oferta do botão do pânico não encontrada.');
    }

    if (offer.status !== EmergencyOfferStatus.PENDING) {
      throw new ConflictException(
        'Esta oferta do botão do pânico não está mais pendente.',
      );
    }

    const updatedOffer = await this.prisma.$transaction(async (tx) => {
      const rejectedOffer = await this.panicButtonOfferRepository.updateStatus(
        tx,
        offerId,
        {
          status: EmergencyOfferStatus.REJECTED,
          rejectionReason: dto.reason,
        },
      );

      await this.panicButtonRequestRepository.markAsSearching(
        tx,
        offer.emergencyRequestId,
      );

      await this.panicButtonAppointmentsService.deleteByEmergencyRequestId(
        tx,
        offer.emergencyRequestId,
      );

      await this.panicButtonProfessionalRepository.releaseProfessionalFromOffer(
        tx,
        professionalId,
        offerId,
      );

      return rejectedOffer;
    });

    this.panicButtonTimeoutsService.cancelOfferExpiration(offerId);

    await this.eventEmitter.emitAsync(EMERGENCY_EVENTS.OFFER_REJECTED, {
      requestId: offer.emergencyRequestId,
      offerId,
      patientId: offer.emergencyRequest.patientId,
      professionalId,
      occurredAt: new Date(),
    });

    return updatedOffer;
  }

  async expireOffer(offerId: string) {
    const offer = await this.panicButtonOfferRepository.findById(offerId);

    if (!offer || offer.status !== EmergencyOfferStatus.PENDING) {
      return offer;
    }

    const updatedOffer = await this.prisma.$transaction(async (tx) => {
      const expiredOffer = await this.panicButtonOfferRepository.updateStatus(
        tx,
        offerId,
        {
          status: EmergencyOfferStatus.EXPIRED,
        },
      );

      await this.panicButtonRequestRepository.markAsSearching(
        tx,
        offer.emergencyRequestId,
      );

      await this.panicButtonAppointmentsService.deleteByEmergencyRequestId(
        tx,
        offer.emergencyRequestId,
      );

      await this.panicButtonProfessionalRepository.releaseProfessionalFromOffer(
        tx,
        offer.professionalId,
        offerId,
      );

      return expiredOffer;
    });

    this.panicButtonTimeoutsService.cancelOfferExpiration(offerId);

    await this.eventEmitter.emitAsync(EMERGENCY_EVENTS.OFFER_EXPIRED, {
      requestId: offer.emergencyRequestId,
      offerId,
      patientId: offer.emergencyRequest.patientId,
      professionalId: offer.professionalId,
      occurredAt: new Date(),
    });

    return updatedOffer;
  }
}
