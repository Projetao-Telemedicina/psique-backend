import { Module } from '@nestjs/common';
import { RescheduleService } from './reschedule.service';
import { RescheduleController } from './reschedule.controller';
import { AppointmentModule } from '@/appointment/appointment.module';
import { PrismaModule } from '@/prisma';

@Module({
  imports: [AppointmentModule, PrismaModule],
  controllers: [RescheduleController],
  providers: [RescheduleService],
})
export class RescheduleModule {}
