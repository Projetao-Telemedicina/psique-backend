# Swagger no Psique Backend

Este documento explica o que é Swagger, por que ele é útil e como usá-lo no projeto.

## O que é Swagger

Swagger é um conjunto de ferramentas para documentar e testar APIs REST.

No ecossistema OpenAPI, ele ajuda a:
- descrever os endpoints da API de forma padronizada;
- visualizar os contratos (rotas, parametros, respostas);
- testar chamadas direto no navegador;
- facilitar alinhamento entre backend, frontend e QA.

## Como esta configurado neste projeto

A configuracao foi adicionada no bootstrap em [src/main.ts](src/main.ts).

Resumo:
- Titulo da doc: `Psique Backend API`
- Descricao: `Documentacao da API do projeto Psique Backend`
- Versao: `1.0`
- Autenticacao: `Bearer` habilitada
- URL da interface: `http://localhost:3000/api`

## Como executar e abrir a documentacao

1. Instale as dependencias (se ainda nao instalou):

```bash
npm install
```

2. Inicie a API:

```bash
npm run start:dev
```

3. Abra no navegador:

```text
http://localhost:3000/api
```

## Como usar a interface do Swagger

1. Abra a rota `/api`.
2. Escolha um endpoint na lista.
3. Clique em `Try it out`.
4. Preencha parametros (quando houver).
5. Clique em `Execute` para enviar a requisicao.
6. Veja status code, payload e headers na resposta.

## Como autenticar com Bearer token

Se uma rota exigir autenticacao:

1. Clique no botao `Authorize` (canto superior direito).
2. Informe o token no campo.

3. Confirme e execute as rotas protegidas.