import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal/LegalPage';
import { TITOLARE } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Cookie policy · Valutazione immobiliare',
};

// Solo strumenti tecnici: per le Linee guida cookie del Garante (2021) non serve consenso né banner.
// Se si aggiungono analytics non anonimi o pixel di marketing, questa pagina va rivista e serve un banner.
export default function CookiePage() {
  return (
    <LegalPage title="Cookie policy">
      <h2>In breve</h2>
      <p>
        Questo sito <strong>non usa cookie di profilazione, di marketing o di analisi</strong>. Usa solo gli strumenti
        tecnici strettamente necessari a farti ottenere la valutazione che richiedi, per i quali non serve il tuo consenso.
      </p>

      <h2>Strumenti tecnici usati</h2>
      <ul>
        <li>
          <strong>Memoria di sessione del browser (sessionStorage)</strong> — conserva i dati del primo step per
          passarli al secondo. Resta solo nel tuo browser e si cancella alla chiusura della scheda o al termine
          della valutazione.
        </li>
        <li>
          <strong>Cloudflare Turnstile</strong> — verifica che a compilare il form sia una persona e non un bot.
          Non usa cookie di profilazione e non traccia la navigazione su altri siti; tratta dati tecnici del
          dispositivo (come l&apos;indirizzo IP) solo per questo controllo.
        </li>
      </ul>
      <p>I caratteri tipografici sono serviti direttamente da questo sito, senza richieste a servizi esterni.</p>

      <h2>Come gestirli</h2>
      <p>
        Puoi cancellare i dati di navigazione dalle impostazioni del browser. Bloccare la verifica anti-bot
        impedisce però l&apos;invio del form.
      </p>

      <h2>Contatti</h2>
      <p>
        Titolare: {TITOLARE.ragioneSociale}. Per domande scrivi a{' '}
        <a href={`mailto:${TITOLARE.emailPrivacy}`}>{TITOLARE.emailPrivacy}</a>. Sul trattamento dei dati personali
        vedi l&apos;<Link href="/privacy">informativa privacy</Link>.
      </p>
    </LegalPage>
  );
}
