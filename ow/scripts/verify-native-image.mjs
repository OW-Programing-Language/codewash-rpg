/**
 * Smoke-checks a jpackage app-image, including packaged runtime only.
 * All checks execute the packaged native launcher, not the developer script.
 */
import {existsSync, lstatSync} from 'node:fs';
import {join, resolve, dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export function pathsForOS(output, platform = process.platform) {
  const root = resolve(output, 'images',
    platform === 'darwin' ? 'CodeWashRPG.app' : 'CodeWashRPG');
  const binary = platform === 'win32'
    ? join(root, 'CodeWashRPG.exe')
    : platform === 'darwin'
      ? join(root, 'Contents/MacOS/CodeWashRPG')
      : join(root, 'bin/CodeWashRPG');
  const app = platform === 'win32'
    ? join(root, 'app')
    : platform === 'darwin'
      ? join(root, 'Contents/app')
      : join(root, 'lib/app');
  return {root, binary, app};
}

export function verifyContents({root, binary, app}) {
  if (!existsSync(binary) || !lstatSync(binary).isFile()) {
    throw new Error('Missing native launcher: ' + binary);
  }
  for (const name of ['native-launcher.jar', 'OwIDE.jar',
    'ow-graphics-native.jar', 'payload/ow/dependencies.lock.yml',
    'payload/ow/src/engine/battle_gpu.ow',
    'payload/ow/assets/native/skills/math_icon.png',
    'payload/ow/assets/native/themes/minecraft.png',
    'payload/ow/assets/native/themes/minecraft_logo.png',
    'payload/ow/.ow/deps/graphics/.ow-resolved']) {
    if (!existsSync(join(app, name))) {
      throw new Error('Missing packaged resource: ' + name + ' in ' + root);
    }
  }
  if (!existsSync(join(app, 'lib'))) {
    throw new Error('Missing bundled LWJGL jar directory');
  }
  return true;
}

// Some Windows CI workers have no interactive desktop and cannot reliably
// pipe stdout from a GUI-subsystem jpackage EXE with a nested child JVM.
// Verify the EXE's own --self-test separately, then run the *packaged* Java
// interpreter directly from its bundled Java runtime for offline OW imports.
export function checkBundledOwRuntime(output, platform = process.platform) {
  const image = pathsForOS(output, platform);
  verifyContents(image);
  const java = platform === 'win32'
    ? join(image.root, 'runtime/bin/java.exe')
    : platform === 'darwin'
      ? join(image.root, 'Contents/runtime/Contents/Home/bin/java')
      : join(image.root, 'lib/runtime/bin/java');
  if (!existsSync(java)) throw new Error('Bundled Java executable missing: ' + java);
  const sep = platform === 'win32' ? ';' : ':';
  const cp = [join(image.app, 'OwIDE.jar'),
    join(image.app, 'ow-graphics-native.jar'),
    join(image.app, 'lib/*')].join(sep);
  const game = join(image.app, 'payload/ow');
  const p = spawnSync(java, ['-cp', cp, 'dev.oreo.Main',
    'check', 'src/engine/battle_gpu.ow'], {
    cwd: game,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 90_000,
  });
  if (p.error) throw p.error;
  if (p.status !== 0) {
    throw new Error('Bundled OW interpreter offline check failed:\n' +
      (p.stdout || '') + '\n' + (p.stderr || '') + '\nStatus ' + p.status);
  }
  console.log('PASS: bundled OW runtime checks the game offline on ' + platform);
}

/**
 * Diagnostic GPU smoke on a Windows CI worker, using the bundled Java
 * interpreter and native LWJGL dependencies, not the development classpath.
 * This runs the existing OW OpenGL lifecycle test and prints its stdout and
 * stderr even when GLFW fails (e.g. headless CI with OpenGL 1.1 driver).
 */
export function probeBundledGpu(output, platform = process.platform) {
  const image = pathsForOS(output, platform);
  verifyContents(image);
  const java = platform === 'win32'
    ? join(image.root, 'runtime/bin/java.exe')
    : platform === 'darwin'
      ? join(image.root, 'Contents/runtime/Contents/Home/bin/java')
      : join(image.root, 'lib/runtime/bin/java');
  if (!existsSync(java)) throw new Error('Bundled Java executable missing: ' + java);
  const sep = platform === 'win32' ? ';' : ':';
  const cp = [join(image.app, 'OwIDE.jar'),
    join(image.app, 'ow-graphics-native.jar'),
    join(image.app, 'lib/*')].join(sep);
  const game = join(image.app, 'payload/ow');
  const p = spawnSync(java, ['-Dorg.lwjgl.util.Debug=true', '-cp', cp,
    'dev.oreo.Main', 'run', 'src/engine/battle_lifecycle_smoke.ow'], {
    cwd: game, encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'], timeout: 90_000,
    windowsHide: true,
  });
  const report = (p.stdout || '') + '\\n' + (p.stderr || '');
  console.log('Packaged OpenGL smoke output:\\n' + report);
  if (p.error) throw p.error;
  if (p.status !== 0) {
    throw new Error('Packaged Windows OpenGL smoke failed, exit=' + p.status);
  }
  console.log('PASS: packaged OW OpenGL lifecycle on ' + platform);
}

export function runPackagedImage(output, args = ['--self-test'], platform = process.platform) {
  const image = pathsForOS(output, platform);
  verifyContents(image);
  const p = spawnSync(image.binary, args, {
    cwd: here, // intentional: the app MUST NOT rely on caller cwd
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: args.includes('--smoke') ? 120_000 : 40_000,
  });
  if (p.error) throw p.error;
  if (p.status !== 0) {
    throw new Error('Native image failed ' + args.join(' ') + '\n' +
      (p.stdout || '') + '\n' + (p.stderr || '') + '\nStatus ' + p.status);
  }
  console.log('PASS: ' + args.join(' ') + ' using ' + image.binary);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const out = process.argv[2] ? resolve(process.argv[2]) : resolve(here, 'ow/native-dist');
    runPackagedImage(out);
    if (process.platform === 'win32') {
      checkBundledOwRuntime(out);
    } else {
      runPackagedImage(out, ['--check']);
    }
    if (process.argv.includes('--smoke')) runPackagedImage(out, ['--smoke']);
    if (process.argv.includes('--gpu-probe')) probeBundledGpu(out);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
