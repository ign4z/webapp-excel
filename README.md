# Webapp Valutazione Immobiliare

**Versione 0.9.1** — vedi [CHANGELOG.md](CHANGELOG.md) per le novità di ogni release.

Applicazione web per la stima del valore di immobili residenziali nella zona sud di Milano. Permette all'utente di ottenere una valutazione in due step e all'admin di gestire prezzi e configurazioni tramite un pannello dedicato.

## Overview

**Cosa fa:** Raccoglie i dati dell'immobile in due passaggi — Step 1 per la stima preliminare, Step 2 per la valutazione definitiva con tutte le caratteristiche — e invia email di conferma con report Excel allegato.

**Stack tecnologico:**
- **Next.js 16** (App Router) + TypeScript + React (React Compiler abilitato)
- **Vercel Blob** — persistenza configurazioni valutazione e prezzi strade per comune
- **Resend** — invio email transazionali (stima preliminare, conferma ordine, notifica admin)
- **ExcelJS** — generazione e parsing file `.xlsx` (report valutazione + import/export strade)
- **Google Maps** — solo nel pannello admin: autocomplete vie e geocoding per allineare i nomi via a Google

## Setup

**Prerequisiti:** Node.js 18+, account Vercel con Blob Storage abilitato

**Variabili d'ambiente richieste:**

| Variabile | Descrizione |
|---|---|
| `BLOB_READ_WRITE_TOKEN` | Token di uno store Vercel Blob con accesso **Private**: configurazione, prezzi strade e report Excel. In locale quello dello store di sviluppo (vedi sotto) |
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
| `NEXT_PUBLIC_GOOGLE_API_KEY` | API key Google Maps (Places) per l'autocomplete "+ Aggiungi via" dell'editor strade admin |
| `GOOGLE_MAPS_SERVER_KEY` | Chiave Google lato server (solo Geocoding API, senza limite per referrer) per "Verifica con Google" e import vie ufficiali nell'admin |
| `SESSION_SECRET` | Segreto HMAC per il token di sessione Step 1 → Step 2 (fallback: `ADMIN_TOKEN`) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Rate limit condiviso tra istanze per i form pubblici. Se assenti, limite in memoria per istanza |
| `LOG_LEVEL` | `error` \| `warn` \| `info` \| `debug` \| `trace` (default `info` in produzione) |
| `BLOB_PRODUCTION_STORE_ID` | Solo in `.env.local`: id dello store di produzione. Se il token locale gli appartiene, le scritture su Blob vengono rifiutate |
| `EMAIL_FROM` | Mittente email, es. `Valutazione Immobiliare <noreply@tuodominio.it>` (default: sandbox Resend) |

## Sviluppo

```bash
npm install
npm run dev        # avvia il server su http://localhost:3000
npm run build      # build di produzione
npm run lint       # ESLint
npm run typecheck  # typecheck TypeScript
npm test           # test Vitest (cartella tests/): valutazione, strade, sicurezza, API form, import Excel, report
```

Il server di sviluppo supporta hot reload. In locale le chiamate Blob vanno allo store di sviluppo (vedi sotto).

### Store Blob di sviluppo

In locale si usa uno store Blob **separato** da quello di produzione, così le modifiche fatte dall'admin in locale, i report di prova e gli script non toccano i dati reali.

Gli store creati di recente non hanno un token di scrittura: `@vercel/blob` (≥ 2.8) si autentica con OIDC (`VERCEL_OIDC_TOKEN` + `BLOB_STORE_ID`), che ha la precedenza su `BLOB_READ_WRITE_TOKEN`.

| Ambiente Vercel | Store | Variabili |
|---|---|---|
| Production | produzione | `BLOB_READ_WRITE_TOKEN` (nessun `BLOB_STORE_ID`) |
| Development, Preview | `webapp-excel-dev` | `BLOB_STORE_ID=store_…` dello store dev (+ `VERCEL_OIDC_TOKEN`, automatico) |

