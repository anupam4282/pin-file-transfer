import crypto from 'crypto';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  throw new Error(
    'SUPABASE_URL and SUPABASE_SECRET_KEY are required in .env'
  );
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SECRET_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);

const BUCKET_NAME = 'files';

export interface StoredFileRecord {
  id: string;
  originalName: string;
  storageFileName: string;
  size: number;
  mimeType: string;
  pinHash: string;
  salt: string;
  uploadedAt: string;
  expiresAt: string;
  downloadCount: number;
}

// Weak PINs
const COMMON_WEAK_PINS = new Set([
  '000000',
  '111111',
  '222222',
  '333333',
  '444444',
  '555555',
  '666666',
  '777777',
  '888888',
  '999999',
  '123456',
  '654321',
  '123123',
  '121212',
  '112233',
  '665544',
  '012345',
  '543210',
  '987654',
  '456789',
]);

export function isWeakPin(pin: string): boolean {
  if (COMMON_WEAK_PINS.has(pin)) return true;

  if (/^(\d)\1{5}$/.test(pin)) return true;

  const digits = pin.split('').map(Number);

  let isSeqInc = true;
  let isSeqDec = true;

  for (let i = 1; i < digits.length; i++) {
    if (digits[i] !== digits[i - 1] + 1) {
      isSeqInc = false;
    }

    if (digits[i] !== digits[i - 1] - 1) {
      isSeqDec = false;
    }
  }

  return isSeqInc || isSeqDec;
}

// PIN hashing
export function hashPin(
  pin: string,
  salt?: string
): { hash: string; salt: string } {
  const finalSalt =
    salt || crypto.randomBytes(16).toString('hex');

  const hash = crypto
    .scryptSync(pin, finalSalt, 64)
    .toString('hex');

  return {
    hash,
    salt: finalSalt,
  };
}

export function verifyPin(
  pin: string,
  record: StoredFileRecord
): boolean {
  try {
    const { hash } = hashPin(pin, record.salt);

    const storedBuf = Buffer.from(record.pinHash, 'hex');
    const computedBuf = Buffer.from(hash, 'hex');

    if (storedBuf.length !== computedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      storedBuf,
      computedBuf
    );
  } catch {
    return false;
  }
}

// Temporary access token
const TOKEN_SECRET = crypto.randomBytes(32).toString('hex');

export function createAccessToken(fileId: string): string {
  const expiry =
    Date.now() + 1000 * 60 * 60 * 2;

  const payload = `${fileId}:${expiry}`;

  const hmac = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payload)
    .digest('hex');

  return Buffer.from(
    `${payload}:${hmac}`
  ).toString('base64url');
}

export function verifyAccessToken(
  token: string,
  fileId: string
): boolean {
  try {
    const decoded = Buffer
      .from(token, 'base64url')
      .toString('utf-8');

    const parts = decoded.split(':');

    if (parts.length !== 3) {
      return false;
    }

    const [
      tokenFileId,
      expiryStr,
      receivedHmac,
    ] = parts;

    if (tokenFileId !== fileId) {
      return false;
    }

    const expiry = parseInt(expiryStr, 10);

    if (Date.now() > expiry) {
      return false;
    }

    const payload =
      `${tokenFileId}:${expiryStr}`;

    const expectedHmac = crypto
      .createHmac('sha256', TOKEN_SECRET)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(receivedHmac, 'hex'),
      Buffer.from(expectedHmac, 'hex')
    );
  } catch {
    return false;
  }
}

// Upload file to Supabase Storage + save DB record
export async function saveFileRecord(
  file: Express.Multer.File,
  pin: string,
  expiryHours: number = 48
): Promise<StoredFileRecord> {
  const id = crypto.randomUUID();

  const originalName = file.originalname
    .split(/[\\/]/)
    .pop() || 'file';

  const extension =
    originalName.includes('.')
      ? '.' + originalName.split('.').pop()
      : '.bin';

  const storageFileName = `${id}${extension}`;

  const fileBuffer = await fs.promises.readFile(
    file.path
  );

  const { error: uploadError } =
    await supabase.storage
      .from(BUCKET_NAME)
      .upload(
        storageFileName,
        fileBuffer,
        {
          contentType:
            file.mimetype ||
            'application/octet-stream',
          upsert: false,
        }
      );

  if (uploadError) {
    throw new Error(
      `Supabase Storage upload failed: ${uploadError.message}`
    );
  }

  // Remove temporary local file
  try {
    await fs.promises.unlink(file.path);
  } catch {
    // Ignore cleanup error
  }

  const { hash, salt } = hashPin(pin);

  const now = new Date();

  const expiresAt = new Date(
    now.getTime() +
      expiryHours * 60 * 60 * 1000
  ).toISOString();

  const record: StoredFileRecord = {
    id,
    originalName,
    storageFileName,
    size: file.size,
    mimeType:
      file.mimetype ||
      'application/octet-stream',
    pinHash: hash,
    salt,
    uploadedAt: now.toISOString(),
    expiresAt,
    downloadCount: 0,
  };

  const { error: dbError } =
    await supabase
      .from('files')
      .insert({
        id: record.id,
        original_name: record.originalName,
        storage_file_name: record.storageFileName,
        size: record.size,
        mime_type: record.mimeType,
        pin_hash: record.pinHash,
        salt: record.salt,
        uploaded_at: record.uploadedAt,
        expires_at: record.expiresAt,
        download_count: 0,
      });

  if (dbError) {
    // If DB insert fails, remove uploaded file
    await supabase.storage
      .from(BUCKET_NAME)
      .remove([storageFileName]);

    throw new Error(
      `Supabase database insert failed: ${dbError.message}`
    );
  }

  return record;
}

