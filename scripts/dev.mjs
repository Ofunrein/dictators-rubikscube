import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const websiteCandidates = ['dictators-website', 'dicators-website'];

function resolveWebsiteDir() {
    for (const dir of websiteCandidates) {
        if (
            existsSync(resolve(repoRoot, dir, 'package.json')) &&
            existsSync(resolve(repoRoot, dir, 'node_modules'))
        ) {
            return dir;
        }
    }
    for (const dir of websiteCandidates) {
        if (existsSync(resolve(repoRoot, dir, 'package.json'))) {
            return dir;
        }
    }
    return null;
}

function assertDependencies(dir) {
    if (!existsSync(resolve(repoRoot, dir, 'node_modules'))) {
        console.error(`Missing dependencies. Run: npm --prefix ${dir} install`);
        console.error('Or run: npm run setup');
        process.exit(1);
    }
}

function assertCppBinary() {
    const binary = resolve(repoRoot, 'backend', 'build', 'cube_server');
    const binaryWin = resolve(repoRoot, 'backend', 'build', 'Debug', 'cube_server.exe');
    
    if (process.platform === 'win32') {
        if (!existsSync(binaryWin)) {
            console.error('C++ server binary not found. Build it first:');
            console.error('  cd backend && mkdir build && cd build && cmake .. && cmake --build .');
            process.exit(1);
        }
        return binaryWin;
    }

    if (!existsSync(binary)) {
        console.error('C++ server binary not found. Build it first:');
        console.error('  cd backend && mkdir -p build && cd build && cmake .. && cmake --build .');
        process.exit(1);
    }
    return binary;
}

const websiteDir = resolveWebsiteDir();

if (!websiteDir) {
    console.error('Could not find website folder. Expected one of: dictators-website/, dicators-website/.');
    process.exit(1);
}

assertDependencies(websiteDir);
assertDependencies('frontend');

const cppBinary = assertCppBinary();

function startNpmService({ name, cwd, args }) {
    const child = spawn(npmCommand, args, {
        cwd,
        env: process.env,
        stdio: 'inherit',
        shell: process.platform === 'win32'
    });
    child.on('error', (error) => {
        console.error(`${name} failed to start: ${error.message}`);
    });
    return child;
}

function startBinaryService(name, binaryPath) {
    const child = spawn(binaryPath, [], {
        env: process.env,
        stdio: 'inherit',
        shell: false
    });
    child.on('error', (error) => {
        console.error(`${name} failed to start: ${error.message}`);
    });
    return child;
}

console.log('Starting all services...');
console.log('  API        -> http://localhost:4011');
console.log('  C++ Server -> http://localhost:4012');
console.log('  Website    -> http://localhost:5173');
console.log('  Cube App   -> http://localhost:5174');

const children = [
    startNpmService({ name: 'API',     cwd: resolve(repoRoot, 'backend/api'), args: ['run', 'serve'] }),
    startBinaryService('CppServer', cppBinary),
    startNpmService({ name: 'Website', cwd: resolve(repoRoot, websiteDir),    args: ['run', 'dev'] }),
    startNpmService({ name: 'CubeApp', cwd: resolve(repoRoot, 'frontend'),    args: ['run', 'dev', '--', '--port', '5174'] }),
];

let shuttingDown = false;

function shutdown(signal = 'SIGTERM') {
    if (shuttingDown) return;
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
        if (shuttingDown) return;
        shutdown('SIGTERM');
        process.exit(typeof code === 'number' ? code : 1);
    });
}