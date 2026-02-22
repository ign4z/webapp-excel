// types/index.ts

// Form 1 Data - Dati Base Immobile
export interface Form1Data {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  squareMeters: number;
  recaptchaToken: string;
}

// Form 1 Response
export interface Form1Response {
  success: boolean;
  result: {
    baseValue: number;
    pricePerSqm: number;
    estimatedValue: number;
    message: string;
  };
  sessionToken: string;
}

// Form 2 Data - Caratteristiche Aggiuntive
export interface Form2Data {
  sessionToken: string;
  floor: number;
  hasElevator: boolean;
  hasSecondBathroom: boolean;
  hasCellar: boolean;
  exposure: 'north' | 'south' | 'east' | 'west';
  heatingType: 'autonomous' | 'centralized';
  buildYear: number;
  isRecentlyRenovated: boolean;
  notes: string;
  recaptchaToken: string;
}

// Risultato Valutazione Finale
export interface FinalValuation {
  baseValue: number;
  adjustments: {
    floor: number;
    secondBathroom: number;
    cellar: number;
    exposure: number;
    heating: number;
    age: number;
    renovation: number;
  };
  totalAdjustment: number;
  finalValue: number;
  details: string[];
}

// Config Parameters
export interface ConfigParams {
  pricePerSqm: number; // Prezzo al mq base
  floorPenaltyNoElevator: number; // Penalità % per piano senza ascensore
  secondBathroomBonus: number; // Bonus secondo bagno (%)
  cellarBonus: number; // Bonus cantina (%)
  exposureSouthBonus: number; // Bonus esposizione sud/est/ovest (%)
  exposureNorthPenalty: number; // Penalità esposizione nord (%)
  heatingAutonomousBonus: number; // Bonus riscaldamento autonomo (%)
  heatingCentralizedPenalty: number; // Penalità riscaldamento centralizzato (%)
  ageDepreciationPerYear: number; // Deprezzamento per anno (%)
  renovationBonus: number; // Bonus ristrutturazione recente (%)
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