1. Su Vercel → **Storage** → **Create** → **Blob**, accesso **Private** (es. `webapp-excel-dev`), collegato al progetto per **Development** e **Preview**
2. Imposta le variabili come nella tabella (lo store di produzione non deve dare `BLOB_READ_WRITE_TOKEN` né `BLOB_STORE_ID` a Development/Preview)
3. In locale le variabili Vercel vanno in `.env.development.local`, così `.env.local` (chiavi admin, reCAPTCHA di test…) non viene sovrascritto:

   ```bash
   vercel env pull .env.development.local --environment=development --yes
   ```

   `VERCEL_OIDC_TOKEN` scade dopo circa 12 ore: se le chiamate Blob falliscono con un errore di autenticazione, rilancia il comando. In `.env.local` non deve esserci il `BLOB_READ_WRITE_TOKEN` di produzione
4. In `.env.local` imposta `BLOB_PRODUCTION_STORE_ID` con l'id dello store di produzione (`store_…`). Se per errore le credenziali locali tornano quelle di produzione, ogni scrittura o cancellazione su Blob fallisce con un errore esplicito
5. Opzionale, per partire con i dati reali: copia config e prezzi strade dalla produzione (sola lettura sulla produzione, i report non vengono copiati)

   ```bash
   PROD_BLOB_READ_WRITE_TOKEN=<token produzione> node scripts/copy-blob-to-dev.mjs          # anteprima
   PROD_BLOB_READ_WRITE_TOKEN=<token produzione> node scripts/copy-blob-to-dev.mjs --apply  # copia
   ```

Con lo store di sviluppo vuoto l'app usa i default (`lib/config.defaults.json`) e i seed delle vie (`lib/streets/*.json`).

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
2. Sceglie la **via** tra quelle del comune (elenco da `GET /api/streets`, stessi nomi della lista prezzi) e, se vuole, il **civico** in un campo separato. Per le frazioni senza elenco la via si scrive a mano
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
- Importare un file Excel aggiornato (max 10000 righe per foglio, max 5 MB)

**Nomi via allineati a Google Maps.** Nello Step 1 l'utente sceglie la via dall'elenco del comune, quindi il nome coincide sempre con una chiave della lista prezzi. Le vie sono tenute con il nome ufficiale di Google, così restano coerenti con le mappe:
- **+ Aggiungi via** apre un autocomplete Google limitato al comune e salva il nome ufficiale. "+ a mano" resta disponibile per le vie che Google non conosce.
- **🔎 Verifica con Google** controlla tutte le vie del comune e propone le rinomine. Applicarle rinomina anche i relativi civici. Le modifiche vanno poi salvate con "Salva prezzi strade".
- **📥 Importa tutte le vie** sostituisce la lista con tutte le vie ufficiali del comune, con i nomi di Google. Le vie già presenti tengono il loro prezzo, le nuove prendono il default del comune, quelle inesistenti vengono rimosse. Prima di applicare mostra un'anteprima.
- **🏠 Espandi civici** aggiunge a ogni via tutti i civici ufficiali mancanti, ognuno con il prezzo €/mq della via, da ritoccare poi dove serve. Usa il filtro per lavorare su una via alla volta.
- Il geocoding gira lato server e richiede `GOOGLE_MAPS_SERVER_KEY`, con un costo di circa 5 $ ogni 1000 vie verificate.
- Le vie cercate dagli utenti che non sono in lista compaiono nei log Vercel come `Street not in price list, using city default` (con comune e nome della via), per esempio vie scritte a mano nelle frazioni senza elenco.

