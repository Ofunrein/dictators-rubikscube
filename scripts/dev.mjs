// import { spawn } from 'node:child_process';
// import { existsSync } from 'node:fs';
// import { dirname, resolve } from 'node:path';
// import process from 'node:process';
// import { fileURLToPath } from 'node:url';
//
// const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// const isWindows = process.platform === 'win32';
// const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
// const frontendCandidates = ['dictators-website', 'dicators-website'];
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
//     'Could not find frontend app folder. Expected one of: dictators-website/, dicators-website/.'
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
// console.log(`Starting API on :4011 and ${frontendDir} dev server on :5173...`);
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
import { spawn, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
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
function assertDependencies(frontendDir) {
    if (!existsSync(resolve(repoRoot, frontendDir, 'node_modules'))) {
        // eslint-disable-next-line no-console
        console.log(`Installing dependencies for ${frontendDir}...`);
        execSync(`${npmCommand} install --legacy-peer-deps`, {
            cwd: resolve(repoRoot, frontendDir),
            stdio: 'inherit',
            shell: process.platform === 'win32'
        });
    }
}
const frontendDir = resolveFrontendDir();
if (!frontendDir) {
    // eslint-disable-next-line no-console
    console.error(
        `Could not find frontend app folder. Expected one of: ${frontendCandidates
            .map((dir) => `${dir}/`)
            .join(', ')}.`
    );
    process.exit(1);
}
assertDependencies(frontendDir);
const services = [
    { name: 'API', cwd: resolve(repoRoot, 'backend/api'), args: ['run', 'serve'], env: { API_PORT: '5200' } },
    { name: 'Frontend', cwd: resolve(repoRoot, frontendDir), args: ['run', 'dev'] }
];
function startService({ name, cwd, args, env = {} }) {
    const child = spawn(npmCommand, args, {
        cwd,
        env: { ...process.env, ...env },
        stdio: 'inherit',
        shell: process.platform === 'win32'
    });
    child.on('error', (error) => {
        // eslint-disable-next-line no-console
        console.error(`${name} failed to start: ${error.message}`);
    });
    return child;
}
// eslint-disable-next-line no-console
console.log(`Starting API on :5200 and ${frontendDir} dev server on :5400...`);
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
