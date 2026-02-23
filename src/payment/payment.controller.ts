import { Controller, Get, Post, Body, Patch, Param, UseInterceptors, UploadedFile, UseGuards, Query } from '@nestjs/common';
import { PaymentsService } from './payment.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentsService,
    private readonly cloudinaryService: CloudinaryService // 🚀 2. ฉีด Cloudinary เข้ามา
  ) { }

  // 🚀 3. อัปเดตการอัปโหลดสลิปขึ้น Cloudinary
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file')) // ลบ diskStorage ออก
  async create(@Body() body: { rentalId: string, amount: number }, @UploadedFile() file: Express.Multer.File) {
    
    // โยนไฟล์ขึ้น Cloudinary ในโฟลเดอร์ชื่อ 'payment-slips'
    const result = await this.cloudinaryService.uploadFile(file, 'payment-slips');
    
    // ดึง URL ที่ได้จาก Cloudinary มาใช้งาน
    const slipUrl = result.secure_url;
    
    // ส่ง URL บันทึกลง Database
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