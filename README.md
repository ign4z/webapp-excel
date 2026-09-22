# Webapp Valutazione Immobiliare

Applicazione web per la stima del valore di immobili residenziali nella zona sud di Milano. Permette all'utente di ottenere una valutazione in due step e all'admin di gestire prezzi e configurazioni tramite un pannello dedicato.

## Overview

**Cosa fa:** Raccoglie i dati dell'immobile in due passaggi — Step 1 per la stima preliminare, Step 2 per la valutazione definitiva con tutte le caratteristiche — e invia email di conferma con report Excel allegato.

**Stack tecnologico:**
- **Next.js 16** (App Router) + TypeScript + React (React Compiler abilitato)
- **Vercel Blob** — persistenza configurazioni valutazione e prezzi strade per comune
- **Resend** — invio email transazionali (stima preliminare, conferma ordine, notifica admin)
- **ExcelJS** — generazione e parsing file `.xlsx` (report valutazione + import/export strade)
- **Google Maps** — autocomplete indirizzi nel form Step 1

## Setup

**Prerequisiti:** Node.js 18+, account Vercel con Blob Storage abilitato

**Variabili d'ambiente richieste:**

| Variabile | Descrizione |
|---|---|
| `BLOB_READ_WRITE_TOKEN` | Token di uno store Vercel Blob con accesso **Private**: configurazione, prezzi strade e report Excel |
| `ADMIN_TOKEN` | Token per il pannello admin: query param `?token=...` sulle pagine, header `Authorization: Bearer` sulle API |
| `ADMIN_USERNAME` | Username HTTP Basic Auth pannello admin |
| `ADMIN_PASSWORD` | Password HTTP Basic Auth pannello admin |
| `RESEND_API_KEY` | API key Resend per invio email transazionali |
| `NEXT_PUBLIC_BASE_URL` | URL pubblico dell'app (es. `https://tuodominio.com`) — usato nei link email |
| `ADMIN_EMAIL` | Email destinatario notifiche admin (se assente la notifica viene saltata) |
| `RECAPTCHA_SECRET_KEY` | Chiave segreta reCAPTCHA. **Obbligatoria in produzione**: senza, i form vengono rifiutati |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Site key reCAPTCHA per il widget nei form |

**Variabili opzionali:**

| Variabile | Descrizione |
|---|---|
| `NEXT_PUBLIC_GOOGLE_API_KEY` | API key Google Maps per autocomplete indirizzi |
| `SESSION_SECRET` | Segreto HMAC per il token di sessione Step 1 → Step 2 (fallback: `ADMIN_TOKEN`) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Rate limit condiviso tra istanze per i form pubblici. Se assenti, limite in memoria per istanza |
| `LOG_LEVEL` | `error` \| `warn` \| `info` \| `debug` \| `trace` (default `info` in produzione) |
| `EMAIL_FROM` | Mittente email, es. `Valutazione Immobiliare <noreply@tuodominio.it>` (default: sandbox Resend) |

## Sviluppo

```bash
npm install
npm run dev        # avvia il server su http://localhost:3000
npm run build      # build di produzione
npm run lint       # ESLint
npm run typecheck  # typecheck TypeScript
npm test           # test unitari (Vitest, cartella tests/)
```

Il server di sviluppo supporta hot reload. Le chiamate ai blob Vercel funzionano anche in locale se `BLOB_READ_WRITE_TOKEN` è configurato in `.env.local`.

## Architettura

Il progetto segue il pattern **MVC** per i componenti admin e usa una struttura a layer:

