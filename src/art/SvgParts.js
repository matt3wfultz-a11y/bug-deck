// SvgParts.js — SVG-based composite bug sprite system for Phaser 3
// Fetches 4 SVG files, isolates per-variant groups, registers as Phaser textures.

// Module-level cache
const _svgCache = {};       // 'body' -> SVG text string
const _dataUriCache = {};   // 'bug-body-1' -> data URI string

const SVG_FILES = {
  body:  'assets/Bug-parts-body.svg',
  head:  'assets/Bug-parts-head.svg',
  legs:  'assets/Bug-parts-legs.svg',
  wings: 'assets/Bug-parts-wings.svg',
};

// Top-level <g id="..."> groups from each SVG file
const PART_GROUPS = {
  body:  ['Beetle-body-1', 'Beetle-body-2', 'Beetle-body-3', 'Beetle-body-4'],
  head:  ['Beetle-head-1', 'Beetle-head-2', 'Beetle-head-3', 'Beetle-head-4'],
  legs:  ['Beetle-legs-1', 'Beetle-legs-2', 'Beetle-legs-3', 'Beetle-legs-4'],
  wings: ['Wings'],  // only 1 wing variant; wings=0 means no wings
};

export const PART_COUNTS = {
  body:  PART_GROUPS.body.length,   // 4
  head:  PART_GROUPS.head.length,   // 4
  legs:  PART_GROUPS.legs.length,   // 4
  wings: PART_GROUPS.wings.length,  // 1 (does NOT include the "no wings" option 0)
};

/**
 * Returns a Blob URL for an SVG showing ONLY the target group,
 * hiding all other top-level <g> elements.
 * Blob URLs are more reliable than data URIs for large SVGs in Phaser.
 */
function isolateGroup(svgText, groupId) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const svg = doc.documentElement;

  // Ensure explicit pixel dimensions so Phaser knows the raster size
  svg.setAttribute('width', '256');
  svg.setAttribute('height', '256');

  // Hide all direct child <g> elements
  Array.from(svg.children).forEach(el => {
    if (el.tagName === 'g') el.setAttribute('display', 'none');
  });

  // Show only the target group
  const target = doc.getElementById(groupId);
  if (target) target.removeAttribute('display');

  const serializer = new XMLSerializer();
  const str = serializer.serializeToString(svg);
  const blob = new Blob([str], { type: 'image/svg+xml' });
  return URL.createObjectURL(blob);
}

/**
 * Phase 1: Fetch all 4 SVG files and cache their text content.
 * Also pre-generates all data URIs for each variant.
 * Call this before starting Phaser (e.g. in main.js before window.main()).
 */
export async function fetchSvgData() {
  await Promise.all(
    Object.entries(SVG_FILES).map(async ([part, path]) => {
      if (!_svgCache[part]) {
        const res = await fetch(path);
        if (!res.ok) {
          console.warn(`SvgParts: failed to fetch ${path}`);
          return;
        }
        _svgCache[part] = await res.text();
      }
    })
  );

  // Pre-generate all variant data URIs
  for (const [part, groups] of Object.entries(PART_GROUPS)) {
    const svgText = _svgCache[part];
    if (!svgText) continue;

    groups.forEach((groupId, idx) => {
      const key = `bug-${part}-${idx + 1}`;
      if (!_dataUriCache[key]) {
        _dataUriCache[key] = isolateGroup(svgText, groupId);
      }
    });
  }

  // wings-0 = transparent 1×1 placeholder (Blob URL)
  if (!_dataUriCache['bug-wings-0']) {
    const emptyBlob = new Blob(
      ['<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'],
      { type: 'image/svg+xml' }
    );
    _dataUriCache['bug-wings-0'] = URL.createObjectURL(emptyBlob);
  }
}

/**
 * Phase 2 (sync): Register all cached Blob URLs as Phaser SVG textures.
 * Uses scene.load.svg() with explicit 256×256 so Phaser rasterises correctly.
 * Must be called from a Phaser scene's preload() method.
 * No-ops for keys that are already registered.
 */
