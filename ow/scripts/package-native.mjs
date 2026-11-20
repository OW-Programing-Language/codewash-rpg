/**
 * CodeWash native OW desktop app-image packager.
 *
 * RUN AT BUILD TIME with a full JDK, Node, Maven-built OW/OW Graphics jars
 * and resolved pinned @alias dependencies. The installed game requires none
 * of Node, Git, Maven, the JDK, or internet: the Java launcher and runtime
 * resources ship within a jpackage platform-native app image.
 */
import {spawnSync} from 'node:child_process';
import {copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync,
  readdirSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {stageNativeAssets} from './stage-native-assets.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const aliases = ['math', 'flow', 'owunit', 'graphics', 'engine'];
const skipped = new Set(['.git', '.github', 'node_modules', 'target', 'dist',
  'release', '.DS_Store', 'coverage', 'build']);

export function parseArgs(args) {
  const out = {
    compilerDir: resolve(repoRoot, '../ow-lang'),
    graphicsDir: resolve(repoRoot, '../OW-Graphics'),
    out: resolve(repoRoot, 'ow/native-dist'),
    version: '1.13.2'
  };
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (key === '--help' || key === '-h') return {help: true};
    if (!['--compiler-dir', '--graphics-dir', '--out', '--version'].includes(key)) {
      throw new Error('Unknown argument: ' + key);
    }
    const val = args[++i];
    if (!val || val.startsWith('--')) throw new Error(key + ' requires a value');
    if (key === '--version') {
      if (!/^\d+\.\d+\.\d+$/.test(val)) throw new Error('Version must be x.y.z');
      out.version = val;
    } else if (key === '--out') out.out = resolve(val);
    else if (key === '--compiler-dir') out.compilerDir = resolve(val);
    else out.graphicsDir = resolve(val);
  }
  return out;
}

export function parseLock(text) {
  const result = new Map();
  let name = null;
  for (const line of text.split(/\r?\n/)) {
    const found = line.match(/^\s*- name:\s*"?([A-Za-z][A-Za-z0-9_-]*)"?\s*$/);
    if (found) {
      name = found[1];
    } else {
      const commit = line.match(/^\s*commit:\s*"?([0-9a-f]{40})"?\s*$/);
      if (commit && name) {
        if (result.has(name)) throw new Error('Duplicate dependency: ' + name);
        result.set(name, commit[1]);
        name = null;
      }
    }
  }
  return result;
}

function assertFile(path, label = path) {
  if (!existsSync(path) || !lstatSync(path).isFile()) {
    throw new Error('Missing build input: ' + label);
  }
}

