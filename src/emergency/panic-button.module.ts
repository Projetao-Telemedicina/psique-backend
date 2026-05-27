import { Module } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { AuthModule } from '@/auth/auth.module';
import { PanicButtonController } from './panic-button.controller';
import { PanicButtonDispatchService } from './panic-button-dispatch.service';
import { PanicButtonDomainEventsHandler } from './panic-button-domain-events.handler';
import { PanicButtonOffersService } from './panic-button-offers.service';
import { PanicButtonPresenceService } from './panic-button-presence.service';
import { PanicButtonRealtimeEventsHandler } from './panic-button-realtime-events.handler';
import { PanicButtonRealtimeGateway } from './panic-button-realtime.gateway';
import { PanicButtonService } from './panic-button.service';
import { PanicButtonTimeoutsService } from './panic-button-timeouts.service';
import { PanicButtonWsAuthService } from './panic-button-ws-auth.service';
import { PanicButtonOfferRepository } from './repositories/panic-button-offer.repository';
import { PanicButtonProfessionalRepository } from './repositories/panic-button-professional.repository';
import { PanicButtonRequestRepository } from './repositories/panic-button-request.repository';

@Module({
  imports: [AuthModule],
  controllers: [PanicButtonController],
  providers: [
    SchedulerRegistry,
    PanicButtonService,
    PanicButtonOffersService,
    PanicButtonDispatchService,
    PanicButtonTimeoutsService,
    PanicButtonPresenceService,
    PanicButtonWsAuthService,
    PanicButtonRealtimeGateway,
    PanicButtonRequestRepository,
    PanicButtonOfferRepository,
    PanicButtonProfessionalRepository,
    PanicButtonDomainEventsHandler,
    PanicButtonRealtimeEventsHandler,
  ],
  exports: [PanicButtonService],
})
export class PanicButtonModule {}
