import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/index';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async getPatientProfile(userId: string) {
    const profile = await this.prisma.patientProfile.findUnique({
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

    if (!profile) throw new NotFoundException('Perfil do paciente não encontrado');
    return profile;
  }

  async updateProfile(userId: string, dto: UpdatePatientProfileDto) {
    const exists = await this.prisma.patientProfile.findUnique({
      where: { userId },
    });

    if (!exists) {
      throw new NotFoundException('Perfil do paciente não encontrado');
    }

    return this.prisma.patientProfile.update({
      where: { userId },
      data: dto,
    });
  }
}
