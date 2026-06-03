# Issue Tracker: GitHub

Issues e PRDs deste repositório vivem no GitHub Issues.

Use o `gh` CLI para operações locais sempre que estiver trabalhando dentro de um clone do repositório.

---

## Comandos principais

Criar issue:

```bash
gh issue create --title "..." --body "..."
```

Para bodies multi-linha, prefira heredoc:

```bash
gh issue create --title "Título da issue" --body "$(cat <<'EOF'
## Objetivo

...

## Contexto

...

## Escopo

...

## Fora de escopo

...

## Critérios de aceitação

...

## Testes esperados

...
EOF
)"
```

Ler issue com comentários:

```bash
gh issue view <number> --comments
```

Listar issues abertas:

```bash
gh issue list --state open --json number,title,body,labels,comments
```

Listar issues com filtro de label:

```bash
gh issue list --state open --label "ready-for-agent" --json number,title,body,labels,comments
```

Comentar em uma issue:

```bash
gh issue comment <number> --body "..."
```

Aplicar label:

```bash
gh issue edit <number> --add-label "..."
```

Remover label:

```bash
gh issue edit <number> --remove-label "..."
```

Fechar issue:

```bash
gh issue close <number> --comment "..."
```

O `gh` normalmente infere o repositório a partir de `git remote -v` quando executado dentro do clone.

---

## Estrutura esperada de issue para agentes

Toda issue pronta para agente deve conter:

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

Essa estrutura é especialmente importante para mudanças em áreas sensíveis do Psique.

---

## Quando uma issue está pronta para agente

Uma issue pode receber `ready-for-agent` quando tiver:

* objetivo claro;
* contexto suficiente;
* escopo delimitado;
* fora de escopo explícito quando houver risco de expansão;
* critérios de aceitação verificáveis;
* testes esperados;
* domínio afetado identificado;
* riscos conhecidos documentados;
* ausência de conflito conhecido com `CONTEXT.md`, `AGENTS.md`, ADRs ou código existente.

Se a issue envolver banco de dados, deve indicar se há expectativa de migration.

Se a issue envolver API, deve indicar endpoints afetados ou comportamento esperado.

Se a issue envolver domínio sensível, deve indicar impacto esperado em privacidade, autorização e segurança.

---

## Quando uma issue não está pronta

Use `needs-info` quando faltarem informações necessárias para implementação segura.

Exemplos:

* escopo indefinido;
* critério de aceitação ausente;
* regra de domínio ambígua;
* autorização não especificada;
* impacto em dados sensíveis não definido;
* comportamento esperado em erro não especificado;
* conflito com teste existente;
* conflito com `CONTEXT.md`;
* dúvida sobre migration;
* dúvida sobre contrato de API;
* dependência externa não documentada.

Use `needs-triage` quando a issue ainda precisa ser avaliada por mantenedor.

Use `ready-for-human` quando a issue exige decisão humana, desenho de produto, decisão arquitetural ou análise sensível antes de implementação.

Use `wontfix` quando a decisão for não implementar.

---

## Regra de parada para issues incompletas

Se a issue não definir informações suficientes para uma alteração segura, o agente não deve escolher uma interpretação por conta própria.

O agente deve parar, apresentar os fatos e aguardar instruções humanas.

Isso é obrigatório quando a tarefa envolver:

* dados sensíveis;
* saúde mental;
* atendimento emergencial;
* diário emocional;
* consultas;
* aprovação profissional;
* autenticação;
* autorização;
* cupons;
* pagamentos;
* planos;
* assinaturas;
* migrations;
* exclusão de dados;
* mudança de contrato de API;
* alteração de testes contraditórios;
* alteração de regra de domínio existente.

---

## Campos recomendados por tipo de issue

### Feature

```md
## Objetivo

## Contexto

## Escopo

## Fora de escopo

## Fluxo esperado

## Critérios de aceitação

## Testes esperados

## Riscos
```

### Bug

```md
## Problema

## Comportamento atual

## Comportamento esperado

## Passos para reproduzir

## Impacto

## Módulos afetados

## Critérios de aceitação

## Testes esperados
```

### Refatoração

```md
## Objetivo

## Motivação

## Escopo

## Fora de escopo

## Comportamento que deve ser preservado

## Critérios de aceitação

## Testes esperados

## Riscos
```

### Alteração de banco

```md
## Objetivo

## Contexto

## Modelos afetados

## Migration esperada

## Dados existentes afetados

## Estratégia de compatibilidade

## Critérios de aceitação

## Testes esperados

## Riscos
```

### Alteração de API

```md
## Objetivo

## Endpoints afetados

## Contrato atual

## Contrato esperado

## Compatibilidade

## Autorização

## Critérios de aceitação

## Testes esperados

## Riscos
```

### Domínio sensível

Use para consultas, emergências, diário emocional, aprovação profissional, dados pessoais, autenticação, autorização, pagamentos, planos, assinaturas e cupons.

```md
## Objetivo

## Contexto de domínio

## Entidades afetadas

## Papéis envolvidos

## Regras de autorização

## Dados sensíveis envolvidos

## Escopo

## Fora de escopo

## Critérios de aceitação

## Testes esperados

## Riscos

## Decisões pendentes
```

---

## Como publicar achados na issue

Quando o agente encontrar uma inconsistência, conflito ou incerteza, comente na issue usando:

```md
## Bloqueio encontrado

...

## Arquivos ou regras envolvidos

- ...

## Opções possíveis

1. ...
2. ...

## Riscos

- ...

## Decisão necessária

...
```

Não marque como concluído até a decisão estar registrada.

---

## Quando uma skill diz "publish to the issue tracker"

Crie uma GitHub Issue usando a estrutura apropriada.

Não publique uma issue vaga quando o assunto envolver área sensível. Inclua contexto, critérios de aceitação e testes esperados.

---

## Quando uma skill diz "fetch the relevant ticket"

Execute:

```bash
gh issue view <number> --comments
```

Leia:

* título;
* body;
* labels;
* comentários;
* estado;
* histórico de decisões registrado nos comentários.

Depois compare a issue com `CONTEXT.md`, `AGENTS.md`, ADRs relevantes e código existente antes de implementar.

---

## Labels mínimas

As labels canônicas estão documentadas em:

```txt
docs/agents/triage-labels.md
```

Use essas labels para indicar prontidão, bloqueio ou necessidade de decisão humana.
