import multer from 'multer';
import { MAX_FILE_SIZE } from '../config.js';

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,     // 10MB
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    // 仅接受图片类型
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('仅支持上传图片文件（image/*）'));
    }
  },
});
