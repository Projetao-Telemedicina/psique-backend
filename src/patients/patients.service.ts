import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/index';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  // Busca o perfil completo (Dados de User + Dados de Patient)
  async getFullProfile(userId: string) {
    const profile = await this.prisma.patientProfile.findUnique({
      where: { userId },
      include: { 
        user: {
          select: { 
           name: true, 
           email: true, 
           phone: true, 
           city: true,
          }
        } 
      },
    });

    if (!profile) throw new NotFoundException('Perfil do paciente não encontrado');
    return profile;
  }

  // Atualiza apenas os dados clínicos/perfil do paciente
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
