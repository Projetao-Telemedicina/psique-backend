import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EMERGENCY_EVENTS } from './constants/panic-button.constants';
import { PanicButtonDispatchService } from './panic-button-dispatch.service';
import { PanicButtonOffersService } from './panic-button-offers.service';
import { PanicButtonService } from './panic-button.service';

@Injectable()
export class PanicButtonDomainEventsHandler {
  constructor(
    private readonly panicButtonDispatchService: PanicButtonDispatchService,
    private readonly panicButtonOffersService: PanicButtonOffersService,
    private readonly panicButtonService: PanicButtonService,
  ) {}

  @OnEvent(EMERGENCY_EVENTS.CREATED, { async: true })
  async handleEmergencyCreated(payload: { requestId: string }) {
    await this.panicButtonDispatchService.tryDispatchNextProfessional(
      payload.requestId,
      EMERGENCY_EVENTS.CREATED,
    );
  }

  @OnEvent(EMERGENCY_EVENTS.OFFER_REJECTED, { async: true })
  async handleOfferRejected(payload: { requestId: string }) {
    await this.panicButtonDispatchService.tryDispatchNextProfessional(
      payload.requestId,
      EMERGENCY_EVENTS.OFFER_REJECTED,
    );
  }

  @OnEvent(EMERGENCY_EVENTS.OFFER_EXPIRED, { async: true })
  async handleOfferExpired(payload: { requestId: string }) {
    await this.panicButtonDispatchService.tryDispatchNextProfessional(
      payload.requestId,
      EMERGENCY_EVENTS.OFFER_EXPIRED,
    );
  }

  @OnEvent(EMERGENCY_EVENTS.PSYCHOLOGIST_AVAILABLE, { async: true })
  async handlePsychologistAvailable() {
    await this.panicButtonDispatchService.tryDispatchOldestSearchingRequest(
      EMERGENCY_EVENTS.PSYCHOLOGIST_AVAILABLE,
    );
  }

  @OnEvent(EMERGENCY_EVENTS.REQUEST_TIMEOUT_TRIGGERED, { async: true })
  async handleRequestTimeout(payload: { requestId: string }) {
    await this.panicButtonService.expireRequest(payload.requestId);
  }

  @OnEvent(EMERGENCY_EVENTS.OFFER_TIMEOUT_TRIGGERED, { async: true })
  async handleOfferTimeout(payload: { offerId: string }) {
    await this.panicButtonOffersService.expireOffer(payload.offerId);
  }
}
