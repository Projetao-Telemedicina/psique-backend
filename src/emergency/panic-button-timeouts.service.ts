import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';
import { PanicButtonOfferRepository } from './repositories/panic-button-offer.repository';
import { PanicButtonRequestRepository } from './repositories/panic-button-request.repository';
import { EMERGENCY_EVENTS } from './constants/panic-button.constants';

@Injectable()
export class PanicButtonTimeoutsService implements OnModuleInit {
  private readonly logger = new Logger(PanicButtonTimeoutsService.name);

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly eventEmitter: EventEmitter2,
    private readonly panicButtonRequestRepository: PanicButtonRequestRepository,
    private readonly panicButtonOfferRepository: PanicButtonOfferRepository,
  ) {}

  async onModuleInit() {
    const [requests, offers] = await Promise.all([
      this.panicButtonRequestRepository.findOpenRequestsForRecovery(),
      this.panicButtonOfferRepository.findPendingOffersForRecovery(),
    ]);

    for (const request of requests) {
      this.scheduleRequestExpiration(request.id, request.expiresAt);
    }

    for (const offer of offers) {
      this.scheduleOfferExpiration(offer.id, offer.expiresAt);
    }

    this.logger.log(
      `Recuperados ${requests.length} timer(s) de solicitações de pânico e ${offers.length} timer(s) de ofertas.`,
    );
  }

  scheduleRequestExpiration(requestId: string, expiresAt: Date) {
    this.scheduleTimeout(
      this.getRequestTimerKey(requestId),
      expiresAt,
      () => {
        void this.eventEmitter.emitAsync(
          EMERGENCY_EVENTS.REQUEST_TIMEOUT_TRIGGERED,
          {
            requestId,
            occurredAt: new Date(),
          },
        );
      },
    );
  }

  scheduleOfferExpiration(offerId: string, expiresAt: Date) {
    this.scheduleTimeout(this.getOfferTimerKey(offerId), expiresAt, () => {
      void this.eventEmitter.emitAsync(EMERGENCY_EVENTS.OFFER_TIMEOUT_TRIGGERED, {
        offerId,
        occurredAt: new Date(),
      });
    });
  }

  cancelRequestExpiration(requestId: string) {
    this.deleteTimeout(this.getRequestTimerKey(requestId));
  }

  cancelOfferExpiration(offerId: string) {
    this.deleteTimeout(this.getOfferTimerKey(offerId));
  }

  private scheduleTimeout(
    key: string,
    expiresAt: Date,
    callback: () => void,
  ) {
    this.deleteTimeout(key);

    const delayMs = expiresAt.getTime() - Date.now();

    if (delayMs <= 0) {
      callback();
      return;
    }

    const timeout = setTimeout(() => {
      this.deleteTimeout(key);
      callback();
    }, delayMs);

    this.schedulerRegistry.addTimeout(key, timeout);
  }

  private deleteTimeout(key: string) {
    try {
      const timeout = this.schedulerRegistry.getTimeout(key);
      clearTimeout(timeout);
      this.schedulerRegistry.deleteTimeout(key);
    } catch {
      // Intentionally empty to keep cleanup idempotent.
    }
  }

  private getRequestTimerKey(requestId: string) {
    return `panic-request:${requestId}`;
  }

  private getOfferTimerKey(offerId: string) {
    return `panic-offer:${offerId}`;
  }
}
