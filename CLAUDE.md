# CLAUDE.md

Webapp di valutazione immobiliare (zona sud Milano) in due step, con pannello admin.
Next.js 16 (App Router, React Compiler) + TypeScript strict, Vercel Blob, Resend, ExcelJS, zod 4.
Codice, commenti, UI e messaggi di commit in **italiano**.

## Comandi

```bash
npm run dev         # http://localhost:3000
npm run lint        # ESLint (deve restare a 0 errori)
npm run typecheck   # tsc --noEmit
npm test            # Vitest, test in tests/
npm run build
```

Prima di considerare finito un lavoro: `npm run lint && npm run typecheck && npm test`.

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
- Loop Ralph: PRD in `prd.json` e log in `progress.txt` nella radice; prompt in `scripts/ralph/CLAUDE.md`.
