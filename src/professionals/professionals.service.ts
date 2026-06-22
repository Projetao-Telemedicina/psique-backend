import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PromotionsService } from '@/payments/promotions.service';
import { UpdateProfessionalProfileDto } from './dto/update-professional-profile.dto';
import { PrismaService } from '@/prisma/index';
import {
  OnlineStatus,
  ProfessionalApprovalStatus,
  Prisma,
  ProfessionalRequestStatus,
  UserStatus,
} from '@prisma/client';
import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { RejectProfessionalValidationDto } from './dto/reject-professional-validation.dto';
import { ListProfessionalValidationRequestsDto } from './dto/list-professional-validation-requests.dto';
import { EMERGENCY_EVENTS } from '@/emergency/constants/panic-button.constants';

type StoredValidationFile = {
  fileName: string;
  mimeType: string;
  buffer: Uint8Array;
  sizeBytes: number;
};

type UploadedValidationDocument = {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname: string;
};

@Injectable()
export class ProfessionalsService {
  private readonly maxValidationDocumentSizeBytes = 5 * 1024 * 1024;

  constructor(
    private prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly promotionsService: PromotionsService,
  ) {}

  async getProfessionalProfile(userId: string) {
    await this.promotionsService.syncExpiredPromotions();

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

  async getProfessionalsByScoreAvg(page: number, limit: number) {
    await this.promotionsService.syncExpiredPromotions();

    const skip = (page - 1) * limit;

    const professionals = await this.prisma.professionalProfile.findMany({
      where: {
        approvalStatus: ProfessionalApprovalStatus.APPROVED,
      },
      orderBy: [
        { isPromoted: 'desc' },
        { scoreAvg: 'desc' },
        { reviewCount: 'desc' },
      ],
      skip,
      take: limit,
      select: {
        userId: true,
        scoreAvg: true,
        reviewCount: true,
        isPromoted: true,
        promotionEndsAt: true,
        specialty: true,
        onlineStatus: true,
        user: {
          select: {
            name: true,
            avatarUrl: true,
            status: true,
          },
        },
      },
    });

    return professionals;
  }

  async updateProfile(userId: string, dto: UpdateProfessionalProfileDto) {
    const exists = await this.prisma.professionalProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!exists) {
      throw new NotFoundException('Perfil do profissional não encontrado');
    }

    const updatedProfile = await this.prisma.professionalProfile.update({
      where: { userId },
      data: dto,
    });

    this.emitPsychologistAvailableIfEligible({
      userId,
      onlineStatus: updatedProfile.onlineStatus,
      availableForEmergency: updatedProfile.availableForEmergency,
      approvalStatus: updatedProfile.approvalStatus,
      userStatus: exists.user.status,
      activeEmergencyOfferId: updatedProfile.activeEmergencyOfferId,
    });

    return updatedProfile;
  }

  async updateOnlineMode(userId: string, onlineMode: OnlineStatus) {
    const exists = await this.prisma.professionalProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!exists) {
      throw new NotFoundException('Perfil do profissional não encontrado');
    }

    const updatedProfile = await this.prisma.professionalProfile.update({
      where: { userId },
      data: {
        onlineStatus: onlineMode,
      },
    });

    this.emitPsychologistAvailableIfEligible({
      userId,
      onlineStatus: updatedProfile.onlineStatus,
      availableForEmergency: updatedProfile.availableForEmergency,
      approvalStatus: updatedProfile.approvalStatus,
      userStatus: exists.user.status,
      activeEmergencyOfferId: updatedProfile.activeEmergencyOfferId,
    });

