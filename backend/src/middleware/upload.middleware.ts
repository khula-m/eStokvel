import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// ── Magic-byte signatures for allowed types ───────────────────────────────
// Checking actual file content prevents MIME spoofing (e.g. .php renamed to .jpg).
type Signature = { offset: number; bytes: number[] };
const MAGIC_SIGNATURES: Record<string, Signature[]> = {
  'image/jpeg':      [{ offset: 0, bytes: [0xFF, 0xD8, 0xFF] }],
  'image/png':       [{ offset: 0, bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] }],
  'image/gif':       [{ offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] }],
  'image/webp':      [{ offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }], // "RIFF" header
  'application/pdf': [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }], // "%PDF"
};

function matchesMagicBytes(buf: Buffer, mime: string): boolean {
  const sigs = MAGIC_SIGNATURES[mime];
  if (!sigs) return false;
  return sigs.some(({ offset, bytes }) =>
    bytes.every((b, i) => buf[offset + i] === b)
  );
}

// ── Uploads directory ──────────────────────────────────────────────────────
const uploadsDir = path.resolve('uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ── All uploads land in memory first so we can inspect magic bytes ─────────
const memStore = multer.memoryStorage();

const ALLOWED_MIMES = Object.keys(MAGIC_SIGNATURES);

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP, and PDF files are allowed.'));
  }
};

const memUpload = multer({
  storage: memStore,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

/**
 * Full upload pipeline for payment proof:
 *   1. Multer reads into memory (MIME header check)
 *   2. Magic-byte validation (prevents MIME spoofing)
 *   3. Write to disk with a UUID filename
 *
 * Attach as: router.post('/...', uploadPaymentProof, handleUploadError, controller)
 */
export const uploadPaymentProof = [
  memUpload.single('paymentProof'),
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) return next(); // no file — let the controller decide if required

    if (!matchesMagicBytes(req.file.buffer, req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'File content does not match its declared type. Upload rejected.',
      });
    }

    // Write validated buffer to disk
    const ext = path.extname(req.file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    const dest = path.join(uploadsDir, filename);
    fs.writeFile(dest, req.file.buffer, (err) => {
      if (err) return next(err);
      // Expose the saved path the same way disk storage would
      (req.file as any).path = dest;
      (req.file as any).filename = filename;
      next();
    });
  },
];

/** Memory-only upload (no disk write) — used when the caller handles the buffer directly. */
export const uploadToMemory = memUpload.single('paymentProof');

export const handleUploadError = (err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File too large. Maximum size is 5MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ success: false, message: 'Too many files. Only 1 file allowed.' });
    }
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message || 'File upload failed' });
  }
  return next();
};

export default memUpload;
