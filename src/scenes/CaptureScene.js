import GameState from '../systems/GameState.js';
import { registerSvgTextures, createBugContainer, destroyBugContainer } from '../art/SvgParts.js';
import { registerCardTexture, createBugCard } from '../art/BugCard.js';

// Catch arena bounds (bug darts within this box during the minigame)
const ARENA      = { x: 16, y: 96, w: 768, h: 380 };
const NET_RADIUS = 52;
const BASE_SWINGS = 3;

export default class CaptureScene extends Phaser.Scene {
  constructor() {
    super('CaptureScene');
  }

  init(data) {
    // Receive the capturable Creature instance from BattleScene (may be null)
    this._capturable  = data?.capturable  ?? null;
    this._returnToMap = data?.returnToMap ?? false;
  }

  preload() {
    registerSvgTextures(this);
    registerCardTexture(this);
  }

  create() {
    const { width, height } = this.scale;

    // ── Header ────────────────────────────────────────────────────────────────
    this.add.rectangle(width / 2, 0, width, 58, 0x0d0d1a).setOrigin(0.5, 0);
    this.add.rectangle(width / 2, 58, width, 2, 0x2a2a50).setOrigin(0.5, 0);
    this.add.text(width / 2, 16, 'CAPTURE', {
      fontSize: '22px', color: '#a8ff78', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);

    this._subtitle = this.add.text(width / 2, 42, 'A wild creature is weakened...', {
      fontSize: '13px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5);

    if (!this._capturable) {
      // ── No capture available ───────────────────────────────────────────────
      this.add.text(width / 2, height / 2 - 40, 'No creature to capture.', {
        fontSize: '20px', color: '#aaaaaa', fontFamily: 'monospace',
      }).setOrigin(0.5);

      this._makeButton(width / 2, height / 2 + 30, 'CONTINUE', '#ffffff', () => {
        this._completeCapture();
      });
      return;
    }

    this._showIntro();
  }

  // ── Phase 1: intro card ─────────────────────────────────────────────────────

  _showIntro() {
    const { width, height } = this.scale;
    const creature = this._capturable;
    const objs = [];
    this._introObjs = objs;

    const stats = creature.getStats();

    // The creature's card, same as deck builder / battle hand
    const card = createBugCard(this, width / 2, 216, {
      id: creature.id, name: creature.name, archetype: creature.archetype,
      ability: creature.ability, special: creature.special, attack: creature.attack,
      parts: creature.parts,
      baseHp: stats.hp, baseAtk: stats.atk, baseDef: stats.def, baseSpd: stats.spd,
    }, 0.62);
    objs.push(card);

    // Speed hint: fast bugs are harder to net
    const spdWarn = stats.spd >= 7 ? 'It looks quick — aim carefully!' :
                    stats.spd >= 5 ? 'It scurries about nervously.' :
                                     'It moves sluggishly. Easy prey.';
    objs.push(this.add.text(width / 2, 356, spdWarn, {
      fontSize: '12px', color: '#ffdd44', fontFamily: 'monospace',
      backgroundColor: '#0d0d1a', padding: { x: 6, y: 3 },
    }).setOrigin(0.5));

    const swings = this._totalSwings();
    const jars   = swings - BASE_SWINGS;
    objs.push(this.add.text(width / 2, height - 170,
      `You have ${swings} net swings${jars > 0 ? `  (+${jars} from Jars)` : ''}`,
      { fontSize: '13px', color: '#88bbff', fontFamily: 'monospace' }
    ).setOrigin(0.5));

    objs.push(this._makeButton(width / 2 - 110, height - 130, 'CATCH IT!', '#a8ff78', () => {
      objs.forEach(o => o.destroy());
      this._startMinigame();
    }));

    objs.push(this._makeButton(width / 2 + 110, height - 130, 'LET IT GO', '#8899aa', () => {
      this._completeCapture();
    }));

    objs.push(this.add.text(width / 2, height - 88,
      'Swing your net with a click — catch it before it wears you out!',
      { fontSize: '12px', color: '#555566', fontFamily: 'monospace' }
    ).setOrigin(0.5));
  }

  _totalSwings() {
    const jarCount = GameState.itemInventory.filter(i => i.id === 'jar').length;
    return BASE_SWINGS + Math.min(2, jarCount);
  }

  // ── Phase 2: net-swing minigame ─────────────────────────────────────────────

  _startMinigame() {
    const { width } = this.scale;
    const creature = this._capturable;

    this._swingsLeft = this._totalSwings();
    this._gameOver   = false;

    this._subtitle.setText('Click to swing your net!');

    // Arena border
    this._arenaGfx = this.add.graphics();
    this._arenaGfx.lineStyle(1, 0x2a2a50, 1);
    this._arenaGfx.strokeRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);

    this._swingsText = this.add.text(width - 20, ARENA.y + 10, '', {
      fontSize: '14px', color: '#88ff88', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(10);
    this._updateSwingsText();

    this._missText = this.add.text(width / 2, ARENA.y + 24, '', {
      fontSize: '18px', color: '#ff6b6b', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);

    // The bug
    this._bug = createBugContainer(
      this,
      ARENA.x + ARENA.w / 2,
      ARENA.y + ARENA.h / 2,
      creature.parts,
      0.5
    );
    this._bug.setDepth(5);

    // Net cursor ring follows the pointer
    this._netCursor = this.add.circle(width / 2, ARENA.y + ARENA.h / 2, NET_RADIUS)
      .setStrokeStyle(2, 0x88ff88, 0.9).setDepth(8);

    this.input.on('pointermove', this._onPointerMove, this);

    // Click anywhere in the arena to swing
    this._arenaHit = this.add
      .rectangle(ARENA.x + ARENA.w / 2, ARENA.y + ARENA.h / 2, ARENA.w, ARENA.h, 0x000000, 0)
      .setInteractive();
    this._arenaHit.on('pointerdown', pointer => this._swing(pointer.x, pointer.y));

    this._scheduleDart();
  }

  _onPointerMove(pointer) {
    if (!this._netCursor || this._gameOver) return;
    const x = Phaser.Math.Clamp(pointer.x, ARENA.x, ARENA.x + ARENA.w);
    const y = Phaser.Math.Clamp(pointer.y, ARENA.y, ARENA.y + ARENA.h);
    this._netCursor.setPosition(x, y);
  }

  _scheduleDart(startled = false) {
    if (this._gameOver) return;
    const spd   = this._capturable.getStats().spd;
    const pause = startled ? 60 : 250 + Math.random() * 450;

    this._dartTimer = this.time.delayedCall(pause, () => {
      if (this._gameOver) return;
      const pad = 70;
      const tx  = ARENA.x + pad + Math.random() * (ARENA.w - pad * 2);
      const ty  = ARENA.y + pad + Math.random() * (ARENA.h - pad * 2);
      const dist    = Phaser.Math.Distance.Between(this._bug.x, this._bug.y, tx, ty);
      const speedPx = 180 + spd * 55; // faster bugs dart quicker

      this._bug.scaleX = tx < this._bug.x ? -1 : 1;
      this._dartTween = this.tweens.add({
        targets:  this._bug,
        x: tx, y: ty,
        duration: Math.max(120, (dist / speedPx) * 1000),
        ease:     'Sine.easeInOut',
        onComplete: () => this._scheduleDart(),
      });
    });
  }

  _swing(px, py) {
    if (this._gameOver || this._swingsLeft <= 0) return;

    this._swingsLeft--;
    this._updateSwingsText();

    // Swing swipe effect
    const swipe = this.add.circle(px, py, NET_RADIUS * 0.4)
      .setStrokeStyle(3, 0xaaffaa, 1).setDepth(9);
    this.tweens.add({
      targets: swipe, radius: NET_RADIUS, alpha: 0, duration: 240,
      onComplete: () => swipe.destroy(),
    });

    const d = Phaser.Math.Distance.Between(px, py, this._bug.x, this._bug.y);
    if (d <= NET_RADIUS + 6) {
      this._onCaught();
    } else if (this._swingsLeft <= 0) {
      this._onEscaped();
    } else {
      // Missed — the startled bug darts away immediately
      this._flashMiss(this._swingsLeft === 1 ? 'Missed! Last swing...' : 'Missed!');
      this._dartTimer?.remove();
      this._dartTween?.stop();
      this._scheduleDart(true);
    }
  }

  _flashMiss(msg) {
    this._missText.setText(msg).setAlpha(1);
    this.tweens.add({ targets: this._missText, alpha: 0, duration: 900, delay: 400 });
  }

  _updateSwingsText() {
    const dots = '●'.repeat(this._swingsLeft) + '○'.repeat(this._totalSwings() - this._swingsLeft);
    this._swingsText.setText(`SWINGS ${dots}`);
    this._swingsText.setColor(this._swingsLeft > 1 ? '#88ff88' : '#ff6b6b');
  }

  _stopMinigame() {
    this._gameOver = true;
    this._dartTimer?.remove();
    this._dartTween?.stop();
    this.input.off('pointermove', this._onPointerMove, this);
    this._arenaHit?.disableInteractive();
    this._netCursor?.setVisible(false);
  }

  // ── Phase 3: result ─────────────────────────────────────────────────────────

  _onCaught() {
    this._stopMinigame();
    this._subtitle.setText('');
    this._missText.setText('');

    // Flash the bug, pull it to center, then show keep options
    this.tweens.add({
      targets: this._bug, alpha: 0.15, yoyo: true, repeat: 2, duration: 90,
      onComplete: () => {
        this.tweens.add({
          targets: this._bug,
          x: this.scale.width / 2, y: 200, scaleX: 0.7, scaleY: 0.7,
          duration: 380, ease: 'Back.easeOut',
          onComplete: () => this._showKeepOptions(),
        });
      },
    });
  }

  _showKeepOptions() {
    const { width, height } = this.scale;
    const creature = this._capturable;

    this.add.text(width / 2, 92, `Caught ${creature.name}!`, {
      fontSize: '26px', color: '#a8ff78', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);

    const handFull = (GameState.selectedDeck || []).length >= 5;

    if (handFull) {
      this.add.text(width / 2 - 110, height - 130, '[ HAND ]', {
        fontSize: '20px', color: '#333344', fontFamily: 'monospace',
        backgroundColor: '#0d0d1a', padding: { x: 14, y: 8 },
      }).setOrigin(0.5);
      this.add.text(width / 2 - 110, height - 100, 'Hand full (5/5)', {
        fontSize: '10px', color: '#443333', fontFamily: 'monospace',
      }).setOrigin(0.5);
    } else {
      this._makeButton(width / 2 - 110, height - 130, 'HAND', '#a8ff78', () => {
        GameState.addToHand(creature);
        this._completeCapture();
      });
    }

    this._makeButton(width / 2 + 110, height - 130, 'FARM', '#66aaff', () => {
      GameState.addToFarm(creature);
      this._completeCapture();
    });

    this.add.text(width / 2, height - 88,
      handFull
        ? 'Hand is full — must send to FARM'
        : 'HAND adds to active run   |   FARM stores permanently',
      { fontSize: '12px', color: handFull ? '#884444' : '#555566', fontFamily: 'monospace' }
    ).setOrigin(0.5);
  }

  _onEscaped() {
    this._stopMinigame();
    this._subtitle.setText('');
    const { width, height } = this.scale;

    // Bug bolts off the edge of the arena
    const exitX = this._bug.x < width / 2 ? -120 : width + 120;
    this._bug.scaleX = exitX < this._bug.x ? -1 : 1;
    this.tweens.add({
      targets: this._bug, x: exitX, duration: 420, ease: 'Quad.easeIn',
      onComplete: () => destroyBugContainer(this._bug),
    });

    this.add.text(width / 2, height / 2 - 44, 'It got away!', {
      fontSize: '30px', color: '#ff6b6b', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);

    this.add.text(width / 2, height / 2 - 8, `${this._capturable.name} slipped through your net.`, {
      fontSize: '13px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(10);

    this._makeButton(width / 2, height / 2 + 56, 'CONTINUE', '#ffffff', () => {
      this._completeCapture();
    });
  }

  // ── Shared ──────────────────────────────────────────────────────────────────

  _completeCapture() {
    if (this._returnToMap) {
      GameState.runFightWins++;
      GameState.lootTaken = false;
      GameState.saveGame();
      this.scene.start('MapScene');
    } else {
      GameState.clearRun();
      this.scene.start('MenuScene');
    }
  }

  _makeButton(x, y, label, color, cb) {
    const btn = this.add.text(x, y, `[ ${label} ]`, {
      fontSize: '20px', color, fontFamily: 'monospace',
      backgroundColor: '#141428', padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setDepth(10).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setScale(1.06));
    btn.on('pointerout',  () => btn.setScale(1));
    btn.on('pointerdown', cb);
    return btn;
  }
}
