---
name: add-coefficient
description: Aggiunge un nuovo coefficiente moltiplicativo alla valutazione (schema, config, label, formula, form, admin, report Excel, test). Uso - /add-coefficient <nome> <step1|step2> [valori]
disable-model-invocation: true
argument-hint: <nome camelCase> <step1|step2> [valore1,valore2,...]
---

# Nuovo coefficiente di valutazione

Argomenti: `$ARGUMENTS` → nome del coefficiente (camelCase, es. `esposizione`), step del form in cui va chiesto, valori ammessi (camelCase).
Se manca qualcosa (valori, coefficienti numerici, quale valore vale 1,00 come riferimento), **chiedilo prima di toccare file**.

Prendi come modello un coefficiente esistente dello stesso step (`cantina` per Step 2, `locali` per Step 1) e replicane la forma in ogni punto.

## Checklist (tutti i punti, in quest'ordine)

1. **`lib/schema.ts`** — array `as const` dei valori (sezione "Valori ammessi"; se sono sì/no riusa `SI_NO`) e campo `z.enum(...)` in `form1Schema` o `form2Schema`. Non ridefinire `z.enum` altrove.
2. **`lib/config.ts`** — tipo `<Nome>Key` e riga in `ValuationCoefficientTables`.
3. **`lib/config.defaults.json`** — tabella in `coefficienti` con il valore di riferimento a `1.00`.
4. **`lib/labels.ts`** — `<NOME>_LABELS` in italiano.
5. **`lib/valuation.ts`** — riga in `computeValuation` (`{ factor, value: LABELS[...], coefficiente: c.<nome>[input.<nome>] ?? 1.00 }`).
6. **Form** — valore di default in `components/forms/Form1.tsx` o `Form2.tsx`; `<select>` con `FieldGroup` in `components/valuation/Step1View.tsx` o `Step2View.tsx` (tipo della prop incluso).
7. **Admin** — voce in `components/admin/ConfigEditorView.tsx` con `title`, `ref: 'Riferimento: ... = 1,00'` e `labels`.
8. **Report Excel** — riga in `lib/excel/valuation-report.ts`.
9. **Test** — in `tests/valuation.test.ts` un test che verifichi il coefficiente nel prodotto finale; aggiorna le fixture in `tests/api-form.test.ts` e `tests/valuation-report.test.ts` (e ogni altro test che costruisce un `form1Data`/`form2Data` completo: cerca un campo esistente con Grep).
10. **Documentazione** — aggiorna il conteggio dei coefficienti in `CLAUDE.md` (sezione "Flusso" e `lib/valuation.ts`) e in `README.md` se lo cita; voce sotto `## [Unreleased]` in `CHANGELOG.md` (crea la sezione se manca).

## Verifica

`npm run lint && npm run typecheck && npm test` — tutto verde prima di dire che hai finito.
Ricorda all'utente che la config admin salvata su Blob non ha la nuova tabella: `mergeWithDefaults` la prende dai default finché non la salva dall'admin.
