import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '@/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { RescheduleService } from './reschedule.service';
import { CreateRescheduleDto } from './dto/create-reschedule.dto';
import { UpdateRescheduleDto } from './dto/update-reschedule.dto';
import { ConfirmRescheduleDto } from './dto/confirm-reschedule.dto';
import {
  RescheduleApiTags,
  CreateRescheduleApiDocs,
  GetAllRescheduleRequestsApiDocs,
  GetRescheduleRequestByIdApiDocs,
  GetRescheduleRequestsByAppointmentIdApiDocs,
  GetMyRescheduleRequestsApiDocs,
  UpdateRescheduleRequestApiDocs,
  ConfirmRescheduleRequestApiDocs,
  ExpireRescheduleRequestsApiDocs,
  RemoveRescheduleRequestApiDocs,
} from './swagger/index';

type AuthenticatedRequest = {
  user: {
    id: string;
    role: Role;
  };
};

@RescheduleApiTags()
@Controller('reschedules')
export class RescheduleController {
  constructor(private readonly rescheduleService: RescheduleService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @CreateRescheduleApiDocs()
  create(
    @Body() dto: CreateRescheduleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.rescheduleService.create(dto, req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @GetAllRescheduleRequestsApiDocs()
  getAll() {
    return this.rescheduleService.getAllRescheduleRequests();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @GetMyRescheduleRequestsApiDocs()
  getMyRequests(@Req() req: AuthenticatedRequest) {
    return this.rescheduleService.getRescheduleRequestsByUserId(req.user.id);
  }

  @Get('appointment/:appointmentId')
  @UseGuards(JwtAuthGuard)
  @GetRescheduleRequestsByAppointmentIdApiDocs()
  getByAppointmentId(
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
  ) {
    return this.rescheduleService.getRescheduleRequestsByAppointmentId(appointmentId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @GetRescheduleRequestByIdApiDocs()
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.rescheduleService.getRescheduleRequestById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UpdateRescheduleRequestApiDocs()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRescheduleDto,
  ) {
    return this.rescheduleService.update(id, dto);
  }

  @Patch(':id/confirm')
  @UseGuards(JwtAuthGuard)
  @ConfirmRescheduleRequestApiDocs()
  confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmRescheduleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.rescheduleService.updateUserConfirmationReschedule(
      id,
      req.user.role,
      dto.confirmed,
    );
  }

  @Post('expire')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ExpireRescheduleRequestsApiDocs()
  expireRequests() {
    return this.rescheduleService.expireRescheduleRequests();
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @RemoveRescheduleRequestApiDocs()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.rescheduleService.remove(id);
  }
}