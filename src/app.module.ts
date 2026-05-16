import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppointmentModule } from './appointment/appointment.module';
import { AuthModule } from './auth/auth.module';
import { GoogleCalendarModule } from './google-calendar/google-calendar.module';
import { PatientsModule } from './patients/patients.module';
import { PrismaModule } from './prisma/index';
import { ProfessionalsModule } from './professionals/professionals.module';
import { RescheduleModule } from './reschedule/reschedule.module';
import { UsersModule } from './users/users.module';
import { DiaryModule } from './diary/diary.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    PatientsModule,
    ProfessionalsModule,
    AppointmentModule,
    RescheduleModule,
    ScheduleModule.forRoot(),
    GoogleCalendarModule,
    DiaryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
