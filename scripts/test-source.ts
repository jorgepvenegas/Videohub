import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { fileURLToPath } from 'node:url';

// Source text for tests that evaluate or pattern-match code. `.ts` files come back with types replaced by whitespace, so line and column positions match the file.
export function readSource(url: URL | string): string {
  const path = typeof url === 'string' && !url.startsWith('file:') ? url : fileURLToPath(url);
  const text = readFileSync(path, 'utf8');
  return path.endsWith('.ts') ? stripTypeScriptTypes(text, { mode: 'strip' }) : text;
}
