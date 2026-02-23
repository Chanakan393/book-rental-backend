import { Module, Global } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

@Global() // ใส่ Global ไว้เพื่อให้ module อื่นๆ เรียกใช้งานได้
@Module({
  // 🚀 ลบ array controllers: [...] ออกไปเลยครับ
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}