import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);

      if (dto.role === 'PATIENT') {
        return await this.prisma.user.create({
          data: {
            name: dto.name,
            email: dto.email,
            passwordHash,
            role: dto.role,
            cpf: dto.cpf,
            phone: dto.phone,
            patientProfile: {
              create: dto.patientProfile || {},
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            patientProfile: true,
          },
        });
      }

      if (dto.role === 'PROFESSIONAL') {
        if (!dto.crp) {
          throw new BadRequestException('CRP é obrigatório');
        }

        return await this.prisma.user.create({
          data: {
            name: dto.name,
            email: dto.email,
            passwordHash,
            role: dto.role,
            professionalProfile: {
              create: {
                crp: dto.crp,
                specialty: dto.specialty,
              },
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            professionalProfile: true,
          },
        });
      }

      // ADMIN
      return await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          passwordHash,
          role: dto.role,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });
    }

  async findPatient(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        patientProfile: {
  	  select: {
            birthDate: true,
            emergencyContactName: true,
            emergencyContactPhone: true,
            shareDiaryWithProfessionals: true,
         }
       },
      },
    });

    if (!user || user.role !== 'PATIENT') {
      throw new NotFoundException('Paciente não encontrado');
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const userExists = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!userExists) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone,
        bio: dto.bio,
        city: dto.city,
        state: dto.state,
      },
    });
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.INACTIVE,
      },
    });
  }
}
