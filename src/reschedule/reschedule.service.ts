import { Injectable } from '@nestjs/common';
import { CreateRescheduleDto } from './dto/create-reschedule.dto';
import { UpdateRescheduleDto } from './dto/update-reschedule.dto';
import { PrismaService } from '@/prisma';
import { AppointmentService } from '@/appointment/appointment.service';


@Injectable()
export class RescheduleService {
  constructor(
    private prisma: PrismaService,
    private appointment: AppointmentService,
  ) {}

  async create(createRescheduleDto: CreateRescheduleDto) {
    return 'This action adds a new reschedule';
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
    const appointmentExists = await this.appointment.getById(appointmentId);

    if (!appointmentExists) {
      throw new Error('Appointment not found');
    }

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

  async remove(id: string) {
    return this.prisma.appointmentRescheduleRequest.delete({
      where: { id },
    });
  }
}
