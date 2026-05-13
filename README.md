<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
$ npm run prisma:generate
$ npm run cli
```

## Project CLI

The project includes an interactive CLI to help with local development flows.

```bash
$ npm run cli
```

Available areas:

- Run the project with a complete setup flow or quick run modes.
- Execute the manual development seed with entity selection.
- Run unit or e2e tests, including module-level and individual test selection.
- Show a built-in help screen.

## Environment files

- Copy `.env.example` to `.env` for local development.
- Copy `.env.test.example` to `.env.test` for local e2e tests.
- Do not commit real `.env` or `.env.test` files.

## Local development database

The development PostgreSQL database runs with Docker using `postgres:16`.

```bash
# start the development database
$ npm run db:dev:up

# generate the Prisma client
$ npm run prisma:generate

# apply migrations to the development database
$ npm run prisma:migrate:dev

# start the API in watch mode
$ npm run start:dev
```

The development `DATABASE_URL` is:

```text
postgresql://psique:psique@localhost:54320/psique_dev?schema=public
```

To stop the local development database:

```bash
$ npm run db:dev:down
```

## Manual development seed

The project now includes a manual seed to populate the development database with sample users. This seed does not run automatically when the API starts. It only runs when you explicitly choose it from the project CLI.

Recommended flow:

```bash
$ npm run cli
```

In the CLI, choose:

1. `Run seed`
2. The desired option among all entities, only admins, only patients, only professionals, or the available combinations

If you prefer to run it directly, the following script is also available:

```bash
$ npm run db:seed
```

Before running the seed manually, make sure the development database is available and the migrations have been applied. The CLI option already handles this preparation automatically.

### Accounts created by the seed

Default password for all accounts:

```text
Password123
```

Admins:

- Amanda Freitas  
  Email: `amanda.admin@psique.local`  
  CPF: `52998224725`  
  Phone: `85999990001`  
  Status: `ACTIVE`  
  Profile: administrator responsible for the platform operation.  

- Bruno Martins  
  Email: `bruno.admin@psique.local`  
  CPF: `11144477735`  
  Phone: `85999990002`  
  Status: `ACTIVE`  
  Profile: administrator focused on support and internal auditing.  

Patients:

- Marina Costa  
  Email: `marina.patient@psique.local`  
  CPF: `39053344705`  
  Phone: `85988887711`  
  Status: `ACTIVE`  
  Birth date: `1993-05-10`  
  Emergency contact: `Pedro Costa`  
  Contact phone: `85977776666`  
  Shares diary with professionals: `true`  
  
- Lucas Almeida  
  Email: `lucas.patient@psique.local`  
  CPF: `93541134780`   
  Phone: `85988887722`  
  Status: `ACTIVE`  
  Birth date: `1990-11-02`  
  Emergency contact: `Renata Almeida`  
  Contact phone: `85977775555`  
  Shares diary with professionals: `false`  

Professionals:

- Dra. Paula Siqueira  
  Email: `paula.professional@psique.local`  
  CPF: `12345678909`  
  Phone: `85977770011`  
  Status: `ACTIVE`  
  CRP: `CRP-11/0001`  
  Specialty: `Cognitive Behavioral Therapy`  
  Approval: `APPROVED`  
  Online status: `ONLINE`  
  Available for emergency: `true`  
  Gap between appointments: `15` minutes  


- Dr. Rafael Nogueira  
  Email: `rafael.professional@psique.local`  
  CPF: `98765432100`  
  Phone: `85977770022`  
  Status: `ACTIVE`  
  CRP: `CRP-11/0002`  
  Specialty: `Organizational Psychology`  
  Approval: `APPROVED`  
  Online status: `OFFLINE`  
  Available for emergency: `false`  
  Gap between appointments: `30` minutes  

The seed is idempotent by email. If you run it again, the same accounts are updated instead of duplicated.

## Local test database

The e2e database is isolated from development and uses a separate Docker Compose file.

```bash
# start the test database
$ npm run db:test:up

# apply migrations to the test database
$ npm run prisma:migrate:test
```

The test `DATABASE_URL` is:

```text
postgresql://test:test@localhost:5433/psique_test?schema=public
```

To stop and discard the local test database:

```bash
$ npm run db:test:down
```

## Prisma 7

This project uses Prisma ORM 7 with PostgreSQL and the `@prisma/adapter-pg` driver adapter.

```bash
# generate the client
$ npm run prisma:generate

# inspect data locally
$ npm run prisma:studio
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## API documentation (Swagger)

After starting the application, access the interactive API docs at:

```text
http://localhost:3000/api
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests with Docker + isolated database
$ npm run test:e2e:local

# e2e tests for CI/already-prepared database
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

`npm run test:e2e:local` performs this flow automatically:

1. Starts the disposable PostgreSQL test container.
2. Runs `prisma generate`.
3. Applies Prisma migrations to the test database.
4. Executes the e2e suite.
5. Stops and removes the test container.

## CI workflow

The GitHub Actions workflow has three jobs:

- `lint`: runs `npm ci`, `npm run prisma:generate`, and `npm run lint`.
- `unit-tests`: runs `npm ci`, `npm run prisma:generate`, and `npm run test`.
- `e2e-tests`: loads the CI env file, starts a disposable PostgreSQL 16 container with Docker Compose, runs `npm ci`, `npm run prisma:generate`, `npx prisma migrate deploy`, and `npm run test:e2e`.

The CI does not use production or staging databases. All CI environment variables come from the `CI_ENV_FILE` GitHub Secret.

Required GitHub Secret:

- `secrets.CI_ENV_FILE`

Example content:

```env
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/psique_test?schema=public
CI_POSTGRES_DB=psique_test
CI_POSTGRES_USER=test
CI_POSTGRES_PASSWORD=test
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
