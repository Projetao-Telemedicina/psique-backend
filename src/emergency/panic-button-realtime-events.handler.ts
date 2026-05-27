import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  EMERGENCY_EVENTS,
  EMERGENCY_SOCKET_EVENTS,
} from './constants/panic-button.constants';
import { PanicButtonRealtimeGateway } from './panic-button-realtime.gateway';

@Injectable()
export class PanicButtonRealtimeEventsHandler {
  constructor(
    private readonly panicButtonRealtimeGateway: PanicButtonRealtimeGateway,
  ) {}

  @OnEvent(EMERGENCY_EVENTS.SEARCHING)
  handleSearching(payload: {
    requestId: string;
    patientId: string;
    status: string;
    reason?: string;
  }) {
    this.panicButtonRealtimeGateway.emitToUser(
      payload.patientId,
      EMERGENCY_SOCKET_EVENTS.SEARCHING,
      {
        requestId: payload.requestId,
        status: payload.status,
        reason: payload.reason ?? 'waiting-for-psychologist',
      },
    );
  }

  @OnEvent(EMERGENCY_EVENTS.OFFER_CREATED)
  handleOfferCreated(payload: {
    requestId: string;
    offerId: string;
    patientId: string;
    professionalId: string;
    attemptNumber: number;
    expiresAt: Date;
  }) {
    this.panicButtonRealtimeGateway.emitToUser(
      payload.professionalId,
      EMERGENCY_SOCKET_EVENTS.NEW_OFFER,
      {
        requestId: payload.requestId,
        offerId: payload.offerId,
        attemptNumber: payload.attemptNumber,
        expiresAt: payload.expiresAt,
      },
    );

    this.panicButtonRealtimeGateway.emitToUser(
      payload.patientId,
      EMERGENCY_SOCKET_EVENTS.SEARCHING,
      {
        requestId: payload.requestId,
        status: 'OFFER_PENDING',
        reason: 'offer-sent',
      },
    );
  }

  @OnEvent(EMERGENCY_EVENTS.MATCHED)
  handleMatched(payload: {
    requestId: string;
    offerId: string;
    patientId: string;
    professionalId: string;
  }) {
    const eventPayload = {
      requestId: payload.requestId,
      offerId: payload.offerId,
      professionalId: payload.professionalId,
      patientId: payload.patientId,
    };

    this.panicButtonRealtimeGateway.emitToUser(
      payload.patientId,
      EMERGENCY_SOCKET_EVENTS.MATCHED,
      eventPayload,
    );
    this.panicButtonRealtimeGateway.emitToUser(
      payload.professionalId,
      EMERGENCY_SOCKET_EVENTS.MATCHED,
      eventPayload,
    );
  }

  @OnEvent(EMERGENCY_EVENTS.OFFER_EXPIRED)
  handleOfferExpired(payload: {
    requestId: string;
    offerId: string;
    professionalId: string;
  }) {
    this.panicButtonRealtimeGateway.emitToUser(
      payload.professionalId,
      EMERGENCY_SOCKET_EVENTS.OFFER_EXPIRED,
      {
        requestId: payload.requestId,
        offerId: payload.offerId,
      },
    );
  }

  @OnEvent(EMERGENCY_EVENTS.CANCELLED)
  handleCancelled(payload: {
    requestId: string;
    patientId: string;
    professionalIds: string[];
  }) {
    const eventPayload = {
      requestId: payload.requestId,
      status: 'CANCELLED',
    };

    this.panicButtonRealtimeGateway.emitToUser(
      payload.patientId,
      EMERGENCY_SOCKET_EVENTS.CANCELLED,
      eventPayload,
    );
    this.panicButtonRealtimeGateway.emitToUsers(
      payload.professionalIds,
      EMERGENCY_SOCKET_EVENTS.CANCELLED,
      eventPayload,
    );
  }

  @OnEvent(EMERGENCY_EVENTS.EXPIRED)
  handleExpired(payload: {
    requestId: string;
    patientId: string;
    professionalIds: string[];
  }) {
    const eventPayload = {
      requestId: payload.requestId,
      status: 'EXPIRED',
    };

    this.panicButtonRealtimeGateway.emitToUser(
      payload.patientId,
      EMERGENCY_SOCKET_EVENTS.CANCELLED,
      eventPayload,
    );
    this.panicButtonRealtimeGateway.emitToUsers(
      payload.professionalIds,
      EMERGENCY_SOCKET_EVENTS.CANCELLED,
      eventPayload,
    );
  }
}
