import { ForbiddenException, Injectable } from '@nestjs/common';
import { CreateDiaryDto } from './dto/create-diary.dto';
import { UpdateDiaryDto } from './dto/update-diary.dto';
import { AppointmentStatus, DiaryFeeling, DiarySleepQuality } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class DiaryService {
  constructor(private prisma: PrismaService) {}

  create(patientId: string,createDiaryDto: CreateDiaryDto) {
    return this.prisma.diaryEntry.create({
      data: {
        patientId,
        feeling: createDiaryDto.feeling,
        sleepQuality: createDiaryDto.sleepQuality,
        symptom: createDiaryDto.symptom,
        content: createDiaryDto.content,
      },
    })
  }

  getAll() {
    return this.prisma.diaryEntry.findMany(
      {
        orderBy: {
          createdAt: 'desc',
        },
      }
    );
  }

  getDiaryById(id: string) {
    return this.prisma.diaryEntry.findUnique({
      where: {
        id,
      },
    });
  }

  getDiaryByUserId(userId: string, feeling?: DiaryFeeling, sleepQuality?: DiarySleepQuality, startDate?: string, endDate?: string) {
    return this.prisma.diaryEntry.findMany({
      where: {
        patientId: userId,
        ...(feeling && { feeling }),
        ...(sleepQuality && { sleepQuality }),
        ...((startDate || endDate) && {
          createdAt: {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate && { lte: new Date(endDate) }),
          },
        }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  update(patientId: string, diaryId: string, updateDiaryDto: UpdateDiaryDto) {
    return this.prisma.diaryEntry.update({
      where: {
        id: diaryId,
        patientId
      },
      data: { ...updateDiaryDto },
    });
  }

  updateSharingPreference(patientId: string, share: boolean) {
    return this.prisma.patientProfile.update({
      where: {
        userId: patientId
      },
      data: {
        shareDiaryWithProfessionals: share
      },
    });
  }

  remove(patientId: string, diaryId: string) {
    return this.prisma.diaryEntry.delete({
      where: {
        id: diaryId,
        patientId
      },
    });
  }

  async getSharedDiaryForProfessional(professionalId: string, patientId: string) {
  const patientProfile = await this.prisma.patientProfile.findUnique({
      where: { userId: patientId },
      select: { shareDiaryWithProfessionals: true },
    });

    if (!patientProfile?.shareDiaryWithProfessionals) {
      throw new ForbiddenException(
        'Este paciente optou por não compartilhar os registros do diário.',
      );
    }

    const hasAppointment = await this.prisma.appointment.findFirst({
      where: {
        patientId,
        professionalId,
        status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.COMPLETED] },
      },
      select: { id: true },
    });

    if (!hasAppointment) {
      throw new ForbiddenException(
        'Você não possui vínculo de consulta com este paciente.',
      );
    }

    return this.prisma.diaryEntry.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
