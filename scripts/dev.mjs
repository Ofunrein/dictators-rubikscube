import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';
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

  if (!existsSync(resolve(repoRoot, 'backend/api', 'node_modules'))) {
    missing.push('npm --prefix backend/api install');
  }

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

function spawnNpmProcess(cwd, args, useShellFallback = false) {
  return spawn(
    useShellFallback ? 'npm' : npmCommand,
    useShellFallback ? [args.join(' ')] : args,
    {
      cwd,
      env: process.env,
      stdio: 'inherit',
      shell: useShellFallback,
    },
  );
}

function killProcessTree(child) {
  if (!child || child.killed) {
    return;
  }

  if (isWindows && child.pid) {
    const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
    });

    killer.on('error', () => {
      child.kill();
    });

    return;
  }

  child.kill('SIGTERM');
}

const frontendDir = resolveFrontendDir();

if (!frontendDir) {
  // eslint-disable-next-line no-console
  console.error(
    'Could not find frontend app folder. Expected one of: dictators-website/, dicators-website/.',
  );
  process.exit(1);
}

assertDependencies(frontendDir);

const services = [
  { name: 'API', cwd: resolve(repoRoot, 'backend/api'), args: ['run', 'serve'] },
  { name: 'Frontend', cwd: resolve(repoRoot, frontendDir), args: ['run', 'dev'] },
];

const children = [];
let shuttingDown = false;

function registerChild(child) {
  children.push(child);

  child.on('exit', (code) => {
    if (shuttingDown) {
      return;
    }

    shutdown();
    process.exit(typeof code === 'number' ? code : 1);
  });
}

function startService({ name, cwd, args }) {
  let attemptedShellFallback = false;
  let child = spawnNpmProcess(cwd, args);
  registerChild(child);

  const attachErrorHandler = (currentChild) => {
    currentChild.on('error', (error) => {
      if (isWindows && !attemptedShellFallback) {
        attemptedShellFallback = true;
        // eslint-disable-next-line no-console
        console.warn(
          `${name} failed with direct npm launch (${error.message}); retrying with Windows shell fallback...`,
        );
        child = spawnNpmProcess(cwd, args, true);
        registerChild(child);
        attachErrorHandler(child);
        return;
      }

      // eslint-disable-next-line no-console
      console.error(`${name} failed to start: ${error.message}`);
    });
  };

  attachErrorHandler(child);
}

function shutdown() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const child of children) {
    killProcessTree(child);
  }
}

// eslint-disable-next-line no-console
console.log(`Starting API on :4011 and ${frontendDir} dev server on :5173...`);
services.forEach(startService);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    shutdown();
    process.exit(0);
  });
}
