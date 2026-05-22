import { Roles } from '@/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DiaryFeeling, DiarySleepQuality, Role } from '@prisma/client';
import { DiaryService } from './diary.service';
import { CreateDiaryDto } from './dto/create-diary.dto';
import { UpdateDiarySharingDto } from './dto/update-diary-sharing.dto';
import { UpdateDiaryDto } from './dto/update-diary.dto';
import {
  CreateDiaryApiDocs,
  DiaryApiTags,
  GetAllDiaryEntriesApiDocs,
  GetDiaryByIdApiDocs,
  GetMyDiaryApiDocs,
  GetSharedDiaryApiDocs,
  RemoveDiaryApiDocs,
  UpdateDiaryApiDocs,
  UpdateDiarySharingApiDocs,
} from './swagger';

type AuthenticatedRequest = {
  user: {
    id: string;
    role: Role;
  };
};

@DiaryApiTags()
@Controller('diaries')
export class DiaryController {
  constructor(private readonly diaryService: DiaryService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT)
  @CreateDiaryApiDocs()
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateDiaryDto) {
    return this.diaryService.create(request.user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @GetAllDiaryEntriesApiDocs()
  getAll() {
    return this.diaryService.getAll();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT)
  @GetMyDiaryApiDocs()
  getMyDiary(
    @Req() request: AuthenticatedRequest,
    @Query('feeling') feeling?: DiaryFeeling,
    @Query('sleepQuality') sleepQuality?: DiarySleepQuality,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.diaryService.getDiaryByUserId(
      request.user.id,
      feeling,
      sleepQuality,
      startDate,
      endDate,
    );
  }

  @Get('patient/:patientId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROFESSIONAL)
  @GetSharedDiaryApiDocs()
  getSharedDiary(
    @Req() request: AuthenticatedRequest,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.diaryService.getSharedDiaryForProfessional(
      request.user.id,
      patientId,
    );
  }

  @Patch('sharing')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT)
  @UpdateDiarySharingApiDocs()
  updateSharing(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateDiarySharingDto,
  ) {
    return this.diaryService.updateSharingPreference(
      request.user.id,
      dto.shareDiaryWithProfessionals,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @GetDiaryByIdApiDocs()
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.diaryService.getDiaryById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT)
  @UpdateDiaryApiDocs()
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDiaryDto,
  ) {
    return this.diaryService.update(request.user.id, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT)
  @RemoveDiaryApiDocs()
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.diaryService.remove(request.user.id, id);
  }
}