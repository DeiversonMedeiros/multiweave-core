// =====================================================
// CONFIGURAÇÕES DE STORAGE
// =====================================================

export const STORAGE_BUCKETS = {
  EMPLOYEE_PHOTOS: 'employee-photos',
  DOCUMENTS: 'documents',
  TEMP: 'temp',
  TIME_RECORD_PHOTOS: 'time-record-photos',
  MATERIALS: 'materials',
  COMPANY_LOGOS: 'company-logos'
} as const;

export const IMAGE_UPLOAD_CONFIG = {
  MAX_SIZE_MB: 5,
  ACCEPTED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  CACHE_CONTROL: '3600' // 1 hora
} as const;

export const DOCUMENT_UPLOAD_CONFIG = {
  MAX_SIZE_MB: 10,
  ACCEPTED_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  CACHE_CONTROL: '3600'
} as const;

export type StorageBucket = typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS];
