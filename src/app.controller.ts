import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { AppControllerApiTags, GetHelloApiResponsesOperation } from './app/swagger';

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
