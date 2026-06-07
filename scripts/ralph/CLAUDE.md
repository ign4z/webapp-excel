# Ralph Agent Instructions

You are an autonomous coding agent working on a software project.

## Your Task

1. Read the PRD at `prd.json` (in the same directory as this file)
2. Read the progress log at `progress.txt` (check Codebase Patterns section first)
3. Check you're on the correct branch from PRD `branchName`. If not, check it out or create from main.
4. Pick the **highest priority** user story where `passes: false`
5. Implement that single user story
6. Run quality checks (e.g., typecheck, lint, test - use whatever your project requires)
7. Update CLAUDE.md files if you discover reusable patterns (see below)
8. If checks pass, commit ALL changes with message: `feat: [Story ID] - [Story Title]`
9. Update the PRD to set `passes: true` for the completed story
10. Append your progress to `progress.txt`

## Progress Report Format

APPEND to progress.txt (never replace, always append):
```
## [Date/Time] - [Story ID]
- What was implemented
- Files changed
- **Learnings for future iterations:**
  - Patterns discovered (e.g., "this codebase uses X for Y")
  - Gotchas encountered (e.g., "don't forget to update Z when changing W")
  - Useful context (e.g., "the evaluation panel is in component X")
---
```

The learnings section is critical - it helps future iterations avoid repeating mistakes and understand the codebase better.

## Consolidate Patterns

