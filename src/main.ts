import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 🚀 ส่วนที่เพิ่ม: เปิดให้เข้าถึงไฟล์ในโฟลเดอร์ uploads ผ่าน URL
  // เช่น http://localhost:3000/uploads/slips/slip-xxx.jpg
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  app.enableCors({
    origin: true, // หรือใส่เป็น ['http://localhost:3000', 'http://localhost:3001']
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // ปรับการตั้งค่า Helmet เพื่อให้ยอมรับรูปภาพจาก Resource ของเราเอง (Cross-Origin)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();