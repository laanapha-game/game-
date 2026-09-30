// The player's bird, built from the character data of scene 1 (see src/interfaces.js).
// Always faces LEFT in scene 2: a sheet drawn facing right is flipped in code, and
// the costume anchors are mirrored with it.
import { anchorFor } from '../interfaces.js';

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
        const s = scene.add.sprite(x, y, layer.key, layer.frame ?? 0).setOrigin(0.5, 1).setDepth(depth + 1);
        this.layers[view].push({ def: layer, sprite: s });
      }
    }
    this.makeAnims();
    this.setView('side');
    this.play('idle');
  }

  get flipped() {
    return this.view === 'side' && this.c.side.facing === 'right';
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
    this.sprite.setFlipX(this.flipped);
    for (const v of ['side', 'front']) this.layers[v].forEach((l) => l.sprite.setVisible(v === view));
  }

  play(name, view = this.view) {
    if (view !== this.view || this.sprite.texture.key !== this.c[view].key) this.setView(view);
    this.sprite.play(`${this.c[view].key}_${name}`, true);
    this.animName = name;
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

  /** Keep shadow and costume layers glued to the fixed anchors. Call every frame. */
  sync() {
    const s = this.sprite;
    this.shadow.setPosition(s.x, this.shadow.y);
    const fw = this.c.frameWidth;
    const fh = this.c.frameHeight;
    const left = s.x - fw / 2;
    const top = s.y - fh;
    for (const { def, sprite } of this.layers[this.view]) {
      const a = anchorFor(this.c, this.view, def.anchor, this.flipped);
      const ox = (def.offsetX ?? 0) * (this.flipped ? -1 : 1);
      sprite.setPosition(left + a.x + ox, top + a.y + (def.offsetY ?? 0));
      sprite.setFlipX(this.flipped);
      sprite.setAlpha(s.alpha);
    }
  }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
    for (const v of ['side', 'front']) this.layers[v].forEach((l) => l.sprite.destroy());
  }
}
