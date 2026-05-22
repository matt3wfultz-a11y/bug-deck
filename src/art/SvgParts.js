// SvgParts.js — loads pre-split SVG part files as Phaser textures.

const SVG_SIZE = { width: 256, height: 256 };

const PART_KEYS = [
  'bug-body-1', 'bug-body-2', 'bug-body-3', 'bug-body-4',
  'bug-head-1', 'bug-head-2', 'bug-head-3', 'bug-head-4',
  'bug-legs-1', 'bug-legs-2', 'bug-legs-3', 'bug-legs-4',
  'bug-wings-1',
];

export const PART_COUNTS = { body: 4, head: 4, legs: 4, wings: 1 };

/**
 * Call from a Phaser scene's preload() method.
 * Registers all bug part SVGs with the Phaser loader.
 */
export function registerSvgTextures(scene) {
  for (const key of PART_KEYS) {
    if (!scene.textures.exists(key)) {
      // key format: 'bug-body-1' -> 'assets/parts/body-1.svg'
      const file = key.replace('bug-', '') + '.svg';
      scene.load.svg(key, `assets/parts/${file}`, SVG_SIZE);
    }
  }
}

/**
 * No-op kept for API compatibility — splitting is now done at build time.
 */
export async function fetchSvgData() {}

/**
 * Creates a Phaser Container compositing the bug part layers.
 * Draw order: wings (behind body), body, legs, head (on top).
 *
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {{ body: number, head: number, legs: number, wings: number }} parts
 * @param {number} [scale=0.5]  — renders 128px from the 256px viewBox
 * @returns {Phaser.GameObjects.Container}
 */
export function createBugContainer(scene, x, y, parts, scale = 0.5) {
  const p = parts ?? { body: 1, head: 1, legs: 1, wings: 0 };
  const container = scene.add.container(x, y);

  const layers = [];
  if (p.wings > 0) layers.push(`bug-wings-${p.wings}`);
  layers.push(`bug-body-${p.body}`);
  layers.push(`bug-legs-${p.legs}`);
  layers.push(`bug-head-${p.head}`);

  for (const key of layers) {
    if (scene.textures.exists(key)) {
      container.add(scene.add.image(0, 0, key).setScale(scale));
    }
  }

  return container;
}

/**
 * Destroys a container created by createBugContainer() and all its children.
 */
export function destroyBugContainer(container) {
  if (!container) return;
  if (typeof container.getAll === 'function') {
    container.getAll().forEach(child => child.destroy());
  }
  container.destroy();
}

/**
 * Returns random parts for a creature of the given archetype.
 */
export function randomParts(archetype) {
  const v = Math.ceil(Math.random() * PART_COUNTS.body);
  return { body: v, head: v, legs: v, wings: archetype === 'Flying' ? 1 : 0 };
}
