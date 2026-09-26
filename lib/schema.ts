// lib/schema.ts
// Unica fonte di verità per i valori ammessi nei form e per gli schemi zod,
// condivisa tra client (Form1/Form2) e API route (form-1/form-2).

import { z } from 'zod';

// ─── Valori ammessi ──────────────────────────────────────────────────────────

export const TIPOLOGIA = ['appartamento', 'openspaceLoft', 'mansarda', 'attico', 'villettaSchiera', 'villa', 'rusticoCasale', 'stabilePalazzo'] as const;
export const PIANO = ['interrato', 'seminterrato', 'pianoTerra', 'rialzato', 'piano1', 'piano2', 'piano3', 'piano4', 'piano5', 'piano6', 'piano7', 'piano8', 'piano9', 'piano10Plus'] as const;
export const LOCALI = ['locale1', 'locali2', 'locali3', 'locali4', 'locali5', 'locali6', 'locali7Plus'] as const;
export const BAGNI = ['bagno1', 'bagni2', 'bagni3', 'bagni4', 'bagni5Plus'] as const;
export const STATO = ['daRistrutturare', 'daRiattare', 'abitabile', 'buono', 'ottimo', 'ristrutturato', 'nuovo'] as const;
export const CLASSE_ENERGETICA = ['G', 'F', 'E', 'D', 'C', 'B', 'A1', 'A2', 'A3', 'A4'] as const;
export const ANNO_COSTRUZIONE = ['prima1945', 'dal1945al1960', 'dal1961al1980', 'dal1981al2000', 'dal2001al2010', 'dal2011al2020', 'dal2021inPoi'] as const;
export const SI_NO = ['no', 'si'] as const;
export const TERRAZZO = ['nessuno', 'balcone', 'balconiMultipli', 'terrazzoAbitabile', 'terrazzoPanoramico'] as const;
export const GIARDINO = ['nessuno', 'piccolo', 'medio', 'grande', 'importante'] as const;
export const GARAGE = ['nessuno', 'postoScoperto', 'postoCoperto', 'boxSingolo', 'boxDoppio'] as const;
export const RISCALDAMENTO = ['assente', 'centralizzatoVecchio', 'centralizzatoContabilizzato', 'autonomo', 'autonomoCondensazione', 'pompaDiCalore', 'impiantoRadiante'] as const;

// ─── Step 1 ──────────────────────────────────────────────────────────────────

export const form1Schema = z.object({
  firstName: z.string().trim().min(2, 'Il nome deve essere di almeno 2 caratteri').max(100),
  lastName: z.string().trim().min(2, 'Il cognome deve essere di almeno 2 caratteri').max(100),
  email: z.string().email('Inserisci un email valida').max(254),
  phone: z.string().trim().min(10, 'Inserisci un numero di telefono valido').max(30),
  city: z.string().min(1, 'Seleziona un comune'),
  address: z.string().trim().min(5, 'Inserisci un indirizzo valido').max(300),
  squareMeters: z.number().min(10, 'Minimo 10 mq').max(100000),
  tipologia: z.enum(TIPOLOGIA),
  piano: z.enum(PIANO),
  locali: z.enum(LOCALI),
  bagni: z.enum(BAGNI),
});

export type Form1Values = z.infer<typeof form1Schema>;

// ─── Step 2 ──────────────────────────────────────────────────────────────────

export const form2Schema = z.object({
  stato: z.enum(STATO),
  classeEnergetica: z.enum(CLASSE_ENERGETICA),
  annoCostruzione: z.enum(ANNO_COSTRUZIONE),
  ascensore: z.enum(SI_NO),
  terrazzo: z.enum(TERRAZZO),
  giardino: z.enum(GIARDINO),
  garage: z.enum(GARAGE),
  cantina: z.enum(SI_NO),
  riscaldamento: z.enum(RISCALDAMENTO),
  notes: z.string().max(500).trim().optional(),
});

export type Form2Values = z.infer<typeof form2Schema>;
