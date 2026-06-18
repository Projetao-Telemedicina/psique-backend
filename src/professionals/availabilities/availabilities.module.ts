import { Module } from '@nestjs/common';
import { AvailabilitiesService } from './availabilities.service';

@Module({
  providers: [AvailabilitiesService],
  exports: [AvailabilitiesService],
})
export class AvailabilitiesModule {}
