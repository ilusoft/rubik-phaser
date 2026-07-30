import Phaser from 'phaser';

export interface ControlButtonConfig {
    x: number;
    y: number;
    label: string;
    callback: () => void;
    width?: number;
    height?: number;
}

export class ControlPanel {
    private scene: Phaser.Scene;
    private buttons: Map<string, { graphics: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text }>;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.buttons = new Map();
    }

    public createButton(config: ControlButtonConfig): void {
        const { x, y, label, callback, width = 100, height = 40 } = config;

        const button = this.scene.add.graphics();
        button.fillStyle(0x4a9eff, 1);
        button.fillRoundedRect(x - width / 2, y - height / 2, width, height, 8);

        const text = this.scene.add.text(x, y, label, {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#ffffff',
        });
        text.setOrigin(0.5, 0.5);

        const hitArea = new Phaser.Geom.Rectangle(x - width / 2, y - height / 2, width, height);

        button.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

        button.on('pointerover', () => {
            button.clear();
            button.fillStyle(0x6ab0ff, 1);
            button.fillRoundedRect(x - width / 2, y - height / 2, width, height, 8);
        });

        button.on('pointerout', () => {
            button.clear();
            button.fillStyle(0x4a9eff, 1);
            button.fillRoundedRect(x - width / 2, y - height / 2, width, height, 8);
        });

        button.on('pointerdown', callback);
        text.on('pointerdown', callback);

        this.buttons.set(label, { graphics: button, text });
    }

    public setButtonEnabled(label: string, enabled: boolean): void {
        const button = this.buttons.get(label);
        if (button) {
            button.graphics.setAlpha(enabled ? 1 : 0.5);
            button.graphics.disableInteractive();
        }
    }

    public destroy(): void {
        for (const button of this.buttons.values()) {
            button.graphics.destroy();
            button.text.destroy();
        }
        this.buttons.clear();
    }
}
