import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { AppointmentService } from './appointment.service';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import {
    AppointmentsApiTags,
    CancelAppointmentApiDocs,
    CreateAppointmentApiDocs,
    GetAllAppointmentsApiDocs,
    GetAppointmentByIdApiDocs,
    MarkAppointmentAsCompletedApiDocs,
    MarkAppointmentAsNoShowApiDocs,
    UpdateAppointmentApiDocs,
    UpdateAppointmentStatusApiDocs,
} from './swagger/index';

@AppointmentsApiTags()
@Controller('appointments')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Post()
  @CreateAppointmentApiDocs()
  create(@Body() dto: CreateAppointmentDto) {
    return this.appointmentService.create(dto);
  }

  @Get()
  @GetAllAppointmentsApiDocs()
  getAll(@Query('status') status?: AppointmentStatus) {
    return this.appointmentService.getAll(status);
  }

  // @Get('upcoming')
  // @GetUpcomingAppointmentsApiDocs()
  // getUpcoming(@CurrentUser() user: AuthUser) {
  //   return this.appointmentService.getUpcomingAppointments(user.id, user.role);
  // }

  // @Get('history')
  // @GetAppointmentHistoryApiDocs()
  // getHistory(
  //   @CurrentUser() user: AuthUser,
  //   @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  //   @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  // ) {
  //   return this.appointmentService.getAppointmentHistory(
  //     user.id,
  //     user.role,
  //     page,
  //     limit,
  //   );
  // }

  @Get(':id')
  @GetAppointmentByIdApiDocs()
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointmentService.getById(id);
  }

  @Patch(':id')
  @UpdateAppointmentApiDocs()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentService.update(id, dto);
  }

  @Patch(':id/status')
  @UpdateAppointmentStatusApiDocs()
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.appointmentService.updateAppointmentStatus(id, dto.status);
  }

  @Patch(':id/complete')
  @MarkAppointmentAsCompletedApiDocs()
  markAsCompleted(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointmentService.markAsCompleted(id);
  }

  @Patch(':id/no-show')
  @MarkAppointmentAsNoShowApiDocs()
  markAsNoShow(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointmentService.markAsNoShow(id);
  }

  @Patch(':id/cancel')
  @CancelAppointmentApiDocs()
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelAppointmentDto,
  ) {
    return this.appointmentService.cancelAppointment(id, dto);
  }
}