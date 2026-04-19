/*
 * Setup Script — installs all project dependencies.
 *
 * Run this once after cloning the repo:
 *   npm run setup
 *
 * It runs "npm install" in both the backend/api and frontend
 * directories so all the packages each part needs get downloaded.
 * After setup is done, you can start developing with "npm run dev".
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const frontendCandidates = ['frontend'];

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

function runNpmInstall(cwd, label) {
  return new Promise((resolveInstall, rejectInstall) => {
    // eslint-disable-next-line no-console
    console.log(`Installing dependencies in ${label}...`);

    const spawnInstall = (useShellFallback = false) =>
      spawn(
        useShellFallback ? 'npm' : npmCommand,
        useShellFallback ? ['install'] : ['install'],
        {
          cwd,
          env: process.env,
          stdio: 'inherit',
          shell: useShellFallback
        }
      );

    let attemptedShellFallback = false;
    let child = spawnInstall();

    const attachHandlers = (currentChild) => {
      currentChild.on('error', (error) => {
        if (isWindows && !attemptedShellFallback) {
          attemptedShellFallback = true;
          // eslint-disable-next-line no-console
          console.warn(
            `${label} install failed with direct npm launch (${error.message}); retrying with Windows shell fallback...`
          );
          child = spawnInstall(true);
          attachHandlers(child);
          return;
        }

        rejectInstall(error);
      });

      currentChild.on('exit', (code) => {
        if (code === 0) {
          resolveInstall();
          return;
        }

        rejectInstall(new Error(`npm install failed in ${label} (exit code ${code ?? 'unknown'})`));
      });
    };

    attachHandlers(child);
  });
}

async function main() {
  const frontendDir = resolveFrontendDir();

  if (!frontendDir) {
    // eslint-disable-next-line no-console
    console.error(
      'Could not find frontend app folder. Expected: frontend/.'
    );
    process.exit(1);
  }

  await runNpmInstall(resolve(repoRoot, 'backend/api'), 'backend/api');
  await runNpmInstall(resolve(repoRoot, frontendDir), frontendDir);

  // eslint-disable-next-line no-console
  console.log('Setup complete. Run: npm run dev');
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
