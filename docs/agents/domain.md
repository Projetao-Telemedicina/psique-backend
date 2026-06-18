# Domain Docs

Este arquivo orienta como agentes devem consumir a documentação de domínio do Psique antes de explorar, alterar ou revisar o código.

O Psique é uma plataforma de telemedicina voltada para saúde mental. O backend lida com dados sensíveis, regras de autorização, consultas, diário emocional, aprovação profissional, atendimento emergencial, matching, cupons e áreas comerciais em evolução.

Por isso, agentes devem tratar a documentação de domínio como fonte obrigatória de contexto antes de implementar qualquer mudança.

---

## Fontes obrigatórias de domínio

Antes de explorar ou alterar o código, leia:

1. `CONTEXT.md` na raiz do repositório.
2. `AGENTS.md` na raiz do repositório.
3. ADRs relevantes em `docs/adr/`, se existirem.
4. Documentação específica do módulo afetado, se existir.
5. Issue ou PRD relacionado à tarefa, quando houver.
6. Testes existentes do módulo afetado.

O `CONTEXT.md` é a fonte principal de verdade sobre vocabulário, papéis, entidades, regras de domínio e áreas sensíveis.

O `AGENTS.md` é a fonte principal de verdade sobre comportamento esperado dos agentes, fluxo de implementação, testes, segurança e critérios de parada.

---

## Regra de parada

Se houver qualquer inconsistência, conflito, ambiguidade ou incerteza relevante entre documentação, issue, ADR, código existente, testes ou regra de negócio, o agente deve parar antes de tomar decisão autônoma.

Nesses casos, o agente deve apresentar os fatos e aguardar instruções humanas.

Isso se aplica especialmente a:

* autorização;
* privacidade;
* dados sensíveis;
* saúde mental;
* atendimento emergencial;
* consultas;
* diário emocional;
* aprovação profissional;
* matching;
* cupons;
* pagamentos;
* planos;
* assinaturas;
* migrations;
* alterações destrutivas no banco;
* mudanças de contrato de API;
* testes existentes que contradizem a solicitação.

O agente não deve escolher silenciosamente uma interpretação quando a decisão puder afetar domínio, segurança, privacidade, banco de dados ou contrato público.

---

## Estrutura de contexto

Este repositório é tratado como um repositório de contexto único enquanto não houver `CONTEXT-MAP.md`.

Estrutura esperada:

```txt
/
├── CONTEXT.md
├── AGENTS.md
├── docs/
│   ├── agents/
│   │   ├── domain.md
│   │   ├── issue-tracker.md
│   │   └── triage-labels.md
│   └── adr/
└── src/
```

Se futuramente o projeto for dividido em múltiplos contextos, poderá ser criado um `CONTEXT-MAP.md` na raiz apontando para contextos específicos.

Exemplo futuro possível:

```txt
/
├── CONTEXT-MAP.md
├── AGENTS.md
├── docs/adr/
└── src/
    ├── appointments/
    ├── coupons/
    ├── payments/
    └── emergency/
```

Enquanto esse arquivo não existir, use `CONTEXT.md` como contexto principal.

---

## Vocabulário do domínio

Use o vocabulário definido em `CONTEXT.md`.

Termos preferidos:

* "paciente", não "cliente";
* "psicólogo", não "terapeuta genérico";
* "consulta", não "sessão", quando falar da entidade agendada;
* "reagendamento", não "remarcação";
* "diário emocional", não "journal";
* "matching" para compatibilidade entre paciente e psicólogo;
* "atendimento emergencial" para busca rápida por psicólogo disponível;
* "plano" e "assinatura" para área comercial recorrente;
* "cupom", não "voucher" ou "promo code";
* "cupom de usuário" para o vínculo entre paciente e cupom;
* "template de cupom" para modelo base de geração automática;
* "reserva" para bloqueio temporário do cupom durante checkout;
* "indicação" ou "referral" para convite entre pacientes.

Termos técnicos existentes no código devem ser preservados quando estiver falando de classes, modelos, módulos ou campos:

* `User`
* `PatientProfile`
* `ProfessionalProfile`
* `ProfessionalRequest`
* `ProfessionalRequestDocument`
* `Appointment`
* `AppointmentRescheduleRequest`
* `Review`
* `EmergencyRequest`
* `EmergencyOffer`
* `DiaryEntry`
* `PatientQuestionnaire`
* `ProfessionalQuestionnaire`
* `Coupon`
* `UserCoupon`
* `CouponTemplate`

Se um conceito necessário não existir no glossário, não invente um termo automaticamente. Registre a lacuna e aguarde orientação quando isso afetar domínio, API, banco ou testes.

---

## Domínios sensíveis

Algumas áreas exigem cuidado extra porque envolvem dados sensíveis, autorização, saúde mental, dinheiro ou transições críticas de estado.

### Autenticação e autorização

Antes de alterar autenticação ou autorização, verifique:

* roles existentes;
* guards;
* ownership do recurso;
* relação autorizada entre paciente e psicólogo;
* exposição indevida de dados;
* testes e2e de acesso permitido e negado.

Pacientes não devem acessar dados privados de outros pacientes.

