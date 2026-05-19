import { Module } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
import { PrismaService } from '@/prisma';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';
import { CertificateService } from './certificate/certificate.service';
import { ReviewModule } from '@/review/review.module';

@Module({
  imports: [GoogleCalendarModule, ReviewModule],
  controllers: [AppointmentController],
  providers: [AppointmentService, PrismaService, CertificateService],
  exports: [AppointmentService],
})
export class AppointmentModule {}
