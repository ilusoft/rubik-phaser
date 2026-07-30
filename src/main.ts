import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { createGameConfig } from './game';

const config = createGameConfig([BootScene, GameScene, UIScene]);

const game = new Phaser.Game(config);
(window as any).__game = game;
