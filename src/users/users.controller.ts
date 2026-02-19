import { Controller, Post, Body, Patch, UseGuards, Param, Get, Req, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AdminGuard } from 'src/common/guards/admin.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ==========================================
  // โซน Public & Member
  // ==========================================

  @Post('register')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

// 🔒 ดูโปรไฟล์ตัวเอง
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyProfile(@Req() req) {
    return this.usersService.findById(req.user.userId);
  }

  // 🔒 แก้ไขโปรไฟล์ (เฉพาะเจ้าของไอดีเท่านั้นที่แก้ได้)
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Req() req) {
    if (id !== req.user.userId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์แก้ไขข้อมูลผู้อื่น');
    }
    return this.usersService.update(id, updateUserDto);
  }

  // ==========================================
  // 🔴 โซน Admin Only (ดูได้อย่างเดียว)
  // ==========================================

  // 🔒 แอดมินดูรายชื่อลูกค้าทั้งหมด (ReadOnly)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  // 🔒 แอดมินดูข้อมูลลูกค้ารายบุคคล (ReadOnly)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}