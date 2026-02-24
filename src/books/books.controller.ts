import { Controller, Get, Post, Delete, Patch, Body, Param, UseGuards, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { BooksService } from './books.service';
import { AdminGuard } from '../common/guards/admin.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UpdateBookDto } from './dto/update-book.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';

@Controller('books')
export class BooksController {
  constructor(
    private readonly booksService: BooksService,
    private readonly cloudinaryService: CloudinaryService
  ) { }

  // ==========================================
  // โซน Public (ใครก็เข้าได้ ไม่ต้องมี Guard)
  // ==========================================

  @Get()
  findAll(
    @Query('search') search: string,
    @Query('category') category: string // 🚀 เพิ่มบรรทัดนี้เพื่อรับค่าหมวดหมู่
  ) {
    // 🚀 แล้วส่งต่อไปให้ Service
    return this.booksService.findAll(search, category);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.booksService.findOne(id);
  }

  // ==========================================
  // 🔴 โซน Admin Only (ต้องมีกุญแจ)
  // ==========================================

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  create(@Body() createBookDto: any) {
    return this.booksService.create(createBookDto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateBookDto: UpdateBookDto
  ) {
    return this.booksService.update(id, updateBookDto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.booksService.remove(id);
  }

  // 🚀 3. อัปเดตการอัปโหลดปกหนังสือขึ้น Cloudinary
  @Post('upload-cover')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadCover(
    @UploadedFile(
      // 🚀 2. ดักก่อนโยนขึ้น Cloudinary
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024, message: 'ขนาดไฟล์หน้าปกต้องไม่เกิน 2 MB' }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    ) file: Express.Multer.File
  ) {
    const result = await this.cloudinaryService.uploadFile(file, 'book-covers');
    return { url: result.secure_url };
  }

}