import { PrismaService } from '@/prisma/index';
import {
  BadRequestException,
  ConflictException,
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

  private parseBirthDate(birthDate?: string): Date | undefined {
    if (!birthDate) {
      return undefined;
    }

    const [year, month, day] = birthDate.split('-').map(Number);
    const parsedDate = new Date(`${birthDate}T00:00:00.000Z`);

    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.getUTCFullYear() !== year ||
      parsedDate.getUTCMonth() + 1 !== month ||
      parsedDate.getUTCDate() !== day
    ) {
      throw new BadRequestException(
        'A data de nascimento deve ser uma data válida no formato YYYY-MM-DD',
      );
    }

    return parsedDate;
  }

  private async validateCreateUserConflicts(dto: CreateUserDto): Promise<void> {
    const checks: Array<Promise<unknown>> = [
      this.prisma.user.findUnique({
        where: { email: dto.email },
        select: { id: true },
      }),
    ];

    if (dto.cpf) {
      checks.push(
        this.prisma.user.findUnique({
          where: { cpf: dto.cpf },
          select: { id: true },
        }),
      );
    }

    if (dto.professionalProfile?.crp) {
      checks.push(
        this.prisma.professionalProfile.findUnique({
          where: { crp: dto.professionalProfile.crp },
          select: { userId: true },
        }),
      );
    }

    const conflicts = await Promise.all(checks);

    if (conflicts.some(Boolean)) {
      throw new ConflictException('Usuário já cadastrado');
    }
  }

  async create(dto: CreateUserDto) {
    await this.validateCreateUserConflicts(dto);

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const birthDate = this.parseBirthDate(dto.birthDate);

    if (dto.role === Role.PATIENT) {
      return await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          passwordHash,
          role: Role.PATIENT,
          cpf: dto.cpf,
          phone: dto.phone,
          birthDate,
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
          birthDate,
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
        birthDate,
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

  async getAll(status?: UserStatus) {
    return this.prisma.user.findMany({
      where: {
        ...(status && { status }),
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
    const birthDate = this.parseBirthDate(dto.birthDate);

    return this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone,
        birthDate,
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
