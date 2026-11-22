// Where the global outputs folder is (config.outputsDir; the default is Documents\VideoHub\outputs, see config.ts).
// Its own tiny module so the scan can skip it without importing the linker.
import path from 'node:path';
import { config, baseDir } from './config.ts';

export function outputsDir() {
  return config().outputsDir || path.join(baseDir(), 'outputs');
}
