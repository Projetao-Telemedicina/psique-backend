# Context

## O que é o Psique

O Psique é uma plataforma de telemedicina voltada para saúde mental. O sistema conecta pacientes a psicólogos cadastrados na plataforma, permitindo cadastro, triagem, matching, agendamento de consultas, acompanhamento emocional e atendimento emergencial.

O backend deste repositório é responsável por autenticação, gestão de usuários, perfis de pacientes e psicólogos, solicitações de aprovação profissional, questionários de matching, consultas, reagendamentos, diário emocional, avaliações e fluxos de atendimento emergencial.

## Objetivo do produto

O objetivo principal é permitir que:

* Pacientes encontrem psicólogos compatíveis com suas necessidades.
* Psicólogos se cadastrem na plataforma e sejam aprovados para atender.
* A plataforma controle disponibilidade, consultas, reagendamentos, avaliações e atendimentos emergenciais.
* Planos pagos definam os direitos de uso dos psicólogos, como quantidade de consultas disponíveis, recursos de destaque ou acesso a funcionalidades adicionais.
* Administradores consigam revisar cadastros profissionais, auditar dados e manter a operação da plataforma.

## Papéis do sistema

### Usuário

Pessoa autenticável no sistema.

No código, todo usuário base fica no modelo `User`. Um usuário possui uma `role`, que define seu papel principal no sistema.

Roles existentes:

* `ADMIN`
* `PROFESSIONAL`
* `PATIENT`

Use "usuário" quando estiver falando da entidade base comum a todos os papéis.

### Paciente

Usuário que busca atendimento psicológico pela plataforma.

No código, o paciente é representado por um `User` com `role = PATIENT` e um `PatientProfile`.

Um paciente pode:

* Responder questionário de matching.
* Buscar psicólogos compatíveis.
* Agendar consultas.
* Solicitar reagendamentos.
* Registrar entradas no diário emocional.
* Compartilhar ou não o diário com profissionais.
* Solicitar atendimento emergencial.
* Avaliar psicólogos após consultas.

### Psicólogo

Usuário profissional que presta atendimento psicológico na plataforma.

No código atual, o termo técnico usado é `Professional`. No domínio do produto, preferimos o termo "psicólogo" quando a conversa for sobre negócio, experiência do usuário ou regra de produto.

Um psicólogo é representado por um `User` com `role = PROFESSIONAL` e um `ProfessionalProfile`.

Um psicólogo pode:

* Cadastrar dados profissionais.
* Informar CRP.
* Enviar solicitação de aprovação.
* Responder questionário profissional.
* Ficar online ou offline.
* Aceitar ou rejeitar ofertas de atendimento emergencial.
* Atender consultas agendadas.
* Receber avaliações.
* Configurar intervalo entre consultas.
* Assinar planos pagos da plataforma quando o módulo comercial estiver ativo.

### Administrador

Usuário responsável pela operação interna da plataforma.

No código, é um `User` com `role = ADMIN`.

Um administrador pode:

* Revisar solicitações de psicólogos.
* Aprovar ou rejeitar cadastros profissionais.
* Auditar dados operacionais.
* Dar suporte a pacientes e psicólogos.
* Atuar em casos de conflito, bloqueio ou revisão manual.

## Vocabulário do domínio

### Perfil de paciente

Dados específicos de um paciente, separados da entidade base `User`.

Inclui contato de emergência e configuração de compartilhamento do diário emocional.

Termo técnico no código: `PatientProfile`.

### Perfil profissional

Dados específicos de um psicólogo, separados da entidade base `User`.

Inclui CRP, especialidade, status de aprovação, status online, disponibilidade para emergência, média de avaliação e intervalo entre consultas.

Termo técnico no código: `ProfessionalProfile`.

### Solicitação profissional

Pedido de validação feito por um psicólogo para poder atender na plataforma.

Termo técnico no código: `ProfessionalRequest`.

Uma solicitação profissional pode estar:

* `PENDING`: aguardando análise.
* `APPROVED`: aprovada.
* `REJECTED`: rejeitada.

### Documento profissional

Arquivo enviado junto à solicitação profissional.

Termo técnico no código: `ProfessionalRequestDocument`.

Use para documentos de validação profissional, como comprovantes, certificados ou documentos exigidos pela plataforma.