    return updatedProfile;
  }

  async submitValidationRequest(
    userId: string,
    document: UploadedValidationDocument,
  ) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
          },
        },
        requests: {
          where: {
            status: ProfessionalRequestStatus.PENDING,
          },
          select: {
            id: true,
          },
          take: 1,
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Perfil do profissional nao encontrado');
    }

    if (profile.approvalStatus === ProfessionalApprovalStatus.APPROVED) {
      throw new ConflictException('Profissional ja validado');
    }

    if (profile.requests.length > 0) {
      throw new ConflictException('Ja existe uma solicitacao de validacao pendente');
    }

    const storedFile = this.validateValidationDocument(document);
    const requestId = randomUUID();
    const createdRequest = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          status: UserStatus.INACTIVE,
        },
      });

      await tx.professionalProfile.update({
        where: { userId },
        data: {
          approvalStatus: ProfessionalApprovalStatus.PENDING,
        },
      });

      return tx.professionalRequest.create({
        data: {
          id: requestId,
          professionalId: userId,
          status: ProfessionalRequestStatus.PENDING,
          documents: {
            create: {
              fileName: storedFile.fileName,
              mimeType: storedFile.mimeType,
              sizeBytes: storedFile.sizeBytes,
              fileData: storedFile.buffer as Uint8Array<ArrayBuffer>,
              documentType: 'RG',
            },
          },
        },
        select: {
          id: true,
          professionalId: true,
          status: true,
          rejectionReason: true,
          submittedAt: true,
          reviewedAt: true,
          reviewedBy: true,
        },
      });
    });

    return {
      ...createdRequest,
      userStatus: UserStatus.INACTIVE,
      approvalStatus: ProfessionalApprovalStatus.PENDING,
    };
  }

  async getOwnLatestValidationRequest(userId: string) {
    await this.ensureProfessionalProfileExists(userId);

    const latestRequest = await this.prisma.professionalRequest.findFirst({
      where: { professionalId: userId },
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true,
        professionalId: true,
        status: true,
        rejectionReason: true,
        submittedAt: true,
        reviewedAt: true,
        reviewedBy: true,
      },
    });

    if (!latestRequest) {
      throw new NotFoundException('Nenhuma solicitacao de validacao encontrada');
    }

    return latestRequest;
  }

  async listOwnValidationRequests(userId: string) {
    await this.ensureProfessionalProfileExists(userId);

    return this.prisma.professionalRequest.findMany({
      where: {
        professionalId: userId,
      },
      orderBy: {
        submittedAt: 'desc',
      },
      select: {
        id: true,
        professionalId: true,
        status: true,
        rejectionReason: true,
        submittedAt: true,
        reviewedAt: true,
        reviewedBy: true,
      },
    });
  }

  async listValidationRequests(filters: ListProfessionalValidationRequestsDto) {
    const where: Prisma.ProfessionalRequestWhereInput = {
      ...(filters.requestId && {
        id: filters.requestId,
      }),
      ...(filters.professionalId && {
        professionalId: filters.professionalId,
      }),
      ...(filters.status && {
        status: filters.status,
      }),
      ...((filters.submittedFrom || filters.submittedTo) && {
        submittedAt: {
          ...(filters.submittedFrom && {
            gte: new Date(filters.submittedFrom),
          }),
          ...(filters.submittedTo && {
            lte: new Date(filters.submittedTo),
          }),
        },
      }),
      ...((filters.professionalName?.length ?? 0) > 0 && {
        professional: {
          user: {
            name: {
              contains: filters.professionalName,
              mode: 'insensitive',
            },
          },
        },
      }),
    };

    return this.prisma.professionalRequest.findMany({
      where,
      orderBy: {
        submittedAt: 'desc',
      },
      select: {
        id: true,
        professionalId: true,
        status: true,
        rejectionReason: true,
        submittedAt: true,
        reviewedAt: true,
        reviewedBy: true,
        professional: {
          select: {
            crp: true,
            user: {
              select: {
                name: true,
                email: true,
                status: true,
              },
            },
          },
        },
      },
    });
  }

  async approveValidationRequest(requestId: string, reviewerId: string) {
    const request = await this.getPendingValidationRequestOrThrow(requestId);

    return this.prisma.$transaction(async (tx) => {
      const reviewedAt = new Date();

      const updatedRequest = await tx.professionalRequest.update({
        where: { id: requestId },
        data: {
          status: ProfessionalRequestStatus.APPROVED,
          rejectionReason: null,
          reviewedAt,
          reviewedBy: reviewerId,
        },
        select: {
          id: true,
          professionalId: true,
          status: true,
          rejectionReason: true,
          submittedAt: true,
          reviewedAt: true,
          reviewedBy: true,
        },
      });

      await tx.professionalProfile.update({
        where: { userId: request.professionalId },
        data: {
          approvalStatus: ProfessionalApprovalStatus.APPROVED,
        },
      });

      await tx.user.update({
        where: { id: request.professionalId },
        data: {
          status: UserStatus.ACTIVE,
        },
      });

      return {
        ...updatedRequest,
        userStatus: UserStatus.ACTIVE,
        approvalStatus: ProfessionalApprovalStatus.APPROVED,
      };
    });
  }

  async rejectValidationRequest(
    requestId: string,
    reviewerId: string,
    dto: RejectProfessionalValidationDto,
  ) {
    const request = await this.getPendingValidationRequestOrThrow(requestId);

    return this.prisma.$transaction(async (tx) => {
      const reviewedAt = new Date();

      const updatedRequest = await tx.professionalRequest.update({
        where: { id: requestId },
        data: {
          status: ProfessionalRequestStatus.REJECTED,
          rejectionReason: dto.rejectionReason,
          reviewedAt,
          reviewedBy: reviewerId,
        },
        select: {
          id: true,
          professionalId: true,
          status: true,
          rejectionReason: true,
          submittedAt: true,
          reviewedAt: true,
          reviewedBy: true,
        },
      });

      await tx.professionalProfile.update({
        where: { userId: request.professionalId },
        data: {
          approvalStatus: ProfessionalApprovalStatus.REJECTED,
          onlineStatus: OnlineStatus.OFFLINE,
        },
      });

      await tx.user.update({
        where: { id: request.professionalId },
        data: {
          status: UserStatus.INACTIVE,
        },
      });

      return {
        ...updatedRequest,
        userStatus: UserStatus.INACTIVE,
        approvalStatus: ProfessionalApprovalStatus.REJECTED,
      };
    });
  }

  private async ensureProfessionalProfileExists(userId: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
      select: { userId: true },
    });

    if (!profile) {
      throw new NotFoundException('Perfil do profissional nao encontrado');
    }
  }

  private async getPendingValidationRequestOrThrow(requestId: string) {
    const request = await this.prisma.professionalRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        professionalId: true,
        status: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Solicitacao de validacao nao encontrada');
    }

    if (request.status !== ProfessionalRequestStatus.PENDING) {
      throw new ConflictException('A solicitacao de validacao nao esta pendente');
    }

    return request;
  }

  private validateValidationDocument(
    document: UploadedValidationDocument,
  ): StoredValidationFile {
    const arrayBuffer = new ArrayBuffer(document.buffer.byteLength);
    const normalizedBuffer = new Uint8Array(arrayBuffer);

    normalizedBuffer.set(document.buffer);

    if (!document?.buffer?.length) {
      throw new BadRequestException('O documento RG e obrigatorio');
    }

    if (document.size > this.maxValidationDocumentSizeBytes) {
      throw new BadRequestException('O documento excede o limite de 5 MB');
    }

    const extension = extname(document.originalname ?? '').toLowerCase();
    const supportedDocuments: Record<string, StoredValidationFile> = {
      '.pdf': {
        fileName: 'rg.pdf',
        mimeType: 'application/pdf',
        buffer: normalizedBuffer,
        sizeBytes: document.size,
      },
      '.jpg': {
        fileName: 'rg.jpg',
        mimeType: 'image/jpeg',
        buffer: normalizedBuffer,
        sizeBytes: document.size,
      },
      '.jpeg': {
        fileName: 'rg.jpg',
        mimeType: 'image/jpeg',
        buffer: normalizedBuffer,
        sizeBytes: document.size,
      },
      '.png': {
        fileName: 'rg.png',
        mimeType: 'image/png',
        buffer: normalizedBuffer,
        sizeBytes: document.size,
      },
    };

    const expectedDocument = supportedDocuments[extension];

    if (!expectedDocument) {
      throw new BadRequestException(
        'Formato de documento invalido. Envie PDF, JPG ou PNG',
      );
    }

    if (document.mimetype !== expectedDocument.mimeType) {
      throw new BadRequestException('O tipo do arquivo nao corresponde a extensao enviada');
    }

    const signatureByExtension: Record<string, (buffer: Buffer) => boolean> = {
      '.pdf': (buffer) => buffer.subarray(0, 4).equals(Buffer.from('%PDF')),
      '.jpg': (buffer) =>
        buffer.length >= 4 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff,
      '.jpeg': (buffer) =>
        buffer.length >= 4 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff,
      '.png': (buffer) =>
        buffer.length >= 8 &&
        buffer.subarray(0, 8).equals(
          Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        ),
    };

    const hasValidSignature = signatureByExtension[extension]?.(document.buffer);

    if (!hasValidSignature) {
      throw new BadRequestException('Assinatura do arquivo invalida para o documento enviado');
    }
    return expectedDocument;
  }

  private emitPsychologistAvailableIfEligible(input: {
    userId: string;
    onlineStatus: OnlineStatus;
    availableForEmergency: boolean;
    approvalStatus: ProfessionalApprovalStatus;
    userStatus: UserStatus;
    activeEmergencyOfferId: string | null;
  }) {
    const isEligible =
      input.onlineStatus === OnlineStatus.ONLINE &&
      input.availableForEmergency &&
      input.approvalStatus === ProfessionalApprovalStatus.APPROVED &&
      input.userStatus === UserStatus.ACTIVE &&
      !input.activeEmergencyOfferId;

    if (!isEligible) {
      return;
    }

    void this.eventEmitter.emitAsync(EMERGENCY_EVENTS.PSYCHOLOGIST_AVAILABLE, {
      professionalId: input.userId,
      occurredAt: new Date(),
    });
  }
}
