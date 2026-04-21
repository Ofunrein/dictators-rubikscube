/*
 * Dev Runner Script ΓÇö starts both servers with one command.
 *
 * When you run "npm run dev" from the repo root, this script launches:
 *   1. The frontend Vite dev server on port 5400 (serves the React app)
 *   2. The backend API server on port 5200 (handles cube solving requests)
 *
 * Both run at the same time so you can develop the full app locally.
 * When you press Ctrl+C, it gracefully shuts down both processes.
 *
 * The first ~165 lines below are a commented-out older version of this
 * script that's kept around for reference. The active code starts after.
 */
// import { spawn } from 'node:child_process';
// import { existsSync } from 'node:fs';
// import { dirname, resolve } from 'node:path';
// import process from 'node:process';
// import { fileURLToPath } from 'node:url';
//
// const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// const isWindows = process.platform === 'win32';
// const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
// const frontendCandidates = ['frontend'];
//
// function resolveFrontendDir() {
//   for (const dir of frontendCandidates) {
//     if (
//       existsSync(resolve(repoRoot, dir, 'package.json')) &&
//       existsSync(resolve(repoRoot, dir, 'node_modules'))
//     ) {
//       return dir;
//     }
//   }
//
//   for (const dir of frontendCandidates) {
//     if (existsSync(resolve(repoRoot, dir, 'package.json'))) {
//       return dir;
//     }
//   }
//
//   return null;
// }
//
// function assertDependencies(frontendDir) {
//   const missing = [];
//
//   if (!existsSync(resolve(repoRoot, frontendDir, 'node_modules'))) {
//     missing.push(`npm --prefix ${frontendDir} install`);
//   }
//
//   if (missing.length > 0) {
//     // eslint-disable-next-line no-console
//     console.error('Missing dependencies for dev startup. Run:');
//     for (const command of missing) {
//       // eslint-disable-next-line no-console
//       console.error(`  ${command}`);
//     }
//     // eslint-disable-next-line no-console
//     console.error('Or run: npm run setup');
//     process.exit(1);
//   }
// }
//
// const frontendDir = resolveFrontendDir();
//
// if (!frontendDir) {
//   // eslint-disable-next-line no-console
//   console.error(
//     'Could not find frontend app folder. Expected: frontend/.'
//   );
//   process.exit(1);
// }
//
// assertDependencies(frontendDir);
//
// const services = [
//   { name: 'API', cwd: resolve(repoRoot, 'backend/api'), args: ['run', 'serve'] },
//   { name: 'Frontend', cwd: resolve(repoRoot, frontendDir), args: ['run', 'dev'] }
// ];
//
// const children = [];
// let shuttingDown = false;
//
// function spawnNpmProcess(cwd, args, useShellFallback = false) {
//   return spawn(
//     useShellFallback ? 'npm' : npmCommand,
//     useShellFallback ? [args.join(' ')] : args,
//     {
//       cwd,
//       env: process.env,
//       stdio: 'inherit',
//       shell: useShellFallback
//     }
//   );
// }
//
// function registerChild(child) {
//   children.push(child);
//
//   child.on('exit', (code) => {
//     if (shuttingDown) {
//       return;
//     }
//
//     shutdown('SIGTERM');
//     process.exit(typeof code === 'number' ? code : 1);
//   });
// }
//
// function startService({ name, cwd, args }) {
//   const child = spawnNpmProcess(cwd, args);
//   let attemptedShellFallback = false;
//   registerChild(child);
//
//   const attachErrorHandler = (currentChild) => {
//     currentChild.on('error', (error) => {
//       if (isWindows && !attemptedShellFallback) {
//         attemptedShellFallback = true;
//         // eslint-disable-next-line no-console
//         console.warn(
//           `${name} failed with direct npm launch (${error.message}); retrying with Windows shell fallback...`
//         );
//         const fallbackChild = spawnNpmProcess(cwd, args, true);
//         registerChild(fallbackChild);
//         attachErrorHandler(fallbackChild);
//         return;
//       }
//
//       // eslint-disable-next-line no-console
//       console.error(`${name} failed to start: ${error.message}`);
//     });
//   };
//
//   attachErrorHandler(child);
// }
//
// function killProcessTree(child) {
//   if (!child || child.killed) {
//     return;
//   }
//
//   if (isWindows && child.pid) {
//     const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
//       stdio: 'ignore'
//     });
//
//     killer.on('error', () => {
//       // Ignore taskkill failures and fall back to default kill.
//       child.kill();
//     });
//     return;
//   }
//
//   child.kill('SIGTERM');
// }
//
// // eslint-disable-next-line no-console
// console.log(`Starting API on :5200 and ${frontendDir} dev server on :5400...`);
// services.forEach(startService);
//
// function shutdown(signal = 'SIGTERM') {
//   if (shuttingDown) {
//     return;
//   }
//
//   shuttingDown = true;
//   for (const child of children) {
//     killProcessTree(child);
//   }
// }
//
// for (const signal of ['SIGINT', 'SIGTERM']) {
//   process.on(signal, () => {
//     shutdown(signal);
//     process.exit(0);
//   });
// }
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const frontendCandidates = ['frontend'];

function resolveFrontendDir() {
    for (const dir of frontendCandidates) {
        if (existsSync(resolve(repoRoot, dir, 'package.json'))) {
            return dir;
        }
    }
    return null;
}