### Consulta

Sessão agendada entre paciente e psicólogo.

Termo técnico no código: `Appointment`.

Uma consulta possui paciente, psicólogo, horário de início, horário de fim, preço e status.

Status de consulta:

* `SCHEDULED`: consulta marcada.
* `RESCHEDULE_REQUESTED`: existe uma solicitação de reagendamento pendente.
* `CANCELED`: consulta cancelada.
* `COMPLETED`: consulta concluída.
* `NO_SHOW`: uma das partes não compareceu.

### Reagendamento

Pedido para alterar o horário de uma consulta existente.

Termo técnico no código: `AppointmentRescheduleRequest`.

Um reagendamento deve preservar o histórico da consulta original e registrar quem solicitou a alteração.

Status de reagendamento:

* `PENDING`
* `ACCEPTED`
* `REJECTED`
* `EXPIRED`

### Avaliação

Feedback deixado pelo paciente sobre o psicólogo após uma consulta.

Termo técnico no código: `Review`.

Uma avaliação pertence a uma consulta, um paciente e um psicólogo.

### Diário emocional

Registro feito pelo paciente sobre como está se sentindo.

Termo técnico no código: `DiaryEntry`.

Pode conter sentimento, qualidade do sono, sintomas e conteúdo textual.

O diário só deve ser compartilhado com psicólogos quando `shareDiaryWithProfessionals` estiver ativo no perfil do paciente.

### Questionário de paciente

Questionário usado para entender necessidades, preferências e contexto do paciente.

Termo técnico no código: `PatientQuestionnaire`.

Usado pelo fluxo de matching.

### Questionário profissional

Questionário usado para entender abordagem, especialidade, estilo terapêutico e contexto de atendimento do psicólogo.

Termo técnico no código: `ProfessionalQuestionnaire`.

Usado pelo fluxo de matching.

### Matching

Processo que relaciona pacientes a psicólogos compatíveis.

O matching deve considerar questionários, contexto terapêutico, preferências, disponibilidade e regras de negócio da plataforma.

Quando alterar matching, preserve a separação entre:

* Dados declarados pelo paciente.
* Dados declarados pelo psicólogo.
* Algoritmo de compatibilidade.
* Resultado apresentado ao paciente.

### Atendimento emergencial

Fluxo em que um paciente solicita atendimento rápido e o sistema procura psicólogos disponíveis.

Termos técnicos no código:

* `EmergencyRequest`
* `EmergencyOffer`

Uma solicitação emergencial representa a busca do paciente por atendimento. Uma oferta emergencial representa a tentativa de encaminhar esse atendimento a um psicólogo específico.

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

### Plano

Produto comercial que define o que um psicólogo pode usar na plataforma.

O plano deve controlar direitos como quantidade de consultas disponíveis, acesso a funcionalidades, recursos de promoção ou outros limites definidos pela regra de negócio.

No schema atual, modelos relacionados a planos, assinaturas e pagamentos aparecem como estrutura planejada/comentada. Ao implementar essa área, trate-a como módulo comercial e não misture regras de plano diretamente nos módulos de consulta, usuário ou psicólogo.

### Assinatura

Vínculo entre um usuário, normalmente psicólogo, e um plano pago.

A assinatura define o status comercial do psicólogo e seus direitos de uso durante um período.

Status planejados para assinatura:

* `PENDING`
* `ACTIVE`
* `OVERDUE`
* `CANCELED`
* `EXPIRED`

### Cupom

Desconto que o paciente pode aplicar em uma consulta avulsa ou assinatura de plano.

Termo técnico no código: `Coupon`.

Um cupom possui:

* Código único (automático com prefixo `PSIQUE` ou manual).
* Categoria: `SINGLE_APPOINTMENT` (consulta avulsa) ou `PLAN_SUBSCRIPTION` (assinatura de plano).
* Tipo de desconto: `PERCENTAGE` (percentual com teto) ou `FIXED` (valor fixo limitado ao total da compra).
* Valor do desconto.
* Teto máximo de desconto para percentual (default R$ 100,00).
* Valor mínimo de compra para aplicação (default R$ 0,00).
* Limite de usos totais, usos atuais e usos por usuário.
* Tipo de distribuição: `PUBLIC` (visível para auto-resgate) ou `TARGETED` (só admin distribui).
* Se é válido apenas para a primeira mensalidade de assinatura.
* Data de expiração.

