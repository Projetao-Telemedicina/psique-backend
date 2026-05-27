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
import { EMERGENCY_EVENTS } from './constants/panic-button.constants';
import { CancelPanicButtonActivationDto } from './dto/cancel-panic-button-activation.dto';
import { CreatePanicButtonActivationDto } from './dto/create-panic-button-activation.dto';
import { PanicButtonTimeoutsService } from './panic-button-timeouts.service';
import { PanicButtonOfferRepository } from './repositories/panic-button-offer.repository';
import { PanicButtonProfessionalRepository } from './repositories/panic-button-professional.repository';
import { PanicButtonRequestRepository } from './repositories/panic-button-request.repository';

@Injectable()
export class PanicButtonService {
  private readonly panicButtonRequestTimeoutMs = Number(
    process.env.PANIC_REQUEST_TIMEOUT_MS ??
      process.env.EMERGENCY_REQUEST_TIMEOUT_MS ??
      60 * 1000,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly panicButtonRequestRepository: PanicButtonRequestRepository,
    private readonly panicButtonOfferRepository: PanicButtonOfferRepository,
    private readonly panicButtonProfessionalRepository: PanicButtonProfessionalRepository,
    private readonly panicButtonTimeoutsService: PanicButtonTimeoutsService,
  ) {}

  async activatePanicButton(
    patientId: string,
    dto: CreatePanicButtonActivationDto,
  ) {
    const activeRequest =
      await this.panicButtonRequestRepository.findActiveByPatientId(patientId);

    if (activeRequest) {
      throw new ConflictException(
        'O paciente já possui um acionamento do botão do pânico em andamento.',
      );
    }

    const expiresAt = new Date(Date.now() + this.panicButtonRequestTimeoutMs);
    const createdRequest = await this.panicButtonRequestRepository.create({
      patientId,
      notes: dto.notes,
      expiresAt,
    });

    this.panicButtonTimeoutsService.scheduleRequestExpiration(
      createdRequest.id,
      createdRequest.expiresAt,
    );

    await this.eventEmitter.emitAsync(EMERGENCY_EVENTS.SEARCHING, {
      requestId: createdRequest.id,
      patientId,
      status: createdRequest.status,
      occurredAt: new Date(),
    });

    await this.eventEmitter.emitAsync(EMERGENCY_EVENTS.CREATED, {
      requestId: createdRequest.id,
      patientId,
      occurredAt: new Date(),
    });

    return this.getRequestById(createdRequest.id);
  }

  async getRequestById(requestId: string) {
    const request = await this.panicButtonRequestRepository.findById(requestId);

    if (!request) {
      throw new NotFoundException('Acionamento do botão do pânico não encontrado.');
    }

    return request;
  }

  async getMyActivePanicButtonActivation(patientId: string) {
    const request =
      await this.panicButtonRequestRepository.findActiveByPatientId(patientId);

    if (!request) {
      throw new NotFoundException(
        'Nenhum acionamento ativo do botão do pânico foi encontrado.',
      );
    }

    return request;
  }

  async cancelPanicButtonActivation(
    requestId: string,
    patientId: string,
    _dto: CancelPanicButtonActivationDto,
  ) {
    const request = await this.getRequestById(requestId);

    if (request.patientId !== patientId) {
      throw new NotFoundException('Acionamento do botão do pânico não encontrado.');
    }

    const canCancel =
      request.status === EmergencyRequestStatus.SEARCHING ||
      request.status === EmergencyRequestStatus.OFFER_PENDING;

    if (!canCancel) {
      throw new ConflictException(
        'Este acionamento do botão do pânico não pode mais ser cancelado.',
      );
    }

    const pendingOffers = request.offers.filter(
      (offer) => offer.status === EmergencyOfferStatus.PENDING,
    );

    const updatedRequest = await this.prisma.$transaction(async (tx) => {
      await this.panicButtonOfferRepository.cancelPendingOffersByRequestId(
        tx,
        requestId,
        EmergencyOfferStatus.CANCELLED,
      );

      for (const offer of pendingOffers) {
        await this.panicButtonProfessionalRepository.releaseProfessionalFromOffer(
          tx,
          offer.professionalId,
          offer.id,
        );
      }

      return this.panicButtonRequestRepository.markAsCancelled(tx, requestId);
    });

    this.panicButtonTimeoutsService.cancelRequestExpiration(requestId);

    for (const offer of request.offers) {
      this.panicButtonTimeoutsService.cancelOfferExpiration(offer.id);
    }

    await this.eventEmitter.emitAsync(EMERGENCY_EVENTS.CANCELLED, {
      requestId,
      patientId,
      professionalIds: pendingOffers.map((offer) => offer.professionalId),
      occurredAt: new Date(),
    });

    return updatedRequest;
  }

  async expireRequest(requestId: string) {
    const request = await this.panicButtonRequestRepository.findById(requestId);

    if (!request) {
      return null;
    }

    const canExpire =
      request.status === EmergencyRequestStatus.SEARCHING ||
      request.status === EmergencyRequestStatus.OFFER_PENDING;

    if (!canExpire) {
      return request;
    }

    const pendingOffers = request.offers.filter(
      (offer) => offer.status === EmergencyOfferStatus.PENDING,
    );

    const updatedRequest = await this.prisma.$transaction(async (tx) => {
      await this.panicButtonOfferRepository.cancelPendingOffersByRequestId(
        tx,
        requestId,
        EmergencyOfferStatus.CANCELLED,
      );

      for (const offer of pendingOffers) {
        await this.panicButtonProfessionalRepository.releaseProfessionalFromOffer(
          tx,
          offer.professionalId,
          offer.id,
        );
      }

      return this.panicButtonRequestRepository.markAsExpired(tx, requestId);
    });

    this.panicButtonTimeoutsService.cancelRequestExpiration(requestId);

    for (const offer of request.offers) {
      this.panicButtonTimeoutsService.cancelOfferExpiration(offer.id);
    }

    await this.eventEmitter.emitAsync(EMERGENCY_EVENTS.EXPIRED, {
      requestId,
      patientId: request.patientId,
      professionalIds: pendingOffers.map((offer) => offer.professionalId),
      occurredAt: new Date(),
    });

    return updatedRequest;
  }
}
