# ADR 0001: Cupons de desconto

## Status

Proposto (2026-05-31)

## Contexto

O UC25 — Gerenciar cupons de desconto — introduz cupons que pacientes podem aplicar em consultas avulsas ou assinaturas de plano. O schema Prisma já contém os modelos `Coupon` e `UserCoupon`, mas várias decisões de domínio estavam em aberto: distribuição, ciclo de vida, exclusividade com outros descontos, geração automática e escopo de implementação.

## Decisões

### 1. Cupom como bounded context próprio

Cupons formam um módulo independente (`CouponsModule`) com contratos explícitos para os módulos consumidores (pagamentos, consultas, assinaturas). O módulo expõe serviços de validação e cálculo que outros contextos chamam, sem que cupons conheçam detalhes de gateway de pagamento ou plano.

### 2. Distribuição

Dois caminhos coexistem:

- **Admin distribui**: O administrador atribui cupons a pacientes específicos via painel. Cupons `TARGETED` são sempre distribuídos assim. Cupons `PUBLIC` também podem ser distribuídos pelo admin. A distribuição pelo admin cria `UserCoupon` diretamente (já aparece como "resgatado").
- **Paciente resgata**: Cupons marcados como `PUBLIC` ficam visíveis para auto-resgate pelo paciente, que clica "resgatar" e ganha um `UserCoupon` com `claimedAt = now()`.

### 3. Ciclo de vida do UserCoupon

O `UserCoupon` transita entre estados:

```
[disponível] → [reservado] → [usado]
                    ↓
              [disponível] (expiração da reserva)
```

- **Disponível**: `isUsed = false`, `reservedAt = null`.
- **Reservado**: `reservedAt = <timestamp>`. O paciente selecionou o cupom na tela de pagamento. Um job (`CronJob`) limpa reservas com mais de 15 minutos, voltando-as para disponível.
- **Usado**: `isUsed = true`, `usedAt = <timestamp>`. O pagamento foi confirmado.

### 4. Exclusividade de desconto

Cupom é mutuamente exclusivo com carteira e promoções. Em uma transação, o paciente escolhe UMA fonte de desconto: cupom OU saldo da carteira OU promoção de psicólogo. O backend valida essa exclusividade no momento da aplicação.

### 5. Cancelamento e devolução

Quando uma consulta paga com cupom é cancelada, o valor do desconto é devolvido como crédito na carteira do paciente. O `UserCoupon` permanece `isUsed = true`. O crédito na carteira referencia o cupom original para rastreamento.

### 6. Cálculo de desconto

- **PERCENTAGE**: Aplica a porcentagem sobre o valor da compra, limitada por `maxDiscountCents`. Se `maxDiscountCents` não for definido, o teto padrão é R$ 100,00 (10000 centavos).
- **FIXED**: Desconta o valor fixo ou o total da compra, o que for menor. Nunca gera valor negativo.

### 7. Categorias

- **SINGLE_APPOINTMENT**: Válido apenas para consultas avulsas.
- **PLAN_SUBSCRIPTION**: Válido apenas para assinaturas de plano. O campo `firstMonthOnly` (default `false`) indica que o desconto aplica-se somente à primeira mensalidade.

O backend filtra cupons por categoria no endpoint de listagem (`GET /users/:id/coupons?category=...`) e valida novamente no momento da aplicação.

### 8. Geração de código

Códigos de cupom são gerados automaticamente com prefixo `PSIQUE` + parte aleatória não-adivinhável. O admin pode opcionalmente definir um código manual (ex: `NATAL2024`).

### 9. Cupons automáticos por template

O sistema gera cupons automaticamente a partir de templates. Templates são armazenados na tabela `CouponTemplate` (separada de `Coupon`). Cada template define os parâmetros base (valor, categoria, expiração, etc.). Quando um evento dispara, o sistema cria uma cópia independente do cupom para o paciente a partir do template.

Templates iniciais:

| Nome | Evento disparador | Expiração |
|---|---|---|
| `WELCOME` | Paciente conclui primeira consulta | 30 dias |
| `REFERRAL` | Indicado conclui primeira consulta | 30 dias |

### 10. Indicação (referral)

Paciente A gera um link de indicação com token dinâmico de uso único (`psique.app/register?ref=<token>`). Paciente B se cadastra por esse link. O vínculo A→B é registrado. Quando B conclui sua primeira consulta, ambos recebem cupom do template `REFERRAL`.

### 11. Escopo de implementação

O módulo de cupons é implementado como **módulo independente com contratos**, sem implementar Payment ou Wallet reais. Os endpoints de aplicação calculam, validam e retornam o valor recalculado, mas não executam cobrança nem alteram saldo de carteira. Payment e Wallet serão implementados posteriormente e consumirão os contratos expostos por `CouponsService`.

## Consequências

- O modelo `UserCoupon` ganha o campo `reservedAt` (DateTime opcional).
- O modelo `CouponTemplate` é adicionado ao schema.
- Um `CronJob` é necessário para liberar reservas expiradas.
- O módulo `CouponsModule` expõe `CouponsService.validateApplication()` e `CouponsService.calculateDiscount()` como contratos públicos para outros módulos.
- Endpoints de aplicação de cupom retornam DTOs com o cálculo, sem efetivar transação financeira.
- A geração de código de indicação exige um campo ou entidade para tokens de referral.
