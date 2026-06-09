import { Injectable } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { PrismaClientLike } from './repositories/panic-button-prisma.types';

@Injectable()
export class PanicButtonAppointmentsService {
  private readonly emergencyAppointmentDurationMinutes = Number(
    process.env.PANIC_APPOINTMENT_DURATION_MINUTES ?? 50,
  );

  createForEmergencyRequest(
    prisma: PrismaClientLike,
    data: {
      emergencyRequestId: string;
      patientId: string;
      professionalId: string;
    },
  ) {
    const startsAt = new Date();
    const endsAt = new Date(
      startsAt.getTime() + this.emergencyAppointmentDurationMinutes * 60 * 1000,
    );

    return prisma.appointment.create({
      data: {
        emergencyRequestId: data.emergencyRequestId,
        patientId: data.patientId,
        professionalId: data.professionalId,
        status: AppointmentStatus.SCHEDULED,
        startsAt,
        endsAt,
        priceCents: 0,
      },
    });
  }

  deleteByEmergencyRequestId(
    prisma: PrismaClientLike,
    emergencyRequestId: string,
  ) {
    return prisma.appointment.deleteMany({
      where: {
        emergencyRequestId,
      },
    });
  }
}
