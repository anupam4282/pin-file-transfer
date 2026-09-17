import React from 'react';
import {
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  File as GenericFile
} from 'lucide-react';

export function formatBytes(bytes: number, decimals = 2): string {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatTimeRemaining(expiryDateString?: string): string {
  if (!expiryDateString) return '';
  const diff = new Date(expiryDateString).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h left`;
  }
  return `${hours}h ${minutes}m left`;
}

export function getFileIcon(filename: string, mimeType: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  if (
    mimeType.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext)
  ) {
    return <FileImage className="w-8 h-8 text-emerald-400" />;
  }

  if (
    mimeType.startsWith('video/') ||
    ['mp4', 'mkv', 'mov', 'avi', 'webm', 'flv'].includes(ext)
  ) {
    return <FileVideo className="w-8 h-8 text-purple-400" />;
  }

  if (
    mimeType.startsWith('audio/') ||
    ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext)
  ) {
    return <FileAudio className="w-8 h-8 text-amber-400" />;
  }

  if (
    mimeType.includes('zip') ||
    mimeType.includes('tar') ||
    mimeType.includes('rar') ||
    ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)
  ) {
    return <FileArchive className="w-8 h-8 text-orange-400" />;
  }

  if (
    mimeType.includes('csv') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('excel') ||
    ['xls', 'xlsx', 'csv'].includes(ext)
  ) {
    return <FileSpreadsheet className="w-8 h-8 text-teal-400" />;
  }

  if (
    mimeType.includes('javascript') ||
    mimeType.includes('typescript') ||
    mimeType.includes('json') ||
    mimeType.includes('html') ||
    mimeType.includes('css') ||
    ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'go', 'rs', 'php', 'rb', 'json', 'yaml', 'yml'].includes(ext)
  ) {
    return <FileCode className="w-8 h-8 text-sky-400" />;
  }

  if (
    mimeType.includes('pdf') ||
    mimeType.includes('text') ||
    mimeType.includes('document') ||
    ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf'].includes(ext)
  ) {
    return <FileText className="w-8 h-8 text-blue-400" />;
  }

  return <GenericFile className="w-8 h-8 text-indigo-400" />;
}

export function generateSecurePin(): string {
  // Generates 6 non-trivial digits
  let pin = '';
  const weakPins = new Set([
    '000000', '111111', '222222', '333333', '444444',
    '555555', '666666', '777777', '888888', '999999',
    '123456', '654321', '123123', '121212', '112233'
  ]);

  while (true) {
    pin = Math.floor(100000 + Math.random() * 900000).toString();
    if (!weakPins.has(pin) && !/^(\d)\1{5}$/.test(pin)) {
      break;
    }
  }
  return pin;
}
