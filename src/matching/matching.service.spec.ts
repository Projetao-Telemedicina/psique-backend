import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/index';
import { MatchingService } from './matching.service';
import { CreatePatientQuestionnaireDto } from './dto/patient-questionnaire.dto';
import { CreateProfessionalQuestionnaireDto } from './dto/professional-questionnaire.dto';
import { of, throwError } from 'rxjs';
import { InternalServerErrorException } from '@nestjs/common';

function makePatientRow(overrides: Partial<{
  userId: string;
  motivoTerapia: number;
  abordagem: number;
  estiloTerapeutico: number;
  objetivo: number;
  genero: number;
  experiencia: number;
  contextos: number[];
  ignoraContextos: boolean;
  tempoBusca: number;
  experienciaPrevia: number;
  precisaSuporteFora: boolean;
  restricaoHorario: boolean;
}> = {}) {
  return {
    userId: 'pat-001',
    motivoTerapia: 0,
    abordagem: 1,
    estiloTerapeutico: 2,
    objetivo: 0,
    genero: 3,
    experiencia: 1,
    contextos: [1, 0, 0, 0, 1],
    ignoraContextos: false,
    tempoBusca: 1,
    experienciaPrevia: 0,
    precisaSuporteFora: false,
    restricaoHorario: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeProfessionalRow(userId: string = 'prof-001') {
  return {
    userId,
    motivosTerapia: [1, 0, 1, 0, 0],
    abordagem: 1,
    estiloTerapeutico: 2,
    objetivo: 0,
    genero: 0,
    experiencia: 1,
    contextos: [1, 0, 1, 0, 1],
    suporteFora: 1,
    periodoAtendimento: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    professional: {
      userId,
      specialty: 'Psicanalise',
      scoreAvg: { toNumber: () => 4.5, valueOf: () => 4.5, toString: () => '4.5' } as any,
      reviewCount: 12,
      user: {
        name: 'Dr. Teste',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
    },
  };
}

describe('MatchingService', () => {
  let service: MatchingService;
  let mockPrisma: any;
  let mockHttpService: any;

  beforeEach(async () => {
    mockPrisma = {
      patientQuestionnaire: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
      },
      professionalQuestionnaire: {
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
    };

    mockHttpService = {
      post: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: HttpService, useValue: mockHttpService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:8000') },
        },
      ],
    }).compile();

    service = module.get(MatchingService);
  });

  // ---------------------------------------------------------
  // upsertPatientQuestionnaire
  // ---------------------------------------------------------
  describe('upsertPatientQuestionnaire', () => {
    it('should upsert a patient questionnaire', async () => {
      const dto: CreatePatientQuestionnaireDto = {
        motivoTerapia: 0,
        abordagem: 1,
        estiloTerapeutico: 2,
        objetivo: 0,
        genero: 3,
        experiencia: 1,
        contextos: [1, 0, 0, 0, 1],
        ignoraContextos: false,
        tempoBusca: 1,
        experienciaPrevia: 0,
        precisaSuporteFora: false,
        restricaoHorario: false,
      };

      const expected = { userId: 'pat-001', ...dto };
      mockPrisma.patientQuestionnaire.upsert.mockResolvedValue(expected);

      const result = await service.upsertPatientQuestionnaire('pat-001', dto);
      expect(result).toEqual(expected);
      expect(mockPrisma.patientQuestionnaire.upsert).toHaveBeenCalledWith({
        where: { userId: 'pat-001' },
        create: { userId: 'pat-001', ...dto },
        update: dto,
      });
    });
  });

  // ---------------------------------------------------------
  // upsertProfessionalQuestionnaire
  // ---------------------------------------------------------
  describe('upsertProfessionalQuestionnaire', () => {
    it('should upsert a professional questionnaire', async () => {
      const dto: CreateProfessionalQuestionnaireDto = {
        motivosTerapia: [1, 0, 1, 0, 0],
        abordagem: 1,
        estiloTerapeutico: 2,
        objetivo: 0,
        genero: 0,
        experiencia: 1,
        contextos: [1, 0, 1, 0, 1],
        suporteFora: 1,
        periodoAtendimento: 0,
      };

      const expected = { userId: 'prof-001', ...dto };
      mockPrisma.professionalQuestionnaire.upsert.mockResolvedValue(expected);

      const result = await service.upsertProfessionalQuestionnaire('prof-001', dto);
      expect(result).toEqual(expected);
    });
  });

  // ---------------------------------------------------------
  // getRecommendationsForPatient
  // ---------------------------------------------------------
  describe('getRecommendationsForPatient', () => {
    it('should throw if patient questionnaire is missing', async () => {
      mockPrisma.patientQuestionnaire.findUnique.mockResolvedValue(null);

      await expect(
        service.getRecommendationsForPatient('pat-001'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should return empty recommendations if no professionals have questionnaires', async () => {
      mockPrisma.patientQuestionnaire.findUnique.mockResolvedValue(
        makePatientRow(),
      );
      mockPrisma.professionalQuestionnaire.findMany.mockResolvedValue([]);

      const result = await service.getRecommendationsForPatient('pat-001');
      expect(result).toEqual({ recommendations: [] });
    });

    it('should call matching service and hydrate results', async () => {
      const patientRow = makePatientRow();
      const profRow = makeProfessionalRow('prof-001');

      mockPrisma.patientQuestionnaire.findUnique.mockResolvedValue(patientRow);
      mockPrisma.professionalQuestionnaire.findMany.mockResolvedValue([profRow]);

      const pythonResponse = {
        data: {
          recommendations: [
            {
              professional_id: 'prof-001',
              score_display: 100.0,
              score_bruto: 8.5,
              cosine: 0.9,
              hamming: 0.1,
              penalidade: 0.0,
              mod_clinico: 0.0,
              explicacoes: ['Abordagem compativel: Psicanalise'],
            },
          ],
        },
      };

      mockHttpService.post.mockReturnValue(of(pythonResponse));

      const result = await service.getRecommendationsForPatient('pat-001');

      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0]).toMatchObject({
        professionalId: 'prof-001',
        professionalName: 'Dr. Teste',
        avatarUrl: 'https://example.com/avatar.jpg',
        specialty: 'Psicanalise',
        scoreAvg: 4.5,
        reviewCount: 12,
        scoreDisplay: 100.0,
        scoreBruto: 8.5,
      });

      expect(mockHttpService.post).toHaveBeenCalledWith(
        'http://localhost:8000/match',
        {
          patient: expect.objectContaining({ motivo_terapia: 0 }),
          professionals: [
            expect.objectContaining({ id: 'prof-001' }),
          ],
        },
      );
    });

    it('should map NestJS/Prisma fields to Python snake_case contract', async () => {
      const patientRow = makePatientRow({
        motivoTerapia: 2,
        estiloTerapeutico: 3,
        experienciaPrevia: 1,
        precisaSuporteFora: true,
        restricaoHorario: true,
      });
      const profRow = makeProfessionalRow('prof-002');
      profRow.userId = 'prof-002';

      mockPrisma.patientQuestionnaire.findUnique.mockResolvedValue(patientRow);
      mockPrisma.professionalQuestionnaire.findMany.mockResolvedValue([profRow]);

      mockHttpService.post.mockReturnValue(
        of({
          data: {
            recommendations: [
              {
                professional_id: 'prof-002',
                score_display: 100.0,
                score_bruto: 7.0,
                cosine: 0.8,
                hamming: 0.2,
                penalidade: 0.0,
                mod_clinico: 0.0,
                explicacoes: [],
              },
            ],
          },
        }),
      );

      await service.getRecommendationsForPatient('pat-001');

      const postCall = mockHttpService.post.mock.calls[0];
      expect(postCall[1].patient).toEqual({
        motivo_terapia: 2,
        abordagem: 1,
        estilo_terapeutico: 3,
        objetivo: 0,
        genero: 3,
        experiencia: 1,
        contextos: [1, 0, 0, 0, 1],
        ignora_contextos: false,
        tempo_busca: 1,
        experiencia_previa: 1,
        precisa_suporte_fora: true,
        restricao_horario: true,
      });

      expect(postCall[1].professionals[0]).toEqual({
        id: 'prof-002',
        motivos_terapia: [1, 0, 1, 0, 0],
        abordagem: 1,
        estilo_terapeutico: 2,
        objetivo: 0,
        genero: 0,
        experiencia: 1,
        contextos: [1, 0, 1, 0, 1],
        suporte_fora: 1,
        periodo_atendimento: 0,
      });
    });

    it('should handle matching service errors gracefully', async () => {
      mockPrisma.patientQuestionnaire.findUnique.mockResolvedValue(
        makePatientRow(),
      );
      mockPrisma.professionalQuestionnaire.findMany.mockResolvedValue([
        makeProfessionalRow(),
      ]);

      mockHttpService.post.mockReturnValue(
        throwError(() => new Error('Connection refused')),
      );

      await expect(
        service.getRecommendationsForPatient('pat-001'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
