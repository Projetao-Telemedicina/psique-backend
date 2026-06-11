# AGENTS.md

Guia operacional para agentes de IA que trabalham neste repositório.

Este arquivo define como entender, modificar, testar e revisar o backend do Psique. Siga estas instruções antes de alterar código, testes, schema, documentação ou fluxos de domínio.

---

## 1. Propósito do projeto

O Psique é uma plataforma de telemedicina voltada para saúde mental.

O backend conecta pacientes a psicólogos cadastrados, permitindo:

* autenticação e gestão de usuários;
* perfis de pacientes;
* perfis de psicólogos;
* aprovação profissional;
* questionários de matching;
* agendamento de consultas;
* reagendamentos;
* avaliações;
* diário emocional;
* atendimento emergencial;
* integração com Google Calendar/Meet;
* cupons, indicações e regras comerciais em evolução.

O sistema lida com dados sensíveis de saúde mental. Qualquer alteração deve preservar privacidade, autorização, consistência de domínio e segurança.

---

## 2. Leitura obrigatória antes de qualquer implementação

Antes de modificar arquivos, leia:

1. `CONTEXT.md`
2. Este `AGENTS.md`
3. Documentos relevantes em `docs/`, especialmente:

   * `docs/agents/domain.md`, se existir;
   * `docs/agents/issue-tracker.md`, se a tarefa envolver issues;
   * `docs/agents/triage-labels.md`, se a tarefa envolver triagem;
   * ADRs em `docs/adr/`, se existirem.
4. Arquivos do módulo afetado em `src/`.
5. Testes relacionados em `src/**/*.spec.ts` e `test/**/*.e2e-spec.ts`.
6. `prisma/schema.prisma` quando a alteração envolver persistência.

Não implemente com base apenas no nome da issue ou no pedido inicial. Primeiro entenda o domínio e o módulo afetado.

---

## 3. Stack do projeto

O backend usa:

* NestJS;
* TypeScript;
* Prisma ORM;
* PostgreSQL;
* Jest;
* Supertest;
* class-validator;
* class-transformer;
* Passport/JWT;
* EventEmitter;
* Schedule/Cron;
* Swagger;
* Google APIs;
* Socket.IO;
* serviço auxiliar de matching em Python.

Scripts principais:

```bash
npm install
npm run prisma:generate
npm run cli
npm run db:dev:up
npm run prisma:migrate:dev
npm run start:dev
npm run dev:full
npm run test
npm run test:e2e:local
npm run lint
```

Para desenvolvimento local com backend e matching service:

```bash
npm run dev:full
```

Para documentação Swagger/API, subir a aplicação e acessar:

```txt
http://localhost:3000/api
```

---

## 4. Arquitetura de alto nível

A aplicação segue arquitetura modular do NestJS.

Módulos principais:

* `AuthModule`: autenticação, login, JWT e guards.
* `UsersModule`: operações comuns sobre usuários.
* `PatientsModule`: regras e endpoints de pacientes.
* `ProfessionalsModule`: regras e endpoints de psicólogos.
* `AppointmentModule`: consultas.
* `RescheduleModule`: reagendamentos.
* `GoogleCalendarModule`: integração com Google Calendar/Meet.
* `DiaryModule`: diário emocional.
* `MatchingModule`: compatibilidade entre pacientes e psicólogos.
* `ReviewModule`: avaliações.
* `PanicButtonModule`: atendimento emergencial.
* `PrismaModule`: acesso ao banco.
* `ScheduleModule`: tarefas agendadas.
* `EventEmitterModule`: eventos internos.

Ao criar ou alterar módulos:

* mantenha controllers finos;
* concentre regras de negócio em services;
* use DTOs para entrada e saída;
* use guards para autenticação/autorização;
* use pipes e `class-validator` para validação;
* use providers para integrações externas;
* não acople módulos por detalhes internos;
* exponha contratos claros quando outro módulo precisar consultar uma regra.

---

## 5. Vocabulário obrigatório do domínio

Use os termos de negócio definidos em `CONTEXT.md`.

Termos preferidos:

