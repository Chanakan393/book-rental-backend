import { Controller, Get, Post, Body, Patch, Param, UseInterceptors, UploadedFile, UseGuards, Query } from '@nestjs/common';
import { PaymentsService } from './payment.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentsService) { }

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/slips',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `slip-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  create(@Body() body: { rentalId: string, amount: number }, @UploadedFile() file: Express.Multer.File) {
    const slipUrl = `/uploads/slips/${file.filename}`;
    return this.paymentService.createPayment(body.rentalId, body.amount, slipUrl);
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard, AdminGuard)
  findAllPending(@Query('date') date?: string) { // 🚀 รับ Query Param ชื่อ date
    return this.paymentService.findAllPending(date);
  }

  @Patch('verify/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  verify(@Param('id') id: string, @Body('isApproved') isApproved: boolean) {
    return this.paymentService.verifyPayment(id, isApproved);
  }
}