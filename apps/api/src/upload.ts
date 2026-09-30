import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { prisma } from './db';

export const uploadRouter = Router();

const storageDir = process.env.STORAGE_DIR || './storage';
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

function checkMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 4) return false;
  
  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  }
  if (mimeType === 'image/png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  }
  if (mimeType === 'application/pdf') {
    return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
  }
  return false;
}

uploadRouter.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file provided' });
  }

  if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
    return res.status(400).json({ message: 'Invalid file type' });
  }
  
  const applicationId = req.body.applicationId;
  if (!applicationId) {
    return res.status(400).json({ message: 'applicationId is required' });
  }

  if (!checkMagicBytes(req.file.buffer, req.file.mimetype)) {
    return res.status(400).json({ message: 'File content does not match extension' });
  }

  const sha256 = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
  const ext = path.extname(req.file.originalname) || '';
  const randomName = crypto.randomBytes(16).toString('hex') + ext;
  const filePath = path.join(storageDir, randomName);

  // Validate job
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { appointment: true }
    });
    if (!app || app.status !== 'ACCEPTED' || !app.appointment || app.appointment.officerId !== user.userId) {
      return res.status(403).json({ message: 'Not linked to an accepted job for you' });
    }
  } catch (e) {
    return res.status(500).json({ message: 'Database error' });
  }

  fs.writeFileSync(filePath, req.file.buffer);

  res.status(201).json({
    fileUrl: `/api/upload/${randomName}`,
    sha256,
    receiveTime: new Date().toISOString()
  });
});

uploadRouter.get('/:filename', (req, res) => {
  const filename = req.params.filename;
  if (!/^[a-f0-9]+(\.jpg|\.jpeg|\.png|\.pdf)$/i.test(filename)) {
    return res.status(400).json({ message: 'Invalid filename' });
  }

  const filePath = path.join(process.cwd(), storageDir, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File not found' });
  }

  res.sendFile(filePath);
});
