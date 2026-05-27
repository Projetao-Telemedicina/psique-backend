import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';

@Module({
  imports: [HttpModule],
  controllers: [MatchingController],
  providers: [MatchingService],
})
export class MatchingModule {}
