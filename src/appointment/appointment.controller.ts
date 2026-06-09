import { Roles } from '@/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AppointmentStatus, Role } from '@prisma/client';
import { AppointmentService } from './appointment.service';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import {
  AppointmentsApiTags,
  CancelAppointmentApiDocs,
  CanJoinAppointmentApiDocs,
  CreateAppointmentApiDocs,
  GetAllAppointmentsApiDocs,
  GetAppointmentByIdApiDocs,
  GetAppointmentsByDateApiDocs,
  GetAppointmentHistoryApiDocs,
  GetUpcomingAppointmentsApiDocs,
  MarkAppointmentAsCompletedApiDocs,
  MarkAppointmentAsNoShowApiDocs,
  UpdateAppointmentApiDocs,
  UpdateAppointmentStatusApiDocs,
} from './swagger/index';
import { GenerateCertificateApiDocs } from './swagger/generate-certificate.swagger';
import { CreateReviewDto } from '@/review/dto/create-review.dto';
import { ReviewService } from '@/review/review.service';
import { CreateReviewApiDocs } from '@/review/swagger';

type AuthenticatedRequest = {
  user: {
    id: string;
    role: Role;
  };
};

@AppointmentsApiTags()
@Controller('appointments')
export class AppointmentController {
  constructor(
    private readonly appointmentService: AppointmentService,
    private readonly reviewService: ReviewService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @CreateAppointmentApiDocs()
  create(@Body() dto: CreateAppointmentDto) {
    return this.appointmentService.create(dto);
  }

  @Post(':id/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT)
  @CreateReviewApiDocs()
  createReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateReviewDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reviewService.create(id, request.user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @GetAllAppointmentsApiDocs()
  getAll(@Query('status') status?: AppointmentStatus) {
    return this.appointmentService.getAll(status);
  }

  @Get('me/upcoming')
  @UseGuards(JwtAuthGuard)
  @GetUpcomingAppointmentsApiDocs()
  getUpcoming(
    @Req() request: AuthenticatedRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number
  ) {
    return this.appointmentService.getUpcomingAppointments(
      request.user.id,
      request.user.role,
      page,
      limit
    );
  }

  @Get('me/history')
  @UseGuards(JwtAuthGuard)
  @GetAppointmentHistoryApiDocs()
  getHistory(
    @Req() request: AuthenticatedRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.appointmentService.getAppointmentHistory(
      request.user.id,
      request.user.role,
      page,
      limit,
    );
  }

  @Get('me/date')
  @UseGuards(JwtAuthGuard)
  @GetAppointmentsByDateApiDocs()
  getByDate(
    @Req() request: AuthenticatedRequest,
    @Query('date') date: string,
  ) {
    return this.appointmentService.getAppointmentsByDate(
      request.user.id,
      request.user.role,
      date,
    );
  }

  @Get(':id/can-join')
  @UseGuards(JwtAuthGuard)
  @CanJoinAppointmentApiDocs()
  canJoin(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.appointmentService.canJoinAppointment(id, request.user.id);
  }

  @Get(':id/certificate')
  @UseGuards(JwtAuthGuard)
  @GenerateCertificateApiDocs()
  async downloadCertificate(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const buffer = await this.appointmentService.generateCertificate(
      id,
      request.user.id,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="comprovante-${id}.pdf"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @GetAppointmentByIdApiDocs()
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointmentService.getById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UpdateAppointmentApiDocs()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentService.update(id, dto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UpdateAppointmentStatusApiDocs()
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.appointmentService.updateAppointmentStatus(id, dto.status);
  }

  @Patch(':id/complete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROFESSIONAL, Role.ADMIN)
  @MarkAppointmentAsCompletedApiDocs()
  markAsCompleted(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointmentService.markAsCompleted(id);
  }

  @Patch(':id/no-show')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROFESSIONAL, Role.ADMIN)
  @MarkAppointmentAsNoShowApiDocs()
  markAsNoShow(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointmentService.markAsNoShow(id);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @CancelAppointmentApiDocs()
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelAppointmentDto,
  ) {
    return this.appointmentService.cancelAppointment(id, dto);
  }
}