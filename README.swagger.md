# Swagger no Psique Backend

Este documento explica como a documentação OpenAPI está configurada no projeto e como escolher entre `Swagger UI` e `Scalar`.

## O que está disponível

O projeto gera um único documento OpenAPI e pode exibi-lo de duas formas:

- `Swagger UI`: interface clássica do ecossistema Swagger
- `Scalar`: interface alternativa, mais moderna, usando o mesmo documento OpenAPI

## Como está configurado neste projeto

A configuração fica em [src/main.ts](src/main.ts).

Resumo:

- Título da doc: `Psique Backend API`
- Descrição: `Documentação da API do projeto Psique Backend`
- Versão: `1.0`
- Autenticação: `Bearer` habilitada
- URL da interface: `http://localhost:3000/api`
- Flag para habilitar docs: `SWAGGER_DOCS`
- Flag para escolher a interface: `API_DOCS_UI`

## Variáveis de ambiente

Use estas variáveis no `.env`:

```env
SWAGGER_DOCS=true
SWAGGER_ROUTE=api
API_DOCS_UI=scalar
```

Valores suportados:

- `SWAGGER_DOCS=true|false`: habilita ou desabilita a documentação.
- `SWAGGER_ROUTE=<rota>`: define a rota onde a documentação será exposta.
- `API_DOCS_UI=scalar|swagger`: escolhe qual interface renderizar.

Comportamento:

- Se `SWAGGER_DOCS=false`, nenhuma documentação é exposta.
- Se `API_DOCS_UI=swagger`, a aplicação usa `Swagger UI`.
- Se `API_DOCS_UI=scalar`, a aplicação usa `Scalar`.
- Se `API_DOCS_UI=scalar` e o pacote do Scalar falhar ao carregar, a aplicação faz fallback para `Swagger UI`.

## Como executar localmente

1. Ajuste o `.env`:

```env
SWAGGER_DOCS=true
SWAGGER_ROUTE=api
API_DOCS_UI=swagger
```

2. Suba a API:

```bash
npm run start:dev
```

3. Abra no navegador:

```text
http://localhost:3000/api
```

## Exemplos de configuração

Para usar Swagger UI:

```env
SWAGGER_DOCS=true
API_DOCS_UI=swagger
```

Para usar Scalar:

```env
SWAGGER_DOCS=true
API_DOCS_UI=scalar
```

Para desligar a documentação:

```env
SWAGGER_DOCS=false
```

## Como usar a interface

1. Abra a rota configurada em `SWAGGER_ROUTE`.
2. Escolha um endpoint na lista.
3. Execute os testes pela própria interface.
4. Consulte request, response e schemas no mesmo lugar.

## Como autenticar com Bearer token

Se uma rota exigir autenticação:

1. Clique em `Authorize` quando estiver no Swagger UI, ou use o painel equivalente no Scalar.
2. Informe o token.
3. Execute as rotas protegidas.

## Padrão arquitetural adotado para documentação da API

Esta seção define como a documentação OpenAPI deve ser implementada e mantida no projeto.

### 1) Estrutura por módulo

- Cada módulo deve ter sua própria pasta `swagger`.
- Cada endpoint/operação deve ter um arquivo próprio no padrão:
- `recurso.acao.swagger.ts`
- Cada pasta `swagger` deve possuir um `index.ts` exportando os decorators do módulo.

Exemplo atual:

```text
src/
  app/
    swagger/
      app.get-hello.swagger.ts
      app.tags.swagger.ts
      index.ts
```

### 2) Controllers limpos

- Controllers importam decorators de documentação somente do `index.ts` do próprio módulo.
- Não misturar regras de negócio com documentação.
- Usar `ApiTags` por controller, encapsulado em decorator do módulo.
- Usar `ApiBearerAuth` apenas nos endpoints autenticados.

### 3) Arquivos de documentação por endpoint

- Cada arquivo Swagger expõe função nomeada no padrão:
- `NomeDaOperacaoApiResponsesOperation`
- Implementação com:
- `applyDecorators`
- `ApiOperation`
- respostas HTTP como `ApiOkResponse`, `ApiCreatedResponse` e similares.
- Sempre que necessário, detalhar `schema`, `examples`, `enums` e mensagens de erro.

### 4) Reuso global de respostas de erro

- Respostas comuns devem ser centralizadas em utilitários compartilhados para evitar repetição.
- Padrões de erro como `400`, `401`, `403`, `404` e `500` devem usar formato consistente.

Implementação atual:

```text
src/common/swagger/swagger-error.decorators.ts
```

Decorator utilitário principal:

- `ApiCommonErrorResponses(...)`

### 5) Bootstrap da documentação

- Configuração central em `src/main.ts` com:
- título, descrição e versão
- autenticação Bearer JWT nomeada (`jwt-auth`)
- criação do documento OpenAPI
- A documentação só é exposta quando `SWAGGER_DOCS` está habilitada.
- A interface exibida é escolhida por `API_DOCS_UI`.
- O documento OpenAPI é o mesmo para `Swagger UI` e `Scalar`.
