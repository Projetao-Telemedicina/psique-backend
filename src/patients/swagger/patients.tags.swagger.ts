import { applyDecorators } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

export function PatientsControllerApiTags(): ClassDecorator {
  return applyDecorators(ApiTags('Patients'));
}
