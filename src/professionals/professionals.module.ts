import { Module } from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';
import { AdminProfessionalsController } from './admin-professionals.controller';
import { ProfessionalsController } from './professionals.controller';
import { ReviewModule } from '@/review/review.module';
import { AvailabilitiesModule } from './availabilities/availabilities.module';

@Module({
  imports: [ReviewModule, AvailabilitiesModule],
  controllers: [ProfessionalsController, AdminProfessionalsController],
  providers: [ProfessionalsService],
})
export class ProfessionalsModule {}
