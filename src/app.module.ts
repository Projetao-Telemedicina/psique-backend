import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppointmentModule } from './appointment/appointment.module';
import { PatientsModule } from './patients/patients.module';
import { PrismaModule } from './prisma/index';
import { ProfessionalsModule } from './professionals/professionals.module';
import { UsersModule } from './users/users.module';
import { RescheduleModule } from './reschedule/reschedule.module';
import { AuthModule } from './auth/auth.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    PatientsModule,
    ProfessionalsModule,
    AppointmentModule,
    RescheduleModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