export function registerSvgTextures(scene) {
  for (const [key, blobUrl] of Object.entries(_dataUriCache)) {
    if (!scene.textures.exists(key)) {
      if (key === 'bug-wings-0') {
        // 1×1 transparent placeholder — just skip; we'll handle missing texture gracefully
        continue;
      }
      scene.load.svg(key, blobUrl, { width: 256, height: 256 });
    }
  }
}

/**
 * All-in-one async helper: fetches SVGs (if not already cached), registers textures,
 * then waits for Phaser's loader to complete.
 * Safe to call from scene create() — resolves when textures are ready.
 * Note: If called from preload(), Phaser handles the load pipeline automatically.
 */
export async function preloadSvgParts(scene) {
  await fetchSvgData();
  registerSvgTextures(scene);

  await new Promise(resolve => {
    if (scene.load.isLoading()) {
      scene.load.once('complete', resolve);
    } else {
      scene.load.once('complete', resolve);
      scene.load.start();
    }
  });
}

/**
 * Creates a Phaser Container compositing the 4 bug part layers.
 * Draw order: wings (behind body), body, legs, head (on top).
 *
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {{ body: number, head: number, legs: number, wings: number }} parts
 * @param {number} [scale=0.5]  — 0.5 renders a 128px bug from the 256px viewBox
 * @returns {Phaser.GameObjects.Container}
 */
export function createBugContainer(scene, x, y, parts, scale = 0.5) {
  const safeParts = parts ?? { body: 1, head: 1, legs: 1, wings: 0 };

  const bodyKey  = scene.textures.exists(`bug-body-${safeParts.body}`)
    ? `bug-body-${safeParts.body}` : 'bug-body-1';
  const headKey  = scene.textures.exists(`bug-head-${safeParts.head}`)
    ? `bug-head-${safeParts.head}` : 'bug-head-1';
  const legsKey  = scene.textures.exists(`bug-legs-${safeParts.legs}`)
    ? `bug-legs-${safeParts.legs}` : 'bug-legs-1';
  const container = scene.add.container(x, y);

  // Add in back-to-front order: wings behind everything, then body, legs, head on top
  if (safeParts.wings > 0) {
    const wingsKey = `bug-wings-${safeParts.wings}`;
    if (scene.textures.exists(wingsKey)) {
      const wingsImg = scene.add.image(0, 0, wingsKey).setScale(scale);
      container.add(wingsImg);
    }
  }
  if (scene.textures.exists(bodyKey)) {
    const bodyImg = scene.add.image(0, 0, bodyKey).setScale(scale);
    container.add(bodyImg);
  }
  if (scene.textures.exists(legsKey)) {
    const legsImg = scene.add.image(0, 0, legsKey).setScale(scale);
    container.add(legsImg);
  }
  if (scene.textures.exists(headKey)) {
    const headImg = scene.add.image(0, 0, headKey).setScale(scale);
    container.add(headImg);
  }

  return container;
}

/**
 * Destroys a container created by createBugContainer() and all its children.
 * @param {Phaser.GameObjects.Container|null} container
 */
export function destroyBugContainer(container) {
  if (!container) return;
  if (typeof container.getAll === 'function') {
    container.getAll().forEach(child => child.destroy());
  }
  container.destroy();
}

/**
 * Returns a random parts object for a creature of the given archetype.
 * Used as fallback when a creature has no parts defined.
 */
export function randomParts(archetype) {
  return {
    body:  Math.ceil(Math.random() * PART_COUNTS.body),
    head:  Math.ceil(Math.random() * PART_COUNTS.head),
    legs:  Math.ceil(Math.random() * PART_COUNTS.legs),
    wings: archetype === 'Flying' ? Math.ceil(Math.random() * PART_COUNTS.wings) : 0,
  };
}
