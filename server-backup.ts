import 'dotenv/config';
import express from 'express';
import path from 'path';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import {
  saveFileRecord,
  findFileByPin,
  getFileById,
  createDownloadUrl,
  verifyPin,
  verifyAccessToken,
  createAccessToken,
  deleteFile,
  incrementDownloadCount,
  isWeakPin,
  cleanExpiredFiles
} from './server/storage.ts';
import {
  checkRateLimit,
  recordFailedAttempt,
  recordSuccessfulAttempt
} from './server/rateLimiter.ts';
import fs from 'fs';

const PORT = 3000;
const MAX_FILE_SIZE_MB = 50; // 50 MB

// Setup Multer for secure uploads with temp storage
const tempUploadDir = path.join(process.cwd(), 'data', 'temp_uploads');
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

const upload = multer({
  dest: tempUploadDir,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
  }
});

function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

// Artificial delay helper to prevent timing attacks
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function startServer() {
  const app = express();

  // Basic middlewares
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // System config
  app.get('/api/config', (req, res) => {
    res.json({
      maxFileSizeMB: MAX_FILE_SIZE_MB,
      defaultExpiryHours: 48,
    });
  });

  // 1. UPLOAD FILE
  app.post('/api/files/upload', upload.single('file'), async (req, res) => {
    try {
      const file = req.file;
      const { pin, confirmPin, expiryHours } = req.body;

      if (!file) {
        return res.status(400).json({ success: false, error: 'Please select a file to upload.' });
      }

      if (!pin || typeof pin !== 'string') {
        // Cleanup temp file
        if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(400).json({ success: false, error: 'A 6-digit PIN is required.' });
      }

      const trimmedPin = pin.trim();
      if (!/^\d{6}$/.test(trimmedPin)) {
        if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(400).json({ success: false, error: 'PIN must be exactly 6 digits (0-9).' });
      }

      if (confirmPin && confirmPin.trim() !== trimmedPin) {
        if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(400).json({ success: false, error: 'PIN confirmation does not match.' });
      }

      if (isWeakPin(trimmedPin)) {
        if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(400).json({
          success: false,
          error: 'This PIN is too common or predictable (e.g., 000000, 123456). Please choose a more secure 6-digit PIN.'
        });
      }

      const parsedExpiry = parseInt(expiryHours, 10) || 48;
      const safeExpiry = Math.min(Math.max(parsedExpiry, 1), 168); // 1 hour to 7 days

      const record = await saveFileRecord(
  file,
  trimmedPin,
  safeExpiry
);

      return res.status(201).json({
        success: true,
        pin: trimmedPin,
        file: {
          id: record.id,
          originalName: record.originalName,
          size: record.size,
          mimeType: record.mimeType,
          uploadedAt: record.uploadedAt,
          expiresAt: record.expiresAt,
        }
      });
    } catch (err: any) {
      console.error('Error during upload:', err);
      // Clean up uploaded file if present
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      return res.status(500).json({ success: false, error: err.message || 'File upload failed. Please try again.' });
    }
  });

  // 2. ACCESS / SEARCH FILE USING 6-DIGIT PIN
  app.post('/api/files/access', async (req, res) => {
    const ip = getClientIp(req);
    const { pin } = req.body;

    // Check rate limit
    const rateCheck = checkRateLimit(ip);
    if (rateCheck.isLocked) {
      return res.status(429).json({
        success: false,
        error: `Too many failed attempts. Please wait ${rateCheck.remainingLockoutSeconds} seconds before trying again.`,
        lockedUntil: Date.now() + rateCheck.remainingLockoutSeconds * 1000
      });
    }

    if (!pin || typeof pin !== 'string' || !/^\d{6}$/.test(pin.trim())) {
      // Small jitter delay
      await delay(150 + Math.random() * 100);
      const attempt = recordFailedAttempt(ip);
      if (attempt.isNowLocked) {
        return res.status(429).json({
          success: false,
          error: `Too many failed attempts. Temporary lockout for ${attempt.lockoutSeconds} seconds.`,
          lockedUntil: Date.now() + attempt.lockoutSeconds * 1000
        });
      }
      return res.status(400).json({
        success: false,
        error: 'Invalid PIN or file not found.'
      });
    }

    const trimmedPin = pin.trim();

    // Constant-time like artificial jitter delay (180ms - 260ms) to foil side channels
    await delay(180 + Math.random() * 80);

   const record = await findFileByPin(trimmedPin);

    if (!record) {
      const attempt = recordFailedAttempt(ip);
      if (attempt.isNowLocked) {
        return res.status(429).json({
          success: false,
          error: `Too many failed attempts. Temporary lockout for ${attempt.lockoutSeconds} seconds.`,
          lockedUntil: Date.now() + attempt.lockoutSeconds * 1000
        });
      }
      return res.status(404).json({
        success: false,
        error: 'Invalid PIN or file not found.'
      });
    }

    // Success! Reset failed attempts for this IP
    recordSuccessfulAttempt(ip);
    const accessToken = createAccessToken(record.id);

    return res.json({
      success: true,
      file: {
        id: record.id,
        originalName: record.originalName,
        size: record.size,
        mimeType: record.mimeType,
        uploadedAt: record.uploadedAt,
        expiresAt: record.expiresAt,
        downloadCount: record.downloadCount || 0
      },
      accessToken
    });
  });

  // 3. DOWNLOAD FILE
  // 3. DOWNLOAD FILE
app.get('/api/files/:id/download', async (req, res) => {
  try {
    const { id } = req.params;

    const token = req.query.token as string;
    const pin = req.query.pin as string;

    const authHeader = req.headers.authorization;

    const bearerToken =
      authHeader?.startsWith('Bearer ')
        ? authHeader.substring(7)
        : null;

    const record = await getFileById(id);

    if (!record) {
      return res
        .status(404)
        .send('File not found or has been deleted.');
    }

    // Check expiry
    if (
      new Date(record.expiresAt).getTime() <=
      Date.now()
    ) {
      await cleanExpiredFiles();

      return res
        .status(410)
        .send(
          'This file has expired and is no longer available.'
        );
    }

    // Verify authorization
    let authorized = false;

    if (
      token &&
      verifyAccessToken(token, id)
    ) {
      authorized = true;
    } else if (
      bearerToken &&
      verifyAccessToken(bearerToken, id)
    ) {
      authorized = true;
    } else if (
      pin &&
      /^\d{6}$/.test(pin.trim()) &&
      verifyPin(pin.trim(), record)
    ) {
      authorized = true;
    }

    if (!authorized) {
      return res
        .status(403)
        .send(
          'Unauthorized. Valid PIN or session token required.'
        );
    }

    // Create short-lived signed URL
    const downloadUrl =
      await createDownloadUrl(record);

    // Count download
    await incrementDownloadCount(id);

    // Send browser to signed Supabase URL
    return res.redirect(downloadUrl);

  } catch (err: any) {
    console.error(
      'Error during download:',
      err
    );

    return res
      .status(500)
      .send('Download failed.');
  }
});

  // 4. DELETE FILE
  app.delete('/api/files/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { pin } = req.body || {};
      const token = req.query.token as string || (req.body && req.body.token);
      const authHeader = req.headers.authorization;
      const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

      const record = await getFileById(id);
      if (!record) {
        return res.status(404).json({ success: false, error: 'File not found or already deleted.' });
      }

      // Verify authorization
      let authorized = false;
      if (token && verifyAccessToken(token, id)) {
        authorized = true;
      } else if (bearerToken && verifyAccessToken(bearerToken, id)) {
        authorized = true;
      } else if (pin && /^\d{6}$/.test(String(pin).trim()) && verifyPin(String(pin).trim(), record)) {
        authorized = true;
      }

      if (!authorized) {
        return res.status(403).json({ success: false, error: 'Unauthorized. Valid PIN or session token required to delete this file.' });
      }

      const deleted = await deleteFile(id);
      if (deleted) {
        return res.json({ success: true, message: 'File has been permanently deleted.' });
      } else {
        return res.status(500).json({ success: false, error: 'Failed to delete file from storage.' });
      }
    } catch (err: any) {
      console.error('Error during deletion:', err);
      return res.status(500).json({ success: false, error: 'Internal server error.' });
    }
  });

  // Setup Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