```
lib/              Model — logica di business
  config.ts         Configurazione valutazione (Blob + cache)
  cities.ts         Lista comuni, isAllowedCity(), cityToSlug()
  schema.ts         Enum e schemi zod condivisi client/server
  valuation.ts      Formula moltiplicativa a coefficienti (funzioni pure)
  excel/            Generazione report Excel
  email.ts          Invio email con Resend
  auth.ts           Autenticazione admin (token + Basic Auth)
  session-token.ts  Token firmato Step 1 → Step 2
  recaptcha.ts      Verifica reCAPTCHA
  blob-json-cache.ts Lettura JSON da Blob con cache per versione
  reports-storage.ts Salvataggio/lista/download report Excel
  rate-limit.ts     Rate limit per IP sui form pubblici
  logger.ts         Log strutturati JSON (Runtime Logs di Vercel)
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

**Pattern di caching:** configurazione e prezzi strade passano da `lib/blob-json-cache.ts`: a ogni richiesta un `list()` leggero confronta `uploadedAt` del blob e il JSON viene riscaricato solo se è cambiato. Un salvataggio admin si propaga quindi a tutte le istanze serverless.

**Integrità dei dati:** il prezzo €/mq è sempre calcolato lato server. Step 1 restituisce un `sessionToken` firmato (HMAC) sui dati inseriti; Step 2 lo verifica e ricalcola il prezzo, quindi dati o prezzi manomessi nel browser vengono rifiutati.

## Flusso utente

### Step 1 — Stima preliminare

1. L'utente seleziona il comune dalla lista dei comuni supportati
2. Inserisce l'indirizzo tramite autocomplete Google Maps
3. Inserisce la superficie in mq
4. Seleziona: **tipologia** (appartamento, attico, villa, ecc.), **piano**, **numero locali**, **numero bagni**
5. Il sistema calcola il prezzo/mq cercando: chiave civico (`via roma:15`) → chiave via (`via roma`) → default comune → fallback globale
6. Viene inviata un'email con la stima base (prezzo/mq × superficie) e il link a Step 2

### Step 2 — Valutazione definitiva

1. L'utente inserisce le caratteristiche dettagliate dell'immobile:
   - **Stato immobile** (da ristrutturare → nuovo)
   - **Classe energetica** (G → A4)
   - **Anno di costruzione** (7 fasce, da prima del 1945 a 2021+)
   - **Ascensore** (sì/no)
   - **Terrazzo/Balcone** (nessuno → panoramico)
   - **Giardino** (nessuno → importante)
   - **Garage/Box** (nessuno → box doppio)
   - **Cantina** (sì/no)
   - **Riscaldamento** (assente → impianto radiante)
2. Il sistema applica la **formula moltiplicativa a coefficienti** (v3)
3. Viene generato un report Excel con il dettaglio di ogni coefficiente applicato, inviato in allegato al cliente e all'admin (`ADMIN_EMAIL`)

## Formula di Valutazione

Il valore stimato è calcolato con una formula moltiplicativa a **13 coefficienti**:

```
Valore Stimato = Prezzo €/mq × Superficie
              × Coeff.Tipologia × Coeff.Stato × Coeff.ClasseEnergetica
              × Coeff.AnnoCostruzione × Coeff.Piano × Coeff.Locali × Coeff.Bagni
              × Coeff.Ascensore × Coeff.Terrazzo × Coeff.Giardino
              × Coeff.Garage × Coeff.Cantina × Coeff.Riscaldamento
