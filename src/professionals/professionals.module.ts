import { Module } from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';
import { AdminProfessionalsController } from './admin-professionals.controller';
import { ProfessionalsController } from './professionals.controller';
import { ReviewModule } from '@/review/review.module';

@Module({
  imports: [ReviewModule],
  controllers: [ProfessionalsController, AdminProfessionalsController],
  providers: [ProfessionalsService],
})
export class ProfessionalsModule {}
