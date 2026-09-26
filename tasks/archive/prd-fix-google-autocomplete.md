# PRD: Fix Google Places Autocomplete

## Introduction

Il campo "Indirizzo" nel form Step 1 dovrebbe mostrare suggerimenti di Google Places mentre l'utente digita, e salvare il nome canonico della via restituito da Google. Attualmente il dropdown non appare mai e il valore salvato non è la via canonica di Google.

## Goals

- Il dropdown di Google Places appare quando l'utente digita nel campo "Indirizzo"
- Il valore salvato nel form è il nome canonico della via (`route`) restituito da Google Places (es. `"Via Giuseppe Garibaldi"`, non l'indirizzo completo)
- L'autocomplete funziona anche quando il geocoding dei bounds della città fallisce

## User Stories

### US-001: Fix autocomplete initialization fallback
**Description:** As a developer, I want the Google Places Autocomplete to initialize even when city bounds lookup fails, so that users always see address suggestions.

**Acceptance Criteria:**
- [ ] Refactor `init()` in `components/forms/Form1.tsx`: estrarre la logica di creazione dell'Autocomplete + listener `place_changed` in una funzione interna `setupAutocomplete(options)` separata
- [ ] Nel `try` block, chiamare `setupAutocomplete({ bounds, strictBounds: true })`
- [ ] Nel `catch` block (attualmente vuoto), chiamare `setupAutocomplete({})` senza bounds invece di non fare nulla
- [ ] Il comportamento in caso di bounds disponibili rimane invariato
- [ ] Typecheck passa (`npm run type-check` o equivalente)

### US-002: Estrarre via canonica (route) da Google
**Description:** As a user, I want the address field to be filled with the canonical street name from Google so that the data is consistent and matchable with the streets database.

**Acceptance Criteria:**
- [ ] Nel listener `place_changed` (riga ~114 di `Form1.tsx`), estrarre il componente `route` da `place.address_components`
- [ ] Se `route` non è presente nell'indirizzo selezionato, mostrare errore: `"Seleziona un indirizzo con un nome di via"` tramite `form.setError`
- [ ] `form.setValue('address', ...)` salva solo il valore del componente `route` (es. `"Via Roma"`) invece di `place.formatted_address`
- [ ] La validazione esistente sull'appartenenza al comune selezionato resta invariata (controllo `locality`)
- [ ] Typecheck passa
- [ ] Verifica in browser usando dev-browser skill

## Functional Requirements

- FR-1: Quando `getCityBounds` fallisce, l'Autocomplete viene inizializzato senza restrizione geografica (solo `componentRestrictions: { country: 'it' }`)
- FR-2: Il listener `place_changed` estrae `address_components.find(c => c.types.includes('route'))?.long_name`
- FR-3: Se nessun componente `route` è trovato, viene mostrato un errore all'utente (non si salva un valore parziale)
- FR-4: Il token di sessione viene rinnovato dopo ogni selezione (comportamento già presente, da non modificare)

## Non-Goals

- Non si cambia la struttura del DB o dell'API `/api/form-1`
- Non si implementa il matching automatico tra via e prezzi del StreetsEditor (quello è lavoro futuro)
- Non si tocca la validazione reCAPTCHA
- Non si cambia il componente `Step1View.tsx` (solo `Form1.tsx` va modificato)

## Technical Considerations

- File da modificare: `components/forms/Form1.tsx` righe 98–136 (funzione `init()`)
- `place.address_components` è tipato come `google.maps.GeocoderAddressComponent[]` — tipi già disponibili via `@types/google.maps`
- Il refactor di `init()` deve mantenere il flag `active` per evitare race condition su città cambiate rapidamente

## Success Metrics

- Dopo il fix, digitando nel campo "Indirizzo" (con comune selezionato) appare il dropdown di Google Places
- Il valore salvato nel campo dopo la selezione è solo il nome della via, non l'indirizzo completo

## Open Questions

- Se il geocoding dei bounds fallisce **e** l'utente seleziona una via di un altro comune, il controllo `locality` ancora blocca il submit — questo è accettabile come fallback?
