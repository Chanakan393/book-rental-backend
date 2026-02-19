import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument } from './entities/payment.entity';
import { Rental, RentalDocument } from '../rentals/entities/rental.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Rental.name) private rentalModel: Model<RentalDocument>,
  ) { }

  async createPayment(rentalId: string, amount: number, slipUrl: string) {
    const payment = await this.paymentModel.create({ rentalId, amount, slipUrl });
    await this.rentalModel.findByIdAndUpdate(rentalId, {
      paymentStatus: 'verification'
    });
    return payment;
  }

  // ✅ แก้ไข: เพิ่มการ Populate ข้อมูลแบบซ้อนกัน (Deep Populate)
  async findAllPending(dateString?: string) {
    let query: any = {};

    if (dateString) {
      // 📅 สร้างช่วงเวลาเริ่ม-จบของวันที่เลือก
      const targetDate = new Date(dateString);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

      query = {
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        // 🚀 ดึงทั้งรายการที่รอตรวจ และรายการที่ตรวจแล้ว (paid/rejected) ของวันนั้น
        status: { $in: ['verification', 'paid', 'rejected', 'refunded'] }
      };
    } else {
      // ถ้าไม่ระบุวัน ให้ดึงเฉพาะรายการที่ค้างตรวจสอบ (verification) ทั้งหมด
      query = { status: 'verification' };
    }

    return this.paymentModel.find(query)
      .populate({
        path: 'rentalId',
        populate: [
          { path: 'userId', select: 'username' },
          { path: 'bookId', select: 'title' }
        ]
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async verifyPayment(paymentId: string, isApproved: boolean) {
    const status = isApproved ? 'paid' : 'rejected';
    const payment = await this.paymentModel.findByIdAndUpdate(paymentId, { status }, { new: true });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const rentalPaymentStatus = isApproved ? 'paid' : 'pending';
    await this.rentalModel.findByIdAndUpdate(payment.rentalId, {
      paymentStatus: rentalPaymentStatus
    });

    return payment;
  }
}