* "paciente", não "cliente";
* "psicólogo", não "terapeuta genérico", quando falar do profissional da plataforma;
* "consulta", não "sessão", quando falar da entidade agendada;
* "reagendamento", não "remarcação";
* "diário emocional", não "journal";
* "matching" para compatibilidade entre paciente e psicólogo;
* "atendimento emergencial" para busca rápida de psicólogo disponível;
* "plano" e "assinatura" para área comercial recorrente;
* "cupom", não "voucher" ou "promo code";
* "cupom de usuário" para o vínculo entre paciente e cupom;
* "template de cupom" para o modelo base de geração automática;
* "reserva" para o bloqueio temporário do cupom durante checkout;
* "indicação" ou "referral" para convite entre pacientes.

Termos técnicos que devem ser preservados no código quando já existirem:

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

Não invente termos novos para conceitos existentes. Se um novo termo de domínio for realmente necessário, atualize `CONTEXT.md`.

---

## 6. Papéis do sistema

### Usuário

Entidade base autenticável.

No código, fica em `User`.

Roles existentes:

* `ADMIN`
* `PROFESSIONAL`
* `PATIENT`

Use "usuário" quando estiver falando da entidade comum a todos os papéis.

### Paciente

Usuário com `role = PATIENT` e `PatientProfile`.

Um paciente pode:

* responder questionário de matching;
* buscar psicólogos compatíveis;
* agendar consultas;
* solicitar reagendamentos;
* registrar entradas no diário emocional;
* compartilhar ou não o diário com profissionais;
* solicitar atendimento emergencial;
* avaliar psicólogos após consultas;
* usar cupons quando elegível.

### Psicólogo

Usuário com `role = PROFESSIONAL` e `ProfessionalProfile`.

Um psicólogo pode:

* cadastrar dados profissionais;
* informar CRP;
* enviar solicitação de aprovação;
* responder questionário profissional;
* ficar online ou offline;
* aceitar ou rejeitar ofertas de atendimento emergencial;
* atender consultas agendadas;
* receber avaliações;
* configurar intervalo entre consultas;
* assinar planos pagos quando o módulo comercial estiver ativo.

### Administrador

Usuário com `role = ADMIN`.

Um administrador pode:

* revisar solicitações profissionais;
* aprovar ou rejeitar cadastros de psicólogos;
* auditar dados operacionais;
* dar suporte a pacientes e psicólogos;
* atuar em casos de conflito, bloqueio ou revisão manual;
* criar, distribuir ou auditar cupons conforme as regras do domínio.

---

## 7. Regras gerais para agentes

Antes de codar, faça sempre:

1. Leia `CONTEXT.md`.
2. Identifique módulos afetados.
3. Identifique entidades Prisma afetadas.
4. Identifique endpoints afetados.
5. Identifique guards, roles e regras de autorização envolvidas.
6. Identifique testes existentes.
7. Explique um plano curto.
8. Aponte riscos de domínio, privacidade ou migração.

Durante a implementação:

1. Prefira TDD quando a mudança tiver regra de negócio clara.
2. Faça uma mudança vertical pequena por vez.
3. Não misture feature grande com refatoração grande.
4. Não altere comportamento fora do escopo.
5. Não crie abstrações sem necessidade real.
6. Não duplique regra de negócio em controllers.
7. Não ignore erros de lint, testes ou typecheck.
8. Não remova testes existentes sem justificar.
9. Não altere schema sem avaliar migrations, seeds e e2e.
10. Documente comandos executados e resultados.

Ao finalizar, informe:

* resumo da alteração;
* arquivos principais alterados;
* regras de domínio preservadas;
* testes executados;
* testes não executados e motivo;
* riscos restantes, se houver.

### 7.1 Regra de parada em caso de inconsistência, conflito ou incerteza

Se houver qualquer inconsistência, conflito, ambiguidade ou incerteza relevante durante a implementação, o agente deve parar antes de tomar decisão autônoma.

Isso inclui, mas não se limita a:

