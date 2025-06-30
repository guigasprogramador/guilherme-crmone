import { v2 as cloudinary } from 'cloudinary';

// Este arquivo deve ser usado apenas no server-side (API, SSR). Não exporte mais CLOUDINARY_CLOUD_NAME para o client. Só exporte o cloudinary SDK configurado.
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dss74q6ld';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '185649899768557';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || 'fXK3RdMxpoPF1ijLUCftqTMV2sk';

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error('Cloudinary configuration error: Missing cloud_name, api_key, or api_secret.');
  // Optionally throw an error if Cloudinary is critical for the app to run
  // throw new Error('Cloudinary configuration is incomplete.');
} else {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true, // Ensure secure URLs (https://) are generated
  });
  console.log('Cloudinary SDK configured successfully.');
}

export { cloudinary };
