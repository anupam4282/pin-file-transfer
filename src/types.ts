export interface FileMetadata {
  id: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  expiresAt?: string;
  downloadCount?: number;
}

export interface AccessResponse {
  success: boolean;
  file?: FileMetadata;
  accessToken?: string;
  error?: string;
  lockedUntil?: number;
}

export interface UploadResponse {
  success: boolean;
  file?: FileMetadata;
  pin?: string;
  error?: string;
}

export interface SecurityStats {
  maxFileSizeMB: number;
  defaultExpiryHours: number;
}