* conflito entre `CONTEXT.md`, `AGENTS.md`, ADRs, issue, PRD ou código existente;
* regra de domínio incompleta ou contraditória;
* dúvida sobre autorização, privacidade ou exposição de dados sensíveis;
* dúvida sobre fluxo de saúde mental, atendimento emergencial, consulta, diário emocional, aprovação profissional, pagamento, cupom, plano ou assinatura;
* alteração que possa quebrar contrato de API;
* necessidade de migration destrutiva ou alteração estrutural no banco;
* comportamento existente sem teste claro;
* teste existente contradizendo a regra solicitada;
* dependência externa, variável de ambiente ou integração não documentada;
* escopo maior do que o descrito na issue ou no pedido.

Nesses casos, o agente deve apresentar os fatos de forma objetiva e aguardar instruções humanas antes de continuar.

O agente deve informar:

1. qual inconsistência, conflito ou incerteza foi encontrada;
2. quais arquivos, regras ou comportamentos estão envolvidos;
3. quais opções parecem possíveis, sem escolher uma automaticamente;
4. quais impactos ou riscos cada opção pode ter;
5. qual decisão humana é necessária para prosseguir.

O agente não deve:

* escolher silenciosamente uma interpretação;
* alterar regra de domínio sensível por conta própria;
* criar migration destrutiva sem aprovação;
* remover ou adaptar teste contraditório sem aprovação;
* mudar contrato de API sem aprovação;
* contornar autorização, privacidade ou validação para concluir a tarefa;
* ampliar escopo para resolver ambiguidades.

---

## 8. Estilo NestJS esperado

### Controllers

Controllers devem:

* receber requisições HTTP;
* aplicar decorators de rota;
* usar DTOs;
* chamar services;
* retornar respostas serializáveis;
* não conter regra de negócio complexa;
* não acessar Prisma diretamente;
* não montar queries complexas.

Evite:

```ts
// Evite regra de negócio no controller
if (appointment.status === 'CANCELED') {
  throw new BadRequestException();
}
```

Prefira:

```ts
return this.appointmentService.cancelAppointment(user.id, appointmentId);
```

### Services

Services devem:

* concentrar regras de negócio;
* orquestrar repositórios/providers;
* validar transições de domínio;
* lançar exceções NestJS apropriadas;
* manter métodos pequenos e nomeados por intenção.

Evite services gigantes. Quando necessário, extraia:

* domain services;
* policy services;
* calculator services;
* factories;
* validators;
* mappers;
* providers de integração.

### Modules

Modules devem:

* declarar providers do próprio contexto;
* importar apenas módulos necessários;
* exportar somente contratos usados por outros módulos;
* evitar dependência circular.

Se houver dependência circular, reavalie o desenho antes de usar `forwardRef`.

### DTOs

DTOs devem:

* usar `class-validator`;
* usar `class-transformer` quando necessário;
* representar entrada e saída de API;
* não conter regra de domínio complexa;
* não expor campos sensíveis sem necessidade.

Use DTOs separados para criação, atualização, query params e resposta quando isso melhorar clareza.

### Guards e autorização

Use guards para autenticação e autorização.

Todo endpoint sensível deve validar:

* usuário autenticado;
* papel adequado;
* propriedade do recurso;
* relação autorizada entre paciente e psicólogo;
* restrição administrativa quando aplicável.

Não confie apenas em IDs recebidos pelo cliente.

### Exceptions

Use exceções HTTP do NestJS:

* `BadRequestException` para entrada inválida ou transição inválida;
* `UnauthorizedException` para ausência/falha de autenticação;
* `ForbiddenException` para falta de permissão;
* `NotFoundException` quando recurso não existir ou não puder ser revelado;
* `ConflictException` para conflito de estado ou unicidade;
* `InternalServerErrorException` apenas para falhas inesperadas.

Não exponha detalhes internos, stack traces, tokens, CPF, CRP, e-mail, dados de diário ou dados médicos em mensagens de erro.

---

## 9. Prisma e banco de dados

O `prisma/schema.prisma` é a fonte de verdade para entidades persistidas.

Ao alterar modelos:

1. Atualize `prisma/schema.prisma`.
2. Gere migration quando necessário.
3. Rode Prisma Client generation.
4. Atualize seeds, se necessário.
5. Atualize testes unitários.
6. Atualize testes e2e, se endpoints ou banco forem afetados.
7. Verifique relações, índices e constraints.
8. Garanta que regras de unicidade importantes estejam no banco quando possível.

