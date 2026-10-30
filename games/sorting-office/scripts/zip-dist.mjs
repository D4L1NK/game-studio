import { execFileSync } from 'node:child_process';
import { existsSync, rmSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const index = resolve(dist, 'index.html');
if (!existsSync(index)) {
  console.error('dist/index.html is missing. Run npm run build first.');
  process.exit(1);
}

const zipPath = resolve(root, 'sorting-office-crazygames.zip');
rmSync(zipPath, { force: true });
execFileSync('zip', ['-r', '-9', '-q', zipPath, '.'], { cwd: dist, stdio: 'inherit' });
const bytes = statSync(zipPath).size;
const mb = bytes / (1024 * 1024);
console.log(`Wrote ${zipPath} (${mb.toFixed(2)} MB)`);
if (bytes > 5 * 1024 * 1024) {
  console.error('Zip is over 5 MB.');
  process.exit(1);
}
