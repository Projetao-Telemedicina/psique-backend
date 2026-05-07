import { PrismaService } from '@/prisma/index';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  Injectable
} from '@nestjs/common';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentStatus, Prisma, Role } from '@prisma/client';

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

    const overlappingAppointment = await this.prisma.appointment.findFirst({
      where: {
        professionalId: createAppointmentDto.professionalId,
        status: AppointmentStatus.SCHEDULED,
        OR: [
          {
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
          },
        ],
      },
    });

    if (overlappingAppointment) {
      throw new ConflictException('O profissional já possui uma consulta agendada para este horário.');
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

  async getUserAppointments(
    userId: string,
    userRole: Role,
    options?: { onlyFuture?: boolean; status?: AppointmentStatus }
  ) {
    const isPatient = userRole === Role.PATIENT;

    const whereClause: Prisma.AppointmentWhereInput = {
      ...(isPatient ? { patientId: userId } : { professionalId: userId }),
    };

    if (options?.status) {
      whereClause.status = options.status;
    }

    if (options?.onlyFuture) {
      whereClause.startsAt = { gte: new Date() };
    }

    return this.prisma.appointment.findMany({
      where: whereClause,
      orderBy: {
        startsAt: 'asc',
      },
      include: {
        professional: isPatient ? {
          include: {
            user: { select: { name: true, avatarUrl: true } }
          }
        } : false,
        patient: !isPatient ? {
          include: {
            user: { select: { name: true, avatarUrl: true } }
          }
        } : false,
      }
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

  async remove(id: string) {
    await this.getById(id);

    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELED,
      },
    });
  }
}