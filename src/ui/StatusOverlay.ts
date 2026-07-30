import Phaser from 'phaser';

export interface StatusOverlayConfig {
    x: number;
    y: number;
    width?: number;
    height?: number;
}

export class StatusOverlay {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private moveCountText: Phaser.GameObjects.Text;
    private timerText: Phaser.GameObjects.Text;
    private statusText: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, config: StatusOverlayConfig) {
        this.scene = scene;
        const { x, y, width = 200, height = 100 } = config;

        this.container = scene.add.container(x, y);

        const background = scene.add.graphics();
        background.fillStyle(0x000000, 0.5);
        background.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
        this.container.add(background);

        this.moveCountText = scene.add.text(-width / 2 + 10, -height / 2 + 10, 'Moves: 0', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#ffffff',
        });
        this.container.add(this.moveCountText);

        this.timerText = scene.add.text(-width / 2 + 10, -height / 2 + 35, 'Time: 0:00', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#ffffff',
        });
        this.container.add(this.timerText);

        this.statusText = scene.add.text(0, height / 2 - 30, 'Playing', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#aaaaaa',
        });
        this.statusText.setOrigin(0.5, 0.5);
        this.container.add(this.statusText);
    }

    public updateMoveCount(count: number): void {
        this.moveCountText.setText(`Moves: ${count}`);
    }

    public updateTimer(seconds: number): void {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        this.timerText.setText(`Time: ${minutes}:${secs.toString().padStart(2, '0')}`);
    }

    public setStatus(status: string, color: string = '#aaaaaa'): void {
        this.statusText.setText(status);
        this.statusText.setColor(color);
    }

    public getContainer(): Phaser.GameObjects.Container {
        return this.container;
    }

    public setPosition(x: number, y: number): void {
        this.container.setPosition(x, y);
    }

    public setDepth(depth: number): void {
        this.container.setDepth(depth);
    }

    public destroy(): void {
        this.container.destroy();
    }
}