// Find file by PIN
export async function findFileByPin(
  pin: string
): Promise<StoredFileRecord | null> {
  const { data, error } =
    await supabase
      .from('files')
      .select('*')
      .gt('expires_at', new Date().toISOString());

  if (error) {
    throw new Error(
      `Database lookup failed: ${error.message}`
    );
  }

  for (const row of data || []) {
    const record = mapDatabaseRow(row);

    if (verifyPin(pin, record)) {
      return record;
    }
  }

  return null;
}

// Get file by ID
export async function getFileById(
  id: string
): Promise<StoredFileRecord | null> {
  const { data, error } =
    await supabase
      .from('files')
      .select('*')
      .eq('id', id)
      .maybeSingle();

  if (error) {
    throw new Error(
      `Database lookup failed: ${error.message}`
    );
  }

  if (!data) {
    return null;
  }

  return mapDatabaseRow(data);
}

// Create temporary signed download URL
export async function createDownloadUrl(
  record: StoredFileRecord
): Promise<string> {
  const { data, error } =
    await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(
        record.storageFileName,
        60,
        {
          download: record.originalName,
        }
      );

  if (error || !data?.signedUrl) {
    throw new Error(
      `Could not create download URL: ${
        error?.message || 'Unknown error'
      }`
    );
  }

  return data.signedUrl;
}

// Increase download count
export async function incrementDownloadCount(
  id: string
): Promise<void> {
  const record = await getFileById(id);

  if (!record) {
    return;
  }

  const { error } =
    await supabase
      .from('files')
      .update({
        download_count:
          (record.downloadCount || 0) + 1,
      })
      .eq('id', id);

  if (error) {
    console.error(
      'Failed to update download count:',
      error.message
    );
  }
}

// Delete file from Supabase Storage + database
export async function deleteFile(
  id: string
): Promise<boolean> {
  const record = await getFileById(id);

  if (!record) {
    return false;
  }

  const { error: storageError } =
    await supabase.storage
      .from(BUCKET_NAME)
      .remove([record.storageFileName]);

  if (storageError) {
    console.error(
      'Storage deletion error:',
      storageError.message
    );
    return false;
  }

  const { error: dbError } =
    await supabase
      .from('files')
      .delete()
      .eq('id', id);

  if (dbError) {
    console.error(
      'Database deletion error:',
      dbError.message
    );
    return false;
  }

  return true;
}

// Delete expired files
export async function cleanExpiredFiles(): Promise<number> {
  const now = new Date().toISOString();

  const { data, error } =
    await supabase
      .from('files')
      .select('*')
      .lte('expires_at', now);

  if (error) {
    console.error(
      'Expired-file lookup failed:',
      error.message
    );
    return 0;
  }

  let deletedCount = 0;

  for (const row of data || []) {
    const record = mapDatabaseRow(row);

    const { error: storageError } =
      await supabase.storage
        .from(BUCKET_NAME)
        .remove([
          record.storageFileName,
        ]);

    if (storageError) {
      console.error(
        'Expired storage deletion failed:',
        storageError.message
      );
      continue;
    }

    const { error: dbError } =
      await supabase
        .from('files')
        .delete()
        .eq('id', record.id);

    if (!dbError) {
      deletedCount++;
    }
  }

  if (deletedCount > 0) {
    console.log(
      `Cleaned up ${deletedCount} expired file(s)`
    );
  }

  return deletedCount;
}

// Convert Supabase DB row to application record
function mapDatabaseRow(
  row: any
): StoredFileRecord {
  return {
    id: row.id,
    originalName: row.original_name,
    storageFileName: row.storage_file_name,
    size: Number(row.size),
    mimeType: row.mime_type,
    pinHash: row.pin_hash,
    salt: row.salt,
    uploadedAt: row.uploaded_at,
    expiresAt: row.expires_at,
    downloadCount:
      Number(row.download_count) || 0,
  };
}

// Cleanup every 15 minutes
setInterval(
  () => {
    cleanExpiredFiles().catch((err) => {
      console.error(
        'Cleanup error:',
        err
      );
    });
  },
  15 * 60 * 1000
);