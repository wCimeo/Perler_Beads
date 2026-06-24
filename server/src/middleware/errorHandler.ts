import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';

interface AppError extends Error {
  status?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // multer file too large error
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: 'File size exceeds limit (max 10MB)' });
      return;
    }
    res.status(400).json({ error: `Upload error: ${err.message}` });
    return;
  }

  // multer file type filter error
  if (err.message?.startsWith('仅支持上传图片')) {
    res.status(400).json({ error: err.message });
    return;
  }

  // sharp processing error
  if (err.message?.includes('sharp') || err.message?.includes('image')) {
    res.status(422).json({ error: `Image processing failed: ${err.message}` });
    return;
  }

  const status = err.status ?? 500;
  const message = status === 500 ? 'Internal server error' : err.message;

  console.error(`[ErrorHandler ${status}]`, err.message || err, '\n', err.stack || '');
  res.status(status).json({ error: message });
}
