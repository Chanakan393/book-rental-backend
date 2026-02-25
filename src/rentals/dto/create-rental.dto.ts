import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsIn } from 'class-validator';

export class CreateRentalDto {
  @ApiProperty({ 
    example: '65c8f1a2b3c4d5e6f7a8b9c0', 
    description: 'ID ของหนังสือที่ต้องการเช่า (Object ID จาก MongoDB)' 
  })
  @IsString()
  bookId: string;

  @ApiProperty({ 
    example: 3, 
    enum: [3, 5, 7], 
    description: 'จำนวนวันที่เช่า (เลือกได้แค่ 3, 5 หรือ 7 วัน)' 
  })
  @IsNumber()
  @IsIn([3, 5, 7])
  days: number;
}