import { PrismaService } from '@/prisma';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus, Prisma } from '@prisma/client';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async create(appointmentId: string, patientId: string, dto: CreateReviewDto) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) throw new NotFoundException('A consulta não existe');

    if (appointment.status !== AppointmentStatus.COMPLETED)
      throw new BadRequestException('A consulta deve estar concluída para ser avaliada');

    if (appointment.patientId !== patientId)
      throw new ForbiddenException('O paciente informado não corresponde ao paciente da consulta');

    return this.prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          appointmentId,
          patientId,
          professionalId: appointment.professionalId,
          rating: dto.rating,
          comment: dto.comment,
        },
      });

      await this.recalculateProfessionalScore(tx, appointment.professionalId, dto.rating);

      return review;
    });
  }

  private async recalculateProfessionalScore(
    tx: Prisma.TransactionClient,
    professionalId: string,
    rating: number,
  ) {
    const professional = await tx.professionalProfile.findUnique({
      where: { userId: professionalId },
      select: { scoreAvg: true, reviewCount: true },
    });

    if (!professional) {
      throw new NotFoundException('Perfil do profissional não encontrado');
    }

    const newReviewCount = professional.reviewCount + 1;
    const newScoreAvg =
      (Number(professional.scoreAvg) * professional.reviewCount + rating) / newReviewCount;

    await tx.professionalProfile.update({
      where: { userId: professionalId },
      data: {
        scoreAvg: newScoreAvg,
        reviewCount: newReviewCount,
      },
    });
  }

  async getReviewsByProfessional(professionalId: string, page: number, limit: number) {
    if (!professionalId) {
      throw new BadRequestException('O ID do profissional é obrigatório');
    }

    return this.prisma.review.findMany({
      where: {
        professionalId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });
  }
}
