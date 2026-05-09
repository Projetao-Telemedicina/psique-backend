import { Module } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
import { PrismaService } from '@/prisma';

@Module({
  controllers: [AppointmentController],
  providers: [AppointmentService, PrismaService],
  exports: [AppointmentService],
})
export class AppointmentModule {}
