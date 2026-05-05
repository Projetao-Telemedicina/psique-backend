import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  CreateUserApiDocs,
  GetActiveUsersApiDocs,
  GetAllUsersApiDocs,
  GetUserByIdApiDocs,
  RemoveUserApiDocs,
  UpdateUserApiDocs,
  UsersControllerApiTags,
} from './swagger/index.js';

@UsersControllerApiTags()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @CreateUserApiDocs()
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @GetAllUsersApiDocs()
  async getAll() {
    return this.usersService.getAll();
  }

  @Get('active')
  @GetActiveUsersApiDocs()
  async getActiveUsers() {
    return this.usersService.getActiveUsers();
  }

  @Get(':id')
  @GetUserByIdApiDocs()
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getById(id);
  }

  @Patch(':id')
  @UpdateUserApiDocs()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @RemoveUserApiDocs()
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }
}
