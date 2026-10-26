// Hook PostToolUse (Edit|Write) di Claude Code: lancia i test Vitest collegati al file appena modificato
// (`vitest related`, segue il grafo degli import). Riguarda solo il codice server/condiviso
// (lib/, app/api/, proxy.ts) e i test stessi.
// Se un test fallisce esce con codice 2: Claude Code rimanda l'output a Claude, che lo corregge subito.
import { execFileSync } from 'node:child_process';
import path from 'node:path';

let input = '';
for await (const chunk of process.stdin) input += chunk;

let file;
try {
  const payload = JSON.parse(input);
  file = payload.tool_input?.file_path ?? payload.tool_response?.filePath;
} catch {
  process.exit(0);
}
if (!file || !/\.(ts|tsx|json)$/.test(file)) process.exit(0);

const root = process.cwd();
const rel = path.relative(root, path.resolve(file)).split(path.sep).join('/');
if (!/^(lib\/|app\/api\/|tests\/|proxy\.ts$)/.test(rel)) process.exit(0);

const vitest = path.join(root, 'node_modules', 'vitest', 'vitest.mjs');
try {
  execFileSync(process.execPath, [vitest, 'related', rel, '--run', '--passWithNoTests', '--reporter=dot'], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'pipe',
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
  });
} catch (err) {
  const out = `${err.stdout ?? ''}${err.stderr ?? ''}`;
  process.stderr.write(`Test falliti dopo la modifica di ${rel}:\n${out.slice(-4000)}`);
  process.exit(2);
}
