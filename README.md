# Webapp Valutazione Immobiliare

Applicazione web per la stima del valore di immobili residenziali nella zona sud di Milano. Permette all'utente di ottenere una valutazione in due step e all'admin di gestire prezzi e configurazioni tramite un pannello dedicato.

## Overview

**Cosa fa:** Raccoglie i dati dell'immobile in due passaggi — Step 1 per la stima preliminare, Step 2 per la valutazione definitiva con tutte le caratteristiche — e invia email di conferma con report Excel allegato.

**Stack tecnologico:**
- **Next.js 15** (App Router) + TypeScript + React (React Compiler abilitato)
- **Vercel Blob** — persistenza configurazioni valutazione e prezzi strade per comune
- **Resend** — invio email transazionali (stima preliminare, conferma ordine, notifica admin)
- **ExcelJS** — generazione e parsing file `.xlsx` (report valutazione + import/export strade)
- **Google Maps** — autocomplete indirizzi nel form Step 1

## Setup

**Prerequisiti:** Node.js 18+, account Vercel con Blob Storage abilitato

**Variabili d'ambiente richieste:**

| Variabile | Descrizione |
|---|---|
| `BLOB_READ_WRITE_TOKEN` | Token Vercel Blob per lettura/scrittura configurazioni e prezzi strade |
| `ADMIN_TOKEN` | Token URL per autenticazione pannello admin (query param `?token=...`) |
| `ADMIN_USERNAME` | Username HTTP Basic Auth pannello admin |
| `ADMIN_PASSWORD` | Password HTTP Basic Auth pannello admin |
| `RESEND_API_KEY` | API key Resend per invio email transazionali |
| `NEXT_PUBLIC_BASE_URL` | URL pubblico dell'app (es. `https://tuodominio.com`) — usato nei link email |
| `ADMIN_EMAIL` | Email destinatario notifiche admin (default: `admin@tuodominio.com`) |

**Variabili opzionali:**

| Variabile | Descrizione |
|---|---|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | API key Google Maps per autocomplete indirizzi |

## Sviluppo

```bash
npm install
npm run dev        # avvia il server su http://localhost:3000
npm run build      # build di produzione
npm run lint       # ESLint
npx tsc --noEmit   # typecheck TypeScript
```

Il server di sviluppo supporta hot reload. Le chiamate ai blob Vercel funzionano anche in locale se `BLOB_READ_WRITE_TOKEN` è configurato in `.env.local`.

## Architettura

Il progetto segue il pattern **MVC** per i componenti admin e usa una struttura a layer:

```
lib/              Model — logica di business
  config.ts         Configurazione valutazione (Blob + cache 5 min)
  cities.ts         Lista comuni e utility cityToSlug()
  calculations.ts   Algoritmo di calcolo valutazione
  email.ts          Invio email con Resend
  streets/
    index.ts        Lookup prezzi per via/civico (Blob + seed fallback)
    *.ts            Seed prezzi per comune (locate-di-triulzi, opera, ...)

components/admin/
  *View.tsx         View — componenti React puri (solo props, no stato/fetch)
  *.tsx             Controller — gestisce stato e chiamate API, passa props alla View

app/api/          API Routes — endpoint Next.js con validazione e autenticazione
  form-1/           Step 1
  form-2/           Step 2
  admin/config/     Configurazione admin
  admin/files/      Gestione file Blob
  admin/streets/    Prezzi strade (CRUD + import/export Excel)
```

**Pattern di caching:** sia la configurazione (`lib/config.ts`) che i prezzi strade (`lib/streets/index.ts`) usano una cache in-memory con TTL di 5 minuti per ridurre le chiamate al Blob.

## Flusso utente

### Step 1 — Stima preliminare

1. L'utente seleziona il comune dalla lista dei comuni supportati
2. Inserisce l'indirizzo tramite autocomplete Google Maps
3. Inserisce la superficie in mq e il proprio indirizzo email
4. Il sistema calcola il prezzo/mq cercando: chiave civico (`via roma:15`) → chiave via (`via roma`) → default comune → fallback globale
5. Viene inviata un'email con la stima preliminare e il link a Step 2

### Step 2 — Valutazione definitiva

1. L'utente inserisce le caratteristiche dell'immobile:
   - Anno di costruzione (depreciation -0,3% per anno)
   - Secondo bagno (+3%)
   - Cantina (+3%)
   - Esposizione (Sud +5%, Est +3%, Ovest +2%, Nord -3%)
   - Piano terra (-5%) o ultimo piano (-3%)
   - Riscaldamento autonomo (+5%) o centralizzato (-2%)
   - Ristrutturato (+10%)
