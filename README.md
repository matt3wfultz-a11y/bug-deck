# Bug Collector Deckbuilder

A beetle-themed roguelite deckbuilder with a monster-catching twist, built with [Phaser 3](https://phaser.io/).

Build a deck of bugs, fight your way through escalating rounds, capture defeated enemies, and grow a permanent collection on your farm — then breed hybrids to push deeper on the next run.

## How to play

```sh
python3 server.py 3456
```

Then open http://localhost:3456 in a browser. Phaser is vendored in `vendor/`, so no network access is needed.

## Game loop

1. **Build your deck** — pick up to 5 bugs from the three archetypes (or from your farm) and up to 3 items.
2. **Battle map** — each round, choose a node: **Fight**, **Shop**, or **Breeding**.
3. **Fight** — queued simultaneous combat. Each turn you spend stamina to queue actions (**ATK**, **DEF**, **SPECIAL** for 2, **ITEM**, **SWAP**), then hit **END** and both sides resolve slot by slot. Flying bugs get 4 stamina; Ground and Water get 3.
4. **Capture** — after every victory one of the defeated enemies is weakened and catchable. Swing your net (click) at the bug as it darts around the arena — faster bugs (higher SPD) are harder to pin down. You get 3 swings, +1 per Jar owned (max +2). Catch it and add it to your **hand** (joins the current run) or send it to the **farm** (kept forever) — or miss every swing and watch it escape. Wins also pay out gold.
5. **Push or leave** — enemies scale +20% per round. Leave safely to bank your surviving bugs, or keep fighting. Bugs that faint are gone for good.

### Archetype triangle

**Flying → Water → Ground → Flying** — advantage gives 1.5× damage on attacks and 2× on specials.

### Farm & breeding

Captured bugs live on your farm (max 20). Breed any two — on the farm between runs, or mid-run at a Breeding node for 50g — to consume the parents and produce a hybrid offspring with averaged stats, a generated name, and a mutated special. Generation bonuses make lineages stronger over time.

Bug parts are fully interchangeable: every bug is composited from body, head, legs, and wings layers, and offspring inherit each part independently from a random parent (with a 12% mutation chance per part to roll a brand-new variant). Farm and breeding cards show each bug's portrait, so you can see exactly which parts your hybrids carry. `assets/mix-test.html` renders every head×body combination for eyeballing the part art.

### Workshop & spare parts

Selling a bug — or losing one in battle — salvages its body, head, and legs into your **spare parts inventory**. From the farm, open the **Workshop** to rebuild any bug by hand: pick a creature, cycle its body, head, and legs through the parts you've banked (a live preview re-composites on every change), and pay 25g per changed part to apply. Installed parts are consumed from your stock and the replaced parts go back into it, so every swap is a true exchange. Wings stay tied to archetype.

### Shop

Sell bugs from your farm or hand for gold, and buy permanent item unlocks that become selectable in the deck builder.

## Project layout

```
index.html            entry point
server.py             no-cache dev server
vendor/phaser.min.js  vendored Phaser 3.60
src/
  main.js             Phaser config + boot
  data/               creature, item, archetype definitions
  entities/           Creature (stats, breeding, name generation)
  systems/            GameState (save/load), BattleSystem, BattleQueue
  scenes/             Menu, DeckBuilder, Map, Battle, Capture, Farm, Breeding, Shop
  art/SvgParts.js     composites bug sprites from SVG part layers
assets/               SVG bug parts (body/head/legs/wings variants)
```

Saves persist to `localStorage` under the key `bugDeck_save`.
