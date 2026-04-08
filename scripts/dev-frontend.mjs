import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
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

const child = spawn(npmCommand, ['run', 'dev'], {
  cwd: resolve(repoRoot, frontendDir),
  env: process.env,
  stdio: 'inherit'
});

child.on('error', (error) => {
  // eslint-disable-next-line no-console
  console.error(`Frontend failed to start: ${error.message}`);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(typeof code === 'number' ? code : 1);
});