Psicólogos não devem acessar dados privados de pacientes sem relação autorizada.

Administradores devem acessar apenas o necessário para operação.

---

### Pacientes

Ao trabalhar com pacientes, preserve:

* vínculo entre `User` e `PatientProfile`;
* dados de contato;
* configuração de compartilhamento do diário emocional;
* privacidade de questionários, consultas e diário.

---

### Psicólogos e aprovação profissional

Ao trabalhar com psicólogos, preserve:

* vínculo entre `User` e `ProfessionalProfile`;
* CRP;
* status de aprovação;
* documentos profissionais;
* motivo de rejeição;
* administrador revisor, quando aplicável.

Um psicólogo rejeitado ou não aprovado não deve atender como aprovado.

---

### Consultas

Ao trabalhar com consultas, preserve:

* paciente;
* psicólogo;
* horário de início;
* horário de fim;
* preço;
* status;
* regras de conflito de agenda;
* integração com Google Calendar/Meet quando aplicável.

Não misture cancelamento, conclusão, ausência e reagendamento sem transições claras.

---

### Reagendamentos

Ao trabalhar com reagendamentos, preserve:

* consulta original;
* solicitante;
* status da solicitação;
* histórico;
* aceite;
* rejeição;
* expiração.

---

### Matching

O matching deve ser explicável e testável.

Ao alterar matching, preserve a separação entre:

* dados declarados pelo paciente;
* dados declarados pelo psicólogo;
* algoritmo de compatibilidade;
* resultado apresentado ao paciente.

Evite pesos ou regras mágicas sem nome, teste ou documentação.

---

### Diário emocional

O diário emocional pertence ao paciente.

Ao alterar diário emocional:

* não exponha conteúdo sem autorização;
* respeite `shareDiaryWithProfessionals`;
* evite logs com conteúdo sensível;
* teste acesso do dono e bloqueio de terceiros.

---

### Atendimento emergencial

O atendimento emergencial é fluxo sensível.

Ao alterar `EmergencyRequest`, `EmergencyOffer` ou `PanicButtonModule`, preserve:

* transições explícitas de status;
* expiração;
* disponibilidade do psicólogo;
* não duplicação de oferta para o mesmo psicólogo;
* registro de aceite, rejeição, cancelamento e expiração;
* testes e2e quando envolver endpoint ou banco.

---

### Cupons

Cupons são um bounded context próprio.

Ao alterar `Coupon`, `UserCoupon` ou `CouponTemplate`, preserve:

* ciclo disponível → reservado → usado;
* reserva de 15 minutos;
* expiração;
* limites de uso;
* limite por usuário;
* categoria;
* tipo de desconto;
* teto para percentual;
* valor mínimo de compra;
* distribuição pública ou direcionada;
* geração automática por template;
* tokens de indicação dinâmicos e de uso único.

Cupom é mutuamente exclusivo com carteira e promoções.

Cupons usados não são revertidos; cancelamento deve gerar crédito na carteira quando esse módulo estiver ativo.

---

### Planos, assinaturas e pagamentos

Planos, assinaturas e pagamentos são áreas comerciais em evolução.

Não descomente modelos planejados ou crie migrations estruturais sem issue, PRD ou orientação explícita.

Não acople gateway de pagamento diretamente à regra de negócio.

Separe:

* intenção de pagamento;
* provedor;
* confirmação;
* efeito de domínio após pagamento aprovado.

Consultas, agenda e matching devem consultar permissões comerciais por contratos explícitos, sem conhecer detalhes internos de pagamento.

---

## ADRs

ADRs registram decisões arquiteturais.

Antes de alterar uma área que possua ADR, leia a decisão correspondente.

Se uma implementação solicitada contradizer ADR existente, não sobrescreva silenciosamente a decisão. Apresente:

1. qual ADR foi contradita;
2. qual regra, código ou issue entra em conflito;
3. quais opções existem;
4. quais riscos cada opção traz;
5. qual decisão humana é necessária.

Se não houver ADR para uma decisão arquitetural relevante, registre a ausência como risco quando a mudança for sensível ou estrutural.

---

## Quando atualizar documentação de domínio

Atualize `CONTEXT.md` ou proponha atualização quando a tarefa:

* criar novo conceito de domínio;
* alterar significado de conceito existente;
* criar novo status relevante;
* alterar fluxo de consulta, emergência, diário, aprovação profissional ou cupom;
* introduzir pagamento, plano, assinatura, carteira ou promoção;
* alterar regra de autorização;
* alterar contrato público de API;
* criar evento de domínio importante;
* alterar ciclo de vida de entidade persistida.

Não atualize documentação apenas para justificar uma implementação errada. Primeiro valide a regra de negócio.

---

## Saída esperada do agente ao encontrar problema de domínio

Quando encontrar inconsistência, conflito ou incerteza, responda com:

```md
## Bloqueio encontrado

Descreva a inconsistência, conflito ou incerteza.

## Arquivos ou regras envolvidos

- ...

## Opções possíveis

1. ...
2. ...

## Riscos

- ...

## Decisão necessária

Explique qual decisão humana é necessária para continuar.
```

Não continue a implementação até receber instrução.
