# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Webapp di valutazione immobiliare (zona sud Milano) in due step, con pannello admin.
Next.js 16 (App Router, React Compiler) + TypeScript strict, Vercel Blob, Resend, ExcelJS, zod 4.
Codice, commenti, UI e messaggi di commit in **italiano**.

## Comandi

```bash
npm run dev         # http://localhost:3000
npm run lint        # ESLint (deve restare a 0 errori)
npm run typecheck   # tsc --noEmit
npm test            # Vitest, test in tests/
npx vitest run tests/valuation.test.ts        # singolo file
npx vitest run -t "nome del test"             # singolo test per nome
npm run build
```

Prima di considerare finito un lavoro: `npm run lint && npm run typecheck && npm test`.
Un hook PostToolUse (`.claude/settings.json` → `scripts/hooks/lint-edited.mjs`) lancia ESLint su ogni file modificato: gli errori bloccano e vanno corretti subito.
Variabili d'ambiente: vedi `.env.example` / README. In locale Blob usa lo **store di sviluppo** via OIDC (`BLOB_STORE_ID` + `VERCEL_OIDC_TOKEN` in `.env.development.local`, da `vercel env pull`): mai il token di produzione in locale. Le scritture passano da `assertBlobWritable()` (`lib/blob-env.ts`).

## Flusso Step 1 → Step 2

1. `components/forms/Form1.tsx` → `POST /api/form-1`: rate limit per IP (`lib/rate-limit.ts`, Upstash o in memoria), reCAPTCHA (`lib/recaptcha.ts`), whitelist comuni, prezzo €/mq da `getPriceForStreet`, email preliminare in `after()`. Risponde con `form1Data`, `result` e un `sessionToken` HMAC.
2. Il client salva i tre valori in `sessionStorage` e naviga su `/step-2`.
3. `Form2.tsx` → `POST /api/form-2` con `form1Data` + `sessionToken`: il server verifica il token, ricalcola il prezzo, applica `computeValuation`, genera l'Excel, lo salva e lo invia via email (cliente + `ADMIN_EMAIL`).

Lookup prezzo €/mq: chiave civico (`via roma:15`) → chiave via (`via roma`) → default comune → fallback globale.
Il coefficiente piano ha due tabelle (con/senza ascensore): per questo l'admin mostra 14 tabelle per 13 coefficienti.

## Architettura

- `lib/schema.ts` — enum e schemi zod di Step 1/Step 2. **Unica fonte**: client (`components/forms/`) e API (`app/api/form-*`) li importano da qui. Non ridefinire `z.enum` altrove.
- `lib/valuation.ts` — formula moltiplicativa a 13 coefficienti, funzioni pure. Coefficienti da `lib/config.ts` (default in `lib/config.defaults.json`, override admin su Blob).
- `lib/streets/` — prezzo €/mq per via/civico (blob `streets/<slug>.json`, seed JSON come fallback).
- `lib/excel/valuation-report.ts` — report Excel; `lib/reports-storage.ts` — dove viene salvato.
- `lib/email.ts` — email Resend; `lib/logger.ts` — `createLogger('ctx')`, log JSON.
- Admin: `components/admin/*View.tsx` sono View pure (solo props), `*.tsx` omonimi sono i Controller (stato + fetch).

## Regole di sicurezza (non negoziabili)

- Il prezzo €/mq e il valore stimato si calcolano **solo lato server**. form-2 accetta `form1Data` solo se il `sessionToken` HMAC (`lib/session-token.ts`) corrisponde, e ricalcola il prezzo.
- API admin: iniziare ogni handler con `requireAdmin(request)` (`lib/auth.ts`). Il token viaggia nell'header `Authorization: Bearer`; lato client usare `adminFetch`. Mai token in query string per le API.
- Pagine `/admin/*`: protette da `proxy.ts` (token in URL + Basic Auth).
- Dati utente interpolati in HTML email: sempre `esc()`.
- Lo store Vercel Blob è **privato**: mai `access: 'public'`, mai `fetch(blob.url)`. JSON (config, strade) con `readBlobJson()`/`writeBlobJson()` (`lib/blob-json-cache.ts`, cache invalidata da `uploadedAt` tra istanze); report Excel con `saveReport()`/`readReport()` (`lib/reports-storage.ts`), nomi file con UUID.
- Lavoro dopo la risposta (email): `after()` di `next/server`, non promise non attese.

## Convenzioni

- Alias import `@/` = radice del progetto.
- React Compiler attivo: per leggere valori del form durante il render usare `useWatch({ control, name })`, **mai** `form.watch()` (il componente memoizzato non si aggiornerebbe). `getValues()` va bene solo negli handler.
- Nuovo comune: aggiungerlo in `lib/cities.ts` + seed `lib/streets/<slug>.json` + voce in `SEED_MAP`.
- Nuovo coefficiente: array in `lib/schema.ts`, tipo e tabella in `lib/config.ts` + `config.defaults.json`, label in `lib/labels.ts`, riga in `computeValuation`, test in `tests/valuation.test.ts`.
