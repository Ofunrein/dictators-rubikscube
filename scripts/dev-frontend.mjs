import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const frontendCandidates = ['dictators-website', 'dicators-website'];

const frontendDir =
  frontendCandidates.find(
    (dir) =>
      existsSync(resolve(repoRoot, dir, 'package.json')) &&
      existsSync(resolve(repoRoot, dir, 'node_modules'))
  ) ??
  frontendCandidates.find((dir) => existsSync(resolve(repoRoot, dir, 'package.json')));

if (!frontendDir) {
  // eslint-disable-next-line no-console
  console.error(
    'Could not find frontend app folder. Expected one of: dictators-website/, dicators-website/.'
  );
  process.exit(1);
}

const frontendNodeModules = resolve(repoRoot, frontendDir, 'node_modules');
if (!existsSync(frontendNodeModules)) {
  // eslint-disable-next-line no-console
  console.error(`Missing dependencies. Run: npm --prefix ${frontendDir} install`);
  // eslint-disable-next-line no-console
  console.error('Or run: npm run setup');
  process.exit(1);
}

function spawnFrontend(useShellFallback = false) {
  return spawn(
    useShellFallback ? 'npm' : npmCommand,
    useShellFallback ? ['run dev'] : ['run', 'dev'],
    {
      cwd: resolve(repoRoot, frontendDir),
      env: process.env,
      stdio: 'inherit',
      shell: useShellFallback
    }
  );
}

let attemptedShellFallback = false;
let child = spawnFrontend();

function attachHandlers(currentChild) {
  currentChild.on('error', (error) => {
    if (isWindows && !attemptedShellFallback) {
      attemptedShellFallback = true;
      // eslint-disable-next-line no-console
      console.warn(
        `Frontend failed with direct npm launch (${error.message}); retrying with Windows shell fallback...`
      );
      child = spawnFrontend(true);
      attachHandlers(child);
      return;
    }

    // eslint-disable-next-line no-console
    console.error(`Frontend failed to start: ${error.message}`);
    process.exit(1);
  });

  currentChild.on('exit', (code) => {
    process.exit(typeof code === 'number' ? code : 1);
  });
}

attachHandlers(child);
