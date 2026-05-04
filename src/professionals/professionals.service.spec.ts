import { Test, TestingModule } from '@nestjs/testing';
import { ProfessionalsService } from './professionals.service';
import { beforeEach, describe, expect, it } from '@jest/globals';

describe('ProfessionalsService', () => {
  let service: ProfessionalsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProfessionalsService],
    }).compile();

    service = module.get<ProfessionalsService>(ProfessionalsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
