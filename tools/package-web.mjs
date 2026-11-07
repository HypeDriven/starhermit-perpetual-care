import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fallback = join(homedir(), 'sh/runtime/1.38.0/starhermit-1.38.0-linux-x86_64/starhermit');
const exe = process.env.STARHERMIT || (existsSync(fallback) ? fallback : null);
if (!exe) throw new Error('Set STARHERMIT to the StarHermit 1.38.0 runtime');
execFileSync(exe, process.argv.includes('--check') ? ['check', '.'] : ['package', '--web', '.'], {
  cwd: root, stdio: 'inherit',
});
