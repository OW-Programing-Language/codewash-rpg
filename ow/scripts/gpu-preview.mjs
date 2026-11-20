/**
 * Reproducible developer launcher for the opt-in OW Engine/Graphics preview.
 * This is NOT a portable game distribution; it builds an OS-native LWJGL
 * provider and uses the caller's local Java/Maven toolchain.
 */
import {spawnSync} from 'node:child_process';
import {readFileSync, existsSync, readdirSync} from 'node:fs';
import {dirname, join, resolve, delimiter} from 'node:path';
import {fileURLToPath} from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const owRoot = join(repoRoot, 'ow');

export function parseArgs(argv) {
  let mode = 'run';
  let modeSet = false;
  let noBuild = false;
  let compilerDir = resolve(repoRoot, '../ow-lang');
  let graphicsDir = resolve(repoRoot, '../OW-Graphics');
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--help' || flag === '-h') return {help: true};
    if (flag === '--run' || flag === '--check' || flag === '--prepare') {
      if (modeSet) throw new Error('Choose one mode: --run, --check, or --prepare');
      mode = flag.slice(2);
      modeSet = true;
      continue;
    }
    if (flag === '--no-build') { noBuild = true; continue; }
    if (flag === '--compiler-dir' || flag === '--graphics-dir') {
      const value = argv[++i];
      if (!value || value.startsWith('--')) throw new Error(flag + ' requires a directory');
      if (flag === '--compiler-dir') compilerDir = resolve(value);
      else graphicsDir = resolve(value);
      continue;
    }
    throw new Error('Unknown argument: ' + flag);
  }
  return {mode, noBuild, compilerDir, graphicsDir};
}

export function pinnedGraphicsSha(manifest) {
  const match = manifest.match(/^\s*- name:\s*graphics\s*\n\s*repository:[^\n]*\n\s*path:[^\n]*\n\s*version:\s*([0-9a-f]{40})\s*$/m);
  if (!match) throw new Error('Cannot read SHA-pinned graphics dependency from ow/dependencies.yml');
  return match[1];
}

export function nativeClasspath(compilerJar, graphicsDir, platform = process.platform) {
  const sep = platform === 'win32' ? ';' : ':';
  return [
    compilerJar,
    join(graphicsDir, 'native-bridge', 'target', 'classes'),
    join(graphicsDir, 'native-bridge', 'target', 'lib', '*'),
  ].join(sep);
}

export function assertPinnedRevision(actual, expected) {
  if (actual !== expected) {
    throw new Error('OW Graphics checkout is at ' + actual + ', but ow/dependencies.yml pins ' +
      expected + '. Run git -C <graphics-dir> checkout ' + expected + ' or use a separate pinned clone.');
  }
}

function command(exe, args, options = {}) {
  process.stdout.write('+ ' + [exe, ...args].join(' ') + '\n');
  // Windows Maven is a .cmd script. No arguments are evaluated as source code
  // on Unix; on Windows validate caller-provided paths before using shell.
  const isBatch = process.platform === 'win32' && exe.toLowerCase().endsWith('.cmd');
  if (isBatch && args.some(arg => /[&|<>^%"\r\n]/.test(arg))) {
    throw new Error('Refusing unsafe characters in Windows Maven arguments');
  }
  const result = spawnSync(exe, args, {
    cwd: options.cwd || repoRoot,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    shell: isBatch,
  });
  if (result.error) throw new Error(exe + ': ' + result.error.message);
  if (result.status !== 0) {
    const details = options.capture ? '\n' + (result.stderr || result.stdout || '').trim() : '';
    throw new Error(exe + ' failed with exit status ' + result.status + details);
  }
  return options.capture ? (result.stdout || '').trim() : '';
}

function requirePath(location, why) {
  if (!existsSync(location)) {
    throw new Error('Missing ' + why + ': ' + location + '. See ow/docs/GPU-BATTLE.md.');
  }
}

async function main(argv) {
  const opts = parseArgs(argv);
  if (opts.help) {
    process.stdout.write('Usage: node ow/scripts/gpu-preview.mjs [--prepare|--check|--run] ' +
      '[--no-build] [--compiler-dir PATH] [--graphics-dir PATH]\n' +
      'Default: --run; sibling checkouts ../ow-lang and ../OW-Graphics.\n');
    return;
  }

  const manifest = readFileSync(join(owRoot, 'dependencies.yml'), 'utf8');
  const pin = pinnedGraphicsSha(manifest);
  requirePath(join(opts.compilerDir, 'pom.xml'), 'ow-lang source pom.xml');
  requirePath(join(opts.graphicsDir, 'native-bridge', 'pom.xml'), 'OW Graphics native bridge');
  const actual = command('git', ['-C', opts.graphicsDir, 'rev-parse', 'HEAD'], {capture: true});
  assertPinnedRevision(actual, pin);

  const compilerJar = join(opts.compilerDir, 'target', 'OwIDE.jar');
  const bridge = join(opts.graphicsDir, 'native-bridge');
  const maven = process.platform === 'win32' ? 'mvn.cmd' : 'mvn';
  if (!opts.noBuild) {
    command(maven, ['-B', '-q', '-f', join(opts.compilerDir, 'pom.xml'), '-DskipTests', 'install']);
    command(maven, ['-B', '-q', '-f', join(bridge, 'pom.xml'),
      'package', 'dependency:copy-dependencies', '-DoutputDirectory=target/lib']);
  }
  requirePath(compilerJar, 'compiled OW runtime jar');
  requirePath(join(bridge, 'target', 'classes', 'META-INF', 'services', 'dev.oreo.RuntimeExtension'),
    'compiled OW Graphics SPI provider');
  const libs = join(bridge, 'target', 'lib');
  requirePath(libs, 'LWJGL dependency folder');
  if (!readdirSync(libs).some(name => name.endsWith('.jar'))) {
    throw new Error('OW Graphics dependency directory contains no jars: ' + libs);
  }

  const lock = join(owRoot, 'dependencies.lock.yml');
  const before = existsSync(lock) ? readFileSync(lock, 'utf8') : null;
  command('java', ['-jar', compilerJar, 'deps', 'install'], {cwd: owRoot});
  const after = readFileSync(lock, 'utf8');
  if (before === null || before !== after) {
    throw new Error('OW dependency lockfile changed. Review/pin and commit ow/dependencies.lock.yml.');
  }
  if (opts.mode === 'prepare') {
    process.stdout.write('Native OW Graphics dependencies built and locked. Run --run to play.\n');
    return;
  }
  for (const entry of ['src/engine/battle_gpu.ow', 'src/engine/battle_smoke.ow']) {
    command('java', ['-jar', compilerJar, 'check', entry], {cwd: owRoot});
  }
  if (opts.mode === 'check') {
    process.stdout.write('OW GPU preview source and pinned provider verified.\n');
    return;
  }
  const cp = nativeClasspath(compilerJar, opts.graphicsDir);
  command('java', ['-cp', cp, 'dev.oreo.Main', 'run', 'src/engine/battle_gpu.ow'], {cwd: owRoot});
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(err => {
    process.stderr.write('GPU preview: ' + err.message + '\n');
    process.exitCode = 1;
  });
}
