import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const frontendCandidates = ['dictators-website', 'dicators-website'];

function resolveFrontendDir() {
  for (const dir of frontendCandidates) {
    if (
      existsSync(resolve(repoRoot, dir, 'package.json')) &&
      existsSync(resolve(repoRoot, dir, 'node_modules'))
    ) {
      return dir;
    }
  }

  for (const dir of frontendCandidates) {
    if (existsSync(resolve(repoRoot, dir, 'package.json'))) {
      return dir;
    }
  }

  return null;
}

function assertDependencies(frontendDir) {
  const missing = [];

  if (!existsSync(resolve(repoRoot, frontendDir, 'node_modules'))) {
    missing.push(`npm --prefix ${frontendDir} install`);
  }

  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error('Missing dependencies for dev startup. Run:');
    for (const command of missing) {
      // eslint-disable-next-line no-console
      console.error(`  ${command}`);
    }
    // eslint-disable-next-line no-console
    console.error('Or run: npm run setup');
    process.exit(1);
  }
}

const frontendDir = resolveFrontendDir();

if (!frontendDir) {
  // eslint-disable-next-line no-console
  console.error(
    'Could not find frontend app folder. Expected one of: dictators-website/, dicators-website/.'
  );
  process.exit(1);
}

assertDependencies(frontendDir);

const services = [
  { name: 'API', cwd: resolve(repoRoot, 'backend/api'), args: ['run', 'serve'] },
  { name: 'Frontend', cwd: resolve(repoRoot, frontendDir), args: ['run', 'dev'] }
];

function startService({ name, cwd, args }) {
  const child = spawn(npmCommand, args, {
    cwd,
    env: process.env,
    stdio: 'inherit'
  });

  child.on('error', (error) => {
    // eslint-disable-next-line no-console
    console.error(`${name} failed to start: ${error.message}`);
  });

  return child;
}

// eslint-disable-next-line no-console
console.log(`Starting API on :4011 and ${frontendDir} dev server on :5173...`);
const children = services.map(startService);

let shuttingDown = false;

function shutdown(signal = 'SIGTERM') {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    shutdown(signal);
    process.exit(0);
  });
}

for (const child of children) {
  child.on('exit', (code) => {
    if (shuttingDown) {
      return;
    }

    shutdown('SIGTERM');
    process.exit(typeof code === 'number' ? code : 1);
  });
}