function npmInstall(cwd, label, extraArgs = []) {
    return new Promise((res, rej) => {
        // eslint-disable-next-line no-console
        console.log(`Installing dependencies in ${label}...`);
        const child = spawn('npm', ['install', ...extraArgs], {
            cwd,
            env: process.env,
            stdio: 'inherit',
            shell: true
        });
        child.on('error', rej);
        child.on('exit', (code) => {
            if (code === 0) res();
            else rej(new Error(`npm install failed in ${label} (exit ${code})`));
        });
    });
}

async function ensureDependencies(frontendDir) {
    const dirs = [
        { path: resolve(repoRoot, 'backend/api'), label: 'backend/api', args: [] },
        // --legacy-peer-deps needed because @vitejs/plugin-react peer dep lags behind vite 8
        { path: resolve(repoRoot, frontendDir), label: frontendDir, args: ['--legacy-peer-deps'] }
    ];
    for (const { path, label, args } of dirs) {
        // Check for the vite binary specifically, not just node_modules, so a
        // partial install (node_modules exists but vite missing) still triggers reinstall.
        const binCheck = label === 'frontend'
            ? resolve(path, 'node_modules', '.bin', 'vite')
            : resolve(path, 'node_modules');
        if (!existsSync(binCheck)) {
            await npmInstall(path, label, args);
        }
    }
}

function startService(name, cwd, args) {
    const child = spawn('npm', args, {
        cwd,
        env: process.env,
        stdio: 'inherit',
        shell: true
    });
    child.on('error', (error) => {
        // eslint-disable-next-line no-console
        console.error(`${name} failed to start: ${error.message}`);
    });
    return child;
}

function pythonFound() {
    const isWin = process.platform === 'win32';
    const candidates = isWin ? ['py', 'python', 'python3'] : ['python3', 'python'];
    for (const cmd of candidates) {
        const result = spawnSync(cmd, ['--version'], { stdio: 'pipe', timeout: 5000, shell: isWin });
        if (result.status === 0) return cmd;
    }
    return null;
}

function tryInstallPython() {
    const isWin = process.platform === 'win32';
    const isMac = process.platform === 'darwin';

    if (isWin) {
        // eslint-disable-next-line no-console
        console.log('Python not found. Attempting auto-install via winget...');
        const result = spawnSync(
            'winget',
            ['install', '-e', '--id', 'Python.Python.3', '--silent',
             '--accept-package-agreements', '--accept-source-agreements'],
            { stdio: 'inherit', shell: true, timeout: 120000 }
        );
        if (result.status === 0) {
            // eslint-disable-next-line no-console
            console.log('\nPython installed. Open a new terminal and run npm run dev again.');
            // eslint-disable-next-line no-console
            console.log('Also disable: Settings ΓåÆ Apps ΓåÆ Advanced app settings ΓåÆ App execution aliases ΓåÆ python.exe / python3.exe');
            process.exit(0);
        }
        // eslint-disable-next-line no-console
        console.warn('winget install failed ΓÇö see manual instructions below.');
        return false;
    }

    if (isMac) {
        // eslint-disable-next-line no-console
        console.log('Python not found. Attempting auto-install via Homebrew (brew)...');
        const result = spawnSync('brew', ['install', 'python3'], { stdio: 'inherit', timeout: 120000 });
        if (result.status === 0) {
            // eslint-disable-next-line no-console
            console.log('\nPython installed. Open a new terminal and run npm run dev again.');
            process.exit(0);
        }
        // eslint-disable-next-line no-console
        console.warn('brew install failed (Homebrew may not be installed) ΓÇö see manual instructions below.');
        return false;
    }

    return false;
}

async function ensurePython() {
    if (pythonFound()) return;

    const isWin = process.platform === 'win32';
    const isMac = process.platform === 'darwin';

    tryInstallPython();

    // eslint-disable-next-line no-console
    console.warn([
        '',
        'WARNING: Python not found ΓÇö 2x2 and 4x4 solving will not work until Python is installed.',
        isWin
            ? 'Install: https://python.org  (check "Add Python to PATH")  then disable the Store alias:\n         Settings ΓåÆ Apps ΓåÆ Advanced app settings ΓåÆ App execution aliases ΓåÆ off for python.exe + python3.exe'
            : isMac
                ? 'Install via Homebrew:  brew install python3\n         Or download from: https://python.org'
                : 'Install Python 3 via your package manager, e.g.:  sudo apt install python3',
        'Then restart this terminal and run: npm run dev',
        '',
    ].join('\n'));
}

async function main() {
    const frontendDir = resolveFrontendDir();
    if (!frontendDir) {
        // eslint-disable-next-line no-console
        console.error('Could not find frontend app folder. Expected: frontend/.');
        process.exit(1);
    }

    await ensurePython();
    await ensureDependencies(frontendDir);

    // eslint-disable-next-line no-console
    console.log(`Starting active frontend "${frontendDir}" on :5400 and local API on :5200...`);
    // eslint-disable-next-line no-console
    console.log('Local dev routing: browser -> http://localhost:5400, API proxy -> /api/v1/*, direct API -> http://localhost:5200/v1/*');

    const services = [
        { name: 'API', cwd: resolve(repoRoot, 'backend/api'), args: ['run', 'serve'] },
        { name: 'Frontend', cwd: resolve(repoRoot, frontendDir), args: ['run', 'dev'] }
    ];

    const children = services.map(({ name, cwd, args }) => startService(name, cwd, args));
    let shuttingDown = false;

    function shutdown(signal = 'SIGTERM') {
        if (shuttingDown) return;
        shuttingDown = true;
        for (const child of children) {
            if (!child.killed) child.kill(signal);
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
            if (shuttingDown) return;
            shutdown('SIGTERM');
            process.exit(typeof code === 'number' ? code : 1);
        });
    }
}

main().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
