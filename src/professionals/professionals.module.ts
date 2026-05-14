import { Module } from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';
import { AdminProfessionalsController } from './admin-professionals.controller';
import { ProfessionalsController } from './professionals.controller';

@Module({
  controllers: [ProfessionalsController, AdminProfessionalsController],
  providers: [ProfessionalsService],
})
export class ProfessionalsModule {}
