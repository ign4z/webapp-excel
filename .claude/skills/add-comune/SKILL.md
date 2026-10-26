---
name: add-comune
description: Aggiunge un nuovo comune alla whitelist con seed prezzi, prezzo di default e (se ha codice catastale) vie ufficiali ANNCSU. Uso - /add-comune "<Nome Comune>" <prezzo €/mq> [codice catastale]
disable-model-invocation: true
argument-hint: "<Nome Comune>" <prezzo €/mq di default> [codice Belfiore]
---

# Nuovo comune

Argomenti: `$ARGUMENTS` → nome esatto del comune (maiuscole e spazi come vanno mostrati), prezzo €/mq di default, codice catastale (Belfiore) facoltativo.
Se manca il prezzo, chiedilo. Le frazioni (come Fizzonasco, Tolcinasco) non hanno codice catastale proprio: niente ANNCSU.

Lo slug è `cityToSlug(nome)` (minuscolo, spazi → trattini), es. `Locate di Triulzi` → `locate-di-triulzi`.

## Checklist

1. **`lib/cities.ts`** — nome in `ALLOWED_CITIES`; se c'è il codice, `'<slug>': '<codice>'` in `CITY_CADASTRAL_CODES`.
2. **`lib/streets/<slug>.json`** — seed `{ "streetPrices": {}, "defaultPrice": <prezzo> }` (stesso formato di `carpiano.json`).
3. **`lib/streets/index.ts`** — import del JSON e voce in `SEED_MAP`.
4. **`lib/config.defaults.json`** — `"<Nome Comune>": <prezzo>` in `pricePerSqmByCity`.
5. **ANNCSU** (solo con codice catastale) — `npm run anncsu:update` genera `lib/streets/anncsu/<slug>.json`; poi import e voce in `OFFICIAL_MAP` di `lib/streets/anncsu/index.ts`. Se lo script richiede download o rete e fallisce, fermati e dillo all'utente.
6. **Test** — controlla con Grep i test che elencano i comuni (es. `ALLOWED_CITIES`, conteggi, `SEED_MAP`) e aggiornali.
7. **Documentazione** — elenco comuni in `README.md` se presente; voce sotto `## [Unreleased]` in `CHANGELOG.md`.

## Verifica

`npm run lint && npm run typecheck && npm test`.
Ricorda all'utente che i prezzi per via si caricano poi dall'admin (`/admin` → Prezzi per via), e che la config admin già salvata su Blob potrebbe non avere il comune in `pricePerSqmByCity`.
