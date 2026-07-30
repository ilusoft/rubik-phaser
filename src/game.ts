import Phaser from 'phaser';

export function createGameConfig(scenes: typeof Phaser.Scene[]): Phaser.Types.Core.GameConfig {
    return {
        type: Phaser.AUTO,
        width: window.innerWidth,
        height: window.innerHeight,
        parent: 'game-container',
        backgroundColor: '#1a1a2e',
        scene: scenes,
        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        input: {
            touch: {
                capture: true,
            },
        },
        render: {
            antialias: true,
            pixelArt: false,
        },
    };
}