2. Il sistema applica tutti gli aggiustamenti percentuali alla stima base
3. Viene generato un report Excel e inviato via email

## Pannello Admin

Tutte le route admin richiedono doppia autenticazione:
- Query param `?token=ADMIN_TOKEN` nell'URL
- HTTP Basic Auth con `ADMIN_USERNAME` / `ADMIN_PASSWORD`

| URL | Funzione |
|---|---|
| `/admin/config?token=...` | Editor parametri valutazione (prezzi €/mq per comune, aggiustamenti %) |
| `/admin/files?token=...` | Lista file su Vercel Blob con possibilità di eliminazione |
| `/admin/streets?token=...` | Editor prezzi per via e per civico, import/export Excel batch |

### Gestione prezzi strade

L'editor strade (`/admin/streets`) permette di:
- Selezionare il comune e visualizzare/modificare i prezzi per via
- Aggiungere prezzi per civico specifico (es. `via roma:15`)
- Scaricare un template Excel con i prezzi attuali per modifiche offline
- Importare un file Excel aggiornato (max 1000 righe, max 5 MB)

## API Reference

| Metodo | Path | Auth | Descrizione |
|---|---|---|---|
| `POST` | `/api/form-1` | Nessuna | Salva dati Step 1, calcola stima, invia email preliminare |
| `POST` | `/api/form-2` | Nessuna | Salva dati Step 2, calcola valutazione definitiva, genera Excel |
| `GET` | `/api/admin/config` | Token + Basic | Legge configurazione corrente da Vercel Blob |
| `POST` | `/api/admin/config` | Token + Basic | Aggiorna configurazione su Vercel Blob |
| `GET` | `/api/admin/files` | Token + Basic | Lista file presenti su Vercel Blob |
| `DELETE` | `/api/admin/files` | Token + Basic | Elimina un file dal Blob (`?url=...`) |
| `GET` | `/api/admin/streets` | Token + Basic | Legge prezzi strade per una city (`?city=opera`) |
| `POST` | `/api/admin/streets` | Token + Basic | Aggiorna prezzi strade per una city (max 1000 chiavi) |
| `GET` | `/api/admin/streets/template` | Token + Basic | Scarica template Excel prezzi strade (`?city=opera`) |
| `POST` | `/api/admin/streets/import` | Token + Basic | Importa prezzi strade da file `.xlsx` (multipart, campo `file`) |

**Formato city:** slug lowercase con trattini (es. `locate-di-triulzi`, `pieve-emanuele`).

**Sicurezza API:** i parametri `city` vengono validati contro il pattern `/^[a-z0-9-]+$/` per prevenire path traversal. I body POST vengono validati per tipo, range e numero massimo di chiavi.

## Comuni supportati

| Comune | Slug | Prezzo base €/mq |
|---|---|---|
| Locate di Triulzi | `locate-di-triulzi` | 2.000 |
| Opera | `opera` | 1.900 |
| Pieve Emanuele | `pieve-emanuele` | 1.850 |
| Fizzonasco | `fizzonasco` | 1.750 |
| Siziano | `siziano` | 1.700 |
| Tolcinasco | `tolcinasco` | 1.650 |
| Carpiano | `carpiano` | 1.600 |

I prezzi sono configurabili dall'admin. La lista dei comuni è centralizzata in `lib/cities.ts` — aggiungere un comune richiede solo una modifica lì + un seed file in `lib/streets/`.

## Deploy

**Vercel (consigliato):**

1. Collega il repository a Vercel dal dashboard
2. Crea uno **Storage Blob** nel progetto Vercel e copia il token generato
3. Aggiungi tutte le variabili d'ambiente in Settings → Environment Variables
4. `git push` su `main` — il deploy avviene automaticamente

**Primo avvio:** se non esistono blob per configurazioni o prezzi strade, vengono usati i valori di default da `lib/config.ts` e i seed da `lib/streets/*.ts`. Non è necessaria nessuna migrazione dati iniziale.

**Note deploy:**
- Le API route admin non richiedono configurazione aggiuntiva su Vercel
- Il pannello admin non usa autenticazione next-auth — la protezione è a livello middleware (`middleware.ts`)
- I file Excel generati vengono salvati su Vercel Blob e il link viene inviato via email
