import { Controller, Get, Body, Patch, Param, ParseUUIDPipe } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto';

@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  // GET /patients/:userId/profile
  @Get(':userId/profile')
  getProfile(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.patientsService.getFullProfile(userId);
  }

  // PATCH /patients/:userId/profile
  @Patch(':userId/profile')
  update(
    @Param('userId', ParseUUIDPipe) userId: string, 
    @Body() updateDto: UpdatePatientProfileDto
  ) {
    return this.patientsService.updateProfile(userId, updateDto);
  }
}