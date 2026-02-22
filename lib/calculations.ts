// lib/calculations.ts
// Re-export dal nuovo sistema per compatibilità con codice legacy

export { getValuationConfig as getConfigParams, defaultConfig } from '@/lib/config';

/**
 * Genera un session token casuale
 */
export function generateSessionToken(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}