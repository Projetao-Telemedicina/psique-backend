import { PrismaService } from '@/prisma/index';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    if (dto.role === Role.PATIENT) {
      return await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          passwordHash,
          role: Role.PATIENT,
          cpf: dto.cpf,
          phone: dto.phone,
          birthDate: dto.birthDate as Date,
          gender: dto.gender,
          avatarUrl: dto.avatarUrl,
          cep: dto.cep,
          state: dto.state,
          city: dto.city,
          neighborhood: dto.neighborhood,
          street: dto.street,
          number: dto.number,
          complement: dto.complement,
          bio: dto.bio,
          patientProfile: {
            create: dto.patientProfile || {},
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          birthDate: true,
          patientProfile: true,
        },
      });
    }

    if (dto.role === Role.PROFESSIONAL) {
      if (!dto.professionalProfile || !dto.professionalProfile.crp) {
        throw new BadRequestException('CRP é obrigatório');
      }

      return await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          passwordHash,
          role: Role.PROFESSIONAL,
          cpf: dto.cpf,
          phone: dto.phone,
          birthDate: dto.birthDate as Date,
          gender: dto.gender,
          avatarUrl: dto.avatarUrl,
          cep: dto.cep,
          state: dto.state,
          city: dto.city,
          neighborhood: dto.neighborhood,
          street: dto.street,
          number: dto.number,
          complement: dto.complement,
          bio: dto.bio,
          professionalProfile: {
            create: {
              crp: dto.professionalProfile.crp,
              specialty: dto.professionalProfile.specialty,
              approvalStatus: dto.professionalProfile.approvalStatus,
              onlineStatus: dto.professionalProfile.onlineStatus,
              availableForEmergency: dto.professionalProfile.availableForEmergency,
              autoAbsenceMessage: dto.professionalProfile.autoAbsenceMessage,
              gapBetweenAppointmentsMinutes: dto.professionalProfile.gapBetweenAppointmentsMinutes,
            },
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          birthDate: true,
          professionalProfile: true,
        },
      });
    }

    return await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: Role.ADMIN,
        cpf: dto.cpf,
        phone: dto.phone,
        birthDate: dto.birthDate as Date,
        gender: dto.gender,
        avatarUrl: dto.avatarUrl,
        cep: dto.cep,
        state: dto.state,
        city: dto.city,
        neighborhood: dto.neighborhood,
        street: dto.street,
        number: dto.number,
        complement: dto.complement,
        bio: dto.bio,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        birthDate: true,
        },
    });
  }

  async getAll() {
    return this.prisma.user.findMany({
      omit: {
        passwordHash: true,
      }
    });
  }

  async getActiveUsers() {
    return this.prisma.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
      },
      omit: {
        passwordHash: true,
      }
    });
  }

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      omit: {
        passwordHash: true,
      }
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.getById(id);

    return this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone,
        birthDate: dto.birthDate as Date,
        gender: dto.gender,
        avatarUrl: dto.avatarUrl,
        bio: dto.bio,
        cep: dto.cep,
        state: dto.state,
        city: dto.city,
        neighborhood: dto.neighborhood,
        street: dto.street,
        number: dto.number,
        complement: dto.complement,
        ...(dto.patientProfile && {
          patientProfile: {
            upsert: {
              create: dto.patientProfile,
              update: dto.patientProfile,
            },
          },
        }),
        ...(dto.professionalProfile && {
          professionalProfile: {
            upsert: {
              create: dto.professionalProfile,
              update: dto.professionalProfile,
            },
          },
        }),
      },
      omit: { passwordHash: true },
    });
  }

  async remove(id: string) {
    await this.getById(id);

    return this.prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.INACTIVE,
      },
      omit: {
        passwordHash: true,
      },
    });
  }
}