Comandos relevantes:

```bash
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:migrate:test
npm run db:seed
```

Regras:

* não edite migrations antigas sem motivo explícito;
* não descomente modelos planejados sem PRD ou issue clara;
* não use `any` para contornar tipos do Prisma;
* não faça queries que exponham dados de outros usuários;
* selecione apenas campos necessários;
* prefira transações para operações que precisam ser atômicas;
* trate concorrência em reservas, uso de cupom, agendamento e emergências.

---

## 10. Testes

Antes de concluir qualquer implementação, rode o menor conjunto de testes relevante.

Comandos esperados:

```bash
npm run test
npm run test:e2e:local
npm run lint
```

Use `npm run test:e2e:local` quando a mudança afetar:

* endpoints;
* banco;
* autenticação;
* autorização;
* consultas;
* pacientes;
* psicólogos;
* matching;
* diário emocional;
* emergências;
* cupons;
* integrações externas mockadas;
* fluxos com múltiplas entidades.

Use testes unitários quando a mudança estiver isolada em:

* services;
* validações;
* mapeamentos;
* cálculos;
* policies;
* factories;
* helpers puros.

Fluxo TDD recomendado:

1. Escreva ou ajuste um teste que falha.
2. Rode o teste e confirme a falha.
3. Implemente o mínimo para passar.
4. Rode o teste novamente.
5. Rode testes relacionados.
6. Refatore sem mudar comportamento.
7. Rode lint e testes finais.

Não altere snapshots, fixtures ou seeds apenas para esconder bug.

---

## 11. Privacidade e segurança

O sistema lida com dados sensíveis de saúde mental.

Trate como sensíveis:

* dados pessoais;
* CPF;
* e-mail;
* telefone;
* endereço;
* CRP;
* diário emocional;
* questionários;
* histórico de consultas;
* solicitações emergenciais;
* avaliações;
* documentos profissionais;
* dados de pagamento;
* dados de cupom vinculados a usuário quando identificáveis.

Regras obrigatórias:

* não exponha dados sensíveis em logs;
* não exponha dados sensíveis em erros;
* não retorne campos privados em endpoints públicos;
* não permita enumeração de usuários;
* não permita que pacientes acessem dados privados de outros pacientes;
* não permita que psicólogos acessem dados de pacientes sem relação autorizada;
* não permita que administradores recebam mais dados do que o necessário para operação;
* não exponha conteúdo do diário emocional sem consentimento do paciente;
* não registre tokens ou credenciais;
* não faça bypass de guards em testes sem deixar claro o motivo.

Ao lidar com logs, prefira IDs internos e mensagens genéricas.

---

## 12. Diretrizes por bounded context

### 12.1 Autenticação e usuários

Ao alterar autenticação:

* preserve hashing seguro de senhas;
* preserve validação de JWT;
* preserve roles;
* não retorne senha, hash, tokens internos ou dados sensíveis;
* teste login, registro e rotas protegidas;
* verifique impacto em guards.

Ao alterar `User`:

* preserve separação entre usuário base e perfis;
* não misture campos específicos de paciente ou psicólogo no modelo base sem justificativa;
* mantenha consistência entre `role` e perfil associado.

### 12.2 Pacientes

Ao alterar `PatientProfile`:

* preserve vínculo com `User`;
* preserve contato de emergência quando usado;
* preserve configuração de compartilhamento do diário;
* não exponha dados privados a outros pacientes ou psicólogos sem autorização;
* teste propriedade do recurso.

### 12.3 Psicólogos e aprovação profissional

Psicólogos precisam passar por aprovação antes de atender.

Ao alterar `ProfessionalProfile` ou `ProfessionalRequest`:

* preserve status `PENDING`, `APPROVED` e `REJECTED`;
* registre administrador revisor quando aplicável;
* preserve motivo de rejeição;
* não permita que profissional rejeitado atenda como aprovado;
* valide CRP como identificador profissional importante;
* proteja documentos profissionais;
* teste fluxos de aprovação, rejeição e acesso por role.

### 12.4 Consultas

Consultas são o centro operacional da plataforma.

