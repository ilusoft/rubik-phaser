import Phaser from "phaser";
import { GameScene } from "./GameScene";

export class UIScene extends Phaser.Scene {
  private gameScene!: GameScene;
  private moveCountText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private moveHistoryText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "UIScene" });
  }

  create(): void {
    this.gameScene = this.scene.get("GameScene") as GameScene;

    this.createUI();
    this.setupEventListeners();
  }

  private createUI(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const panelWidth = 340;
    const panelHeight = 640;
    const padding = 20;
    const panelX = width - panelWidth - 20;
    const panelY = 20;

    const panel = this.add.graphics();
    panel.fillStyle(0x0f172a, 0.92);
    panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 22);
    panel.lineStyle(2, 0x4a9eff, 0.9);
    panel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 22);

    const title = this.add
      .text(panelX + panelWidth / 2, panelY + padding, "Controls", {
        fontSize: "22px",
        fontFamily: "Arial",
        color: "#ffffff",
      })
      .setOrigin(0.5, 0);

    this.add
      .text(
        panelX + panelWidth / 2,
        title.y + 30,
        "Click buttons or press keys to move faces.",
        {
          fontSize: "12px",
          fontFamily: "Arial",
          color: "#cbd5e1",
          align: "center",
          wordWrap: { width: panelWidth - padding * 2, useAdvancedWrap: true },
        },
      )
      .setOrigin(0.5, 0);

    const actionStartY = panelY + 90;
    const actionX = panelX + panelWidth / 2;

    this.createButton(
      actionX,
      actionStartY,
      "Scramble",
      () => this.gameScene.scramble(),
      120,
      40,
    );
    this.createButton(
      actionX,
      actionStartY + 52,
      "Reset",
      () => this.gameScene.reset(),
      120,
      40,
    );
    this.createButton(
      actionX,
      actionStartY + 104,
      "Undo",
      () => this.gameScene.undo(),
      120,
      40,
    );

    const gridStartY = actionStartY + 190;
    const cellWidth = 88;
    const cellSpacing = 12;
    const buttonWidth = 36;
    const buttonHeight = 36;
    const rowWidth = cellWidth * 3 + cellSpacing * 2;
    const firstCellX = panelX + (panelWidth - rowWidth) / 2 + cellWidth / 2;
    const rowPadding = 25;
    const rowBlockHeight = buttonHeight + rowPadding * 2;
    const colPadding = 4;

    const moveRows = [
      [
        ["U", "U'"],
        ["E", "E'"],
        ["D", "D'"],
      ],
      [
        ["L", "L'"],
        ["M", "M'"],
        ["R", "R'"],
      ],
      [
        ["F", "F'"],
        ["S", "S'"],
        ["B", "B'"],
      ],
    ];

    this.add
      .text(panelX + panelWidth / 2, gridStartY - 36, "Move Grid", {
        fontSize: "18px",
        fontFamily: "Arial",
        color: "#ffffff",
      })
      .setOrigin(0.5, 0);

    let rowY = gridStartY;
    for (const row of moveRows) {
      let cellX = firstCellX;
      const buttonY = rowY + rowPadding;

      for (const pair of row) {
        const [face, prime] = pair;
        const leftButtonX = cellX - buttonWidth / 2 - colPadding;
        const rightButtonX = cellX + buttonWidth / 2 + colPadding;

        this.createButton(
          leftButtonX,
          buttonY,
          face,
          () => this.gameScene.executeMove(face),
          buttonWidth,
          buttonHeight,
        );
        this.createButton(
          rightButtonX,
          buttonY,
          prime,
          () => this.gameScene.executeMove(prime),
          buttonWidth,
          buttonHeight,
        );
        cellX += cellWidth + cellSpacing;
      }

      rowY += rowBlockHeight;
    }

    const helpTitle = this.add
      .text(panelX + panelWidth / 2, rowY + 12, "Keyboard shortcuts", {
        fontSize: "12px",
        fontFamily: "Arial",
        color: "#ffffff",
      })
      .setOrigin(0.5, 0);

    this.add
      .text(
        panelX + panelWidth / 2,
        helpTitle.y + 20,
        "U/D/L/R/F/B/M/E/S = move · Shift + key = prime",
        {
          fontSize: "11px",
          fontFamily: "Arial",
          color: "#cbd5e1",
          align: "center",
          wordWrap: { width: panelWidth - padding * 2, useAdvancedWrap: true },
        },
      )
      .setOrigin(0.5, 0);

    this.moveCountText = this.add.text(20, 20, "Moves: 0", {
      fontSize: "18px",
      fontFamily: "Arial",
      color: "#ffffff",
    });

    this.statusText = this.add.text(width / 2, 30, "Rubik's Cube", {
      fontSize: "24px",
      fontFamily: "Arial",
      color: "#4a9eff",
    });
    this.statusText.setOrigin(0.5, 0.5);

    this.moveHistoryText = this.add.text(20, height - 90, "", {
      fontSize: "14px",
      fontFamily: "Arial",
      color: "#aaaaaa",
    });
    this.moveHistoryText.setWordWrapWidth(
      Math.min(260, width - panelWidth - 60),
    );
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    callback: () => void,
    width: number = 100,
    height: number = 40,
  ): void {
    const button = this.add.graphics();
    button.fillStyle(0x4a9eff, 1);
    button.fillRoundedRect(x - width / 2, y - height / 2, width, height, 8);

    const text = this.add.text(x, y, label, {
      fontSize: "16px",
      fontFamily: "Arial",
      color: "#ffffff",
    });
    text.setOrigin(0.5, 0.5);

    button.setInteractive(
      new Phaser.Geom.Rectangle(x - width / 2, y - height / 2, width, height),
      Phaser.Geom.Rectangle.Contains,
    );

    button.on("pointerover", () => {
      button.clear();
      button.fillStyle(0x6ab0ff, 1);
      button.fillRoundedRect(x - width / 2, y - height / 2, width, height, 8);
    });

    button.on("pointerout", () => {
      button.clear();
      button.fillStyle(0x4a9eff, 1);
      button.fillRoundedRect(x - width / 2, y - height / 2, width, height, 8);
    });

    button.on("pointerdown", callback);
    text.on("pointerdown", callback);
  }

  private setupEventListeners(): void {
    this.gameScene.events.on(
      "move-executed",
      (_move: string, count: number) => {
        this.moveCountText.setText(`Moves: ${count}`);
        this.updateMoveHistory();
      },
    );

    this.gameScene.events.on("scramble-executed", () => {
      this.statusText.setText("Scrambled!");
      this.statusText.setColor("#ffaa00");
      this.moveCountText.setText(
        `Moves: ${this.gameScene.getMoveHistory().length}`,
      );
      this.updateMoveHistory();
    });

    this.gameScene.events.on("reset", () => {
      this.moveCountText.setText("Moves: 0");
      this.statusText.setText("Rubik's Cube");
      this.statusText.setColor("#4a9eff");
      this.moveHistoryText.setText("");
    });

    this.gameScene.events.on("undo", () => {
      this.updateMoveHistory();
    });

    this.gameScene.events.on("cube-solved", (moves: number) => {
      this.statusText.setText(`Solved in ${moves} moves!`);
      this.statusText.setColor("#00ff00");
    });
  }

  private updateMoveHistory(): void {
    const history = this.gameScene.getMoveHistory();
    const recentMoves = history.slice(-10).join(" ");
    if (history.length > 10) {
      this.moveHistoryText.setText(`...${recentMoves}`);
    } else {
      this.moveHistoryText.setText(recentMoves);
    }
  }
}
