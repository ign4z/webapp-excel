/**
 * Readable Italian labels for all coefficient enum keys.
 * Single source of truth used by form UI (Step2View), Excel export (form-2 route), and admin ConfigEditorView.
 */

export const TIPOLOGIA_LABELS: Record<string, string> = {
  appartamento: 'Appartamento',
  openspaceLoft: 'Open Space / Loft',
  mansarda: 'Mansarda',
  attico: 'Attico',
  villettaSchiera: 'Villetta a schiera',
  villa: 'Villa',
  rusticoCasale: 'Rustico / Casale',
  stabilePalazzo: 'Stabile / Palazzo',
};

export const STATO_LABELS: Record<string, string> = {
  daRistrutturare: 'Da ristrutturare',
  daRiattare: 'Da riattare',
  abitabile: 'Abitabile',
  buono: 'Buono',
  ottimo: 'Ottimo',
  ristrutturato: 'Ristrutturato',
  nuovo: 'Nuovo',
};

export const CLASSE_ENERGETICA_LABELS: Record<string, string> = {
  G: 'G', F: 'F', E: 'E', D: 'D', C: 'C', B: 'B', A1: 'A1', A2: 'A2', A3: 'A3', A4: 'A4',
};

export const ANNO_COST_LABELS: Record<string, string> = {
  prima1945: 'Prima del 1945',
  dal1945al1960: '1945–1960',
  dal1961al1980: '1961–1980',
  dal1981al2000: '1981–2000',
  dal2001al2010: '2001–2010',
  dal2011al2020: '2011–2020',
  dal2021inPoi: '2021 o successivo',
};

export const PIANO_LABELS: Record<string, string> = {
  interrato: 'Interrato',
  seminterrato: 'Seminterrato',
  pianoTerra: 'Piano Terra',
  rialzato: 'Rialzato',
  piano1: '1° Piano',
  piano2: '2° Piano',
  piano3: '3° Piano',
  piano4: '4° Piano',
  piano5: '5° Piano',
  piano6: '6° Piano',
  piano7: '7° Piano',
  piano8: '8° Piano',
  piano9: '9° Piano',
  piano10Plus: '10° Piano o superiore',
  piano6Plus: '6° Piano e oltre',
};

export const LOCALI_LABELS: Record<string, string> = {
  locale1: '1 locale',
  locali2: '2 locali',
  locali3: '3 locali',
  locali4: '4 locali',
  locali5: '5 locali',
  locali6: '6 locali',
  locali7Plus: '7+ locali',
};

export const BAGNI_LABELS: Record<string, string> = {
  bagno1: '1 bagno',
  bagni2: '2 bagni',
  bagni3: '3 bagni',
  bagni4: '4 bagni',
  bagni5Plus: '5+ bagni',
};

export const ASCENSORE_LABELS: Record<string, string> = {
  no: 'No',
  si: 'Sì',
};

export const TERRAZZO_LABELS: Record<string, string> = {
  nessuno: 'Nessuno',
  balcone: 'Balcone',
  balconiMultipli: 'Balconi multipli',
  terrazzoAbitabile: 'Terrazzo abitabile',
  terrazzoPanoramico: 'Terrazzo panoramico',
};

export const GIARDINO_LABELS: Record<string, string> = {
  nessuno: 'Nessuno',
  piccolo: 'Piccolo (<50 mq)',
  medio: 'Medio (50–150 mq)',
  grande: 'Grande (>150 mq)',
  importante: 'Giardino importante',
};

export const GARAGE_LABELS: Record<string, string> = {
  nessuno: 'Nessuno',
  postoScoperto: 'Posto auto scoperto',
  postoCoperto: 'Posto auto coperto',
  boxSingolo: 'Box singolo',
  boxDoppio: 'Box doppio',
};

export const CANTINA_LABELS: Record<string, string> = {
  no: 'No',
  si: 'Sì',
};

export const RISCALDAMENTO_LABELS: Record<string, string> = {
  assente: 'Assente',
  centralizzatoVecchio: 'Centralizzato (vecchio)',
  centralizzatoContabilizzato: 'Centralizzato contabilizzato',
  autonomo: 'Autonomo',
  autonomoCondensazione: 'Autonomo a condensazione',
  pompaDiCalore: 'Pompa di calore',
  impiantoRadiante: 'Impianto radiante/evoluto',
};
