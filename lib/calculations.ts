// lib/calculations.ts
// Config gestita tramite file JSON su Vercel Blob Storage

import { head, put } from '@vercel/blob';
import { ConfigParams } from '@/types';

const CONFIG_BLOB_PATH = 'config/parameters.json';

/**
 * Calcola il prezzo finale basato sui parametri di configurazione
 */
export function calculatePrice(
  quantity: number,
  config: ConfigParams
): {
  basePrice: number;
  finalPrice: number;
  discount: number;
  message: string;
} {
  // Prezzo base
  const basePrice = config.basePrice * quantity;

  // Applica moltiplicatore
  let finalPrice = basePrice * config.multiplier;

  // Calcola sconto se supera la soglia
  let discount = 0;
  if (quantity >= config.discountThreshold) {
    discount = finalPrice * (config.discountPercentage / 100);
    finalPrice -= discount;
  }

  // Messaggio personalizzato
  const message = discount > 0
    ? `Complimenti! Hai ricevuto uno sconto di €${discount.toFixed(2)}`
    : `Quantità minima per sconto: ${config.discountThreshold} unità`;

  return {
    basePrice: Math.round(basePrice * 100) / 100,
    finalPrice: Math.round(finalPrice * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    message,
  };
}

/**
 * Recupera parametri di configurazione dal BLOB STORAGE
 * (con fallback a valori di default se il file non esiste)
 */
export async function getConfigParams(): Promise<ConfigParams> {
  try {
    // Verifica se il file config esiste
    const blobInfo = await head(CONFIG_BLOB_PATH);
    
    if (!blobInfo) {
      console.warn('⚠️ Config non trovata su Blob, uso valori default');
      return getDefaultConfig();
    }

    // Scarica il file JSON
    const response = await fetch(blobInfo.url);
    const config: ConfigParams = await response.json();

    console.log('✅ Config caricata da Blob Storage');
    return config;

  } catch (error) {
    console.error('❌ Errore lettura config da Blob:', error);
    // Fallback a valori di default
    return getDefaultConfig();
  }
}

/**
 * Salva parametri di configurazione nel BLOB STORAGE
 */
export async function saveConfigParams(config: ConfigParams): Promise<boolean> {
  try {
    // Converti in JSON
    const jsonContent = JSON.stringify(config, null, 2);

    // Upload su Vercel Blob (sovrascrive se esiste già)
    const blob = await put(CONFIG_BLOB_PATH, jsonContent, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false, // Importante: non aggiungere suffisso random
    });

    console.log('✅ Config salvata su Blob Storage:', blob.url);
    return true;

  } catch (error) {
    console.error('❌ Errore salvataggio config su Blob:', error);
    return false;
  }
}

/**
 * Valori di default (fallback se Blob non disponibile)
 */
function getDefaultConfig(): ConfigParams {
  return {
    basePrice: 100,
    multiplier: 1.5,
    discountThreshold: 10,
    discountPercentage: 15,
  };
}

/**
 * Inizializza la configurazione (crea il file JSON se non esiste)
 * Esegui questa funzione al primo deploy
 */
export async function initializeConfig(): Promise<void> {
  try {
    // Verifica se esiste già
    const existing = await head(CONFIG_BLOB_PATH);
    
    if (existing) {
      console.log('ℹ️ Config già presente su Blob Storage');
      return;
    }

    // Crea con valori di default
    const defaultConfig = getDefaultConfig();
    await saveConfigParams(defaultConfig);
    console.log('✅ Config inizializzata con valori default');

  } catch (error) {
    console.error('❌ Errore inizializzazione config:', error);
  }
}

/**
 * Genera un session token casuale
 */
export function generateSessionToken(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}
