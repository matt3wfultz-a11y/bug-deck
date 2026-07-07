// BugCard.js — renders a full creature card using the card-frame art:
// composited bug portrait in the circle, name banner, stats and attacks
// on the parchment panel.

import { createBugContainer } from './SvgParts.js';
import { creatures as creatureData } from '../data/creatures.js';

export const CARD_W = 300;
export const CARD_H = 400;

// One-line summary of each element's unique special mechanic
export const ELEMENT_FX = {
  Wind:      'strikes twice',
  Lightning: 'stuns: -1 stamina',
  Earth:     'ignores DEF stance',
  Tide:      'drains: heals ½ dmg',
};

export const ELEMENT_COLOR = {
  Wind:      '#3d8fa8',
  Lightning: '#a8862a',
  Earth:     '#8a5a28',
  Tide:      '#2a6aa8',
};

const ARCH_TAG_COLOR = { Flying: '#ffdd44', Ground: '#e0a865', Water: '#7cc4ff' };

/** Call from a scene's preload() to make the card frame texture available. */
export function registerCardTexture(scene) {
  if (!scene.textures.exists('card-frame')) {
    scene.load.svg('card-frame', 'assets/card-frame.svg', { width: CARD_W, height: CARD_H });
  }
}

/**
 * Create a full bug card as a Phaser container centered at (x, y).
 * `entry` is a plain creature data object (baseHp/baseAtk/..., ability,
 * special, parts, generation). Returns the container; caller scales it.
 */
export function createBugCard(scene, x, y, entry, scale = 0.5) {
  const c = scene.add.container(x, y);
  c.setSize(CARD_W * scale, CARD_H * scale);

  if (scene.textures.exists('card-frame')) {
    c.add(scene.add.image(0, 0, 'card-frame'));
  } else {
    c.add(scene.add.rectangle(0, 0, CARD_W, CARD_H, 0x1a2e1a).setStrokeStyle(3, 0xb8860b));
  }

  // ── Bug portrait in the circle (circle center ≈ (1, -107) from card center) ──
  const bug = createBugContainer(scene, 1, -107, entry.parts, 0.42);
  c.add(bug);

  // ── Archetype tag on the moss above the circle ──
  c.add(scene.add.text(0, -178, `[${entry.archetype}]`, {
    fontSize: '15px', color: ARCH_TAG_COLOR[entry.archetype] || '#ffffff',
    fontFamily: 'monospace', fontStyle: 'bold',
  }).setOrigin(0.5));

  // Generation badge (bred creatures)
  const gen = entry.generation ?? 0;
  if (gen > 0) {
    c.add(scene.add.text(122, -178, `G${gen}`, {
      fontSize: '15px', color: '#ffcc88', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5));
  }

  // ── Name banner (banner center ≈ y -10) ──
  const displayName = entry.name.length > 15 ? entry.name.slice(0, 14) + '…' : entry.name;
  c.add(scene.add.text(0, -9, displayName, {
    fontSize: '21px', color: '#2a2016', fontFamily: 'monospace', fontStyle: 'bold',
  }).setOrigin(0.5));

  // ── Parchment panel (spans roughly y +25 .. +155) ──
  const ink = '#2a2016';

  // Stats row
  c.add(scene.add.text(0, 42,
    `HP ${entry.baseHp} ATK ${entry.baseAtk} DEF ${entry.baseDef} SPD ${entry.baseSpd}`, {
    fontSize: '13px', color: ink, fontFamily: 'monospace', fontStyle: 'bold',
  }).setOrigin(0.5));

  // Basic attack
  const attackName = entry.attack?.name
    ?? creatureData.find(cr => cr.id === entry.id)?.attack?.name
    ?? 'Strike';
  c.add(scene.add.text(-92, 68, `⚔ ${attackName}`, {
    fontSize: '15px', color: ink, fontFamily: 'monospace',
  }).setOrigin(0, 0.5));
  c.add(scene.add.text(92, 68, `${entry.baseAtk} dmg`, {
    fontSize: '13px', color: '#5a4a36', fontFamily: 'monospace',
  }).setOrigin(1, 0.5));

  // Ability
  if (entry.ability?.name) {
    c.add(scene.add.text(-92, 91, `✦ ${entry.ability.name}`, {
      fontSize: '13px', color: '#4a3a5a', fontFamily: 'monospace',
    }).setOrigin(0, 0.5));
  }

  // Special attack + its unique element mechanic (name tinted by element)
  const sp = entry.special;
  if (sp) {
    const elColor = ELEMENT_COLOR[sp.element] || '#663366';
    c.add(scene.add.text(-92, 116, `⚡ ${sp.name}`, {
      fontSize: '15px', color: elColor, fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0, 0.5));
    c.add(scene.add.text(-92, 137, ELEMENT_FX[sp.element] ?? '', {
      fontSize: '12px', color: elColor, fontFamily: 'monospace', fontStyle: 'italic',
    }).setOrigin(0, 0.5));
  }

  c.setScale(scale);
  return c;
}
