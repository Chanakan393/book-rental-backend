import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin', description: 'Username หรือ Email' })
  @IsNotEmpty() @IsString()
  account: string;

  @ApiProperty({ example: 'password1234', description: 'รหัสผ่าน' })
  @IsNotEmpty() @IsString()
  password: string;
}