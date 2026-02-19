import { Controller, Post, Body, Param, Patch, UseGuards, Req, Get, Query, ForbiddenException } from '@nestjs/common';
import { RentalsService } from './rentals.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

@Controller('rentals')
export class RentalsController {
  constructor(private readonly rentalsService: RentalsService) { }

  // ==========================================
  // 🟢 โซน Member
  // ==========================================

  @UseGuards(JwtAuthGuard)
  @Post('rent')
  async create(@Req() req, @Body() body: { bookId: string; days: number }) {
    return this.rentalsService.rentBook(req.user.userId, body.bookId, body.days);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-history')
  async getMyHistory(@Req() req) {
    return this.rentalsService.findMyHistory(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/cancel')
  async cancel(@Param('id') id: string) {
    return this.rentalsService.cancelRental(id);
  }

  // ==========================================
  // 🔴 โซน Admin Only
  // ==========================================

  // แอดมินดูสรุป Dashboard ประจำวัน
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('dashboard')
  async getDashboardReports(@Query('date') date?: string) {
    return this.rentalsService.getDashboardReports(date);
  }

  // แอดมินดูรายการที่เกินกำหนดคืน
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('overdue')
  async getOverdueRentals() {
    return this.rentalsService.findOverdueRentals();
  }

  // แอดมินดูประวัติการเช่าของลูกค้าแต่ละคน
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/user-history/:userId')
  async getUserHistoryForAdmin(@Param('userId') userId: string) {
    return this.rentalsService.findMyHistory(userId); // ใช้ฟังก์ชันเดิมแต่ส่ง userId ของลูกค้าไป
  }

  // แอดมินยืนยันลูกค้ามารับหนังสือ (booked -> rented)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id/pickup') 
  async pickup(@Param('id') id: string) {
    return this.rentalsService.pickupBook(id);
  }

  // แอดมินยืนยันลูกค้าคืนหนังสือ (rented -> returned)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id/return') 
  async returnBook(@Param('id') id: string) {
    return this.rentalsService.returnBook(id);
  }
}