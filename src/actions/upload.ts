
'use server';

import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImage(dataUri: string) {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.local');
  }
  if (!dataUri) {
    throw new Error('No image data URI provided.');
  }

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      dataUri,
      {
          tags: ['blinkchat_profile_image'],
      },
      (error, result) => {
        if (error) {
          console.error('Full upload error details from Cloudinary:', error);
          reject(error);
          return;
        }
        resolve(result);
      }
    );
  }) as Promise<any>;
}