Ao alterar `Appointment`:

* preserve relação entre paciente e psicólogo;
* preserve horário de início e fim;
* preserve status correto;
* verifique conflitos de agenda;
* verifique intervalo entre consultas do psicólogo;
* verifique integração com Google Calendar quando aplicável;
* não misture cancelamento, conclusão e reagendamento sem transições claras;
* teste cenários de conflito, autorização e status.

Status de consulta:

* `SCHEDULED`
* `RESCHEDULE_REQUESTED`
* `CANCELED`
* `COMPLETED`
* `NO_SHOW`

### 12.5 Reagendamentos

Ao alterar `AppointmentRescheduleRequest`:

* preserve histórico da consulta original;
* registre quem solicitou;
* preserve status da solicitação;
* não altere horário da consulta antes de aceite quando a regra exigir confirmação;
* trate expiração quando aplicável;
* teste aceite, rejeição e permissões.

Status de reagendamento:

* `PENDING`
* `ACCEPTED`
* `REJECTED`
* `EXPIRED`

### 12.6 Matching

O matching deve ser testável e explicável.

Ao alterar matching:

* separe dados declarados pelo paciente;
* separe dados declarados pelo psicólogo;
* separe algoritmo de compatibilidade;
* separe resultado apresentado ao paciente;
* evite regras mágicas sem nome;
* documente pesos e critérios importantes;
* crie testes com pacientes e psicólogos representativos;
* preserve questionários como fonte dos dados declarados;
* não acople matching a pagamento, agenda ou consulta sem contrato claro.

### 12.7 Diário emocional

O diário emocional pertence ao paciente.

Ao alterar `DiaryEntry`:

* o paciente deve controlar seus próprios registros;
* compartilhamento com psicólogos depende da configuração do paciente;
* não exponha conteúdo do diário para psicólogos sem autorização;
* não inclua conteúdo sensível em logs;
* teste acesso do dono, bloqueio de terceiros e compartilhamento autorizado.

### 12.8 Avaliações

Ao alterar `Review`:

* avaliação deve pertencer a consulta, paciente e psicólogo;
* paciente só deve avaliar consultas próprias;
* avaliação deve respeitar conclusão da consulta quando essa regra existir;
* não permita avaliações duplicadas se a regra exigir unicidade;
* atualize média do psicólogo de forma consistente;
* teste autorização e consistência.

### 12.9 Atendimento emergencial

O fluxo emergencial é sensível.

Ao alterar `EmergencyRequest`, `EmergencyOffer` ou `PanicButtonModule`:

* preserve transições explícitas de status;
* evite duplicar ofertas para o mesmo psicólogo na mesma solicitação;
* respeite expiração de solicitações e ofertas;
* garanta que apenas psicólogos disponíveis recebam ofertas;
* registre cancelamento, aceite, rejeição e expiração;
* evite logs com detalhes sensíveis;
* cubra com testes e2e quando envolver endpoint ou banco.

Status de solicitação emergencial:

* `SEARCHING`
* `OFFER_PENDING`
* `MATCHED`
* `EXPIRED`
* `CANCELLED`

Status de oferta emergencial:

* `PENDING`
* `ACCEPTED`
* `REJECTED`
* `EXPIRED`
* `CANCELLED`

### 12.10 Google Calendar/Meet

Ao alterar integração com Google Calendar/Meet:

* isole chamadas externas em provider/service próprio;
* não acople regra de consulta diretamente à API externa;
* trate falhas externas de forma segura;
* não exponha tokens;
* use mocks em testes;
* preserve consistência entre consulta local e evento externo;
* documente comportamento quando a integração falhar.

### 12.11 Cupons

Cupons são um bounded context próprio.

Outros módulos devem consultar permissões, reservas e cálculos de cupom por contratos explícitos, sem conhecer detalhes internos.

Entidades principais:

* `Coupon`
* `UserCoupon`
* `CouponTemplate`

Regras obrigatórias:

