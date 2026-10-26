import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal/LegalPage';
import { TITOLARE, RESPONSABILI, RETENTION_MONTHS } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Informativa privacy · Valutazione immobiliare',
};

// Informativa ex art. 13 Regolamento (UE) 2016/679. Testo da far validare prima del rilascio.
export default function PrivacyPage() {
  return (
    <LegalPage title="Informativa privacy">
      <h2>1. Titolare del trattamento</h2>
      <p>
        <strong>{TITOLARE.ragioneSociale}</strong>, P.IVA {TITOLARE.partitaIva}, con sede in {TITOLARE.sede}.
        Per qualsiasi richiesta sulla privacy: <a href={`mailto:${TITOLARE.emailPrivacy}`}>{TITOLARE.emailPrivacy}</a>
        {TITOLARE.pec && <>, PEC <a href={`mailto:${TITOLARE.pec}`}>{TITOLARE.pec}</a></>}.
      </p>

      <h2>2. Dati che raccogliamo</h2>
      <ul>
        <li><strong>Dati di contatto</strong> (primo step): nome, cognome, email, telefono.</li>
        <li><strong>Dati dell&apos;immobile</strong>: comune, indirizzo, superficie, tipologia, piano, locali, bagni e, nel secondo step, stato, classe energetica, anno di costruzione, dotazioni, riscaldamento ed eventuali note.</li>
        <li><strong>Dati tecnici</strong>: indirizzo IP, usato solo per limitare gli invii ripetuti e per la verifica anti-bot.</li>
      </ul>

      <h2>3. Perché li usiamo e su quale base</h2>
      <ul>
        <li>
          <strong>Calcolare e inviarti la valutazione</strong> e <strong>ricontattarti tramite un nostro agente</strong> per
          approfondirla: è ciò che ci chiedi compilando il form (art. 6.1.b GDPR, misure precontrattuali su tua richiesta).
        </li>
        <li>
          <strong>Proteggere il servizio da abusi e bot</strong> (limite di richieste per IP, verifica anti-bot): legittimo
          interesse del titolare alla sicurezza del sito (art. 6.1.f GDPR).
        </li>
      </ul>
      <p>
        Non usiamo i tuoi dati per newsletter o marketing e non li cediamo a terzi per loro finalità.
      </p>

      <h2>4. Conferimento dei dati</h2>
      <p>
        I dati richiesti nei form sono necessari per calcolare la valutazione: senza, non possiamo fornirla.
        Le note sono facoltative.
      </p>

      <h2>5. Valutazione automatica</h2>
      <p>
        Il valore è calcolato automaticamente da una formula (prezzo al metro quadro della zona e coefficienti
        sulle caratteristiche dell&apos;immobile). È una stima indicativa e non produce effetti giuridici né
        decisioni che ti riguardano: per una valutazione professionale puoi parlare con un nostro agente.
      </p>

      <h2>6. Chi tratta i dati</h2>
      <p>
        I dati sono trattati dal personale e dagli agenti del titolare autorizzati, e dai seguenti fornitori,
        nominati responsabili del trattamento (art. 28 GDPR):
      </p>
      <ul>
        {RESPONSABILI.map((r) => (
          <li key={r.nome}><strong>{r.nome}</strong> — {r.ruolo}.</li>
        ))}
      </ul>
      <p>
        Alcuni fornitori hanno sede negli Stati Uniti: il trasferimento avviene sulla base dell&apos;EU-US Data
        Privacy Framework o delle clausole contrattuali standard approvate dalla Commissione europea.
      </p>

      <h2>7. Per quanto tempo</h2>
      <ul>
        <li>Report della valutazione: <strong>{RETENTION_MONTHS} mesi</strong> dalla richiesta, poi cancellati automaticamente. Le email di notifica ricevute dal nostro staff (con i soli dati di contatto e il valore stimato) vengono eliminate entro lo stesso termine.</li>
        <li>Indirizzo IP per il limite di richieste: solo per la durata della finestra di controllo (al massimo qualche minuto).</li>
        <li>Log tecnici del sito: per il periodo di conservazione previsto dal fornitore di hosting, di norma pochi giorni.</li>
      </ul>

      <h2>8. I tuoi diritti</h2>
      <p>
        Puoi chiedere in ogni momento accesso, rettifica, cancellazione, limitazione, portabilità dei dati e
        opporti al trattamento basato sul legittimo interesse (artt. 15-22 GDPR), scrivendo a{' '}
        <a href={`mailto:${TITOLARE.emailPrivacy}`}>{TITOLARE.emailPrivacy}</a>. Rispondiamo entro 30 giorni.
      </p>
      <p>
        Se ritieni che il trattamento violi la normativa puoi proporre reclamo al Garante per la protezione dei
        dati personali (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">www.garanteprivacy.it</a>).
      </p>

      <h2>9. Cookie</h2>
      <p>
        Il sito usa solo strumenti tecnici, senza cookie di profilazione: dettagli nella{' '}
        <Link href="/cookie">cookie policy</Link>.
      </p>
    </LegalPage>
  );
}
