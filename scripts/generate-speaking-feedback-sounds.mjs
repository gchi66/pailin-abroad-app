import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sampleRate = 44_100;
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputDirectory = resolve(scriptDirectory, '../assets/audio');

const clamp = (value) => Math.max(-1, Math.min(1, value));

const makeWav = (durationSeconds, sampleAt) => {
  const sampleCount = Math.ceil(durationSeconds * sampleRate);
  const buffer = Buffer.alloc(44 + sampleCount * 2);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + sampleCount * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(sampleCount * 2, 40);

  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate;
    const fadeIn = Math.min(1, time / 0.008);
    const fadeOut = Math.min(1, (durationSeconds - time) / 0.025);
    const sample = clamp(sampleAt(time) * fadeIn * fadeOut);
    buffer.writeInt16LE(Math.round(sample * 32_767), 44 + index * 2);
  }

  return buffer;
};

const bell = (time, start, frequency, amplitude, decay) => {
  if (time < start) return 0;
  const elapsed = time - start;
  const envelope = Math.exp(-decay * elapsed);
  return amplitude * envelope * (
    Math.sin(2 * Math.PI * frequency * elapsed)
    + 0.28 * Math.sin(2 * Math.PI * frequency * 2 * elapsed)
  );
};

const correct = makeWav(0.5, (time) =>
  bell(time, 0, 659.25, 0.42, 8)
  + bell(time, 0.12, 987.77, 0.5, 7)
);

const incorrect = makeWav(0.48, (time) => {
  const split = 0.2;
  const frequency = time < split ? 293.66 : 220;
  const localTime = time < split ? time : time - split;
  const envelope = Math.exp(-5 * localTime);
  return 0.36 * envelope * (
    Math.sin(2 * Math.PI * frequency * localTime)
    + 0.15 * Math.sin(2 * Math.PI * frequency * 2 * localTime)
  );
});

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(resolve(outputDirectory, 'speaking-correct.wav'), correct),
  writeFile(resolve(outputDirectory, 'speaking-incorrect.wav'), incorrect),
]);
