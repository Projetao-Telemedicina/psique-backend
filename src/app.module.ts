import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/index';
import { UsersModule } from './users/users.module';
import { PatientsModule } from './patients/patients.module';
import { ProfessionalsModule } from './professionals/professionals.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    PatientsModule,
    ProfessionalsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
