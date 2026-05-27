import { PrismaService } from '@/prisma';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
      const existingReview = await tx.review.findUnique({
        where: {
          appointmentId,
        },
      });

      if (existingReview) {
        throw new ConflictException('Esta consulta já foi avaliada.');
      }

      const review = await tx.review.create({
        data: {
          appointmentId,
          patientId,
          professionalId: appointment.professionalId,
          rating: dto.rating,
          comment: dto.comment,
        },
      });

      await this.recalculateProfessionalScore(tx, appointment.professionalId);

      return review;
    });
  }

  private async recalculateProfessionalScore(
    tx: Prisma.TransactionClient,
    professionalId: string,
  ) {
    const professional = await tx.professionalProfile.findUnique({
      where: { userId: professionalId },
      select: { userId: true },
    });

    if (!professional) {
      throw new NotFoundException('Perfil do profissional não encontrado');
    }

    const { _avg, _count } = await tx.review.aggregate({
      where: { professionalId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await tx.professionalProfile.update({
      where: { userId: professionalId },
      data: {
        scoreAvg: _avg.rating ?? 0,
        reviewCount: _count.rating,
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
      include: {
        patient: {
          select: {
            user: {
              select: {
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }
}
