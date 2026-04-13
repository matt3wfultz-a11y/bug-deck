export const items = [
  // ── Basic items (available to all players) ────────────────────────────────
  {
    id:          'nectar_vial',
    name:        'Nectar Vial',
    type:        'heal',
    value:       8,
    description: 'Heal 8 HP',
  },
  {
    id:          'venom_gland',
    name:        'Venom Gland',
    type:        'atkBuff',
    value:       1,
    description: 'ATK +1',
  },
  {
    id:          'chitin_shard',
    name:        'Chitin Shard',
    type:        'defBuff',
    value:       1,
    description: 'DEF +1',
  },

  // ── Flying items ──────────────────────────────────────────────────────────
  {
    id:          'wing_shards',
    name:        'Wing Shards',
    archetype:   'Flying',
    type:        'atkBuff',
    value:       3,
    description: 'ATK +3',
  },
  {
    id:          'featherlight_armor',
    name:        'Featherlight Armor',
    archetype:   'Flying',
    type:        'defBuff',
    value:       3,
    description: 'DEF +3',
  },

  // ── Ground items ──────────────────────────────────────────────────────────
  {
    id:          'carapace_plate',
    name:        'Carapace Plate',
    archetype:   'Ground',
    type:        'defBuff',
    value:       4,
    description: 'DEF +4',
  },
  {
    id:          'mandible_claws',
    name:        'Mandible Claws',
    archetype:   'Ground',
    type:        'atkBuff',
    value:       4,
    description: 'ATK +4',
  },

  // ── Water items ───────────────────────────────────────────────────────────
  {
    id:          'tide_vial',
    name:        'Tide Vial',
    archetype:   'Water',
    type:        'heal',
    value:       12,
    description: 'Heal 12 HP',
  },
  {
    id:          'silt_cloak',
    name:        'Silt Cloak',
    archetype:   'Water',
    type:        'defBuff',
    value:       4,
    description: 'DEF +4',
  },
];