If you discover a **reusable pattern** that future iterations should know, add it to the `## Codebase Patterns` section at the TOP of progress.txt (create it if it doesn't exist). This section should consolidate the most important learnings:

```
## Codebase Patterns
- Example: Use `sql<number>` template for aggregations
- Example: Always use `IF NOT EXISTS` for migrations
- Example: Export types from actions.ts for UI components
```

Only add patterns that are **general and reusable**, not story-specific details.

## Update CLAUDE.md Files

Before committing, check if any edited files have learnings worth preserving in nearby CLAUDE.md files:

1. **Identify directories with edited files** - Look at which directories you modified
2. **Check for existing CLAUDE.md** - Look for CLAUDE.md in those directories or parent directories
3. **Add valuable learnings** - If you discovered something future developers/agents should know:
   - API patterns or conventions specific to that module
   - Gotchas or non-obvious requirements
   - Dependencies between files
   - Testing approaches for that area
   - Configuration or environment requirements

**Examples of good CLAUDE.md additions:**
- "When modifying X, also update Y to keep them in sync"
- "This module uses pattern Z for all API calls"
- "Tests require the dev server running on PORT 3000"
- "Field names must match the template exactly"

**Do NOT add:**
- Story-specific implementation details
- Temporary debugging notes
- Information already in progress.txt

Only update CLAUDE.md if you have **genuinely reusable knowledge** that would help future work in that directory.

## Quality Requirements

- ALL commits must pass your project's quality checks (typecheck, lint, test)
- Do NOT commit broken code
- Keep changes focused and minimal
- Follow existing code patterns

## Browser Testing (If Available)

For any story that changes UI, verify it works in the browser if you have browser testing tools configured (e.g., via MCP):

1. Navigate to the relevant page
2. Verify the UI changes work as expected
3. Take a screenshot if helpful for the progress log

If no browser tools are available, note in your progress report that manual browser verification is needed.

## Stop Condition

After completing a user story, check if ALL stories have `passes: true`.

If ALL stories are complete and passing, reply with:
<promise>COMPLETE</promise>

If there are still stories with `passes: false`, end your response normally (another iteration will pick up the next story).

## Important

- Work on ONE story per iteration
- Commit frequently
- Keep CI green
- Read the Codebase Patterns section in progress.txt before starting

---

## Codebase Context for v3 (Coefficienti Immobiliari)

### Obiettivo v3
Sostituire il sistema di aggiustamento percentuale (secondBathroomPct, renovatedPct, ecc.) con una formula moltiplicativa a coefficienti. Aggiungere 4 nuovi campi a Step 1 (tipologia, piano, locali, bagni) e riscrivere i campi di Step 2.

### Formula di Calcolo
```
Valore Stimato = pricePerSqm × squareMeters × Πcoefficienti
```
dove ogni coefficiente è un numero (1.00 = neutro, >1.00 = premium, <1.00 = sconto).

Il baseValue (pricePerSqm × sqm) viene calcolato in form-1/route.ts e salvato nella sessione. Il finalValue con tutti i coefficienti viene calcolato in form-2/route.ts.

### Flusso Dati v3
1. **Form1** → l'utente seleziona: città, indirizzo, superficie + NUOVI: tipologia, piano, locali, bagni
2. **form-1/route.ts** → valida i nuovi campi con z.enum(), li include nel response; Form1.tsx li salva in sessionStorage come parte di form1Data
3. **Form2** → l'utente seleziona: stato, classeEnergetica, annoCostruzione, ascensore, terrazzo, giardino, garage, cantina, riscaldamento + note libere
4. **form-2/route.ts** → riceve form1Data (con tipologia/piano/locali/bagni) + campi Form2, legge config.coefficienti, applica formula moltiplicativa

### Logica Piano + Ascensore
Il coefficiente piano dipende dalla presenza dell'ascensore (campo di Form2):
```typescript
function calcolaPianoCoeff(piano: string, ascensore: 'no' | 'si', c: ValuationCoefficientTables): number {
  const soloSenzaAscensore = ['interrato', 'seminterrato', 'rialzato']
  const soloConAscensore = ['piano6', 'piano7', 'piano8', 'piano9']

  if (ascensore === 'si' && !soloSenzaAscensore.includes(piano)) {
    // piano6..piano9 hanno chiavi esplicite in pianoConAscensore; piano10Plus anche
    return c.pianoConAscensore[piano as PianoConAscensoreKey] ?? 1.00
  }
  // senza ascensore: piano6/7/8/9 → mappano a 'piano6Plus'
  const key = soloConAscensore.includes(piano) ? 'piano6Plus' : piano
  return c.pianoSenzaAscensore[key as PianoSenzaAscensoreKey] ?? 1.00
}
```

### Nomenclatura Chiavi Coefficienti
Tutte le chiavi sono camelCase e definite come string union types esportati da lib/config.ts:
- `tipologia`: appartamento, openspaceLoft, mansarda, attico, villettaSchiera, villa, rusticoCasale, stabilePalazzo
- `stato`: daRistrutturare, daRiattare, abitabile, buono, ottimo, ristrutturato, nuovo
- `classeEnergetica`: G, F, E, D, C, B, A1, A2, A3, A4
- `annoCostruzione`: prima1945, dal1945al1960, dal1961al1980, dal1981al2000, dal2001al2010, dal2011al2020, dal2021inPoi
- `pianoSenzaAscensore`: interrato, seminterrato, pianoTerra, rialzato, piano1..piano5, piano6Plus
- `pianoConAscensore`: pianoTerra, piano1..piano9, piano10Plus
- `locali`: locale1, locali2..locali6, locali7Plus
- `bagni`: bagno1, bagni2..bagni4, bagni5Plus
- `ascensore`: no, si
- `terrazzo`: nessuno, balcone, balconiMultipli, terrazzoAbitabile, terrazzoPanoramico
- `giardino`: nessuno, piccolo, medio, grande, importante
- `garage`: nessuno, postoScoperto, postoCoperto, boxSingolo, boxDoppio
- `cantina`: no, si
- `riscaldamento`: assente, centralizzatoVecchio, centralizzatoContabilizzato, autonomo, autonomoCondensazione, pompaDiCalore, impiantoRadiante

### Campi Rimossi in v3
Da **Form2 / Step2View** (rimossi in US-103):
- `floor` (number) → spostato a Form1 come `piano` (PianoKey string)
- `hasElevator` (boolean) → diventa `ascensore: 'no'|'si'`
- `hasSecondBathroom` (boolean) → sostituito da `bagni` in Form1
- `isRecentlyRenovated` (boolean) → sostituito da `stato` enum
- `exposure` ('north'|'south'|...) → rimosso (nessuna tabella coefficiente fornita)
- `buildYear` (number) → diventa `annoCostruzione` enum select
- `heatingType` ('autonomous'|'centralized'|'none') → diventa `riscaldamento` enum con 7 opzioni

Da **ValuationConfig / config.defaults.json** (rimossi in US-104):
- secondBathroomPct, cellarPct, renovatedPct, floorGroundPct, floorTopPct
- exposureNorthPct, exposureSouthPct, exposureEastPct, exposureWestPct
- heatingAutonomousPct, heatingCentralizedPct, depreciationRatePerYear

### Sequenza Implementazione
US-101 → US-102 → US-103 → US-104 → US-105 → US-106 → US-107 → US-108 → US-109

**Attenzione**: tra US-103 (Form2 aggiornato lato UI) e US-104 (API aggiornata), il form invia campi nuovi che la route non conosce ancora. Il build TypeScript non si rompe perché il POST body è JSON (nessun tipo condiviso tra client e server). La route usa ancora la vecchia formula fino a US-104.

### File Chiave v3
| File | Responsabilità |
|------|---------------|
| lib/config.ts | Tipi ValuationCoefficientTables, ValuationConfig, helper getCoefficienti() |
| lib/config.defaults.json | Valori default per tutti i 14 coefficient tables |
| app/api/form-1/route.ts | Validazione z.enum() nuovi campi Form1 |
| app/api/form-2/route.ts | Formula moltiplicativa, Excel aggiornato |
| components/forms/Form1.tsx | Controller: include tipologia, piano, locali, bagni |
| components/valuation/Step1View.tsx | View: 4 nuovi select |
| components/forms/Form2.tsx | Controller: nuovi campi, rimozione vecchi |
| components/valuation/Step2View.tsx | View: 9 select aggiornati |
| components/admin/ConfigEditorView.tsx | 14 accordion sections per i coefficienti |
