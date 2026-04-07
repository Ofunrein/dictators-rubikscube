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

function runNpmInstall(cwd, label) {
  return new Promise((resolveInstall, rejectInstall) => {
    // eslint-disable-next-line no-console
    console.log(`Installing dependencies in ${label}...`);

    const child = spawn(npmCommand, ['install'], {
      cwd,
      env: process.env,
      stdio: 'inherit'
    });

    child.on('error', (error) => {
      rejectInstall(error);
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolveInstall();
        return;
      }

      rejectInstall(new Error(`npm install failed in ${label} (exit code ${code ?? 'unknown'})`));
    });
  });
}

async function main() {
  const frontendDir = resolveFrontendDir();

  if (!frontendDir) {
    // eslint-disable-next-line no-console
    console.error(
      'Could not find frontend app folder. Expected one of: dictators-website/, dicators-website/.'
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
