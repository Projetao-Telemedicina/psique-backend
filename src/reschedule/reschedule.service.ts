import { AppointmentService } from '@/appointment/appointment.service';
import { PrismaService } from '@/prisma';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AppointmentStatus, Role } from '@prisma/client';
import { CreateRescheduleDto } from './dto/create-reschedule.dto';
import { UpdateRescheduleDto } from './dto/update-reschedule.dto';


@Injectable()
export class RescheduleService {
  constructor(
    private prisma: PrismaService,
    private appointment: AppointmentService,
  ) {}

  async create(createRescheduleDto: CreateRescheduleDto) {
    const appointment = await this.appointment.getById(
      createRescheduleDto.appointmentId,
    );

    if (
      createRescheduleDto.requestedBy !== appointment.patientId &&
      createRescheduleDto.requestedBy !== appointment.professionalId
    ) {
      throw new ForbiddenException(
        'Apenas o paciente ou o profissional pode solicitar o reagendamento da consulta.',
      );
    }

    if (appointment.status !== AppointmentStatus.SCHEDULED) {
      throw new BadRequestException(
        'A consulta nao pode ser reagendada no status atual.',
      );
    }

    const hoursUntilAppointment =
      (appointment.startsAt.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursUntilAppointment < 8) {
      throw new BadRequestException(
        'O reagendamento so e permitido com 8 horas de antecedencia.',
      );
    }

    const newStartAt = new Date(createRescheduleDto.suggestedStartsAt);
    const newEndAt = new Date(createRescheduleDto.suggestedEndsAt);

    if (newEndAt <= newStartAt) {
      throw new BadRequestException(
        'A data e hora de termino deve ser posterior a data e hora de inicio sugerida.',
      );
    }

    const conflictAppointment = await this.prisma.appointment.findFirst({
      where: {
        id: { not: appointment.id },
        professionalId: appointment.professionalId,
        status: {
          in: [
            AppointmentStatus.SCHEDULED,
            AppointmentStatus.RESCHEDULE_REQUESTED,
          ],
        },
        startsAt: { lt: newEndAt },
        endsAt: { gt: newStartAt },
      },
    });

    if (conflictAppointment) {
      throw new ConflictException(
        'O profissional possui uma consulta no mesmo horario sugerido.',
      );
    }

    const isPatientRequester =
      createRescheduleDto.requestedBy === appointment.patientId;
    const isProfessionalRequester =
      createRescheduleDto.requestedBy === appointment.professionalId;

    const patientConfirmed =
      createRescheduleDto.patientConfirmed ??
      (isPatientRequester ? true : undefined);
    const professionalConfirmed =
      createRescheduleDto.professionalConfirmed ??
      (isProfessionalRequester ? true : undefined);

    const expiresAt = createRescheduleDto.expiresAt
      ? new Date(createRescheduleDto.expiresAt)
      : new Date(appointment.startsAt.getTime() - 1 * 60 * 60 * 1000);

    await this.appointment.updateAppointmentStatus(
      appointment.id,
      AppointmentStatus.RESCHEDULE_REQUESTED,
    );

    const rescheduleRequest = await this.prisma.appointmentRescheduleRequest.create({
      data: {
        appointmentId: createRescheduleDto.appointmentId,
        requestedBy: createRescheduleDto.requestedBy,
        suggestedStartsAt: newStartAt,
        suggestedEndsAt: newEndAt,
        patientConfirmed,
        professionalConfirmed,
        expiresAt,
      },
    });

    return rescheduleRequest;
  }

  async getAllRescheduleRequests() {
    return this.prisma.appointmentRescheduleRequest.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async getRescheduleRequestById(id: string) {
    return this.prisma.appointmentRescheduleRequest.findUnique({
      where: { id },
    });
  }

  async getRescheduleRequestsByAppointmentId(appointmentId: string) {
    await this.appointment.getById(appointmentId);

    return this.prisma.appointmentRescheduleRequest.findMany({
      where: { appointmentId },
    });
  }

  async getRescheduleRequestsByUserId(userId: string) {
    return this.prisma.appointmentRescheduleRequest.findMany({
      where: { requestedBy: userId },
    });
  }

  async update(id: string, updateRescheduleDto: UpdateRescheduleDto) {
    return this.prisma.appointmentRescheduleRequest.update({
      where: { id },
      data: updateRescheduleDto,
    });
  }

  async updateUserConfirmationReschedule(id: string, userRole: Role, confirmed: boolean) {
    const updateData =
      userRole === Role.PATIENT
        ? { patientConfirmed: confirmed }
        : { professionalConfirmed: confirmed };

    return this.prisma.appointmentRescheduleRequest.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    return this.prisma.appointmentRescheduleRequest.delete({
      where: { id },
    });
  }
}
