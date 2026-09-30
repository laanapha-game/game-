// Builds every texture (real art or placeholder), reports asset sizes, then starts scene 2.
import Phaser from 'phaser';
import { queueRealArt, buildTextures } from '../assets/loader.js';
import { setupScene } from '../display/integerScale.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Scene2Boot');
  }

  init(data) {
    this.startData = data;
  }

  preload() {
    queueRealArt(this);
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
    this.scene.start('TrickOrTreat', this.startData);
  }
}
