import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';
import { CreateCloudinaryDto } from './dto/create-cloudinary.dto';

@Injectable()
export class CloudinaryService {
  create(createCloudinaryDto: CreateCloudinaryDto) {
    throw new Error('Method not implemented.');
  }
  constructor() {
    // 🚀 เอาค่าจากเว็บ Cloudinary มาใส่ตรงนี้ครับ
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  uploadFile(file: Express.Multer.File, folderName: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: folderName }, // แยกโฟลเดอร์รูปปก กับ สลิป ให้เป็นระเบียบ
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );
      // โยนไฟล์จาก Memory ขึ้น Cloud
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }
}