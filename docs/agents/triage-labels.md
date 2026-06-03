# Triage Labels

Este arquivo define as labels recomendadas para triagem de issues e PRs no Psique.

As labels ajudam agentes e mantenedores a entender prontidão, domínio afetado, risco e tipo de trabalho.

---

## Labels canônicas de prontidão

| Papel canônico para agentes | Label no tracker  | Significado                                     |
| --------------------------- | ----------------- | ----------------------------------------------- |
| `needs-triage`              | `needs-triage`    | Mantenedor precisa avaliar a issue              |
| `needs-info`                | `needs-info`      | Falta informação para implementar com segurança |
| `ready-for-agent`           | `ready-for-agent` | Issue especificada e pronta para agente         |
| `ready-for-human`           | `ready-for-human` | Exige decisão, implementação ou revisão humana  |
| `wontfix`                   | `wontfix`         | Não será implementada                           |

---

## Quando usar cada label

### `needs-triage`

Use quando a issue ainda não foi avaliada.

Exemplos:

* pedido recém-criado;
* bug ainda não confirmado;
* escopo ainda não analisado;
* impacto desconhecido.

---

### `needs-info`

Use quando falta informação necessária para seguir.

Exemplos:

* critérios de aceitação ausentes;
* regra de domínio ambígua;
* autorização não especificada;
* impacto em dados sensíveis não descrito;
* endpoints afetados não informados;
* dúvida sobre migration;
* conflito entre issue e `CONTEXT.md`;
* testes esperados ausentes.

---

### `ready-for-agent`

Use quando a issue está pronta para agente.

A issue deve ter:

* objetivo claro;
* contexto suficiente;
* escopo definido;
* critérios de aceitação;
* testes esperados;
* domínio afetado;
* ausência de conflito conhecido;
* riscos conhecidos documentados.

Não use `ready-for-agent` em mudanças sensíveis se ainda houver decisão de produto, arquitetura, segurança, privacidade ou domínio pendente.

---

### `ready-for-human`

Use quando a tarefa precisa de intervenção humana.

Exemplos:

* decisão de produto;
* decisão arquitetural;
* conflito entre documentos;
* conflito com teste existente;
* mudança sensível de domínio;
* migration destrutiva;
* alteração de contrato público de API;
* dúvida sobre dados sensíveis;
* dúvida sobre atendimento emergencial;
* dúvida sobre pagamento, plano ou assinatura.

---

### `wontfix`

Use quando a decisão for não implementar.

A issue deve receber comentário explicando o motivo.

---

## Labels recomendadas por tipo de trabalho

| Label              | Uso                                                   |
| ------------------ | ----------------------------------------------------- |
| `type:feature`     | Nova funcionalidade                                   |
| `type:bug`         | Correção de bug                                       |
| `type:refactor`    | Refatoração sem mudança esperada de comportamento     |
| `type:docs`        | Documentação                                          |
| `type:test`        | Testes                                                |
| `type:chore`       | Manutenção, scripts, dependências ou ajustes internos |
| `type:security`    | Segurança                                             |
| `type:performance` | Performance                                           |
| `type:migration`   | Alteração de banco/migration                          |

---

## Labels recomendadas por domínio

| Label                          | Domínio                                         |
| ------------------------------ | ----------------------------------------------- |
| `domain:auth`                  | Autenticação, login, JWT, guards e autorização  |
| `domain:users`                 | Usuário base e roles                            |
| `domain:patients`              | Pacientes e `PatientProfile`                    |
| `domain:professionals`         | Psicólogos e `ProfessionalProfile`              |
| `domain:professional-approval` | Solicitação, aprovação ou rejeição profissional |
| `domain:appointments`          | Consultas                                       |
| `domain:reschedule`            | Reagendamentos                                  |
| `domain:matching`              | Matching e questionários                        |
| `domain:diary`                 | Diário emocional                                |
| `domain:reviews`               | Avaliações                                      |
| `domain:emergency`             | Atendimento emergencial                         |
| `domain:calendar`              | Google Calendar/Meet                            |
| `domain:coupons`               | Cupons, cupom de usuário, templates e reservas  |
| `domain:referrals`             | Indicações/referral                             |
| `domain:plans`                 | Planos                                          |
| `domain:subscriptions`         | Assinaturas                                     |
| `domain:payments`              | Pagamentos                                      |
| `domain:wallet`                | Carteira                                        |
| `domain:notifications`         | Notificações                                    |
| `domain:prisma`                | Schema Prisma, migrations e seeds               |

