import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppointmentModule } from './appointment/appointment.module';
import { PatientsModule } from './patients/patients.module';
import { PrismaModule } from './prisma/index';
import { ProfessionalsModule } from './professionals/professionals.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    PatientsModule,
    ProfessionalsModule,
    AppointmentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}