function execute(command, args, cwd = repoRoot) {
  const result = spawnSync(command, args, {
    cwd, encoding: 'utf8', stdio: 'inherit',
    shell: process.platform === 'win32' && /\.cmd$/i.test(command),
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(command + ' returned ' + result.status);
}

export function copySafeTree(source, dest) {
  if (!existsSync(source) || !lstatSync(source).isDirectory()) {
    throw new Error('Missing source directory ' + source);
  }
  mkdirSync(dest, {recursive: true});
  for (const item of readdirSync(source, {withFileTypes: true})) {
    if (skipped.has(item.name)) continue;
    const from = join(source, item.name);
    const target = join(dest, item.name);
    if (item.isSymbolicLink()) throw new Error('Symlink not allowed in runtime: ' + from);
    if (item.isDirectory()) copySafeTree(from, target);
    else if (item.isFile()) copyFileSync(from, target);
    else throw new Error('Unsupported source entry: ' + from);
  }
}

/**
 * Add pre-resolved markers recognized by OW's own DependencyManager.gitHead.
 * This guarantees the runtime never invokes Git, downloads or changes refs.
 * A correctly populated bundle also never rewrites dependencies.lock.yml.
 */
export function stageOwPayload(projectRoot, dest) {
  const owRoot = join(projectRoot, 'ow');
  const lock = join(owRoot, 'dependencies.lock.yml');
  assertFile(lock);
  const pinned = parseLock(readFileSync(lock, 'utf8'));
  if (pinned.size !== aliases.length) throw new Error('Unexpected pinned dependency count');
  for (const name of aliases) {
    if (!pinned.has(name)) throw new Error('Missing pinned alias @' + name);
  }
  mkdirSync(dest, {recursive: true});
  copySafeTree(join(owRoot, 'src'), join(dest, 'src'));
  copyFileSync(join(owRoot, 'dependencies.yml'), join(dest, 'dependencies.yml'));
  copyFileSync(lock, join(dest, 'dependencies.lock.yml'));
  copySafeTree(join(owRoot, 'assets/native'), join(dest, 'assets/native'));

  for (const alias of aliases) {
    const source = join(owRoot, '.ow/deps', alias);
    const target = join(dest, '.ow/deps', alias);
    copySafeTree(source, target);
    const marker = join(target, '.ow-resolved');
    writeFileSync(marker, pinned.get(alias) + '\n', 'utf8');
  }
  assertFile(join(dest, 'src/engine/battle_gpu.ow'));
  assertFile(join(dest, 'src/engine/battle_lifecycle_smoke.ow'));
  assertFile(join(dest, 'assets/native/skills/math_icon.png'));
  assertFile(join(dest, 'assets/native/items/egg.png'));
  return aliases.length;
}

export function buildNativeImage(options) {
  const compilerJar = join(options.compilerDir, 'target/OwIDE.jar');
  const graphicsJar = join(options.graphicsDir,
    'native-bridge/target/ow-graphics-native-0.1.0-SNAPSHOT.jar');
  const libsDir = join(options.graphicsDir, 'native-bridge/target/lib');
  assertFile(compilerJar, 'built OW compiler');
  assertFile(graphicsJar, 'OW Graphics SPI jar');
  const graphicsLibs = readdirSync(libsDir).filter(x => x.endsWith('.jar'));
  if (graphicsLibs.length === 0) throw new Error('LWJGL JAR dependencies missing');

  stageNativeAssets(repoRoot);
  const stage = join(options.out, 'staging');
  const input = join(stage, 'input');
  const classes = join(stage, 'classes');
  rmSync(stage, {recursive: true, force: true});
  mkdirSync(input, {recursive: true});
  mkdirSync(classes, {recursive: true});
  const javaSource = join(repoRoot,
    'ow/native-launcher/src/main/java/org/oreostudios/codewash/NativeLauncher.java');
  assertFile(javaSource);
  execute('javac', ['--release', '17', '-d', classes, javaSource]);
  execute('jar', ['--create', '--file', join(input, 'native-launcher.jar'),
    '-C', classes, '.']);

  copyFileSync(compilerJar, join(input, 'OwIDE.jar'));
  copyFileSync(graphicsJar, join(input, 'ow-graphics-native.jar'));
  mkdirSync(join(input, 'lib'), {recursive: true});
  for (const name of graphicsLibs) {
    copyFileSync(join(libsDir, name), join(input, 'lib', name));
  }
  stageOwPayload(repoRoot, join(input, 'payload/ow'));

  // jpackage is supplied by the full Java 17+ JDK on the BUILD machine.
  // It creates CodeWashRPG.exe (Windows), a launcher (Linux), or a .app (macOS),
  // and bundles a private Java runtime (via jlink). No extra Java install.
  // Default jpackage jlink flags omit bin/java on Linux. Our bootstrap
  // launches a second JVM with its own cwd, so ship an explicit JRE that
  // preserves the java/javaw commands on every target operating system.
  const runtime = join(stage, 'runtime');
  rmSync(runtime, {recursive: true, force: true});
  execute('jlink', ['--add-modules', 'java.se,jdk.unsupported,jdk.crypto.ec',
    '--strip-debug', '--no-header-files', '--no-man-pages',
    '--output', runtime]);
  const javaBin = process.platform === 'win32' ? 'java.exe' : 'java';
  assertFile(join(runtime, 'bin', javaBin), 'bundled jlink Java runtime');
  const dest = join(options.out, 'images');
  const imageName = process.platform === 'darwin' ? 'CodeWashRPG.app' : 'CodeWashRPG';
  rmSync(join(dest, imageName), {recursive: true, force: true});
  mkdirSync(dest, {recursive: true});
  execute('jpackage', ['--type', 'app-image',
    '--name', 'CodeWashRPG', '--app-version', options.version,
    '--vendor', 'Oreo Studios', '--input', input,
    '--main-jar', 'native-launcher.jar',
    '--main-class', 'org.oreostudios.codewash.NativeLauncher',
    '--dest', dest, '--runtime-image', runtime,
    '--java-options', '-Dfile.encoding=UTF-8']);
  return join(dest, imageName);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const opts = parseArgs(process.argv.slice(2));
    if (opts.help) {
      console.log('Usage: node ow/scripts/package-native.mjs ' +
        '[--compiler-dir PATH] [--graphics-dir PATH] [--out PATH] [--version X.Y.Z]');
    } else {
      console.log('Building platform-native offline OW desktop image...');
      console.log('Created native app image: ' + buildNativeImage(opts));
    }
  } catch (error) {
    console.error('Native OW packaging: ' + error.message);
    process.exitCode = 1;
  }
}
