import { Controller, Get, Post, Delete, Patch, Body, Param, UseGuards, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { AdminGuard } from '../common/guards/admin.guard'; // Import Guard เข้ามา
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'; // Import Guard เข้ามา
import { UpdateBookDto } from './dto/update-book.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) { }

  // ==========================================
  // โซน Public (ใครก็เข้าได้ ไม่ต้องมี Guard)
  // ==========================================

  @Get()
  findAll(@Query('search') search: string) { // ✅ ระบุชื่อ 'search' ใน @Query
    return this.booksService.findAll(search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    // ดูรายละเอียดหนังสือรายเล่ม
    return this.booksService.findOne(id);
  }

  // ==========================================
  // 🔴 โซน Admin Only (ต้องมีกุญแจ)
  // ==========================================

  @UseGuards(JwtAuthGuard, AdminGuard) // 🔒 ตรวจ Token ก่อน แล้วค่อยตรวจ Role
  @Post()
  create(@Body() createBookDto: any) {
    return this.booksService.create(createBookDto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateBookDto: UpdateBookDto // เช็คว่าไม่ได้เผลอใส่ {} ตรงนี้
  ) {
    return this.booksService.update(id, updateBookDto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard) // 🔒 ตรวจสอบทั้งบัตร(Token) และ สิทธิ์(Admin)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.booksService.remove(id);
  }

  @Post('upload-cover')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/covers',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `cover-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  uploadCover(@UploadedFile() file: Express.Multer.File) {
    return { url: `/uploads/covers/${file.filename}` };
  }

}