# Changelog

Tutte le modifiche rilevanti del progetto sono documentate in questo file.
Formato ispirato a [Keep a Changelog](https://keepachangelog.com/it/1.1.0/), versioni secondo [Semantic Versioning](https://semver.org/lang/it/).

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
