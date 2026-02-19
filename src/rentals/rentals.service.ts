import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Rental, RentalDocument } from './entities/rental.entity';
import { Book, BookDocument } from '../books/entities/book.entity';
import { Payment, PaymentDocument } from '../payment/entities/payment.entity';

@Injectable()
export class RentalsService {
  findOverdueRentals() {
    throw new Error('Method not implemented.');
  }
  constructor(
    @InjectModel(Rental.name) private rentalModel: Model<RentalDocument>,
    @InjectModel(Book.name) private bookModel: Model<BookDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
  ) { }

  // 1. ลูกค้ากดจองหนังสือ (booked)
  async rentBook(userId: string, bookId: string, days: number) {
    if (![3, 5, 7].includes(days)) {
      throw new BadRequestException('เลือกจำนวนวันเช่าได้แค่ 3, 5 หรือ 7 วันเท่านั้น');
    }

    const book = await this.bookModel.findOneAndUpdate(
      { _id: bookId, "stock.available": { $gt: 0 }, status: 'Available' },
      { $inc: { "stock.available": -1 } },
      { new: true }
    );

    if (!book) throw new BadRequestException('หนังสือหมด หรือไม่พร้อมให้เช่า');

    let rentalCost = days === 3 ? book.pricing.day3 : days === 5 ? book.pricing.day5 : book.pricing.day7;
    const dueDate = new Date();
    dueDate.setDate(new Date().getDate() + days);

    const rental = new this.rentalModel({
      userId,
      bookId,
      borrowDate: new Date(),
      dueDate,
      cost: rentalCost,
      status: 'booked',
      paymentStatus: 'pending'
    });

    return rental.save();
  }

  // 2. ลูกค้ามารับของ (booked -> rented)
  async pickupBook(rentalId: string) {
    const rental = await this.rentalModel.findById(rentalId);
    if (!rental) throw new NotFoundException('ไม่พบรายการเช่านี้');

    if (rental.paymentStatus !== 'paid') {
      throw new BadRequestException('ยังไม่ได้จ่ายเงินหรือรอแอดมินตรวจสอบสลิป');
    }

    if (rental.status !== 'booked') {
      throw new BadRequestException('สถานะไม่ถูกต้องสำหรับการรับหนังสือ');
    }

    rental.status = 'rented';
    rental.borrowDate = new Date(); // รีเซ็ตวันยืมเป็นวันที่มารับของจริง
    return rental.save();
  }

  // 3. คืนหนังสือ (rented -> returned) พร้อมคำนวณค่าปรับ
  async returnBook(rentalId: string) {
    const rental = await this.rentalModel.findById(rentalId);
    if (!rental || rental.status !== 'rented') {
      throw new BadRequestException('รายการไม่ถูกต้อง หรือหนังสือไม่ได้อยู่ในสถานะกำลังเช่า');
    }

    const now = new Date();
    const dueDate = new Date(rental.dueDate);
    let fine = 0;

    // 🚀 Logic คำนวณค่าปรับ: ถ้าเวลาปัจจุบัน > วันกำหนดคืน
    if (now > dueDate) {
      // คำนวณส่วนต่างของเวลา (มิลลิวินาที) และแปลงเป็นจำนวนวัน
      const diffTime = Math.abs(now.getTime() - dueDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      fine = diffDays * 10; // 💸 สมมติค่าปรับวันละ 10 บาท
    }

    // อัปเดตสต็อกหนังสือ (+1)
    await this.bookModel.findByIdAndUpdate(rental.bookId, { $inc: { "stock.available": 1 } });

    // บันทึกข้อมูลการคืน
    rental.status = 'returned';
    rental.returnDate = now;
    rental.fine = fine; // บันทึกลงฟิลด์ fine ใน Entity

    return rental.save();
  }

  // 4. ยกเลิกรายการจอง (ปรับปรุงใหม่ตามความต้องการ)
  async cancelRental(rentalId: string) {
    const rental = await this.rentalModel.findById(rentalId);
    if (!rental) throw new NotFoundException('ไม่พบรายการเช่า');

    // 🛡️ เช็คเงื่อนไข: ยกเลิกได้ตราบใดที่ยังไม่ได้มารับของ (rented)
    if (['rented', 'returned', 'cancelled'].includes(rental.status)) {
      throw new BadRequestException('ไม่สามารถยกเลิกรายการได้เนื่องจากรับหนังสือไปแล้วหรือดำเนินการเสร็จสิ้นแล้ว');
    }

    // จัดการสถานะการเงิน
    let targetPaymentStatus = '';
    let targetRentalPaymentStatus = '';

    if (rental.paymentStatus === 'paid' || rental.paymentStatus === 'verification') {
      // ถ้าจ่ายแล้วหรือกำลังตรวจสลิป ให้เปลี่ยนเป็น "รอคืนเงิน"
      targetPaymentStatus = 'refunded';
      targetRentalPaymentStatus = 'refund_pending';
    } else {
      targetPaymentStatus = 'rejected';
      targetRentalPaymentStatus = 'cancelled';
    }

    // อัปเดตสถานะใน Payment Collection
    await this.paymentModel.findOneAndUpdate(
      { rentalId: rental._id },
      { status: targetPaymentStatus }
    );

    // อัปเดตฝั่ง Rental
    rental.paymentStatus = targetRentalPaymentStatus as any;
    rental.status = 'cancelled';

    // คืนสต็อกหนังสือ (+1 กลับเข้าคลัง)
    await this.bookModel.findByIdAndUpdate(rental.bookId, {
      $inc: { "stock.available": 1 }
    });

    return rental.save();
  }

  // ✅ ตรวจสอบฟังก์ชันนี้: ต้องมั่นใจว่ามีการ populate 'bookId'
  async findMyHistory(userId: string) {
    return this.rentalModel.find({ userId })
      .populate('userId', 'username email phoneNumber address') // ✨ เพิ่มให้ดึง address และเบอร์โทรมาด้วย
      .populate('bookId', 'title coverImage') // ✨ ดึงข้อมูลหนังสือมาโชว์หน้าปก
      .sort({ createdAt: -1 })
      .exec();
  }

  async getDashboardReports(dateString?: string) {
    let query: any = {};
    if (dateString && dateString !== 'all') {
      const targetDate = new Date(dateString);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      query = { createdAt: { $gte: startOfDay, $lte: endOfDay } };
    }

    const transactions = await this.rentalModel.find(query)
      .populate('userId', 'username email')
      .populate('bookId', 'title coverImage')
      .sort({ createdAt: -1 })
      .exec();

    const activeBookings = await this.rentalModel.countDocuments({ ...query, status: 'booked' });
    const activeRentals = await this.rentalModel.countDocuments({ ...query, status: 'rented' });
    const overdueRentals = await this.rentalModel.countDocuments({
      ...query,
      status: 'rented',
      dueDate: { $lt: new Date() }
    });

    const revenue = transactions
      .filter(r => r.paymentStatus === 'paid')
      .reduce((sum, r) => sum + r.cost, 0);

    return {
      summaryData: { activeBookings, activeRentals, overdueRentals, revenue },
      transactions
    };
  }
}