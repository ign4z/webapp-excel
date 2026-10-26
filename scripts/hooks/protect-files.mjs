// Hook PreToolUse (Edit|Write) di Claude Code: impedisce di modificare i file .env* (token OIDC,
// segreti) e package-lock.json (va rigenerato da npm, mai a mano).
// Esce con codice 2: Claude Code blocca la modifica e rimanda il motivo a Claude.
// .env.example resta modificabile: è il modello versionato, senza segreti.
import path from 'node:path';

let input = '';
for await (const chunk of process.stdin) input += chunk;

let file;
try {
  file = JSON.parse(input).tool_input?.file_path;
} catch {
  process.exit(0);
}
if (!file) process.exit(0);

const name = path.basename(file);
if (name === '.env.example') process.exit(0);

if (name.startsWith('.env')) {
  process.stderr.write(
    `Modifica bloccata: ${name} contiene segreti locali. Chiedi all'utente di aggiornarlo a mano (o con \`vercel env pull\`).\n`
  );
  process.exit(2);
}
if (name === 'package-lock.json') {
  process.stderr.write('Modifica bloccata: package-lock.json si aggiorna solo con npm install/update.\n');
  process.exit(2);
}
