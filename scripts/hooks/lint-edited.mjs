// Hook PostToolUse (Edit|Write) di Claude Code: lancia ESLint sul file appena modificato.
// Se ci sono errori esce con codice 2: Claude Code rimanda l'output a Claude, che li corregge subito
// (utile soprattutto nelle iterazioni Ralph in AFK). I warning non bloccano.
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
if (!file || !/\.(ts|tsx|mjs|js)$/.test(file)) process.exit(0);

const root = process.cwd();
const rel = path.relative(root, path.resolve(file));
if (rel.startsWith('..') || /(^|[\/])(node_modules|\.next)[\/]/.test(rel)) process.exit(0);

const eslint = path.join(root, 'node_modules', 'eslint', 'bin', 'eslint.js');
try {
  execFileSync(process.execPath, [eslint, '--quiet', rel], { cwd: root, encoding: 'utf8', stdio: 'pipe' });
} catch (err) {
  process.stderr.write(`ESLint ha trovato errori in ${rel}:\n${err.stdout ?? ''}${err.stderr ?? ''}`);
  process.exit(2);
}
