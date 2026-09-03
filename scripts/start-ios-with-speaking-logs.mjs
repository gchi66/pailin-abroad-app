import { spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CAPTURE_MARKER = '[SPEAKING_COACH_CAPTURE]';
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = dirname(scriptDirectory);
const logDirectory = join(projectDirectory, '.local', 'speaking-coach-logs');
const latestPath = join(logDirectory, 'latest.json');
const previousPath = join(logDirectory, 'previous.json');
const ansiPattern = /\u001b\[[0-?]*[ -/]*[@-~]/g;

mkdirSync(logDirectory, { recursive: true });

function atomicWrite(path, contents) {
  const temporaryPath = `${path}.${process.pid}.tmp`;
  writeFileSync(temporaryPath, contents, 'utf8');
  renameSync(temporaryPath, path);
}

function saveCapture(line) {
  const cleanLine = line.replace(ansiPattern, '');
  const markerIndex = cleanLine.indexOf(CAPTURE_MARKER);
  if (markerIndex < 0) return false;

  try {
    const payload = JSON.parse(
      cleanLine.slice(markerIndex + CAPTURE_MARKER.length).trim()
    );
    if (existsSync(latestPath)) {
      atomicWrite(previousPath, readFileSync(latestPath, 'utf8'));
    }
    atomicWrite(latestPath, `${JSON.stringify(payload, null, 2)}\n`);
    process.stdout.write('[Speaking Coach] Evaluator diagnostics\n');
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(
      `[Speaking Coach] Could not save evaluator diagnostics: ${error instanceof Error ? error.message : String(error)}\n`
    );
  }
  return true;
}

function forwardLines(stream, destination) {
  let buffered = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    buffered += chunk;
    const lines = buffered.split(/\r?\n/);
    buffered = lines.pop() ?? '';
    for (const line of lines) {
      if (!saveCapture(line)) destination.write(`${line}\n`);
    }
  });
  stream.on('end', () => {
    if (buffered && !saveCapture(buffered)) destination.write(buffered);
  });
}

process.stdout.write(
  `[Speaking Coach] Rolling logs: ${latestPath} and ${previousPath}\n`
);

const expo = spawn('npx', ['expo', 'start', '--ios'], {
  cwd: projectDirectory,
  env: process.env,
  stdio: ['inherit', 'pipe', 'pipe'],
});

forwardLines(expo.stdout, process.stdout);
forwardLines(expo.stderr, process.stderr);

expo.on('error', (error) => {
  process.stderr.write(`Could not start Expo: ${error.message}\n`);
  process.exitCode = 1;
});

expo.on('close', (code, signal) => {
  if (signal) {
    process.stdout.write(`Expo stopped by ${signal}.\n`);
    return;
  }
  process.exitCode = code ?? 0;
});
