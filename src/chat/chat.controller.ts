import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpStatus,
  Param,
  ParseFilePipe,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { Roles } from '@/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { UploadChatAttachmentDto } from './dto/upload-chat-attachment.dto';
import {
  ChatControllerApiTags,
  CreateChatRoomApiDocs,
  DownloadChatAttachmentApiDocs,
  GetChatMessagesApiDocs,
  GetChatRoomApiDocs,
  GetMyChatRoomsApiDocs,
  UploadChatAttachmentApiDocs,
} from './swagger';

type AuthenticatedRequest = {
  user: {
    id: string;
    role: Role;
  };
};

type UploadedChatAttachment = {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname: string;
};

@ChatControllerApiTags()
@Controller('chat')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PATIENT, Role.PROFESSIONAL)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Post('rooms')
  @CreateChatRoomApiDocs()
  createOrGetRoom(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateChatRoomDto,
  ) {
    return this.chatService.createOrGetRoom(request.user, dto);
  }

  @Get('rooms')
  @GetMyChatRoomsApiDocs()
  getMyRooms(@Req() request: AuthenticatedRequest) {
    return this.chatService.listRooms(request.user);
  }

  @Get('rooms/:roomId')
  @GetChatRoomApiDocs()
  getRoomById(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.chatService.getRoomById(roomId, request.user);
  }

  @Get('rooms/:roomId/messages')
  @GetChatMessagesApiDocs()
  getMessages(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Req() request: AuthenticatedRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.chatService.listMessages(roomId, request.user, page, limit);
  }

  @Post('rooms/:roomId/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
      },
    }),
  )
  @UploadChatAttachmentApiDocs()
  async uploadAttachment(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      }),
    )
    file: UploadedChatAttachment,
    @Body() dto: UploadChatAttachmentDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const message = await this.chatService.createAttachmentMessage({
      roomId,
      senderId: request.user.id,
      file,
      caption: dto.caption,
    });

    await this.chatGateway.emitMessageCreated(roomId, message);

    return message;
  }

  @Get('attachments/:attachmentId')
  @DownloadChatAttachmentApiDocs()
  async downloadAttachment(
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @Req() request: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const attachment = await this.chatService.getAttachmentForDownload(
      attachmentId,
      request.user.id,
    );

    res.set({
      'Content-Type': attachment.mimeType,
      'Content-Disposition': `attachment; filename="${attachment.fileName}"`,
      'Content-Length': attachment.sizeBytes,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cache-Control': 'no-store',
    });

    res.end(attachment.fileData);
  }
}