* preserve ciclo de vida disponível → reservado → usado;
* um cupom de usuário disponível tem `isUsed = false` e `reservedAt = null`;
* um cupom reservado tem `reservedAt` preenchido;
* reserva expira em 15 minutos se o pagamento não for concluído;
* um cupom usado tem `isUsed = true` e `usedAt` preenchido;
* paciente não pode possuir o mesmo cupom mais de uma vez;
* cupom é mutuamente exclusivo com carteira e promoções;
* valide categoria do cupom contra o contexto da transação;
* `SINGLE_APPOINTMENT` vale para consulta avulsa;
* `PLAN_SUBSCRIPTION` vale para assinatura de plano;
* `PERCENTAGE` sempre deve ter teto;
* teto padrão percentual é R$ 100,00;
* `FIXED` nunca deve gerar total negativo;
* respeite valor mínimo de compra;
* respeite limite total de uso;
* respeite limite de uso por usuário;
* respeite expiração;
* respeite distribuição `PUBLIC` ou `TARGETED`;
* cupons usados não são revertidos;
* cancelamento de consulta paga com cupom gera crédito na carteira quando esse módulo estiver ativo;
* cupons automáticos são cópias independentes criadas a partir de templates;
* tokens de indicação devem ser dinâmicos e de uso único;
* job de limpeza deve liberar reservas expiradas periodicamente.

Categorias:

* `SINGLE_APPOINTMENT`
* `PLAN_SUBSCRIPTION`

Tipos de desconto:

* `PERCENTAGE`
* `FIXED`

Distribuição:

* `PUBLIC`
* `TARGETED`

Templates existentes:

* `WELCOME`: paciente conclui a primeira consulta; expira em 30 dias.
* `REFERRAL`: indicado conclui a primeira consulta; quem indicou e indicado recebem cupom; expira em 30 dias.

Ao implementar ou refatorar cupons, prefira separar:

* validação de elegibilidade;
* cálculo de desconto;
* reserva;
* confirmação de uso;
* liberação de reserva expirada;
* geração automática por template;
* distribuição manual por admin;
* aplicação em consulta;
* aplicação em assinatura.

Não espalhe regra de cupom em controllers de consulta, pagamento ou usuário.

### 12.12 Planos, assinaturas e pagamentos

A área comercial deve ser tratada como bounded context próprio.

Áreas planejadas incluem:

* carteira;
* métodos de pagamento;
* planos;
* assinaturas;
* promoções de psicólogos;
* pagamentos.

Regras:

* não descomente modelos planejados sem PRD ou issue clara;
* não misture regra de plano diretamente em consultas, usuários ou psicólogos;
* não acople gateway de pagamento à regra de negócio;
* separe intenção de pagamento, provedor, confirmação e efeito de domínio;
* consultas, matching e agenda devem consultar permissões comerciais por interface clara;
* cupom é mutuamente exclusivo com carteira e promoções em uma transação.

Serviços esperados no futuro podem incluir verificações como:

* psicólogo possui assinatura ativa;
* plano permite determinada quantidade de consultas;
* limite já foi consumido;
* recurso está liberado pelo plano;
* assinatura venceu ou está inadimplente.

---

## 13. Eventos, jobs e tarefas agendadas

O projeto usa eventos internos e schedule/cron.

Ao trabalhar com eventos:

* nomeie eventos por ação de domínio;
* evite efeitos colaterais escondidos;
* mantenha payload mínimo;
* não inclua dados sensíveis desnecessários;
* teste handlers importantes;
* documente eventos que disparam cupom, indicação, notificação ou pagamento.

Ao trabalhar com jobs:

* garanta idempotência;
* garanta que rodar duas vezes não corrompa estado;
* trate concorrência;
* registre apenas informações seguras;
* cubra limpeza de reservas expiradas, ofertas expiradas e outros estados temporais.

---

## 14. Estrutura esperada de implementação

Para uma nova feature em NestJS, prefira estrutura semelhante a:

```txt
src/<context>/
  <context>.module.ts
  <context>.controller.ts
  <context>.service.ts
  dto/
    create-<resource>.dto.ts
    update-<resource>.dto.ts
    <resource>-response.dto.ts
  tests ou *.spec.ts
```

Quando a regra crescer, considere:

```txt
src/<context>/
  policies/
  validators/
  calculators/
  mappers/
  events/
  jobs/
  providers/
```

