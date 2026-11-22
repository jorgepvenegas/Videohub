// Builds VideoHub's ready-made sound effects (data/sfx-lib/*.wav) with an optional 3D studio engine's synth — made on this computer,
// nothing downloaded. Run by server/soundedit.ts in a child process:  node sfxlib.ts <synth.js> <out dir>
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [synthFile, outDir] = process.argv.slice(2);
// the external engine's synth module is not part of this repo, so its drawing functions are described here
type Draw = (...args: number[]) => void;
interface Synth {
  whoosh: Draw;
  pop: Draw;
  sparkle: Draw;
  boom: Draw;
  riser: Draw;
  powerUp: Draw;
  burst: Draw;
  snap: Draw;
  thud: Draw;
  pluff: Draw;
  kick: Draw;
  crash: Draw;
  snareRoll: Draw;
  steps: Draw;
  creak: Draw;
  chirp: Draw;
  rustle: Draw;
  glock: Draw;
  mixdown: (file: string, options: Record<string, number>) => void;
}
const { createSynth } = (await import(pathToFileURL(synthFile).href)) as { createSynth: (options: { duration: number }) => Synth };
fs.mkdirSync(outDir, { recursive: true });

// name (shown in the list, also the file name) → [seconds, (S) => draw it]
const FX: Record<string, [number, (S: Synth) => void]> = {
  'whoosh fast': [0.9, (S: Synth) => S.whoosh(0.05, 0.45, 0.6)],
  'whoosh long': [1.6, (S: Synth) => S.whoosh(0.05, 1.1, 0.55, -0.8, 0.8, 200, 1800)],
  pop: [0.5, (S: Synth) => S.pop(0.03, 900, 0.5)],
  'pop high': [0.5, (S: Synth) => S.pop(0.03, 1500, 0.5)],
  sparkle: [1.2, (S: Synth) => S.sparkle(0.03, 0.5)],
  boom: [2.6, (S: Synth) => S.boom(0.05, 1)],
  'tension riser': [3.2, (S: Synth) => S.riser(0.05, 2.8, 0.6)],
  'power up': [1.6, (S: Synth) => S.powerUp(0.05, 1.2, 0.5)],
  'burst short': [1.0, (S: Synth) => S.burst(0.03, 0.8)],
  snap: [0.6, (S: Synth) => S.snap(0.03, 0.8, 0)],
  thud: [0.8, (S: Synth) => S.thud(0.03, 0.9, 0)],
  'soft drop': [1.0, (S: Synth) => S.pluff(0.03, 1)],
  kick: [0.7, (S: Synth) => S.kick(0.03, 1)],
  'crash cymbal': [2.6, (S: Synth) => S.crash(0.03, 0.8)],
  'drum roll': [2.2, (S: Synth) => S.snareRoll(0.05, 1.8, 0.7)],
  footsteps: [1.2, (S: Synth) => S.steps(0.05, 6, 0.16, 0.5)],
  creak: [1.4, (S: Synth) => S.creak(0.05, 1.0, 0.6, 0)],
  'bird chirp': [0.8, (S: Synth) => S.chirp(0.05, 0.6, 0)],
  rustle: [1.4, (S: Synth) => S.rustle(0.05, 1.1, 0.6, 0)],
  glockenspiel: [2.0, (S: Synth) => S.glock(0.05, 76, 0.7)]
};
let n = 0;
for (const [name, [dur, fn]] of Object.entries(FX)) {
  const file = path.join(outDir, name + '.wav');
  if (fs.existsSync(file)) continue;
  try {
    const S = createSynth({ duration: dur });
    fn(S);
    S.mixdown(file, { fadeIn: 0.002, fadeOut: Math.min(0.2, dur * 0.15), musicGain: 1, sfxGain: 1 });
    n++;
  } catch (e) {
    console.error(name + ': ' + (e as Error).message);
  }
}
console.log(`ok ${n}`);
