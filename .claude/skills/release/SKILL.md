---
name: release
description: Prepara una release - bump versione in package.json, sezione CHANGELOG in italiano dai commit dall'ultima release, verifiche e commit. Uso - /release [patch|minor|major|x.y.z]
disable-model-invocation: true
argument-hint: [patch|minor|major|x.y.z]
---

# Release

Argomento: `$ARGUMENTS` (default `patch`).

## Contesto

- Versione attuale: !`node -p "require('./package.json').version"`
- Ultimo commit di release: !`git log --grep="release" -1 --format="%h %s"`
- Stato: !`git status --short`

## Passi

1. Se il working tree non è pulito, fermati e chiedi cosa fare.
2. Leggi i commit dall'ultima release (`git log <hash>..HEAD --format="%h %s%n%b"`) e, dove il messaggio non basta, i diff rilevanti.
3. Calcola la nuova versione (semver) e aggiorna **solo** il campo `version` di `package.json` con Edit (non `npm version`: niente tag automatici). `package-lock.json` è protetto da un hook: aggiornalo con `npm install --package-lock-only`.
4. In `CHANGELOG.md` aggiungi in cima `## [x.y.z] — YYYY-MM-DD` (data di oggi), assorbendo un eventuale `## [Unreleased]`. Sezioni `### Aggiunto` / `### Modificato` / `### Corretto` / `### Rimosso`, stile delle voci esistenti: italiano, frasi complete orientate all'utente, file e funzioni in `codice`. Escludi commit puramente interni (docs su TODO, refactor senza effetti) salvo che siano rilevanti.
5. Mostra all'utente la sezione CHANGELOG e aspetta conferma.
6. `npm run lint && npm run typecheck && CI_RELEASE=1 npm test && npm run build` (`CI_RELEASE=1` fa fallire i test se in `lib/legal.ts` restano segnaposto). Se qualcosa fallisce, fermati e riporta l'output.
7. Commit: `chore: release x.y.z — <2-3 temi principali>` (formato dei commit di release precedenti). **Non** fare push né tag se l'utente non lo chiede: il deploy parte dal push su `master`.
