import { PartialType } from '@nestjs/mapped-types';
import { PickType } from '@nestjs/swagger';
import { CreateProfessionalProfileDto } from './create-professional-profile.dto';

export class UpdateProfessionalProfileDto extends PartialType(
  PickType(CreateProfessionalProfileDto, [
    'specialty',
    'availableForEmergency',
    'autoAbsenceMessage',
    'gapBetweenAppointmentsMinutes',
  ] as const),
) {}
