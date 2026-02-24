import { Controller, Get, Post, Body, Patch, Param, UseInterceptors, UploadedFile, UseGuards, Query } from '@nestjs/common';
import { PaymentsService } from './payment.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';

@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentsService,
    private readonly cloudinaryService: CloudinaryService // 🚀 2. ฉีด Cloudinary เข้ามา
  ) { }

  // 🚀 3. อัปเดตการอัปโหลดสลิปขึ้น Cloudinary
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() body: { rentalId: string, amount: number },
    @UploadedFile(
      // 🚀 2. ใส่ Pipe ป้องกันตรงนี้เลย
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024, message: 'ขนาดไฟล์สลิปต้องไม่เกิน 2 MB' }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }), // แถมดักประเภทไฟล์ให้ด้วย!
        ],
      }),
    ) file: Express.Multer.File
  ) {
    const result = await this.cloudinaryService.uploadFile(file, 'payment-slips');
    const slipUrl = result.secure_url;
    return this.paymentService.createPayment(body.rentalId, body.amount, slipUrl);
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard, AdminGuard)
  findAllPending(@Query('date') date?: string) {
    return this.paymentService.findAllPending(date);
  }

  @Patch('verify/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  verify(@Param('id') id: string, @Body('isApproved') isApproved: boolean) {
    return this.paymentService.verifyPayment(id, isApproved);
  }
}