Cupons são criados manualmente pelo admin ou automaticamente pelo sistema a partir de templates.

### Cupom de usuário

Vínculo entre um paciente e um cupom, representando um cupom que o paciente possui.

Termo técnico no código: `UserCoupon`.

O ciclo de vida do cupom de usuário transita entre:

* **Disponível**: `isUsed = false`, `reservedAt = null`. O paciente pode aplicar o cupom.
* **Reservado**: `reservedAt` preenchido. O paciente selecionou o cupom na tela de pagamento. A reserva expira em 15 minutos se o pagamento não for concluído.
* **Usado**: `isUsed = true`, `usedAt` preenchido. O cupom foi consumido e não pode ser reutilizado.

Um paciente não pode possuir o mesmo cupom mais de uma vez (`@@unique([couponId, userId])`).

Quando uma consulta paga com cupom é cancelada, o valor do desconto volta como crédito na carteira. O cupom de usuário permanece `isUsed = true`.

### Template de cupom

Modelo base para geração automática de cupons pelo sistema.

Termo técnico no código: `CouponTemplate`.

Templates definem os parâmetros padrão (valor, categoria, tipo de desconto, expiração). Quando um evento de negócio dispara, o sistema cria uma cópia independente do cupom para o paciente a partir do template.

Templates existentes:

* `WELCOME`: paciente conclui a primeira consulta. Cupom expira em 30 dias.
* `REFERRAL`: indicado conclui a primeira consulta. Ambos (quem indicou e o indicado) recebem o cupom. Expira em 30 dias.

### Reserva de cupom

Período de 15 minutos durante o qual um cupom de usuário fica bloqueado para uso após o paciente selecioná-lo na tela de pagamento.

Um job de limpeza (`CronJob`) libera reservas expiradas, voltando o cupom para o estado disponível.

### Indicação

Mecanismo em que um paciente gera um link com token dinâmico de uso único para convidar outro paciente. Quando o indicado conclui sua primeira consulta, ambos recebem cupom do template `REFERRAL`.

Também chamado de referral.

O token é gerado dinamicamente para evitar fraudes e é validado no momento do cadastro do indicado.

### Pagamento

Registro financeiro relacionado a consultas, planos, promoções ou outros produtos pagos.

Ao implementar pagamentos, evite acoplar regras de gateway diretamente à regra de negócio. Prefira separar:

* Intenção de pagamento.
* Provedor/gateway.
* Confirmação.
* Efeito de domínio após pagamento aprovado.

O cupom é mutuamente exclusivo com outras fontes de desconto (carteira e promoções). Em uma transação, o paciente escolhe apenas uma fonte.

## Termos preferidos

Use estes termos nos nomes de issues, testes, PRDs e documentação:

* "paciente", não "cliente", quando falar da pessoa atendida.
* "psicólogo", não "terapeuta genérico", quando falar do profissional da plataforma.
* "consulta", não "sessão", quando falar da entidade agendada no sistema.
* "reagendamento", não "remarcação", quando falar de mudança formal de horário.
* "diário emocional", não "journal", quando falar do registro emocional do paciente.
* "matching", quando falar do processo de compatibilidade entre paciente e psicólogo.
* "atendimento emergencial", quando falar do fluxo de busca rápida por psicólogo disponível.
* "plano" e "assinatura" para a área comercial recorrente.
* "cupom", não "voucher" ou "promo code", quando falar do desconto aplicado pelo paciente.
* "cupom de usuário", não "cupom resgatado", quando falar do vínculo entre paciente e cupom.
* "template de cupom", quando falar do modelo base para geração automática.
* "reserva", quando falar do bloqueio temporário do cupom durante o checkout.
* "indicação" ou "referral", quando falar do mecanismo de convite entre pacientes.

## Termos técnicos existentes no código

Mantenha estes nomes quando estiver falando diretamente de classes, modelos, módulos ou campos existentes:

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

## Arquitetura atual

O backend usa NestJS com TypeScript.

A persistência usa Prisma ORM com PostgreSQL.

Os principais módulos da aplicação são:

