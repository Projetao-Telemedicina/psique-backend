import { Module } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
import { PrismaService } from '@/prisma';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';

@Module({
  imports: [GoogleCalendarModule],
  controllers: [AppointmentController],
  providers: [AppointmentService, PrismaService],
  exports: [AppointmentService],
})
export class AppointmentModule {}
