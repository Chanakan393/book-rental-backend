import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, ValidateNested, Min, IsArray, MaxLength, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class StockDto {
  @ApiProperty({ example: 10 })
  @IsInt() @Min(1) total: number;

  @ApiProperty({ example: 10 })
  @IsInt() @Min(0) available: number;
}

class PricingDto {
  @ApiProperty({ example: 50 })
  @IsNumber() @Min(1) day3: number;

  @ApiProperty({ example: 80 })
  @IsNumber() @Min(1) day5: number;

  @ApiProperty({ example: 100 })
  @IsNumber() @Min(1) day7: number;
}

export class CreateBookDto {
  @ApiProperty({ example: 'Blue Lock เล่ม 1' })
  @IsString() title: string;

  @ApiProperty({ example: 'Muneyuki Kaneshiro' })
  @IsString() author: string;

  @ApiProperty({ example: ['Sport', 'Shonen'], type: [String] })
  @IsArray() @IsString({ each: true }) category: string[];

  @ApiProperty({ example: 'การ์ตูนฟุตบอลสุดมันส์', required: false })
  @IsOptional() @IsString() @MaxLength(3000) description?: string;

  @ApiProperty({ type: StockDto })
  @ValidateNested() @Type(() => StockDto) stock: StockDto;

  @ApiProperty({ type: PricingDto })
  @ValidateNested() @Type(() => PricingDto) pricing: PricingDto;

  @ApiProperty({ example: 'https://image-url.com/cover.jpg' })
  @IsString() coverImage: string;
}