```

Ogni coefficiente è un numero dove `1,00 = neutro`, `> 1,00 = premium`, `< 1,00 = sconto`.

| Fattore | Riferimento (1,00) | Range tipico |
|---|---|---|
| Tipologia | Appartamento | 0,90–1,30 |
| Stato | Buono | 0,80–1,20 |
| Classe energetica | D | 0,88–1,22 |
| Anno costruzione | 1981–2000 | 0,92–1,15 |
| Piano (con ascensore) | 1° Piano | 0,95–1,15 |
| Piano (senza ascensore) | 1° Piano | 0,60–1,05 |
| Locali | 3 locali | 0,90–1,20 |
| Bagni | 1 bagno | 1,00–1,20 |
| Ascensore | No | 1,00–1,05 |
| Terrazzo | Nessuno | 1,00–1,15 |
| Giardino | Nessuno | 1,00–1,20 |
| Garage | Nessuno | 1,00–1,12 |
| Cantina | No | 1,00–1,02 |
| Riscaldamento | Centralizzato contabilizzato | 0,90–1,10 |

Tutti i valori sono configurabili dall'admin nella sezione **Coefficienti Immobiliari** di `/admin/config`.

**Nota piano:** il coefficiente piano dipende dalla presenza dell'ascensore. Senza ascensore, i piani 6+ usano la voce `piano6Plus`. Con ascensore, ogni piano fino al 10° ha il proprio coefficiente.

## Pannello Admin

Le pagine `/admin/*` richiedono doppia autenticazione (verificata in `proxy.ts`):
- Query param `?token=ADMIN_TOKEN` nell'URL
- HTTP Basic Auth con `ADMIN_USERNAME` / `ADMIN_PASSWORD`

Le API `/api/admin/*` richiedono l'header `Authorization: Bearer <ADMIN_TOKEN>` (mai in query string). I confronti sono a tempo costante e se le variabili d'ambiente mancano l'accesso è negato.

| URL | Funzione |
|---|---|
| `/admin/config?token=...` | Editor prezzi €/mq per comune + **14 tabelle coefficienti immobiliari** |
| `/admin/files?token=...` | Lista file su Vercel Blob con possibilità di eliminazione |
| `/admin/streets?token=...` | Editor prezzi per via e per civico, import/export Excel batch |

La sezione **Coefficienti Immobiliari** in `/admin/config` espone 14 accordion collassabili, uno per ogni tabella coefficiente. Ogni riga mostra l'etichetta leggibile e un input numerico (step 0,01, range 0,01–5,00).

### Gestione prezzi strade

L'editor strade (`/admin/streets`) permette di:
- Selezionare il comune e visualizzare/modificare i prezzi per via
- Aggiungere prezzi per civico specifico (es. `via roma:15`)
- Scaricare un template Excel con i prezzi attuali per modifiche offline
- Importare un file Excel aggiornato (max 1000 righe, max 5 MB)

## API Reference

| Metodo | Path | Auth | Descrizione |
|---|---|---|---|
| `POST` | `/api/form-1` | Nessuna | Salva dati Step 1 (inclusi tipologia/piano/locali/bagni), calcola stima base, invia email preliminare |
| `POST` | `/api/form-2` | `sessionToken` di Step 1 | Verifica il token, ricalcola il prezzo, applica la formula a coefficienti, genera Excel e invia le email |
| `GET` | `/api/admin/config` | Bearer | Legge configurazione corrente da Vercel Blob |
| `POST` | `/api/admin/config` | Bearer | Aggiorna configurazione su Vercel Blob |
| `GET` | `/api/admin/files` | Bearer | Lista file presenti su Vercel Blob |
| `DELETE` | `/api/admin/files` | Bearer | Elimina un report `.xlsx` (`?url=...`) |
| `GET` | `/api/admin/files/download` | Bearer | Scarica un report passando dal server (`?url=...`) |
| `GET` | `/api/admin/streets` | Bearer | Legge prezzi strade per una city (`?city=opera`) |
| `POST` | `/api/admin/streets` | Bearer | Aggiorna prezzi strade per una city (max 1000 chiavi) |
| `GET` | `/api/admin/streets/template` | Bearer | Scarica template Excel prezzi strade (`?city=opera`) |
| `POST` | `/api/admin/streets/import` | Bearer | Importa prezzi strade da file `.xlsx` (multipart, campo `file`) |

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

**Primo avvio:** se non esistono blob per configurazioni o prezzi strade, vengono usati i valori di default da `lib/config.defaults.json` e i seed da `lib/streets/*.json`. Non è necessaria nessuna migrazione dati iniziale.

**Note deploy:**
- Le API route admin non richiedono configurazione aggiuntiva su Vercel
- Il pannello admin non usa autenticazione next-auth — la protezione è in `proxy.ts` (pagine) e `lib/auth.ts` (API)
- Lo store Blob deve essere **Private** (Vercel non ammette blob privati in uno store pubblico). Nessun file è raggiungibile via URL: i report Excel (`valutazioni/`) si scaricano dal pannello admin tramite route autenticata e vengono inviati in allegato via email
- Migrazione da un vecchio store pubblico: `scripts/migrate-blob-to-private.mjs` (copia config e prezzi strade)
- I form pubblici hanno un rate limit di 10 richieste / 10 minuti per IP (risposta 429)
- Log: JSON strutturato su stdout, consultabile nei **Runtime Logs** del progetto Vercel (filtra per `ctx` o `level`)
