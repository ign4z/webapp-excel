// types/index.ts

// Form 1 Data
export interface Form1Data {
  name: string;
  email: string;
  phone: string;
  quantity: number;
  recaptchaToken: string;
}

// Form 1 Response
export interface Form1Response {
  success: boolean;
  result: {
    basePrice: number;
    finalPrice: number;
    discount: number;
    message: string;
  };
  sessionToken: string;
}

// Form 2 Data
export interface Form2Data {
  sessionToken: string;
  company: string;
  address: string;
  notes: string;
  recaptchaToken: string;
}

// Config Parameters
export interface ConfigParams {
  basePrice: number;
  multiplier: number;
  discountThreshold: number;
  discountPercentage: number;
}

// Excel File Metadata
export interface ExcelFileMetadata {
  id: string;
  filename: string;
  blobUrl: string;
  userEmail: string;
  createdAt: string;
  fileSize: number;
}

// API Response Generic
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
