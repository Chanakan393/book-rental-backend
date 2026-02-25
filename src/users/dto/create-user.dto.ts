import { IsString, IsEmail, MinLength, IsOptional, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'somchai99' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  // 🚀 ดัก Username: ห้ามอักษรพิเศษ ห้ามช่องว่าง (รองรับไทย-อังกฤษ-เลข)
  @Matches(/^[a-zA-Z0-9ก-๛]+$/, { message: 'ชื่อผู้ใช้งานห้ามมีอักษรพิเศษหรือช่องว่าง' })
  username: string;

  @ApiProperty({ example: 'test@mail.com' })
  @IsEmail({}, { message: 'รูปแบบอีเมลไม่ถูกต้อง' })
  email: string;

  @ApiProperty({ example: 'password1234' })
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  password: string;

  @ApiProperty({ example: '0812345678' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  phoneNumber: string;

  @ApiProperty({ example: '123/45 ซอยสุขุมวิท' })
  @IsString()
  @IsOptional()
  @MinLength(10)
  // 🚀 ดัก Address รวม: รองรับสระไทยทั้งหมด ตัวเลข สแลช และช่องว่าง (ห้ามมีจุด หรืออักษรแปลกๆ)
  @Matches(/^[a-zA-Z0-9ก-๛\s/]+$/, { message: 'ที่อยู่ห้ามมีอักษรพิเศษ (อนุญาตเฉพาะ / และช่องว่าง)' })
  address: string;

  @ApiProperty({ example: '10110' })
  @IsString()
  // 🚀 ดัก Zipcode: ต้องเป็นเลข 5 ตัวเท่านั้น
  @Matches(/^\d{5}$/, { message: 'รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลักเท่านั้น' })
  zipcode: string;
}