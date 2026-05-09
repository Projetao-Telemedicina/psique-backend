import { Module } from '@nestjs/common';
import { RescheduleService } from './reschedule.service';
import { RescheduleController } from './reschedule.controller';
import { AppointmentService } from '@/appointment/appointment.service';

@Module({
  imports: [AppointmentService],
  controllers: [RescheduleController],
  providers: [RescheduleService],
})
export class RescheduleModule {}
