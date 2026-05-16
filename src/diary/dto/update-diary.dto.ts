// update-diary-entry.dto.ts
import { PartialType, PickType } from '@nestjs/mapped-types';
import { CreateDiaryDto } from './create-diary.dto';

export class UpdateDiaryDto extends PartialType(
    PickType(CreateDiaryDto, [
        'feeling',
        'sleepQuality',
        'symptom',
        'content'
    ] as const)
) {}