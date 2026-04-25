import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import {
  AppControllerApiTags,
  GetHelloApiResponsesOperation,
} from './app/swagger/index.js';

@AppControllerApiTags()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @GetHelloApiResponsesOperation()
  getHello(): string {
    return this.appService.getHello();
  }
}