* `AuthModule`: autenticação.
* `UsersModule`: operações sobre usuários.
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

## Banco de dados

O banco principal é PostgreSQL.

O schema Prisma é a fonte de verdade para entidades persistidas.

Ao alterar modelos:

* Atualize `prisma/schema.prisma`.
* Gere migration quando necessário.
* Rode geração do Prisma Client.
* Atualize testes afetados.
* Verifique impacto nos seeds.
* Verifique impacto nos testes e2e.

## Convenções de desenvolvimento local

Use o CLI do projeto para fluxos locais sempre que possível.

Comandos úteis:

```bash
npm install
npm run prisma:generate
npm run cli
```

Para desenvolvimento local:

```bash
npm run db:dev:up
npm run prisma:migrate:dev
npm run start:dev
```

Para rodar com backend e serviço de matching:

```bash
npm run dev:full
```

Para Swagger/API docs, subir a aplicação e acessar:

```txt
http://localhost:3000/api
```

## Testes e qualidade

Antes de concluir qualquer implementação, o agente deve procurar o menor conjunto de testes relevante e executá-lo.

Comandos esperados:

```bash
npm run test
npm run test:e2e:local
npm run lint
```

Use `npm run test:e2e:local` quando a mudança afetar endpoints, banco, autenticação, consultas, pacientes, psicólogos, matching, diário ou emergências.

Use testes unitários quando a mudança estiver isolada em services, regras puras, validações ou mapeamentos.

Ao implementar com TDD:

1. Escreva ou ajuste um teste que falha.
2. Rode o teste e confirme a falha.
3. Implemente o mínimo para passar.
4. Rode o teste novamente.
5. Rode testes relacionados.
6. Refatore sem mudar comportamento.
7. Rode lint/typecheck/testes antes de finalizar.

## Regras para agentes

Antes de modificar código, o agente deve:

1. Ler este `CONTEXT.md`.
2. Ler ADRs relevantes em `docs/adr/`, se existirem.
3. Identificar quais módulos serão afetados.
4. Explicar um plano curto.
5. Evitar mudanças grandes sem issue ou PRD.
6. Preferir uma mudança vertical pequena por vez.
7. Não misturar refatoração grande com feature.
8. Não inventar novos termos de domínio sem atualizar este arquivo.
9. Não alterar regras sensíveis de saúde, agenda, pagamento ou autorização sem explicitar o impacto.
10. Sempre indicar quais testes foram rodados.

## Regras de privacidade e segurança

O sistema lida com dados sensíveis de saúde mental.

Ao implementar funcionalidades, trate como sensíveis:

* Dados pessoais.
* CPF.
* E-mail.
* Telefone.
* Endereço.
* CRP.
* Diário emocional.
* Questionários.
* Histórico de consultas.
* Solicitações emergenciais.
* Avaliações.
* Documentos profissionais.

Evite expor dados sensíveis em logs, erros, respostas públicas ou eventos desnecessários.

Endpoints devem respeitar autorização por papel:

* Pacientes não devem acessar dados privados de outros pacientes.
* Psicólogos não devem acessar dados de pacientes sem relação autorizada.
* Administradores devem ter acesso operacional somente quando necessário.
* Dados de diário emocional só devem ser compartilhados conforme a configuração do paciente.

## Áreas planejadas ou parcialmente modeladas

O schema contém modelos comentados que indicam evolução futura do produto.

Áreas planejadas incluem:

* Chat entre paciente e psicólogo.
* Anexos de mensagens.
* Carteira.
* Métodos de pagamento.
* Planos.
* Assinaturas.
* Promoções de psicólogos.
* Pagamentos.
* Sessões de videochamada.
* Botão de pânico.
* Notificações.

Ao implementar essas áreas, primeiro criar PRD ou issue bem definida. Não descomentar modelos sem revisar regra de negócio, fluxo de dados, testes e impacto nas migrations.

## Diretriz para planos e assinaturas

A área de planos deve ser tratada como um bounded context comercial.

Não espalhe regras de plano dentro de controllers de consulta ou perfil profissional.

Prefira criar serviços explícitos para verificar direito de uso, como:

* se o psicólogo possui assinatura ativa;
* quantas consultas o plano permite;
* se o limite já foi consumido;
* quais recursos o plano libera;
* o que acontece quando a assinatura vence ou fica inadimplente.

