# PRD — Webapp Valutazione Immobiliare

## Panoramica

Web app a due step per la valutazione immobiliare di proprietà nei comuni di Milano, Monza, Sesto San Giovanni, Cinisello Balsamo e Locate di Triulzi. L'utente inserisce i dati dell'immobile e riceve una stima in tempo reale + report Excel scaricabile.

**Stack:** Next.js 16 · TypeScript · Tailwind · ExcelJS · Vercel Blob · Resend · reCAPTCHA v2 · Google Maps Places

---

## Funzionalità esistenti (completate)

- [x] **Step 1 — Dati base**: form con nome, cognome, email, telefono, comune, indirizzo (con autocomplete Google Maps limitato al comune), superficie mq. Calcola stima base (`mq × prezzo/mq per comune`). Restituisce sessionToken.
- [x] **Step 2 — Caratteristiche**: form con piano, anno costruzione, esposizione, riscaldamento, dotazioni (ascensore, secondo bagno, cantina, ristrutturato), note. Applica modificatori percentuali alla stima base. Genera file Excel e lo carica su Vercel Blob.
- [x] **Result screen**: mostra valore base, modificatori applicati, valore finale, link download Excel.
- [x] **Admin — Config**: pagina `/admin/config?token=SECRET` per leggere/modificare i parametri di calcolo (prezzi/mq per comune, percentuali modificatori) salvati su Vercel Blob.
- [x] **Admin — Files**: pagina `/admin/files?token=SECRET` per listare/eliminare i file Excel generati.
- [x] **reCAPTCHA v2**: integrato su entrambi gli step (condizionale alla presenza della env var).
- [x] **Session storage**: dati form 1 persistiti in sessionStorage per navigazione avanti/indietro.

---

## Bug da correggere

- [ ] **BUG-1: Email non inviata dopo Form 1** — `lib/email.ts` contiene `sendForm1Email` ma `app/api/form-1/route.ts` non la chiama mai. L'utente non riceve nessuna email dopo il primo step.
- [ ] **BUG-2: Email non inviata dopo Form 2** — `lib/email.ts` contiene `sendForm2Email` ma `app/api/form-2/route.ts` non la chiama mai. L'utente non riceve il report via email.
- [ ] **BUG-3: Template email obsoleti** — Le funzioni in `lib/email.ts` usano campi generici (`company`, `discount`, `basePrice`) non compatibili con il dominio immobiliare. Vanno riscritti con i campi corretti (`estimatedValue`, `finalValue`, `address`, `excelUrl`).
- [ ] **BUG-4: Esposizione Est mostra "+5%" ma vale +3%** — In `Step2View.tsx` l'opzione "Est" mostra `(+5%)` ma la config ha `exposureEast: 3`. Il badge deve mostrare il valore reale dalla config, oppure essere corretto a `+3%`.
- [ ] **BUG-5: Piano top non applicato** — La config ha `topFloor: -3` ma `api/form-2/route.ts` applica solo la penalità piano terra (`floor === 0`), ignorando il piano attico. Serve un campo "piano totale edificio" o una logica alternativa per rilevare l'ultimo piano.

---

## Miglioramenti pianificati

- [ ] **FEAT-1: Riscrivere template email Form 1** — Email di conferma step 1 con: nome utente, indirizzo immobile, stima base calcolata, link per procedere allo step 2.
- [ ] **FEAT-2: Riscrivere template email Form 2** — Email di conferma step 2 con: nome utente, valore base, modificatori applicati, valore finale, link download Excel.
- [ ] **FEAT-3: Email notifica admin** — Dopo ogni valutazione completata, inviare email all'admin (`ADMIN_EMAIL`) con i dati del lead (nome, email, telefono, indirizzo, valore stimato).
- [ ] **FEAT-4: Pulizia `lib/excel.ts`** — Il file è vuoto (placeholder). Va popolato con la logica di generazione Excel attualmente inline in `api/form-2/route.ts`, per separare le responsabilità.
- [ ] **FEAT-5: Rimuovere `lib/calculations.ts`** — Contiene solo un re-export deprecato e un generatore di token. Il token viene già generato in `api/form-1/route.ts` con `crypto`. Il file può essere eliminato.

---

## Parametri di calcolo (config attuale)

| Parametro | Valore default |
|---|---|
| Milano €/mq | 4500 |
| Monza €/mq | 2800 |
| Sesto San Giovanni €/mq | 2400 |
| Cinisello Balsamo €/mq | 2200 |
| Locate di Triulzi €/mq | 2000 |
| Default €/mq | 2500 |
| Deprezzamento/anno | 0.3% |
| Secondo bagno | +3% |
| Cantina | +3% |
| Ristrutturato | +10% |
| Piano terra | -5% |
| Ultimo piano | -3% |
| Esposizione Sud | +5% |
| Esposizione Est | +3% |
| Esposizione Ovest | +2% |
| Esposizione Nord | -3% |
| Riscaldamento autonomo | +5% |
| Riscaldamento centralizzato | -2% |

---

## Variabili d'ambiente richieste

```
NEXT_PUBLIC_GOOGLE_API_KEY       # Google Maps Places
NEXT_PUBLIC_RECAPTCHA_SITE_KEY   # reCAPTCHA v2 site key
RECAPTCHA_SECRET_KEY             # reCAPTCHA v2 secret
RESEND_API_KEY                   # Resend per le email
BLOB_READ_WRITE_TOKEN            # Vercel Blob
ADMIN_TOKEN                      # Token accesso pagine admin
ADMIN_EMAIL                      # Email destinatario notifiche admin
NEXT_PUBLIC_BASE_URL             # URL base app (es. https://tuodominio.com)
```
