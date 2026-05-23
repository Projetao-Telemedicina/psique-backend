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
import { MatchingModule } from './matching/matching.module';
import { ReviewModule } from './review/review.module';

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
    MatchingModule,
    ReviewModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
