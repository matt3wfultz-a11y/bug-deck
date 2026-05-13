const SVG_PATHS = {
  body:  'assets/Bug-parts-body.svg',
  head:  'assets/Bug-parts-head.svg',
  legs:  'assets/Bug-parts-legs.svg',
  wings: 'assets/Bug-parts-wings.svg',
};

const _svgCache = {};

async function _fetch(key) {
  if (!_svgCache[key]) {
    const res = await fetch(SVG_PATHS[key]);
    _svgCache[key] = await res.text();
  }
  return _svgCache[key];
}

function _isolate(svgText, groupId) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(svgText, 'image/svg+xml');
  const root   = doc.documentElement;
  for (const child of [...root.children]) {
    if (child.localName === 'g') {
      if (child.id !== groupId) {
        child.setAttribute('display', 'none');
      } else {
        child.removeAttribute('display');
      }
    }
  }
  return new XMLSerializer().serializeToString(doc);
}

async function _drawLayer(ctx, svgText, groupId, size) {
  const isolated = _isolate(svgText, groupId);
  const blob     = new Blob([isolated], { type: 'image/svg+xml;charset=utf-8' });
  const url      = URL.createObjectURL(blob);
  await new Promise((resolve) => {
    const img  = new Image();
    img.onload = () => { ctx.drawImage(img, 0, 0, size, size); URL.revokeObjectURL(url); resolve(); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(); };
    img.src = url;
  });
}

/** Deterministic parts derived from a string seed (used for base-template creatures). */
export function partsFromSeed(str) {
  let h = 0;
  for (const c of String(str)) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  h = Math.abs(h);
  return {
    head:  (h % 4) + 1,
    body:  ((h >> 4) % 4) + 1,
    legs:  ((h >> 8) % 4) + 1,
    wings: (h & 1) === 0,
  };
}

export function beetleKey(parts) {
  return `beetle_h${parts.head}_b${parts.body}_l${parts.legs}_w${parts.wings ? 1 : 0}`;
}

/**
 * Ensures a Phaser texture for the given beetle parts exists and returns its key.
 * Textures are 80×80 px and cached by parts signature.
 */
export async function ensureBeetleTexture(scene, parts) {
  const key = beetleKey(parts);
  if (scene.textures.exists(key)) return key;

  const size = 80;
  const [body, head, legs, wings] = await Promise.all([
    _fetch('body'), _fetch('head'), _fetch('legs'), _fetch('wings'),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width  = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Draw order: wings (back) → legs → body → head (front)
  if (parts.wings) await _drawLayer(ctx, wings, 'Wings', size);
  await _drawLayer(ctx, legs,  `Beetle-legs-${parts.legs}`, size);
  await _drawLayer(ctx, body,  `Beetle-body-${parts.body}`, size);
  await _drawLayer(ctx, head,  `Beetle-head-${parts.head}`, size);

  scene.textures.addCanvas(key, canvas);
  return key;
}
