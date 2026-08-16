// Small filesystem helpers (recursive copy / link / remove) that avoid the
// experimental-warning surface of fs.cp on older Node 18 lines.
//
// Link-awareness matters here: a project install can be a symlink (or, on
// Windows, a junction) pointing at the global install. Anything that removes
// an install must delete *the link* and never recurse through it into the
// shared global payload.
import { promises as fs } from 'node:fs';
import { join, dirname, resolve, sep } from 'node:path';

/**
 * True when the path resolves to something real (follows links). Uses stat, not
 * access: on Windows access() succeeds on a dangling link because the reparse
 * point itself is reachable, which would report a broken install as present.
 */
export async function exists(p) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

/** True when the path itself exists, even as a dangling link. */
export async function lexists(p) {
  try {
    await fs.lstat(p);
    return true;
  } catch {
    return false;
  }
}

/** True for symlinks and Windows junctions (both report as links via lstat). */
export async function isLink(p) {
  try {
    return (await fs.lstat(p)).isSymbolicLink();
  } catch {
    return false;
  }
}

/** Absolute target of a link, or null. Normalises Windows \\?\ junction paths. */
export async function linkTarget(p) {
  try {
    let target = await fs.readlink(p);
    if (target.startsWith('\\\\?\\')) target = target.slice(4);
    if (target.length > 1 && target.endsWith(sep)) target = target.slice(0, -1);
    return resolve(dirname(p), target);
  } catch {
    return null;
  }
}

/**
 * Point `linkPath` at `target` (an absolute dir). Returns the link flavour used.
 * On Windows a real directory symlink needs elevation or Developer Mode, so we
 * fall back to a junction, which any user can create. Throws if neither works —
 * callers are expected to degrade to a copy.
 */
export async function linkDir(target, linkPath) {
  await fs.mkdir(dirname(linkPath), { recursive: true });
  const flavours = process.platform === 'win32' ? ['dir', 'junction'] : ['dir'];
  let lastErr;
  for (const flavour of flavours) {
    try {
      await fs.symlink(target, linkPath, flavour);
      return flavour;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

export async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const s = join(src, entry.name);
    const d = join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(s, d);
    } else if (entry.isSymbolicLink()) {
      const link = await fs.readlink(s);
      await fs.symlink(link, d);
    } else {
      await fs.copyFile(s, d);
    }
  }
}

/** Remove an install. A linked install loses only its link, never its target. */
export async function removeDir(dir) {
  let st;
  try {
    st = await fs.lstat(dir);
  } catch {
    return; // nothing there
  }
  if (st.isSymbolicLink()) {
    try {
      await fs.unlink(dir);
    } catch {
      await fs.rmdir(dir); // Windows junctions occasionally need this
    }
    return;
  }
  await fs.rm(dir, { recursive: true, force: true });
}
