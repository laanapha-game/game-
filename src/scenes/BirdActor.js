// The player's bird, built from the character data of scene 1 (see src/interfaces.js).
// Always faces LEFT in scene 2: a sheet drawn facing right is flipped in code, and
// the costume anchors are mirrored with it. Scene 1's characters face left already
// and have their costumes drawn in, so they need neither.
import Phaser from 'phaser';
import { layerTopLeft } from '../interfaces.js';

export class BirdActor {
  constructor(scene, character, x, y, depth = 50) {
    this.scene = scene;
    this.c = character;
    this.view = 'side';
    this.sprite = scene.add.sprite(x, y, character.side.key, character.side.anims.idle[0]).setOrigin(0.5, 1).setDepth(depth);
    this.shadow = scene.add.image(x, y + 1, 'ground_shadow').setOrigin(0.5, 1).setDepth(depth - 1);
    this.layers = { side: [], front: [] };
    for (const view of ['side', 'front']) {
      for (const layer of character.layers?.[view] ?? []) {
        const s = scene.add.sprite(x, y, layer.key, layer.frame ?? 0).setOrigin(0, 0).setDepth(depth + 1);
        this.layers[view].push({ def: layer, sprite: s });
      }
    }
    this.makeAnims();
    this.setView('side');
    this.play('idle');
    // Footsteps: on the first frame and half way through the run cycle (both feet),
    // so they follow the animation speed (slower walk, faster run).
    this.onStep = null;
    this.sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, (anim, frame) => {
      if (this.animName !== 'run' || !this.onStep) return;
      const i = frame.index - 1;
      const half = Math.floor(anim.frames.length / 2);
      if (i === 0 || i === half) this.onStep(i === half);
    });
  }

  /** Flip needed to face LEFT (sheet drawn facing right). lookBack() flips on top of this. */
  get flipped() {
    return this.view === 'side' && this.c.side.facing === 'right';
  }

  /** What is on screen: mirrored relative to the sheet as drawn (includes lookBack). */
  get shownFlipped() {
    return this.sprite.flipX;
  }

  makeAnims() {
    for (const view of ['side', 'front']) {
      const { key, anims } = this.c[view];
      for (const [name, frames] of Object.entries(anims)) {
        const animKey = `${key}_${name}`;
        if (this.scene.anims.exists(animKey)) continue;
        this.scene.anims.create({
          key: animKey,
          frames: frames.map((frame) => ({ key, frame })),
          frameRate: name === 'run' ? 10 : name === 'struggle' ? 8 : 3,
          repeat: frames.length > 1 && name !== 'happy' ? -1 : 0,
        });
      }
    }
  }

  setView(view) {
    this.view = view;
    // `backward`: look behind (to the right) in the side view.
    this.sprite.setFlipX(this.flipped !== (view === 'side' && !!this.backward));
    this.sync();
  }

  play(name, view = this.view) {
    if (view !== this.view || this.sprite.texture.key !== this.c[view].key) this.setView(view);
    this.sprite.play(`${this.c[view].key}_${name}`, true);
    this.animName = name;
  }

  /** Turn to look behind (right) or forward (left) in the side view. */
  lookBack(on) {
    this.backward = on;
    this.setView(this.view);
  }

  setPosition(x, y = this.sprite.y) {
    this.sprite.setPosition(Math.round(x), Math.round(y));
  }

  get x() {
    return this.sprite.x;
  }

  set x(v) {
    this.sprite.x = Math.round(v);
  }

  /**
   * Keep shadow and costume layers glued to the fixed anchors, mirrored exactly
   * when the bird is shown flipped (facing fix or lookBack). Call every frame.
   */
  sync() {
    const s = this.sprite;
    this.shadow.setPosition(s.x, this.shadow.y);
    // Real frame size in design px (the sheet may differ from the declared frame size).
    const fw = Math.round(s.displayWidth);
    const fh = Math.round(s.displayHeight);
    const frameLeft = Math.round(s.x - fw * s.originX);
    const frameTop = Math.round(s.y - fh * s.originY);
    const flipped = this.shownFlipped;
    for (const v of ['side', 'front']) {
      for (const { def, sprite } of this.layers[v]) {
        sprite.setVisible(v === this.view && s.visible);
        if (v !== this.view) continue;
        const p = layerTopLeft({
          frameLeft,
          frameTop,
          frameWidth: fw,
          anchor: this.c[v].anchors[def.anchor],
          offsetX: def.offsetX,
          offsetY: def.offsetY,
          layerW: Math.round(sprite.displayWidth),
          layerH: Math.round(sprite.displayHeight),
          flipped,
        });
        sprite.setPosition(p.x, p.y).setFlipX(flipped).setAlpha(s.alpha);
      }
    }
  }

  /** White silhouettes of the bird and its visible layers (win), above them, alpha 0. */
  silhouette() {
    this.sync();
    const parts = [this.sprite, ...this.layers[this.view].map((l) => l.sprite)].filter((p) => p.visible);
    return parts.map((p) =>
      this.scene.add
        .sprite(p.x, p.y, p.texture.key, p.frame.name)
        .setOrigin(p.originX, p.originY)
        .setFlipX(p.flipX)
        .setDepth(p.depth + 2)
        .setTint(0xffffff)
        .setTintMode(Phaser.TintModes.FILL)
        .setAlpha(0),
    );
  }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
    for (const v of ['side', 'front']) this.layers[v].forEach((l) => l.sprite.destroy());
  }
}
