import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateProfessionalProfileDto } from './dto/update-professional-profile.dto';
import { PrismaService } from '@/prisma/index';
import { OnlineStatus } from '@prisma/client';

@Injectable()
export class ProfessionalsService {
  constructor(private prisma: PrismaService) {}

  async getProfessionalProfile(userId: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            name: true,
            cpf: true,
            email: true,
            birthDate: true,
            gender: true,
            role: true,
            status: true,
            phone: true,
            bio: true,
            avatarUrl: true,
            cep: true,
            state: true,
            city: true,
            neighborhood: true,
            street: true,
            number: true,
            complement: true,
          }
        }
      },
    });

    if (!profile) throw new NotFoundException('Perfil do profissional não encontrado');
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateProfessionalProfileDto) {
    const exists = await this.prisma.professionalProfile.findUnique({
      where: { userId },
    });

    if (!exists) {
      throw new NotFoundException('Perfil do profissional não encontrado');
    }

    return this.prisma.professionalProfile.update({
      where: { userId },
      data: dto,
    });
  }

  async updateOnlineMode(userId: string, onlineMode: OnlineStatus) {
    const exists = await this.prisma.professionalProfile.findUnique({
      where: { userId },
    });

    if (!exists) {
      throw new NotFoundException('Perfil do profissional não encontrado');
    }

    return this.prisma.professionalProfile.update({
      where: { userId },
      data: {
        onlineStatus: onlineMode,
      },
    });
  }
}