**Vie e civici ufficiali (ANNCSU).** Vie e civici dei comuni vengono dall'[Archivio Nazionale dei Numeri Civici e delle Strade Urbane](https://www.anncsu.gov.it/it/consultazione-dellarchivio/open-data/) (Agenzia delle Entrate / Istat, open data). Sono salvati in `lib/streets/anncsu/<slug>.json`, uno per comune.
- **Aggiornamento mensile:** `npm run anncsu:update` riscarica stradario e indirizzario della Lombardia, circa 40 MB.
- **Codici catastali:** stanno in `CITY_CADASTRAL_CODES` (`lib/cities.ts`). Le frazioni Fizzonasco e Tolcinasco non hanno un codice proprio, quindi per loro l'import non è disponibile.
- **Operazioni in blocco da terminale**, con la stessa logica dell'editor:
  ```bash
  npx tsx --env-file=.env.local --env-file=.env.development.local scripts/official-streets.ts import opera           # anteprima
  npx tsx --env-file=.env.local --env-file=.env.development.local scripts/official-streets.ts import opera --write   # scrive blob + seed (backup in ./backups)
  npx tsx --env-file=.env.local --env-file=.env.development.local scripts/official-streets.ts clear siziano --write  # svuota le vie del comune
  ```

## API Reference

| Metodo | Path | Auth | Descrizione |
|---|---|---|---|
| `GET` | `/api/streets` | Nessuna | Vie selezionabili nello Step 1 per un comune (`?city=Opera`): solo nomi e civici, mai prezzi |
| `POST` | `/api/form-1` | Nessuna | Salva dati Step 1 (inclusi tipologia/piano/locali/bagni), calcola stima base, invia email preliminare |
| `POST` | `/api/form-2` | `sessionToken` di Step 1 | Verifica il token, ricalcola il prezzo, applica la formula a coefficienti, genera Excel e invia le email |
| `GET` | `/api/admin/config` | Bearer | Legge configurazione corrente da Vercel Blob |
| `POST` | `/api/admin/config` | Bearer | Aggiorna configurazione su Vercel Blob |
| `GET` | `/api/admin/files` | Bearer | Lista file presenti su Vercel Blob |
| `DELETE` | `/api/admin/files` | Bearer | Elimina un report `.xlsx` (`?url=...`) |
| `GET` | `/api/admin/files/download` | Bearer | Scarica un report passando dal server (`?url=...`) |
| `GET` | `/api/admin/streets` | Bearer | Legge prezzi strade per una city (`?city=opera`) |
| `POST` | `/api/admin/streets` | Bearer | Aggiorna prezzi strade per una city (max 10000 chiavi) |
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

## TODO

1. **Grafica interna**: migliorare l'aspetto del pannello admin, oggi poco curato.

## Versioni e rilascio

1. Aggiornare `version` in `package.json` (`npm version <x.y.z> --no-git-tag-version`)
2. Aggiungere la voce corrispondente in `CHANGELOG.md`
3. `npm run lint && npm run typecheck && npm test && npm run build`
4. Commit e push su `master`: Vercel pubblica in automatico

La versione in uso è visibile in basso a destra in tutte le pagine del pannello admin.

## Deploy

**Vercel (consigliato):**

1. Collega il repository a Vercel dal dashboard
2. Crea uno **Storage Blob** nel progetto Vercel e copia il token generato
3. Aggiungi tutte le variabili d'ambiente in Settings → Environment Variables
4. `git push` su `master` — il deploy avviene automaticamente

**Primo avvio:** se non esistono blob per configurazioni o prezzi strade, vengono usati i valori di default da `lib/config.defaults.json` e i seed da `lib/streets/*.json`. Non è necessaria nessuna migrazione dati iniziale.

**Note deploy:**
- Le API route admin non richiedono configurazione aggiuntiva su Vercel
- Il pannello admin non usa autenticazione next-auth — la protezione è in `proxy.ts` (pagine) e `lib/auth.ts` (API)
- Lo store Blob deve essere **Private** (Vercel non ammette blob privati in uno store pubblico). Nessun file è raggiungibile via URL: i report Excel (`valutazioni/`) si scaricano dal pannello admin tramite route autenticata e vengono inviati in allegato via email
- Migrazione da un vecchio store pubblico: `scripts/migrate-blob-to-private.mjs` (copia config e prezzi strade)
- I form pubblici hanno un rate limit di 10 richieste / 10 minuti per IP (risposta 429)
- Log: JSON strutturato su stdout, consultabile nei **Runtime Logs** del progetto Vercel (filtra per `ctx` o `level`)
