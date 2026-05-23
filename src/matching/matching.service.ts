import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/index';
import { CreatePatientQuestionnaireDto } from './dto/patient-questionnaire.dto';
import { CreateProfessionalQuestionnaireDto } from './dto/professional-questionnaire.dto';
import { MatchRecommendationDto, MatchResponseDto } from './dto/match-response.dto';
import { firstValueFrom } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { Prisma } from '@prisma/client';

type PatientRow = Prisma.PatientQuestionnaireGetPayload<object>;
type ProfessionalRow = Prisma.ProfessionalQuestionnaireGetPayload<object>;

type PythonPatientPayload = Record<string, unknown>;
type PythonProfessionalPayload = Record<string, unknown> & { id: string };

type PythonMatchItem = {
  professional_id: string;
  score_display: number;
  score_bruto: number;
  cosine: number;
  hamming: number;
  penalidade: number;
  mod_clinico: number;
  explicacoes: string[];
};

type PythonMatchResponse = {
  recommendations: PythonMatchItem[];
};

type ProfessionalHydrationData = {
  userId: string;
  user: {
    name: string;
    avatarUrl: string | null;
  };
  specialty: string | null;
  scoreAvg: Prisma.Decimal;
  reviewCount: number;
};

@Injectable()
export class MatchingService {
  private readonly matchingServiceUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.matchingServiceUrl = this.configService.get<string>(
      'MATCHING_SERVICE_URL',
      'http://localhost:8000',
    );
  }

  async upsertPatientQuestionnaire(
    userId: string,
    dto: CreatePatientQuestionnaireDto,
  ) {
    return this.prisma.patientQuestionnaire.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: dto,
    });
  }

  async upsertProfessionalQuestionnaire(
    userId: string,
    dto: CreateProfessionalQuestionnaireDto,
  ) {
    return this.prisma.professionalQuestionnaire.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: dto,
    });
  }

  async getRecommendationsForPatient(userId: string): Promise<MatchResponseDto> {
    const patientRow = await this.prisma.patientQuestionnaire.findUnique({
      where: { userId },
    });

    if (!patientRow) {
      throw new InternalServerErrorException(
        'Questionario do paciente nao encontrado. Preencha o questionario antes de buscar recomendacoes.',
      );
    }

    const professionals = await this.prisma.professionalQuestionnaire.findMany({
      include: {
        professional: {
          select: {
            userId: true,
            specialty: true,
            scoreAvg: true,
            reviewCount: true,
            user: {
              select: {
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (professionals.length === 0) {
      return { recommendations: [] };
    }

    const patientPayload = this.mapPatientToPython(patientRow);
    const professionalPayloads = professionals.map((p) =>
      this.mapProfessionalToPython(p),
    );

    const pythonResponse = await this.callMatchingService(
      patientPayload,
      professionalPayloads,
    );

    const hydrationMap = new Map<string, ProfessionalHydrationData>(
      professionals.map((p) => [p.userId, p.professional]),
    );

    const recommendations: MatchRecommendationDto[] =
      pythonResponse.recommendations.map((item) => {
        const prof = hydrationMap.get(item.professional_id);
        return {
          professionalId: item.professional_id,
          professionalName: prof?.user.name ?? 'Desconhecido',
          avatarUrl: prof?.user.avatarUrl ?? null,
          specialty: prof?.specialty ?? null,
          scoreAvg: prof ? Number(prof.scoreAvg) : 0,
          reviewCount: prof?.reviewCount ?? 0,
          scoreDisplay: item.score_display,
          scoreBruto: item.score_bruto,
          cosine: item.cosine,
          hamming: item.hamming,
          penalidade: item.penalidade,
          modClinico: item.mod_clinico,
          explicacoes: item.explicacoes,
        };
      });

    return { recommendations };
  }

  // -------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------

  private mapPatientToPython(row: PatientRow): PythonPatientPayload {
    return {
      motivo_terapia: row.motivoTerapia,
      abordagem: row.abordagem,
      estilo_terapeutico: row.estiloTerapeutico,
      objetivo: row.objetivo,
      genero: row.genero,
      experiencia: row.experiencia,
      contextos: row.contextos,
      ignora_contextos: row.ignoraContextos,
      tempo_busca: row.tempoBusca,
      experiencia_previa: row.experienciaPrevia,
      precisa_suporte_fora: row.precisaSuporteFora,
      restricao_horario: row.restricaoHorario,
    };
  }

  private mapProfessionalToPython(
    row: ProfessionalRow,
  ): PythonProfessionalPayload {
    return {
      id: row.userId,
      motivos_terapia: row.motivosTerapia,
      abordagem: row.abordagem,
      estilo_terapeutico: row.estiloTerapeutico,
      objetivo: row.objetivo,
      genero: row.genero,
      experiencia: row.experiencia,
      contextos: row.contextos,
      suporte_fora: row.suporteFora,
      periodo_atendimento: row.periodoAtendimento,
    };
  }

  private async callMatchingService(
    patient: PythonPatientPayload,
    professionals: PythonProfessionalPayload[],
  ): Promise<PythonMatchResponse> {
    const url = `${this.matchingServiceUrl}/match`;

    const response = await firstValueFrom(
      this.httpService
        .post<PythonMatchResponse>(url, {
          patient,
          professionals,
        })
        .pipe(
          timeout(15_000),
          catchError((error) => {
            throw new InternalServerErrorException(
              `Servico de matching indisponivel: ${error?.message ?? 'erro desconhecido'}`,
            );
          }),
        ),
    );

    return response.data;
  }
}
