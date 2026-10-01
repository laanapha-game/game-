// Builds every texture (real art or placeholder), reports asset sizes, then starts scene 2.
import Phaser from 'phaser';
import { queueRealArt, buildTextures, queueCharacterSheets, prepareCharacterSheets } from '../assets/loader.js';
import { setupScene } from '../display/integerScale.js';
import { createPlaceholderCharacter } from '../interfaces.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Scene2Boot');
  }

  init(data) {
    this.startData = data;
    this.character = data?.character ?? this.registry.get('character') ?? createPlaceholderCharacter();
  }

  preload() {
    queueRealArt(this);
    // The player's sheets: scene 1 draws its characters in code and loads no textures,
    // so scene 2 loads the exported sheets itself (unless a host already did).
    queueCharacterSheets(this, this.character);
  }

  create() {
    setupScene(this);
    const report = buildTextures(this);
    const bad = report.filter((r) => !r.ok);
    if (bad.length) {
      console.warn('[scene2] asset size mismatches (expected = frames x frame width, frame height):');
      console.table(bad);
    }
    const needed = report.filter((r) => r.source === 'placeholder').map((r) => r.file);
    console.info(`[scene2] assets: ${report.length - needed.length} real, ${needed.length} SPRITE NEEDED`);
    if (needed.length) console.info('[scene2] sprites needed:', needed.join(', '));
    this.registry.set('realArt', new Set(report.filter((r) => r.source === 'art').map((r) => r.key)));
    if (import.meta.env.DEV) window.__scene2AssetReport = report;

    // Default bird as the fallback when the character's sheets are missing or the wrong size.
    // onWin still passes on the character the host sent.
    let shown = this.character;
    const problems = prepareCharacterSheets(this, shown);
    if (problems.length) {
      console.warn(`[scene2] character "${shown?.id}" cannot be shown, using the default bird:`, problems.join('; '));
      shown = createPlaceholderCharacter();
    }
    console.info(`[scene2] player: ${shown.id}`);
    this.scene.start('TrickOrTreat', { ...this.startData, character: shown, passOn: this.character });
  }
}