Não crie pastas genéricas como `utils` para regra de domínio importante. Nomeie pelo papel no domínio.

---

## 15. Padrões de código TypeScript

Siga estas regras:

* evite `any`;
* prefira tipos explícitos em contratos públicos;
* evite funções longas;
* evite duplicação de regra;
* use nomes expressivos;
* use early return quando melhorar legibilidade;
* não silencie erros sem justificativa;
* não use comentários para explicar código confuso: refatore;
* use comentários apenas para decisões de domínio ou integrações não óbvias;
* mantenha imports organizados;
* remova código morto;
* remova logs temporários;
* não commite credenciais, tokens ou arquivos `.env`.

---

## 16. Validação e transformação

Entradas de API devem ser validadas com DTOs.

Use decorators como:

* `@IsString()`
* `@IsEmail()`
* `@IsEnum()`
* `@IsOptional()`
* `@IsBoolean()`
* `@IsNumber()`
* `@Min()`
* `@Max()`
* `@IsDateString()`
* `@ValidateNested()`

Para valores monetários:

* valide limites;
* evite valores negativos;
* documente unidade usada;
* garanta arredondamento consistente;
* teste bordas como zero, teto máximo, valor maior que total e compra mínima.

---

## 17. Autorização por recurso

Além de role, valide propriedade e relação.

Exemplos:

* paciente só acessa seu próprio diário;
* paciente só avalia consulta própria;
* paciente só usa seu próprio cupom de usuário;
* psicólogo só acessa dados de paciente quando existe relação autorizada;
* psicólogo só altera sua própria disponibilidade;
* admin acessa fluxos operacionais, mas endpoints devem retornar apenas o necessário;
* profissional não aprovado não deve atender como aprovado.

Não implemente endpoints que aceitam `userId` livremente quando o ID deve vir do usuário autenticado.

---

## 18. API e Swagger

Ao criar ou alterar endpoints:

* use decorators de Swagger quando o padrão do módulo já usar;
* mantenha nomes de rotas consistentes;
* documente parâmetros, body e respostas;
* mantenha status HTTP adequado;
* não quebre contrato sem necessidade;
* atualize testes e2e;
* verifique `http://localhost:3000/api` localmente quando possível.

---

## 19. Seeds e ambiente local

Ao alterar dados necessários para desenvolvimento:

* atualize seeds;
* preserve usuários de teste quando existirem;
* garanta que `npm run db:seed` continue funcionando;
* não dependa de dados manuais;
* não coloque dados reais em seeds;
* mantenha dados fictícios seguros.

---

## 20. Issues e triagem

Issue bem formada deve conter:

```md
## Objetivo

O que deve ser entregue.

## Contexto

Quais módulos, entidades e regras de domínio são relevantes.

## Escopo

O que deve ser alterado.

## Fora de escopo

O que não deve ser alterado agora.

## Critérios de aceitação

Condições observáveis para considerar pronto.

## Testes esperados

Comandos e cenários que devem ser cobertos.
```

Labels canônicas de triagem:

* `needs-triage`
* `needs-info`
* `ready-for-agent`
* `ready-for-human`
* `wontfix`

Se uma issue estiver incompleta, peça ou registre as informações faltantes antes de alterar código sensível.

---

## 21. Fluxo recomendado para agentes

Use este fluxo para implementar tarefas:

```txt
1. Ler CONTEXT.md e AGENTS.md.
2. Ler docs/agents relevantes e ADRs.
3. Ler issue/PRD.
4. Identificar domínio afetado.
5. Identificar módulos, services, controllers, DTOs e entidades Prisma.
6. Identificar testes existentes.
7. Resumir entendimento.
8. Listar plano curto.
9. Implementar teste falhando quando aplicável.
10. Implementar o mínimo.
11. Rodar teste específico.
12. Refatorar.
13. Rodar testes relacionados.
14. Rodar lint.
15. Atualizar documentação quando necessário.
16. Resumir resultado e comandos executados.
```

Modelo de resposta antes de codar:

```md
## Entendimento

Resumo curto da tarefa.

## Módulos afetados

- ...

## Plano

1. ...
2. ...
3. ...

## Riscos

- ...

## Testes previstos

- ...
```

