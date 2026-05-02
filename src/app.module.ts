import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/index';
import { UsersModule } from './app/users/users.module';
import { PatientsModule } from './app/patients/patients.module';

@Module({
  imports: [PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

@Module({
  imports: [
    UsersModule,
    PatientsModule,
  ],
})
export class AppModule {}