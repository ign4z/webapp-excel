# Changelog

Tutte le modifiche rilevanti del progetto sono documentate in questo file.
Formato ispirato a [Keep a Changelog](https://keepachangelog.com/it/1.1.0/), versioni secondo [Semantic Versioning](https://semver.org/lang/it/).

## [0.9.1] — 2026-09-26

### Aggiunto
- Editor strade: "+ Aggiungi via" con autocomplete Google Maps limitato al comune, così la via viene salvata con il nome ufficiale che Google restituisce anche all'utente in Step 1.
- Editor strade: "🔎 Verifica con Google" confronta le vie in lista con i nomi Google e propone le rinomine (applicabili una per una o tutte insieme, civici inclusi, senza sovrascrivere vie esistenti).
- Log `Street not in price list, using city default` quando la via dell'utente non è in lista.
- Vie e civici ufficiali ANNCSU per Opera, Locate di Triulzi, Pieve Emanuele, Siziano e Carpiano (`lib/streets/anncsu/`, aggiornabili con `npm run anncsu:update`).
- Editor strade: "📥 Importa tutte le vie" (vie ufficiali con nomi Google, anteprima prima di applicare) e "🏠 Espandi civici" (tutti i civici ufficiali con il prezzo della via).
- Editor strade: filtro per nome via e civici raggruppati per via.
- Script `scripts/official-streets.ts` per import o svuotamento delle liste vie da terminale.

### Modificato
- Step 1: il campo indirizzo non usa più Google. La via si sceglie dall'elenco del comune (suggerimenti mentre si scrive, solo vie di quel comune, nome sempre uguale alla lista prezzi) e il civico ha un campo separato e facoltativo, con i civici ufficiali come suggerimento. Sotto compare il riepilogo "via civico, comune". Nuova route pubblica `GET /api/streets` (solo nomi e civici).
- Caricamento di Google Maps e lettura dei componenti indirizzo spostati in `lib/google-maps.ts` e `lib/address.ts` (usati solo dall'admin).
- "Verifica con Google" ora gira lato server con `GOOGLE_MAPS_SERVER_KEY` (`lib/google-geocode.ts`).
- Limite chiavi per comune (vie + civici) portato da 1000 a 10000.
- Svuotate le liste vie di Pieve Emanuele, Fizzonasco, Tolcinasco, Siziano e Carpiano (i comuni usano il prezzo di default).

## [0.9.0] — 2026-09-26

### Aggiunto
- Formula di valutazione moltiplicativa a 13 coefficienti (tipologia, stato, classe energetica, anno di costruzione, piano con/senza ascensore, locali, bagni, ascensore, terrazzo, giardino, garage, cantina, riscaldamento).
- Nuovi campi nei form: tipologia, piano, locali e bagni in Step 1; stato, classe energetica, anno, dotazioni e riscaldamento in Step 2.
- Editing delle 14 tabelle coefficienti dal pannello admin (`/admin/config`).
- 7 comuni della zona sud di Milano (Locate di Triulzi, Opera, Pieve Emanuele, Fizzonasco, Tolcinasco, Siziano, Carpiano) con seed dei prezzi per via.
- Prezzo €/mq per numero civico, con priorità civico → via → default comune.
- Pannello admin "Prezzi per Via" con download del template Excel e import massivo.
- Report Excel della valutazione con dettaglio dei coefficienti applicati.
- Versione dell'app mostrata nel pannello admin.
- Test Vitest su valutazione, lookup strade, sicurezza, rate limit, API form-1/form-2, import strade e report Excel.

### Modificato
- Componenti admin separati in View (solo props) e Controller (stato e fetch).
- Schemi zod ed enum centralizzati in `lib/schema.ts`, condivisi tra client e API.
- Email inviate con `after()` dopo la risposta.

### Sicurezza
- Token di sessione HMAC tra Step 1 e Step 2: prezzo e valore stimato calcolati solo lato server.
- Rate limit per IP sui form pubblici (Upstash o in memoria) e verifica reCAPTCHA.
- Store Vercel Blob privato: report scaricabili solo tramite route admin autenticata.
- Token admin solo nell'header `Authorization: Bearer`, mai in query string per le API.
- Escape dei dati utente nelle email HTML.

### Corretto
- Autocomplete indirizzi: salvataggio della via canonica Google + civico, rimossi listener duplicati.
- Email di conferma inviata dopo lo Step 1.

## [0.2.0] — 2026-06-07

### Aggiunto
- Prima versione dei coefficienti immobiliari e dei nuovi comuni della zona sud di Milano.
- Gestione prezzi per via dal pannello admin.

## [0.1.0] — 2026-02-22

### Aggiunto
- Valutazione immobiliare in due step con stima preliminare e valutazione definitiva.
- Report Excel inviato via email al cliente e all'admin.
- Pannello admin per configurazione e gestione file.
