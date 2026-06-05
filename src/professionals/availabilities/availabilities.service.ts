import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/index';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';

@Injectable()
export class AvailabilitiesService {
  constructor(private prisma: PrismaService) {}

  async create(professionalId: string, dto: CreateAvailabilityDto) {
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('O horário inicial deve ser menor que o horário final');
    }

    await this.ensureProfessionalExists(professionalId);
    await this.checkOverlap(professionalId, dto.weekday, dto.startTime, dto.endTime);

    return this.prisma.professionalAvailability.create({
      data: {
        professionalId,
        weekday: dto.weekday,
        startTime: dto.startTime,
        endTime: dto.endTime,
        recurrence: dto.recurrence,
        slotDurationMinutes: dto.slotDurationMinutes,
      },
    });
  }

  async findAllOwn(professionalId: string) {
    return this.prisma.professionalAvailability.findMany({
      where: { professionalId, isActive: true },
      orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
    });
  }

  async findByProfessional(professionalId: string) {
    return this.prisma.professionalAvailability.findMany({
      where: { professionalId, isActive: true },
      orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
    });
  }

  async update(professionalId: string, availabilityId: string, dto: UpdateAvailabilityDto) {
    const slot = await this.findOwnSlotOrThrow(professionalId, availabilityId);

    const newStartTime = dto.startTime ?? slot.startTime;
    const newEndTime = dto.endTime ?? slot.endTime;

    if (newStartTime >= newEndTime) {
      throw new BadRequestException('O horário inicial deve ser menor que o horário final');
    }

    await this.checkOverlap(professionalId, slot.weekday, newStartTime, newEndTime, availabilityId);

    return this.prisma.professionalAvailability.update({
      where: { id: availabilityId },
      data: {
        startTime: dto.startTime,
        endTime: dto.endTime,
        slotDurationMinutes: dto.slotDurationMinutes,
        recurrence: dto.recurrence,
      },
    });
  }

  async remove(professionalId: string, availabilityId: string) {
    const slot = await this.findOwnSlotOrThrow(professionalId, availabilityId);

    await this.checkAppointmentConflict(professionalId, slot.weekday, slot.startTime, slot.endTime);

    return this.prisma.professionalAvailability.update({
      where: { id: availabilityId },
      data: { isActive: false },
    });
  }

  async getAvailableSlots(professionalId: string, date: string) {
    const targetDate = new Date(date);

    if (isNaN(targetDate.getTime())) {
      throw new BadRequestException('Data inválida. Use o formato YYYY-MM-DD');
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (targetDate < today) {
      throw new BadRequestException('Não é possível consultar horários em datas passadas');
    }

    const weekday = targetDate.getUTCDay();

    const [availabilities, profile] = await Promise.all([
      this.prisma.professionalAvailability.findMany({
        where: { professionalId, weekday, isActive: true },
      }),
      this.prisma.professionalProfile.findUnique({
        where: { userId: professionalId },
        select: { gapBetweenAppointmentsMinutes: true },
      }),
    ]);

    if (!profile) {
      throw new NotFoundException('Profissional não encontrado');
    }

    if (availabilities.length === 0) return [];

    const dayStart = new Date(targetDate);
    dayStart.setUTCHours(0, 0, 0, 0);

    const dayEnd = new Date(targetDate);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const existingAppointments = await this.prisma.appointment.findMany({
      where: {
        professionalId,
        status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.RESCHEDULE_REQUESTED] },
        startsAt: { gte: dayStart },
        endsAt: { lte: dayEnd },
      },
      select: { startsAt: true, endsAt: true },
    });

    const slots: Array<{ startsAt: Date; endsAt: Date }> = [];

    for (const availability of availabilities) {
      const [startHour, startMin] = availability.startTime.split(':').map(Number);
      const [endHour, endMin] = availability.endTime.split(':').map(Number);

      const rangeStart = startHour * 60 + startMin;
      const rangeEnd = endHour * 60 + endMin;
      const { slotDurationMinutes: duration } = availability;
      const gap = profile.gapBetweenAppointmentsMinutes;

      let cursor = rangeStart;

      while (cursor + duration <= rangeEnd) {
        const slotStartAt = new Date(targetDate);
        slotStartAt.setUTCHours(Math.floor(cursor / 60), cursor % 60, 0, 0);

        const slotEndAt = new Date(targetDate);
        slotEndAt.setUTCHours(Math.floor((cursor + duration) / 60), (cursor + duration) % 60, 0, 0);

        const isOccupied = existingAppointments.some(
          (appt) => slotStartAt < appt.endsAt && slotEndAt > appt.startsAt,
        );

        if (!isOccupied) {
          slots.push({ startsAt: slotStartAt, endsAt: slotEndAt });
        }

        cursor += duration + gap;
      }
    }

    return slots;
  }

  private async ensureProfessionalExists(professionalId: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId: professionalId },
      select: { userId: true },
    });

    if (!profile) {
      throw new NotFoundException('Perfil do profissional não encontrado');
    }
  }

  private async findOwnSlotOrThrow(professionalId: string, availabilityId: string) {
    const slot = await this.prisma.professionalAvailability.findUnique({
      where: { id: availabilityId },
    });

    if (!slot) {
      throw new NotFoundException('Disponibilidade não encontrada');
    }

    if (slot.professionalId !== professionalId) {
      throw new ForbiddenException('Você não tem permissão para gerenciar esta disponibilidade');
    }

    return slot;
  }

  private async checkOverlap(
    professionalId: string,
    weekday: number,
    startTime: string,
    endTime: string,
    excludeId?: string,
  ) {
    const existing = await this.prisma.professionalAvailability.findMany({
      where: {
        professionalId,
        weekday,
        isActive: true,
        ...(excludeId && { NOT: { id: excludeId } }),
      },
    });

    const hasOverlap = existing.some(
      (slot) => startTime < slot.endTime && endTime > slot.startTime,
    );

    if (hasOverlap) {
      throw new ConflictException('Já existe uma disponibilidade que se sobrepõe a este intervalo');
    }
  }

  private async checkAppointmentConflict(
    professionalId: string,
    weekday: number,
    startTime: string,
    endTime: string,
  ) {
    const futureAppointments = await this.prisma.appointment.findMany({
      where: {
        professionalId,
        status: AppointmentStatus.SCHEDULED,
        startsAt: { gte: new Date() },
      },
      select: { startsAt: true, endsAt: true },
    });

    const hasConflict = futureAppointments.some((appt) => {
      if (appt.startsAt.getUTCDay() !== weekday) return false;

      const apptStart = appt.startsAt.toISOString().slice(11, 16);
      const apptEnd = appt.endsAt.toISOString().slice(11, 16);

      return apptStart < endTime && apptEnd > startTime;
    });

    if (hasConflict) {
      throw new ConflictException(
        'Existem consultas agendadas neste horário. Cancele-as antes de remover a disponibilidade.',
      );
    }
  }
}