Modelo de resposta ao finalizar:

```md
## Entregue

- ...

## Arquivos principais

- ...

## Testes executados

- `npm run ...`

## Observações

- ...
```

---

## 22. O que não fazer

Não faça:

* não ignore `CONTEXT.md`;
* não altere termos de domínio sem atualizar documentação;
* não crie módulos genéricos sem bounded context claro;
* não acesse Prisma diretamente em controllers;
* não exponha dados sensíveis;
* não faça bypass de autorização;
* não misture paciente e psicólogo em regras ambíguas;
* não altere migrations antigas sem justificativa;
* não descomente modelos planejados sem PRD ou issue;
* não implemente pagamentos reais sem separar gateway e domínio;
* não espalhe regra de cupom em módulos não comerciais;
* não altere matching sem testes explicáveis;
* não altere emergências sem pensar em status, expiração e disponibilidade;
* não remova testes para fazer build passar;
* não finalize sem informar testes executados.

---

## 23. Checklist de PR

Antes de abrir ou finalizar um PR, verifique:

* [ ] `CONTEXT.md` foi respeitado.
* [ ] Termos de domínio estão corretos.
* [ ] Escopo da issue foi mantido.
* [ ] Controllers continuam finos.
* [ ] Services concentram regra de negócio.
* [ ] DTOs validam entrada.
* [ ] Guards/autorização foram considerados.
* [ ] Dados sensíveis não foram expostos.
* [ ] Prisma schema/migrations foram atualizados quando necessário.
* [ ] Seeds foram atualizados quando necessário.
* [ ] Testes unitários foram criados ou ajustados.
* [ ] Testes e2e foram criados ou ajustados quando necessário.
* [ ] `npm run lint` foi executado ou motivo foi informado.
* [ ] `npm run test` ou teste específico foi executado.
* [ ] `npm run test:e2e:local` foi executado quando aplicável.
* [ ] Documentação foi atualizada quando necessário.
* [ ] Riscos e pendências foram registrados.

---

## 24. Comandos úteis

Instalação:

```bash
npm install
```

Gerar Prisma Client:

```bash
npm run prisma:generate
```

Subir banco de desenvolvimento:

```bash
npm run db:dev:up
```

Rodar migrations em desenvolvimento:

```bash
npm run prisma:migrate:dev
```

Subir aplicação:

```bash
npm run start:dev
```

Subir backend com matching service:

```bash
npm run dev:full
```

Rodar testes unitários:

```bash
npm run test
```

Rodar testes e2e locais:

```bash
npm run test:e2e:local
```

Rodar lint:

```bash
npm run lint
```

Abrir CLI do projeto:

```bash
npm run cli
```

Popular banco de desenvolvimento:

```bash
npm run db:seed
```

---

## 25. Prioridade das instruções

Quando houver conflito:

1. Segurança e privacidade vêm primeiro.
2. A regra de parada em caso de inconsistência, conflito ou incerteza deve ser obedecida antes de qualquer decisão autônoma.
3. `CONTEXT.md` define o domínio.
4. Este `AGENTS.md` define o modo de trabalho dos agentes.
5. ADRs definem decisões arquiteturais aceitas.
6. Issues/PRDs definem escopo específico.
7. Código existente orienta convenções locais.
8. Preferências pontuais do solicitante valem apenas se não conflitarem com os itens acima.

Se a prioridade entre duas instruções ainda não estiver clara, o agente deve apresentar os fatos e aguardar instrução humana.

---

## 26. Estado atual do domínio

O sistema já possui base para:

* usuários com papéis;
* perfis de paciente;
* perfis de psicólogo;
* aprovação profissional;
* consultas;
* reagendamentos;
* avaliações;
* atendimento emergencial;
* diário emocional;
* questionários de matching;
* integração com Google Calendar/Meet;
* seeds de desenvolvimento;
* testes unitários e e2e;
* cupons em evolução na branch atual.

A próxima evolução importante do domínio é consolidar os contextos comerciais, especialmente cupons, planos, assinaturas, pagamentos e direitos de uso dos psicólogos, mantendo baixo acoplamento com consultas, agenda e matching.
