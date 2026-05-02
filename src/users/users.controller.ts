import { Controller, Get, Post, Body, Param, Delete, Patch, ParseUUIDPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ConflictException } from '@nestjs/common';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

   @Post()
   async create(@Body() createUserDto: CreateUserDto) {
     try {
       return await this.usersService.create(createUserDto);
     } catch (error) {
       if (error instanceof ConflictException) {
         throw new ConflictException('Email, CPF ou CRP já cadastrado');
       }
       throw error;
     }
   }

  @Get('patient/:id')
  findPatient(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findPatient(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }
}
