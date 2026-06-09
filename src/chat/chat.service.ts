import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ChatRoomStatus,
  MessageType,
  Role,
} from '@prisma/client';
import { PrismaService } from '@/prisma';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';

type AuthenticatedUser = {
  id: string;
  role: Role;
};

type UploadedChatAttachment = {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname: string;
};

type StoredChatAttachment = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  fileData: Uint8Array<ArrayBuffer>;
};

const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrGetRoom(user: AuthenticatedUser, dto: CreateChatRoomDto) {
    const participants = this.resolveParticipants(user, dto);
    await this.assertUsersCanChat(
      participants.patientId,
      participants.professionalId,
      dto.appointmentId,
    );

    const room = await this.prisma.chatRoom.upsert({
      where: {
        patientId_professionalId: {
          patientId: participants.patientId,
          professionalId: participants.professionalId,
        },
      },
      update:
        dto.appointmentId == null
          ? {}
          : {
              appointmentId: dto.appointmentId,
            },
      create: {
        patientId: participants.patientId,
        professionalId: participants.professionalId,
        appointmentId: dto.appointmentId,
      },
      include: this.roomInclude(),
    });

    return this.mapRoom(room);
  }

  async listRooms(user: AuthenticatedUser) {
    this.assertChatRole(user.role);

    const rooms = await this.prisma.chatRoom.findMany({
      where:
        user.role === Role.PATIENT
          ? { patientId: user.id }
          : { professionalId: user.id },
      orderBy: {
        updatedAt: 'desc',
      },
      include: this.roomInclude(),
    });

    return rooms.map((room) => this.mapRoom(room));
  }

  async getRoomById(roomId: string, user: AuthenticatedUser) {
    const room = await this.getAuthorizedRoom(roomId, user.id);
    return this.mapRoom(room);
  }

  async listMessages(
    roomId: string,
    user: AuthenticatedUser,
    page: number,
    limit: number,
  ) {
    await this.getAuthorizedRoom(roomId, user.id);

    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    const messages = await this.prisma.message.findMany({
      where: {
        roomId,
      },
      orderBy: {
        sentAt: 'asc',
      },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      include: this.messageInclude(),
    });

    return messages.map((message) => this.mapMessage(message));
  }

  async createTextMessage(roomId: string, senderId: string, content: string) {
    const room = await this.getAuthorizedRoom(roomId, senderId);
    this.assertRoomWritable(room.status);

    const normalizedContent = this.normalizeMessageContent(content);

    const message = await this.prisma.message.create({
      data: {
        roomId,
        senderId,
        type: MessageType.TEXT,
        content: normalizedContent,
      },
      include: this.messageInclude(),
    });

    await this.bumpRoomTimestamp(roomId);

    return this.mapMessage(message);
  }

  async createAttachmentMessage(input: {
    roomId: string;
    senderId: string;
    file: UploadedChatAttachment;
    caption?: string;
  }) {
    const room = await this.getAuthorizedRoom(input.roomId, input.senderId);
    this.assertRoomWritable(room.status);

    const storedFile = this.validateAttachment(input.file);
    const normalizedCaption =
      input.caption == null || input.caption.trim() === ''
        ? null
        : this.normalizeMessageContent(input.caption);

    const message = await this.prisma.message.create({
      data: {
        roomId: input.roomId,
        senderId: input.senderId,
        type: storedFile.mimeType.startsWith('image/')
          ? MessageType.IMAGE
          : MessageType.FILE,
        content: normalizedCaption,
        attachments: {
          create: {
            fileName: storedFile.fileName,
            mimeType: storedFile.mimeType,
            sizeBytes: storedFile.sizeBytes,
            fileData: storedFile.fileData,
          },
        },
      },
      include: this.messageInclude(),
    });

    await this.bumpRoomTimestamp(input.roomId);

    return this.mapMessage(message);
  }

  async getAttachmentForDownload(attachmentId: string, userId: string) {
    const attachment = await this.prisma.messageAttachment.findUnique({
      where: {
        id: attachmentId,
      },
      include: {
        message: {
          include: {
            room: true,
          },
        },
      },
    });

    if (!attachment) {
      throw new NotFoundException('Anexo do chat não encontrado.');
    }

    this.assertUserCanAccessRoom(attachment.message.room, userId);

    return {
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      fileData: Buffer.from(attachment.fileData),
    };
  }

  async assertUserCanJoinRoom(roomId: string, userId: string) {
    await this.getAuthorizedRoom(roomId, userId);
  }

  async getRoomParticipantIds(roomId: string) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: {
        patientId: true,
        professionalId: true,
      },
    });

    if (!room) {
      throw new NotFoundException('Sala de chat não encontrada.');
    }

    return [room.patientId, room.professionalId];
  }

  private assertChatRole(role: Role) {
    if (role !== Role.PATIENT && role !== Role.PROFESSIONAL) {
      throw new ForbiddenException(
        'Somente pacientes e profissionais podem usar o chat.',
      );
    }
  }

  private resolveParticipants(
    user: AuthenticatedUser,
    dto: CreateChatRoomDto,
  ) {
    this.assertChatRole(user.role);

    if (user.role === Role.PATIENT) {
      if (!dto.professionalId) {
        throw new BadRequestException(
          'O profissional é obrigatório para criar a sala de chat.',
        );
      }

      return {
        patientId: user.id,
        professionalId: dto.professionalId,
      };
    }

    if (!dto.patientId) {
      throw new BadRequestException(
        'O paciente é obrigatório para criar a sala de chat.',
      );
    }

    return {
      patientId: dto.patientId,
      professionalId: user.id,
    };
  }

  private async assertUsersCanChat(
    patientId: string,
    professionalId: string,
    appointmentId?: string,
  ) {
    const [patient, professional] = await Promise.all([
      this.prisma.patientProfile.findUnique({
        where: { userId: patientId },
        select: { userId: true },
      }),
      this.prisma.professionalProfile.findUnique({
        where: { userId: professionalId },
        select: { userId: true },
      }),
    ]);

    if (!patient) {
      throw new NotFoundException('Paciente do chat não encontrado.');
    }

    if (!professional) {
      throw new NotFoundException('Profissional do chat não encontrado.');
    }

    const appointment = await this.prisma.appointment.findFirst({
      where: {
        patientId,
        professionalId,
        ...(appointmentId ? { id: appointmentId } : {}),
      },
      select: {
        id: true,
      },
    });

    if (!appointment) {
      throw new ForbiddenException(
        'O chat só pode ser criado para paciente e profissional com consulta vinculada.',
      );
    }
  }

  private async getAuthorizedRoom(roomId: string, userId: string) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: this.roomInclude(),
    });

    if (!room) {
      throw new NotFoundException('Sala de chat não encontrada.');
    }

    this.assertUserCanAccessRoom(room, userId);

    return room;
  }

  private assertUserCanAccessRoom(
    room: { patientId: string; professionalId: string },
    userId: string,
  ) {
    if (room.patientId !== userId && room.professionalId !== userId) {
      throw new ForbiddenException(
        'Você não possui permissão para acessar esta sala de chat.',
      );
    }
  }

  private assertRoomWritable(status: ChatRoomStatus) {
    if (status === ChatRoomStatus.ARCHIVED) {
      throw new ConflictException('Esta sala de chat está arquivada.');
    }

    if (status === ChatRoomStatus.READ_ONLY) {
      throw new ConflictException('Esta sala de chat está somente leitura.');
    }
  }

  private normalizeMessageContent(content: string) {
    if (typeof content !== 'string') {
      throw new BadRequestException('A mensagem enviada é inválida.');
    }

    const normalized = content.replace(/\r\n/g, '\n').trim();

    if (!normalized) {
      throw new BadRequestException('A mensagem não pode ser vazia.');
    }

    if (normalized.length > 4000) {
      throw new BadRequestException(
        'A mensagem excede o limite de 4.000 caracteres.',
      );
    }

    return normalized;
  }

  private validateAttachment(file: UploadedChatAttachment): StoredChatAttachment {
    if (!file?.buffer?.length) {
      throw new BadRequestException('O arquivo do chat é obrigatório.');
    }

    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      throw new BadRequestException(
        'O anexo excede o tamanho máximo de 5 MB.',
      );
    }

    const extensionMatch = file.originalname.match(/\.[^.]+$/);
    const rawExtension = extensionMatch?.[0]?.toLowerCase();

    const signatures: Record<
      string,
      { mimeType: string; detect: (buffer: Buffer) => boolean }
    > = {
      '.pdf': {
        mimeType: 'application/pdf',
        detect: (buffer: Buffer) => buffer.subarray(0, 4).equals(Buffer.from('%PDF')),
      },
      '.jpg': {
        mimeType: 'image/jpeg',
        detect: (buffer: Buffer) =>
          buffer.length >= 4 &&
          buffer[0] === 0xff &&
          buffer[1] === 0xd8 &&
          buffer[2] === 0xff,
      },
      '.jpeg': {
        mimeType: 'image/jpeg',
        detect: (buffer: Buffer) =>
          buffer.length >= 4 &&
          buffer[0] === 0xff &&
          buffer[1] === 0xd8 &&
          buffer[2] === 0xff,
      },
      '.png': {
        mimeType: 'image/png',
        detect: (buffer: Buffer) =>
          buffer.length >= 8 &&
          buffer
            .subarray(0, 8)
            .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
      },
    };

    if (!rawExtension || !(rawExtension in signatures)) {
      throw new BadRequestException(
        'Formato de anexo inválido. Envie PDF, JPG, JPEG ou PNG.',
      );
    }

    const expected = signatures[rawExtension];

    if (file.mimetype !== expected.mimeType) {
      throw new BadRequestException(
        'O tipo do anexo não corresponde à extensão enviada.',
      );
    }

    if (!expected.detect(file.buffer)) {
      throw new BadRequestException(
        'Assinatura do arquivo inválida para o anexo enviado.',
      );
    }

    const safeBaseName = file.originalname
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, ' ')
      .split('')
      .filter((character) => character >= ' ')
      .join('')
      .trim()
      .slice(0, 120);

    const safeFileName =
      safeBaseName.length > 0
        ? safeBaseName
        : `anexo-chat${rawExtension}`;

    const fileData = new Uint8Array(new ArrayBuffer(file.buffer.byteLength));
    fileData.set(file.buffer);

    return {
      fileName: safeFileName,
      mimeType: expected.mimeType,
      sizeBytes: file.size,
      fileData,
    };
  }

  private async bumpRoomTimestamp(roomId: string) {
    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: {
        updatedAt: new Date(),
      },
    });
  }

  private mapRoom(room: {
    id: string;
    patientId: string;
    professionalId: string;
    appointmentId: string | null;
    status: ChatRoomStatus;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
    patient: { userId: string; user: { id: string; name: string; avatarUrl: string | null } };
    professional: { userId: string; specialty: string | null; user: { id: string; name: string; avatarUrl: string | null } };
    messages: Array<{
      id: string;
      roomId: string;
      senderId: string;
      type: MessageType;
      content: string | null;
      isAutoGenerated: boolean;
      sentAt: Date;
      readAt: Date | null;
      sender: { id: string; name: string; avatarUrl: string | null; role: Role };
      attachments: Array<{
        id: string;
        fileName: string;
        mimeType: string;
        sizeBytes: number;
        createdAt: Date;
      }>;
    }>;
  }) {
    const lastMessage = room.messages[0];

    return {
      id: room.id,
      patientId: room.patientId,
      professionalId: room.professionalId,
      appointmentId: room.appointmentId,
      status: room.status,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      archivedAt: room.archivedAt,
      patient: {
        userId: room.patient.userId,
        name: room.patient.user.name,
        avatarUrl: room.patient.user.avatarUrl,
      },
      professional: {
        userId: room.professional.userId,
        name: room.professional.user.name,
        avatarUrl: room.professional.user.avatarUrl,
        specialty: room.professional.specialty,
      },
      lastMessage: lastMessage ? this.mapMessage(lastMessage) : null,
    };
  }

  private mapMessage(message: {
    id: string;
    roomId: string;
    senderId: string;
    type: MessageType;
    content: string | null;
    isAutoGenerated: boolean;
    sentAt: Date;
    readAt: Date | null;
    sender?: { id: string; name: string; avatarUrl: string | null; role: Role };
    attachments?: Array<{
      id: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      createdAt: Date;
    }>;
  }) {
    return {
      id: message.id,
      roomId: message.roomId,
      senderId: message.senderId,
      type: message.type,
      content: message.content,
      isAutoGenerated: message.isAutoGenerated,
      sentAt: message.sentAt,
      readAt: message.readAt,
      sender: message.sender
        ? {
            id: message.sender.id,
            name: message.sender.name,
            avatarUrl: message.sender.avatarUrl,
            role: message.sender.role,
          }
        : null,
      attachments: (message.attachments ?? []).map((attachment) => ({
        id: attachment.id,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        createdAt: attachment.createdAt,
        downloadUrl: `/chat/attachments/${attachment.id}`,
      })),
    };
  }

  private roomInclude() {
    return {
      patient: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      },
      professional: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      },
      messages: {
        orderBy: {
          sentAt: 'desc' as const,
        },
        take: 1,
        include: this.messageInclude(),
      },
    };
  }

  private messageInclude() {
    return {
      sender: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          role: true,
        },
      },
      attachments: {
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          sizeBytes: true,
          createdAt: true,
        },
      },
    };
  }
}
