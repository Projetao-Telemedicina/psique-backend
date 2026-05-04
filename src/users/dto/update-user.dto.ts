import { PartialType, PickType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(
  PickType(CreateUserDto, [
    'name',
    'phone',
    'birthDate',
    'gender',
    'avatarUrl',
    'bio',
    'cep',
    'state',
    'city',
    'neighborhood',
    'street',
    'number',
    'complement',
    'patientProfile',
    'professionalProfile',
  ] as const),
) {}