Consultas, matching e agenda devem consultar permissões comerciais por uma interface clara, sem conhecer detalhes de pagamento ou gateway.

## Diretriz para matching

O matching deve ser testável e explicável.

Ao alterar matching:

* Separe pontuação de compatibilidade de persistência.
* Evite regras mágicas sem nome.
* Crie testes com pacientes e psicólogos representativos.
* Preserve os questionários como fonte de dados declarados.
* Documente pesos ou critérios importantes.

## Diretriz para cupons

Cupons são um bounded context próprio. Outros módulos consultam permissões e cálculos de cupom por contratos explícitos, sem conhecer detalhes internos.

Ao alterar `Coupon`, `UserCoupon` ou `CouponTemplate`:

* Preserve o ciclo de vida disponível → reservado → usado.
* Cupom é mutuamente exclusivo com carteira e promoções.
* Valide categoria do cupom contra o contexto da transação (consulta vs. assinatura).
* PERCENTAGE sempre tem teto (default R$ 100,00). FIXED nunca gera valor negativo.
* Cupons usados não são revertidos — cancelamento gera crédito na carteira.
* Cupons automáticos são cópias independentes geradas a partir de templates.
* Tokens de indicação devem ser dinâmicos e de uso único.
* O job de limpeza de reservas deve rodar periodicamente para liberar cupons expirados.

## Diretriz para emergências

O fluxo emergencial é sensível.

Ao alterar `EmergencyRequest`, `EmergencyOffer` ou `PanicButtonModule`:

* Preserve transições de status explícitas.
* Evite duplicar ofertas para o mesmo psicólogo na mesma solicitação.
* Respeite expiração de solicitações e ofertas.
* Garanta que apenas psicólogos disponíveis recebam ofertas.
* Registre cancelamentos, aceite, rejeição e expiração.
* Cubra com testes e2e quando envolver endpoint ou banco.

## Diretriz para consultas

Consultas são o centro operacional da plataforma.

Ao alterar `Appointment`:

* Preserve relação entre paciente e psicólogo.
* Preserve horário de início e fim.
* Preserve status correto.
* Verifique conflitos de agenda.
* Verifique integração com Google Calendar quando aplicável.
* Não misture cancelamento, conclusão e reagendamento sem transições claras.

## Diretriz para diário emocional

O diário emocional pertence ao paciente.

Ao alterar `DiaryEntry`:

* O paciente deve controlar seus próprios registros.
* Compartilhamento com psicólogos depende da configuração do paciente.
* Não exponha conteúdo do diário para psicólogos sem autorização.
* Evite incluir conteúdo sensível em logs.

## Diretriz para aprovação profissional

Psicólogos precisam passar por aprovação antes de atender.

Ao alterar `ProfessionalRequest`:

* Preserve status pendente, aprovado e rejeitado.
* Registre o administrador revisor quando aplicável.
* Preserve motivo de rejeição.
* Não permita que profissional rejeitado atenda como aprovado.
* Valide CRP como identificador profissional importante.

## Como criar issues para agentes

Uma boa issue deve conter:

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

## Como pedir implementação para agente

Use um pedido nesse formato:

```txt
Leia CONTEXT.md, docs/agents/domain.md e ADRs relevantes.

Implemente a issue #X usando TDD.

Antes de codar:
1. Resuma o entendimento.
2. Liste módulos afetados.
3. Explique o plano curto.
4. Aponte riscos.

Durante a implementação:
1. Escreva teste falhando.
2. Implemente o mínimo.
3. Rode testes relevantes.
4. Refatore.
5. Rode lint/testes finais.
```

## Estado atual do domínio

O sistema já possui base para:

* Usuários com papéis.
* Perfis de paciente.
* Perfis de psicólogo.
* Aprovação profissional.
* Consultas.
* Reagendamentos.
* Avaliações.
* Atendimento emergencial.
* Diário emocional.
* Questionários de matching.
* Integração com Google Calendar/Meet.
* Seeds de desenvolvimento.
* Testes unitários e e2e.

A próxima evolução importante do domínio parece ser consolidar planos, assinaturas e pagamentos para controlar direitos de uso dos psicólogos dentro da plataforma.
