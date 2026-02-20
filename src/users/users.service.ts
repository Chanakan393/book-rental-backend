import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) { }

  // 🛡️ ฟังก์ชันช่วยตรวจสอบและล้างค่าเบอร์โทรศัพท์
  private validateAndCleanPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber) return '';
    
    // ✅ 1. ล้างช่องว่างและขีดออกให้เหลือแต่ตัวเลข
    const cleanPhone = phoneNumber.replace(/[- ]/g, '');

    // ✅ 2. เช็ค Regex: ขึ้นด้วย 06, 08, 09 และต้องครบ 10 หลัก
    const phoneRegex = /^(06|08|09)\d{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      throw new BadRequestException('เบอร์โทรศัพท์ไม่ถูกต้อง (ต้องขึ้นด้วย 06, 08, 09 และมี 10 หลักเท่านั้น)');
    }
    
    return cleanPhone;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { email, password } = createUserDto;

    // ✅ ตรวจสอบและล้างค่าเบอร์โทรศัพท์ก่อนบันทึก
    createUserDto.phoneNumber = this.validateAndCleanPhoneNumber(createUserDto.phoneNumber);

    // 1. เช็คว่า Email ซ้ำไหม
    const emailExists = await this.userModel.findOne({ email });
    if (emailExists) {
      throw new BadRequestException('Email นี้ถูกใช้งานไปแล้ว');
    }

    // 2. เช็คเบอร์โทรศัพท์ซ้ำไหม
    const phoneExists = await this.userModel.findOne({ phoneNumber: createUserDto.phoneNumber });
    if (phoneExists) {
      throw new BadRequestException('เบอร์โทรศัพท์นี้ถูกใช้งานไปแล้ว');
    }

    // 3. Hash Password และบันทึก (ล็อก role เป็น member)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
      role: 'member',
    });

    return newUser.save();
  }

  // ฟังก์ชันสำหรับหา User โดยเช็คทั้ง Username หรือ Email
  async findByLogin(identifier: string): Promise<UserDocument | null> {
    return this.userModel.findOne({
      $or: [
        { email: identifier },
        { username: identifier }
      ]
    }).exec();
  }

  // ใช้ตอน Login และ Refresh
  async findByIdWithRefresh(userId: string) {
    return this.userModel.findById(userId).select('+refreshTokenHash').exec();
  }

  // อัปเดต Hash กุญแจสำรอง
  async setRefreshTokenHash(userId: string, refreshTokenHash: string | null) {
    return this.userModel.updateOne({ _id: userId }, { refreshTokenHash }).exec();
  }

  // แก้ไขข้อมูลผู้ใช้งาน
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    // ดึงข้อมูลเดิมมาเช็คก่อน
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('ไม่พบข้อมูลผู้ใช้งาน');

    // ✅ ถ้ามีการส่งเบอร์โทรศัพท์มา ให้ตรวจสอบและล้างค่าก่อน
    if (updateUserDto.phoneNumber) {
      updateUserDto.phoneNumber = this.validateAndCleanPhoneNumber(updateUserDto.phoneNumber);
    }

    // 🚀 ดักเช็ค Email ซ้ำ (ถ้ามีการเปลี่ยน Email)
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const emailExists = await this.userModel.findOne({ email: updateUserDto.email });
      if (emailExists) throw new BadRequestException('Email นี้ถูกใช้งานโดยผู้ใช้อื่นแล้ว');
    }

    // 🚀 ดักเช็คเบอร์โทรศัพท์ซ้ำ (ถ้ามีการเปลี่ยนเบอร์)
    if (updateUserDto.phoneNumber && updateUserDto.phoneNumber !== user.phoneNumber) {
      const phoneExists = await this.userModel.findOne({ phoneNumber: updateUserDto.phoneNumber });
      if (phoneExists) throw new BadRequestException('เบอร์โทรศัพท์นี้ถูกใช้งานโดยผู้ใช้อื่นแล้ว');
    }

    // 🚀 ถ้ามีการแก้ Password ต้อง Hash ใหม่
    if (updateUserDto.password) {
      const salt = await bcrypt.genSalt(10);
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, salt);
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, { $set: updateUserDto }, { new: true })
      .select('-password -refreshTokenHash') // 🔒 ไม่ส่งข้อมูลลับกลับไป
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('ไม่พบข้อมูลผู้ใช้งาน');
    }
    return updatedUser;
  }

  // ==========================================
  //  ฟังก์ชันสำหรับ Admin และ Profile
  // ==========================================

  // ดึงรายชื่อสมาชิกทั้งหมด (ไม่เอา Password และ Hash) - สำหรับแอดมิน
  async findAll(): Promise<UserDocument[]> {
    return this.userModel
      .find({ role: 'member' })
      .select('-password -refreshTokenHash')
      .exec();
  }

  // ดูข้อมูลลูกค้ารายบุคคล - สำหรับแอดมิน และ Member ดูหน้าโปรไฟล์ตัวเอง
  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel
      .findById(id)
      .select('-password -refreshTokenHash')
      .exec();

    if (!user) throw new BadRequestException('ไม่พบข้อมูลผู้ใช้งาน');
    return user;
  }
}