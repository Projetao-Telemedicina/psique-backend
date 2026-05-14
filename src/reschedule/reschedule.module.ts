import { Module } from '@nestjs/common';
import { RescheduleService } from './reschedule.service';
import { RescheduleController } from './reschedule.controller';
import { AppointmentModule } from '@/appointment/appointment.module';
import { PrismaModule } from '@/prisma';
import { GoogleCalendarModule } from '@/google-calendar/google-calendar.module';

@Module({
  imports: [
    AppointmentModule,
    PrismaModule,
    GoogleCalendarModule,
  ],
  controllers: [RescheduleController],
  providers: [RescheduleService],
})
export class RescheduleModule {}
