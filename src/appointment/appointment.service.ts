import { PrismaService } from '@/prisma/index';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  Injectable
} from '@nestjs/common';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentCanceledBy, AppointmentStatus, Prisma, Role } from '@prisma/client';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';

@Injectable()
export class AppointmentService {
  constructor(private prisma: PrismaService) {}

  async create(createAppointmentDto: CreateAppointmentDto) {
    if (!createAppointmentDto.patientId) {
      throw new BadRequestException('O ID do paciente é obrigatório para agendar a consulta.');
    }

    const startsAt = new Date(createAppointmentDto.startsAt);
    const endsAt = new Date(createAppointmentDto.endsAt);

    if (endsAt <= startsAt) {
      throw new BadRequestException('A data de término deve ser posterior à data de início.');
    }

    const conflictAppointment = await this.prisma.appointment.findFirst({
      where: {
        professionalId: createAppointmentDto.professionalId,
        status: {
          in: [
            AppointmentStatus.SCHEDULED,
            AppointmentStatus.RESCHEDULE_REQUESTED
          ],
        },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });

    if (conflictAppointment) {
      throw new ConflictException('O profissional possui uma consulta no mesmo horário.');
    }

    const price = createAppointmentDto.priceCents ?? 0;

    if (price < 0) {
      throw new BadRequestException('O preço não pode ser negativo.');
    }

    return this.prisma.appointment.create({
      data: {
        professionalId: createAppointmentDto.professionalId,
        patientId: createAppointmentDto.patientId,
        startsAt,
        endsAt,
        priceCents: price,
      }
    });
  }

  async getAll(status?: AppointmentStatus) {
    return this.prisma.appointment.findMany({
      where: {
        ...(status && { status }),
      },
      orderBy: {
        startsAt: 'asc',
      },
    });
  }

  async getById(id: string) {
    const existsAppointment = await this.prisma.appointment.findUnique({
      where: { id },
    });

    if (!existsAppointment) {
      throw new NotFoundException('Consulta não encontrada.');
    }

    return existsAppointment;
  }

  async getUpcomingAppointments(userId: string, userRole: Role) {
    const isPatient = userRole === Role.PATIENT;

    return this.prisma.appointment.findMany({
      where: {
        ...(isPatient ? { patientId: userId } : { professionalId: userId }),
        startsAt: { gte: new Date() },
        status: {
          in: [AppointmentStatus.SCHEDULED, AppointmentStatus.RESCHEDULE_REQUESTED],
        },
      },
      orderBy: {
        startsAt: 'asc',
      },
      include: isPatient
        ? {
            professional: {
              include: {
                user: { select: { name: true, avatarUrl: true } },
              },
            },
          }
        : {
            patient: {
              include: {
                user: { select: { name: true, avatarUrl: true } },
              },
            },
          },
    });
  }

  async getAppointmentHistory(userId: string, userRole: Role, page: number, limit: number) {
    const isPatient = userRole === Role.PATIENT;

    return this.prisma.appointment.findMany({
      where: {
        ...(isPatient ? { patientId: userId } : { professionalId: userId }),
        status: {
          in: [
            AppointmentStatus.COMPLETED,
            AppointmentStatus.CANCELED,
            AppointmentStatus.NO_SHOW,
          ],
        },
      },
      orderBy: {
        startsAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
      include: isPatient
        ? {
            professional: {
              include: {
                user: { select: { name: true, avatarUrl: true } },
              },
            },
          }
        : {
            patient: {
              include: {
                user: { select: { name: true, avatarUrl: true } },
              },
            },
          },
    });
  }

  async update(id: string, updateAppointmentDto: UpdateAppointmentDto) {
    await this.getById(id);

    const dataToUpdate: Prisma.AppointmentUpdateInput = {};

    if (updateAppointmentDto.startsAt) {
      dataToUpdate.startsAt = new Date(updateAppointmentDto.startsAt);
    }
    if (updateAppointmentDto.endsAt) {
      dataToUpdate.endsAt = new Date(updateAppointmentDto.endsAt);
    }
    if (updateAppointmentDto.priceCents !== undefined) {
      dataToUpdate.priceCents = updateAppointmentDto.priceCents;
    }

    return this.prisma.appointment.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async updateAppointmentStatus(id: string, status: AppointmentStatus) {
    await this.getById(id);

    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: status,
      },
    });
  }

  async markAsCompleted(id: string) {
    const appointment = await this.getById(id);

    if (appointment.status !== AppointmentStatus.SCHEDULED) {
      throw new BadRequestException('Apenas consultas agendadas podem ser marcadas como concluídas.');
    }

    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }

  async markAsNoShow(id: string) {
    const appointment = await this.getById(id);

    if (appointment.status !== AppointmentStatus.SCHEDULED) {
      throw new BadRequestException('Apenas consultas agendadas podem ser marcadas como ausência.');
    }

    if (appointment.endsAt > new Date()) {
      throw new BadRequestException('A consulta ainda não terminou.');
    }

    return this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.NO_SHOW },
    });
  }

  async applyReschedule(id: string, newStartsAt: Date, newEndsAt: Date) {
  const appointment = await this.getById(id);

  if (appointment.status !== AppointmentStatus.RESCHEDULE_REQUESTED) {
    throw new BadRequestException('Esta consulta não está em processo de reagendamento.');
  }

  const conflictTimeReschedule = await this.prisma.appointment.findFirst({
    where: {
      id: { not: id },
      professionalId: appointment.professionalId,
      status: {
        in: [AppointmentStatus.SCHEDULED, AppointmentStatus.RESCHEDULE_REQUESTED],
      },
      startsAt: { lt: newEndsAt },
      endsAt: { gt: newStartsAt },
    },
  });

  if (conflictTimeReschedule) {
    throw new ConflictException('O profissional já possui uma consulta neste novo horário.');
  }

  return this.prisma.appointment.update({
    where: { id },
    data: {
      startsAt: newStartsAt,
      endsAt: newEndsAt,
      status: AppointmentStatus.SCHEDULED,
    },
  });
}

  async cancelAppointment(id: string, cancelAppointmentDto: CancelAppointmentDto) {
    const appointment = await this.getById(id);

    if (
      appointment.status === AppointmentStatus.COMPLETED ||
      appointment.status === AppointmentStatus.CANCELED
    ) {
      throw new BadRequestException(
        'Esta consulta não pode ser cancelada pois já foi finalizada ou cancelada.',
      );
    }

    if (cancelAppointmentDto.canceledBy === AppointmentCanceledBy.PATIENT) {
      const hoursUntilAppointment =
        (appointment.startsAt.getTime() - Date.now()) / (1000 * 60 * 60);

      if (hoursUntilAppointment < 24) {
        throw new BadRequestException(
          'Cancelamentos com menos de 24 horas de antecedência estão sujeitos à política de taxas. Consulte os termos antes de prosseguir.',
        );
      }
    }

    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELED,
        canceledBy: cancelAppointmentDto.canceledBy,
        cancellationReason: cancelAppointmentDto.cancellationReason,
        canceledAt: new Date(),
      },
    });
  }
}