---

## Labels recomendadas por risco

| Label                       | Uso                                                         |
| --------------------------- | ----------------------------------------------------------- |
| `risk:privacy`              | Pode afetar dados pessoais ou dados sensíveis               |
| `risk:security`             | Pode afetar autenticação, autorização ou exposição indevida |
| `risk:health-data`          | Pode afetar dados de saúde mental                           |
| `risk:emergency-flow`       | Pode afetar atendimento emergencial                         |
| `risk:billing`              | Pode afetar pagamento, cupom, plano, assinatura ou carteira |
| `risk:migration`            | Pode afetar banco de dados ou dados existentes              |
| `risk:api-contract`         | Pode alterar contrato público de API                        |
| `risk:external-integration` | Pode afetar integração externa                              |
| `risk:breaking-change`      | Pode quebrar comportamento existente                        |

---

## Labels recomendadas por prioridade

| Label               | Uso                                                |
| ------------------- | -------------------------------------------------- |
| `priority:low`      | Baixa prioridade                                   |
| `priority:medium`   | Prioridade normal                                  |
| `priority:high`     | Alta prioridade                                    |
| `priority:critical` | Crítico para operação, segurança ou fluxo sensível |

Use `priority:critical` com cuidado, especialmente para falhas que afetem autenticação, privacidade, dados de saúde, atendimento emergencial ou perda de dados.

---

## Labels recomendadas por tamanho

| Label          | Uso                                     |
| -------------- | --------------------------------------- |
| `size:small`   | Mudança pequena e localizada            |
| `size:medium`  | Mudança moderada em poucos módulos      |
| `size:large`   | Mudança grande ou com múltiplos módulos |
| `size:unknown` | Tamanho ainda não estimado              |

Issues `size:large` ou `size:unknown` não devem ser marcadas como `ready-for-agent` se envolverem domínio sensível sem escopo e critérios claros.

---

## Combinações recomendadas

Bug simples em diário emocional:

```txt
type:bug
domain:diary
risk:privacy
priority:high
needs-triage
```

Feature de cupom pronta para agente:

```txt
type:feature
domain:coupons
risk:billing
size:medium
ready-for-agent
```

Mudança em atendimento emergencial que precisa de decisão humana:

```txt
type:feature
domain:emergency
risk:emergency-flow
risk:health-data
ready-for-human
```

Refatoração em consulta:

```txt
type:refactor
domain:appointments
size:medium
ready-for-agent
```

Migration ainda incerta:

```txt
type:migration
domain:prisma
risk:migration
needs-info
```

---

## Regras para agentes

Se uma issue tiver conflito, incerteza ou lacuna relevante, aplique ou recomende:

```txt
needs-info
```

ou:

```txt
ready-for-human
```

Não marque como `ready-for-agent` quando houver dúvida relevante sobre:

* domínio;
* autorização;
* privacidade;
* dados sensíveis;
* saúde mental;
* atendimento emergencial;
* consulta;
* diário emocional;
* aprovação profissional;
* cupom;
* pagamento;
* plano;
* assinatura;
* migration;
* contrato de API;
* teste contraditório.

Quando uma label indicar risco sensível, o agente deve verificar `CONTEXT.md`, `AGENTS.md`, issue/PRD e testes antes de implementar.

---

## Manutenção deste arquivo

Se o tracker usar nomes diferentes, atualize a coluna "Label no tracker" ou os nomes de label neste arquivo.

Não remova as labels canônicas de prontidão sem atualizar também:

* `AGENTS.md`;
* `docs/agents/issue-tracker.md`;
* automações ou fluxos de agentes que dependam dessas labels.
