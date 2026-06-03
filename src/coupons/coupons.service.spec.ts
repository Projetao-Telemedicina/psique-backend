import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/index';
import { CouponsService } from './coupons.service';

type MockPrisma = {
  $transaction: jest.Mock;
  coupon: {
    findUnique: jest.Mock;
    update: jest.Mock;
    create: jest.Mock;
  };
  userCoupon: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
    create: jest.Mock;
  };
};

describe('CouponsService', () => {
  let service: CouponsService;
  let mockTransaction: jest.Mock;
  let mockCouponFindUnique: jest.Mock;
  let mockCouponUpdate: jest.Mock;
  let mockCouponCreate: jest.Mock;
  let mockFindMany: jest.Mock;
  let mockFindUnique: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockUpdateMany: jest.Mock;
  let mockUserCouponCreate: jest.Mock;
  let mockPrisma: MockPrisma;

  beforeEach(async () => {
    mockTransaction = jest.fn();
    mockCouponFindUnique = jest.fn();
    mockCouponUpdate = jest.fn();
    mockCouponCreate = jest.fn();
    mockFindMany = jest.fn();
    mockFindUnique = jest.fn();
    mockUpdate = jest.fn();
    mockUpdateMany = jest.fn();
    mockUserCouponCreate = jest.fn();

    mockPrisma = {
      $transaction: mockTransaction,
      coupon: {
        findUnique: mockCouponFindUnique,
        update: mockCouponUpdate,
        create: mockCouponCreate,
      },
      userCoupon: {
        findMany: mockFindMany,
        findUnique: mockFindUnique,
        update: mockUpdate,
        updateMany: mockUpdateMany,
        create: mockUserCouponCreate,
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CouponsService>(CouponsService);
  });

  describe('listMyCoupons', () => {
    it('deve filtrar apenas cupons ativos', async () => {
      const userId = 'user-001';
      mockFindMany.mockResolvedValue([]);

      await service.listMyCoupons(userId);

      const whereArg = (
        mockFindMany.mock.calls[0] as unknown as [
          { where: Record<string, unknown> },
        ]
      )[0].where;

      const couponWhere = whereArg.coupon as Record<string, unknown>;
      expect(couponWhere.isActive).toBe(true);
    });
  });

  describe('applyCoupon', () => {
    const mockUserCoupon = (
      overrides: Partial<{
        id: string;
        userId: string;
        isUsed: boolean;
        coupon: {
          category: string;
          discountType: string;
          discountValue: number;
          maxDiscountCents: number | null;
          minPurchaseCents: number | null;
          expiresAt: Date;
          firstMonthOnly: boolean;
          isActive: boolean;
        };
      }> = {},
    ) => ({
      id: 'uc-001',
      userId: 'user-001',
      isUsed: false,
      coupon: {
        code: 'PSIQUE-BEMVINDO',
        category: 'SINGLE_APPOINTMENT',
        discountType: 'PERCENTAGE',
        discountValue: 20,
        maxDiscountCents: 5000,
        minPurchaseCents: null,
        expiresAt: new Date('2027-06-01'),
        firstMonthOnly: false,
        isActive: true,
      },
      ...overrides,
    });

    it('deve rejeitar cupom inativo', async () => {
      mockFindUnique.mockResolvedValue(
        mockUserCoupon({
          coupon: { ...mockUserCoupon().coupon, isActive: false },
        }),
      );

      await expect(
        service.applyCoupon('user-001', 'uc-001', 10000, 'SINGLE_APPOINTMENT'),
      ).rejects.toThrow('Este cupom não está mais ativo');
    });

    it('deve rejeitar valor abaixo do minPurchaseCents', async () => {
      mockFindUnique.mockResolvedValue(
        mockUserCoupon({
          coupon: { ...mockUserCoupon().coupon, minPurchaseCents: 15000 },
        }),
      );

      await expect(
        service.applyCoupon('user-001', 'uc-001', 10000, 'SINGLE_APPOINTMENT'),
      ).rejects.toThrow('Valor mínimo para este cupom não atingido');
    });

    it('deve permitir valor igual ao minPurchaseCents', async () => {
      mockFindUnique.mockResolvedValue(
        mockUserCoupon({
          coupon: { ...mockUserCoupon().coupon, minPurchaseCents: 10000 },
        }),
      );

      const result = await service.applyCoupon(
        'user-001', 'uc-001', 10000, 'SINGLE_APPOINTMENT',
      );

      expect(result.totalCents).toBe(8000); // 20% de 10000 = 2000
    });

    it('deve rejeitar cupom expirado com mensagem exata', async () => {
      mockFindUnique.mockResolvedValue(
        mockUserCoupon({
          coupon: { ...mockUserCoupon().coupon, expiresAt: new Date('2020-01-01') },
        }),
      );

      await expect(
        service.applyCoupon('user-001', 'uc-001', 10000, 'SINGLE_APPOINTMENT'),
      ).rejects.toThrow('Este cupom não é mais válido');
    });

    it('deve rejeitar cupom já usado', async () => {
      mockFindUnique.mockResolvedValue(mockUserCoupon({ isUsed: true }));

      await expect(
        service.applyCoupon('user-001', 'uc-001', 10000, 'SINGLE_APPOINTMENT'),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve calcular PERCENTAGE com teto', async () => {
      mockFindUnique.mockResolvedValue(mockUserCoupon());

      const result = await service.applyCoupon('user-001', 'uc-001', 20000, 'SINGLE_APPOINTMENT');

      expect(result).toEqual({
        subtotalCents: 20000,
        discountCents: 4000,
        totalCents: 16000,
        couponCode: 'PSIQUE-BEMVINDO',
        warning: null,
      });
    });

    it('deve calcular FIXED sem total negativo', async () => {
      mockFindUnique.mockResolvedValue(
        mockUserCoupon({
          coupon: { ...mockUserCoupon().coupon, discountType: 'FIXED', discountValue: 200 },
        }),
      );

      const result = await service.applyCoupon('user-001', 'uc-001', 5000, 'SINGLE_APPOINTMENT');

      expect(result.totalCents).toBe(0);
      expect(result.discountCents).toBe(5000);
    });

    it('deve retornar aviso firstMonthOnly', async () => {
      mockFindUnique.mockResolvedValue(
        mockUserCoupon({
          coupon: {
            ...mockUserCoupon().coupon,
            category: 'PLAN_SUBSCRIPTION',
            firstMonthOnly: true,
          },
        }),
      );

      const result = await service.applyCoupon(
        'user-001', 'uc-001', 30000, 'PLAN_SUBSCRIPTION',
      );

      expect(result.warning).toBe('Desconto aplicado apenas para o primeiro mês');
    });
  });

  describe('validateApplication', () => {
    const mockValidUC = () => ({
      id: 'uc-001',
      userId: 'user-001',
      isUsed: false,
      coupon: {
        expiresAt: new Date('2027-06-01'),
        category: 'SINGLE_APPOINTMENT',
        isActive: true,
        minPurchaseCents: null as number | null,
      },
    });

    it('deve rejeitar cupom inativo', async () => {
      mockFindUnique.mockResolvedValue({
        ...mockValidUC(),
        coupon: { ...mockValidUC().coupon, isActive: false },
      });

      await expect(
        service.validateApplication('user-001', 'uc-001', 'SINGLE_APPOINTMENT'),
      ).rejects.toThrow('Este cupom não está mais ativo');
    });

    it('deve rejeitar valor abaixo do mínimo quando amountCents informado', async () => {
      mockFindUnique.mockResolvedValue({
        ...mockValidUC(),
        coupon: { ...mockValidUC().coupon, minPurchaseCents: 15000 },
      });

      await expect(
        service.validateApplication('user-001', 'uc-001', 'SINGLE_APPOINTMENT', 10000),
      ).rejects.toThrow('Valor mínimo para este cupom não atingido');
    });

    it('não deve validar minPurchaseCents quando amountCents não informado', async () => {
      mockFindUnique.mockResolvedValue({
        ...mockValidUC(),
        coupon: { ...mockValidUC().coupon, minPurchaseCents: 15000 },
      });

      const result = await service.validateApplication(
        'user-001', 'uc-001', 'SINGLE_APPOINTMENT',
      );

      expect(result.valid).toBe(true);
    });

    it('deve retornar valid=true para cupom válido', async () => {
      mockFindUnique.mockResolvedValue(mockValidUC());

      const result = await service.validateApplication(
        'user-001', 'uc-001', 'SINGLE_APPOINTMENT',
      );

      expect(result.valid).toBe(true);
    });

    it('deve lançar exceção para cupom expirado', async () => {
      mockFindUnique.mockResolvedValue({
        ...mockValidUC(),
        coupon: { ...mockValidUC().coupon, expiresAt: new Date('2020-01-01') },
      });

      await expect(
        service.validateApplication('user-001', 'uc-001', 'SINGLE_APPOINTMENT'),
      ).rejects.toThrow('Este cupom não é mais válido');
    });
  });

  describe('calculateDiscount', () => {
    it('deve calcular PERCENTAGE com teto', () => {
      const result = service.calculateDiscount(20000, 'PERCENTAGE', 20, 5000, false);
      expect(result.discountCents).toBe(4000);
      expect(result.warning).toBeNull();
    });

    it('deve usar teto padrão 10000 quando maxDiscountCents é null', () => {
      const result = service.calculateDiscount(50000, 'PERCENTAGE', 50, null, false);
      expect(result.discountCents).toBe(10000);
    });

    it('deve limitar FIXED ao valor da compra', () => {
      const result = service.calculateDiscount(5000, 'FIXED', 200, null, false);
      expect(result.discountCents).toBe(5000); // min(20000, 5000) = 5000
    });

    it('deve retornar aviso para firstMonthOnly', () => {
      const result = service.calculateDiscount(30000, 'PERCENTAGE', 50, null, true);
      expect(result.warning).toBe('Desconto aplicado apenas para o primeiro mês');
    });
  });

  describe('consumeCoupon', () => {
    it('deve consumir cupom em transação atômica', async () => {
      const txMock = {
        userCoupon: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'uc-001',
            couponId: 'c-001',
            isUsed: false,
            coupon: { maxUses: 10, currentUses: 5 },
          }),
          update: jest.fn().mockResolvedValue({
            id: 'uc-001',
            isUsed: true,
            usedAt: new Date(),
            reservedAt: null,
          }),
        },
        coupon: {
          update: jest.fn(),
        },
      };

      mockTransaction.mockImplementation(
        (fn: (tx: unknown) => unknown) => fn(txMock),
      );

      await service.consumeCoupon('uc-001');

      expect(txMock.coupon.update).toHaveBeenCalledWith({
        where: { id: 'c-001' },
        data: { currentUses: { increment: 1 } },
      });
      expect(txMock.userCoupon.update).toHaveBeenCalledWith({
        where: { id: 'uc-001' },
        data: { isUsed: true, usedAt: expect.any(Date) as Date, reservedAt: null },
      });
    });

    it('deve rejeitar cupom já usado', async () => {
      const txMock = {
        userCoupon: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'uc-001',
            couponId: 'c-001',
            isUsed: true,
            coupon: { maxUses: 10, currentUses: 5 },
          }),
          update: jest.fn(),
        },
        coupon: { update: jest.fn() },
      };

      mockTransaction.mockImplementation(
        (fn: (tx: unknown) => unknown) => fn(txMock),
      );

      await expect(service.consumeCoupon('uc-001')).rejects.toThrow(BadRequestException);
    });

    it('deve rejeitar quando limite de usos do cupom excedido', async () => {
      const txMock = {
        userCoupon: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'uc-001',
            couponId: 'c-001',
            isUsed: false,
            coupon: { maxUses: 5, currentUses: 5 },
          }),
          update: jest.fn(),
        },
        coupon: { update: jest.fn() },
      };

      mockTransaction.mockImplementation(
        (fn: (tx: unknown) => unknown) => fn(txMock),
      );

      await expect(service.consumeCoupon('uc-001')).rejects.toThrow(
        'Limite de usos do cupom atingido',
      );
    });
  });

  describe('claimPublicCoupon', () => {
    it('deve criar UserCoupon para cupom PUBLIC válido', async () => {
      mockCouponFindUnique.mockResolvedValue({
        id: 'c-001',
        distributionType: 'PUBLIC',
        isActive: true,
        expiresAt: new Date('2027-06-01'),
      });
      mockUserCouponCreate.mockResolvedValue({
        id: 'uc-new',
        couponId: 'c-001',
        userId: 'user-001',
      });

      const result = await service.claimPublicCoupon('user-001', 'c-001');

      expect(result.id).toBe('uc-new');
    });

    it('deve rejeitar cupom TARGETED', async () => {
      mockCouponFindUnique.mockResolvedValue({
        id: 'c-001',
        distributionType: 'TARGETED',
        isActive: true,
        expiresAt: new Date('2027-06-01'),
      });

      await expect(
        service.claimPublicCoupon('user-001', 'c-001'),
      ).rejects.toThrow('Este cupom não está disponível para resgate');
    });

    it('deve rejeitar cupom inativo', async () => {
      mockCouponFindUnique.mockResolvedValue({
        id: 'c-001',
        distributionType: 'PUBLIC',
        isActive: false,
        expiresAt: new Date('2027-06-01'),
      });

      await expect(
        service.claimPublicCoupon('user-001', 'c-001'),
      ).rejects.toThrow('Este cupom não está mais ativo');
    });

    it('deve rejeitar cupom expirado', async () => {
      mockCouponFindUnique.mockResolvedValue({
        id: 'c-001',
        distributionType: 'PUBLIC',
        isActive: true,
        expiresAt: new Date('2020-01-01'),
      });

      await expect(
        service.claimPublicCoupon('user-001', 'c-001'),
      ).rejects.toThrow('Este cupom não é mais válido');
    });
  });

  describe('distributeCoupon', () => {
    it('deve criar UserCoupon para o usuário alvo', async () => {
      mockCouponFindUnique.mockResolvedValue({
        id: 'c-001',
        code: 'PSIQUE-ADMIN',
      });
      mockUserCouponCreate.mockResolvedValue({
        id: 'uc-distributed',
        couponId: 'c-001',
        userId: 'target-user',
      });

      const result = await service.distributeCoupon('c-001', 'target-user');

      expect(result.id).toBe('uc-distributed');
      expect(mockUserCouponCreate).toHaveBeenCalledWith({
        data: { couponId: 'c-001', userId: 'target-user' },
      });
    });

    it('deve rejeitar cupom inexistente', async () => {
      mockCouponFindUnique.mockResolvedValue(null);

      await expect(
        service.distributeCoupon('c-notfound', 'target-user'),
      ).rejects.toThrow('Cupom não encontrado');
    });
  });

  describe('reserveCoupon', () => {
    it('deve preencher reservedAt ao reservar', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'uc-001',
        userId: 'user-001',
        isUsed: false,
        reservedAt: null,
        coupon: { expiresAt: new Date('2027-06-01') },
      });
      mockUpdate.mockResolvedValue({
        id: 'uc-001',
        reservedAt: new Date('2026-06-02T12:00:00Z'),
      });

      const result = await service.reserveCoupon('user-001', 'uc-001');

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'uc-001' },
        data: { reservedAt: expect.any(Date) as Date },
      });
      expect(result).toBeDefined();
    });
  });
});
