  import { AppointmentService } from '@/appointment/appointment.service';
  import { PrismaService } from '@/prisma';
  import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  import {
    AppointmentCanceledBy,
    AppointmentStatus,
    RescheduleRequestStatus,
    Role,
  } from '@prisma/client';
  import { Cron, CronExpression } from '@nestjs/schedule';
  import { CreateRescheduleDto } from './dto/create-reschedule.dto';
  import { UpdateRescheduleDto } from './dto/update-reschedule.dto';

  @Injectable()
  export class RescheduleService {
    constructor(
      private prisma: PrismaService,
      private appointment: AppointmentService,
    ) {}

    async create(createRescheduleDto: CreateRescheduleDto, requestedBy: string) {
      const appointment = await this.appointment.getById(createRescheduleDto.appointmentId);

      if (requestedBy !== appointment.patientId && requestedBy !== appointment.professionalId) {
        throw new ForbiddenException(
          'Apenas o paciente ou o profissional pode solicitar o reagendamento da consulta.',
        );
      }

      if (appointment.status !== AppointmentStatus.SCHEDULED) {
        throw new BadRequestException('A consulta nao pode ser reagendada no status atual.');
      }

      const hoursUntilAppointment =
        (appointment.startsAt.getTime() - Date.now()) / (1000 * 60 * 60);

      if (hoursUntilAppointment < 8) {
        throw new BadRequestException(
          'O reagendamento so e permitido com 8 horas de antecedencia.',
        );
      }

      const newStartsAt = new Date(createRescheduleDto.suggestedStartsAt);
      const newEndsAt = new Date(createRescheduleDto.suggestedEndsAt);

      if (newEndsAt <= newStartsAt) {
        throw new BadRequestException(
          'A data de termino deve ser posterior a data de inicio sugerida.',
        );
      }

      const conflictAppointment = await this.prisma.appointment.findFirst({
        where: {
          id: { not: appointment.id },
          professionalId: appointment.professionalId,
          status: {
            in: [AppointmentStatus.SCHEDULED, AppointmentStatus.RESCHEDULE_REQUESTED],
          },
          startsAt: { lt: newEndsAt },
          endsAt: { gt: newStartsAt },
        },
      });

      if (conflictAppointment) {
        throw new ConflictException('O profissional possui uma consulta no mesmo horario sugerido.');
      }

      const isPatient = requestedBy === appointment.patientId;

      const patientConfirmed = isPatient ? true : null;
      const professionalConfirmed = isPatient ? null : true;

      const expiresAt = createRescheduleDto.expiresAt
        ? new Date(createRescheduleDto.expiresAt)
        : new Date(appointment.startsAt.getTime() - 1 * 60 * 60 * 1000);

      await this.appointment.updateAppointmentStatus(
        appointment.id,
        AppointmentStatus.RESCHEDULE_REQUESTED,
      );

      return this.prisma.appointmentRescheduleRequest.create({
        data: {
          appointmentId: createRescheduleDto.appointmentId,
          requestedBy,
          status: RescheduleRequestStatus.PENDING,
          suggestedStartsAt: newStartsAt,
          suggestedEndsAt: newEndsAt,
          patientConfirmed,
          professionalConfirmed,
          expiresAt,
        },
      });
    }

    async getAllRescheduleRequests() {
      return this.prisma.appointmentRescheduleRequest.findMany({
        orderBy: { createdAt: 'asc' },
      });
    }

    async getRescheduleRequestById(id: string) {
      const request = await this.prisma.appointmentRescheduleRequest.findUnique({
        where: { id },
      });

      if (!request) {
        throw new NotFoundException('Solicitacao de reagendamento nao encontrada.');
      }

      return request;
    }

    async getRescheduleRequestsByAppointmentId(appointmentId: string) {
      await this.appointment.getById(appointmentId);

      return this.prisma.appointmentRescheduleRequest.findMany({
        where: { appointmentId },
        orderBy: { createdAt: 'asc' },
      });
    }

    async getRescheduleRequestsByUserId(userId: string) {
      return this.prisma.appointmentRescheduleRequest.findMany({
        where: {
          appointment: {
            OR: [
              { patientId: userId },
              { professionalId: userId },
            ],
          },
        },
        orderBy: { createdAt: 'asc' },
        include: {
          appointment: {
            select: {
              startsAt: true,
              endsAt: true,
              status: true,
            },
          },
        },
      });
    }

    async update(id: string, updateRescheduleDto: UpdateRescheduleDto) {
      await this.getRescheduleRequestById(id);

      const data: Record<string, unknown> = {};

      if (updateRescheduleDto.suggestedStartsAt) {
        data.suggestedStartsAt = new Date(updateRescheduleDto.suggestedStartsAt);
      }
      if (updateRescheduleDto.suggestedEndsAt) {
        data.suggestedEndsAt = new Date(updateRescheduleDto.suggestedEndsAt);
      }
      if (updateRescheduleDto.expiresAt) {
        data.expiresAt = new Date(updateRescheduleDto.expiresAt);
      }

      return this.prisma.appointmentRescheduleRequest.update({
        where: { id },
        data,
      });
    }

    async updateUserConfirmationReschedule(id: string, userRole: Role, confirmed: boolean) {
      const rescheduleRequest = await this.getRescheduleRequestById(id);

      if (rescheduleRequest.status !== RescheduleRequestStatus.PENDING) {
        throw new BadRequestException('Esta solicitacao de reagendamento nao esta mais pendente.');
      }

      if (rescheduleRequest.expiresAt && rescheduleRequest.expiresAt < new Date()) {
        throw new BadRequestException('Esta solicitacao de reagendamento ja expirou.');
      }

      const confirmationField =
        userRole === Role.PATIENT
          ? { patientConfirmed: confirmed }
          : { professionalConfirmed: confirmed };

      const updated = await this.prisma.appointmentRescheduleRequest.update({
        where: { id },
        data: confirmationField,
      });

      const bothConfirmed =
        updated.patientConfirmed === true && updated.professionalConfirmed === true;

      const someoneRejected =
        updated.patientConfirmed === false || updated.professionalConfirmed === false;

      if (bothConfirmed) {
        await this.prisma.$transaction([
          this.prisma.appointment.update({
            where: { id: updated.appointmentId },
            data: {
              startsAt: updated.suggestedStartsAt,
              endsAt: updated.suggestedEndsAt,
              status: AppointmentStatus.SCHEDULED,
            },
          }),
          this.prisma.appointmentRescheduleRequest.update({
            where: { id },
            data: { status: RescheduleRequestStatus.ACCEPTED },
          }),
        ]);

        return { message: 'Reagendamento confirmado com sucesso.' };
      }

      if (someoneRejected) {
        await this.prisma.$transaction([
          this.prisma.appointment.update({
            where: { id: updated.appointmentId },
            data: { status: AppointmentStatus.SCHEDULED },
          }),
          this.prisma.appointmentRescheduleRequest.update({
            where: { id },
            data: { status: RescheduleRequestStatus.REJECTED },
          }),
        ]);

        return { message: 'Reagendamento recusado. A consulta voltou ao horario original.' };
      }

      return updated;
    }

    @Cron(CronExpression.EVERY_5_MINUTES)
    async handleExpiredRescheduleRequests() {
      await this.expireRescheduleRequests();
    }

    async expireRescheduleRequests() {
      const expiredRequests = await this.prisma.appointmentRescheduleRequest.findMany({
        where: {
          status: RescheduleRequestStatus.PENDING,
          expiresAt: { lt: new Date() },
        },
      });

      for (const request of expiredRequests) {
        await this.prisma.$transaction([
          this.prisma.appointment.update({
            where: { id: request.appointmentId },
            data: {
              status: AppointmentStatus.CANCELED,
              canceledBy: AppointmentCanceledBy.SYSTEM,
              canceledAt: new Date(),
              cancellationReason:
                'Consulta cancelada automaticamente por falta de consenso no reagendamento.',
            },
          }),
          this.prisma.appointmentRescheduleRequest.update({
            where: { id: request.id },
            data: { status: RescheduleRequestStatus.EXPIRED },
          }),
        ]);
      }
    }

    async remove(id: string) {
      await this.getRescheduleRequestById(id);

      return this.prisma.appointmentRescheduleRequest.delete({
        where: { id },
      });
    }
  }