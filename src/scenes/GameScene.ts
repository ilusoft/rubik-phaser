import Phaser from "phaser";
import { CubeModel } from "../models/CubeModel";
import { CubeRenderer } from "../rendering/CubeRenderer";
import { CubeInputController } from "../input/CubeInputController";

export class GameScene extends Phaser.Scene {
  private cubeModel!: CubeModel;
  private cubeRenderer!: CubeRenderer;
  private inputController!: CubeInputController;
  private isAnimating: boolean = false;
  private moveHistory: string[] = [];
  private eventEmitter: Phaser.Events.EventEmitter;

  constructor() {
    super({ key: "GameScene" });
    this.eventEmitter = new Phaser.Events.EventEmitter();
  }

  create(): void {
    this.cubeModel = new CubeModel();
    this.cubeRenderer = new CubeRenderer(this);
    this.inputController = new CubeInputController(
      this,
      this.cubeModel,
      this.cubeRenderer,
    );

    this.cubeRenderer.render(this.cubeModel.getState());

    this.setupEventListeners();

    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene');
    }
  }

  private setupEventListeners(): void {
    this.inputController.on("move", (move: string) => {
      this.executeMove(move);
    });

    this.events.on("resize", this.handleResize, this);
  }

  public executeMove(move: string): void {
    if (this.isAnimating) return;

    this.isAnimating = true;
    this.moveHistory.push(move);

    this.cubeModel.applyMove(move);
    this.cubeRenderer.animateMove(move, () => {
      this.cubeRenderer.render(this.cubeModel.getState());
      this.isAnimating = false;
      this.checkSolved();
    });

    this.events.emit("move-executed", move, this.moveHistory.length);
  }

  public scramble(): void {
    if (this.isAnimating) return;

    const moves = this.cubeModel.generateScramble(20);
    this.moveHistory = [...moves];

    let index = 0;
    const executeNext = () => {
      if (index < moves.length) {
        this.isAnimating = true;
        this.cubeModel.applyMove(moves[index]);
        this.cubeRenderer.animateMove(moves[index], () => {
          this.cubeRenderer.render(this.cubeModel.getState());
          index++;
          this.isAnimating = false;
          this.events.emit("move-executed", moves[index - 1], index);
          if (index < moves.length) {
            executeNext();
          } else {
            this.events.emit("scramble-executed");
          }
        });
      }
    };
    executeNext();

    this.events.emit("scramble-executed");
  }

  public reset(): void {
    if (this.isAnimating) return;

    this.cubeModel.reset();
    this.moveHistory = [];
    this.cubeRenderer.render(this.cubeModel.getState());
    this.events.emit("reset");
  }

  public undo(): void {
    if (this.isAnimating || this.moveHistory.length === 0) return;

    const lastMove = this.moveHistory.pop();
    if (!lastMove) return;

    const inverseMove = this.getInverseMove(lastMove);
    this.isAnimating = true;

    this.cubeModel.applyMove(inverseMove);
    this.cubeRenderer.animateMove(inverseMove, () => {
      this.isAnimating = false;
    });

    this.events.emit("undo", lastMove);
  }

  private getInverseMove(move: string): string {
    if (move.endsWith("'")) {
      return move.slice(0, -1);
    } else if (move.endsWith("2")) {
      return move;
    } else {
      return move + "'";
    }
  }

  private checkSolved(): void {
    if (this.cubeModel.isSolved()) {
      this.events.emit("cube-solved", this.moveHistory.length);
    }
  }

  private handleResize(): void {
    this.cubeRenderer.handleResize();
  }

  public getMoveHistory(): string[] {
    return [...this.moveHistory];
  }

  public getCubeModel(): CubeModel {
    return this.cubeModel;
  }

  public getCubeRenderer(): CubeRenderer {
    return this.cubeRenderer;
  }

  public isMoveInProgress(): boolean {
    return this.isAnimating;
  }
}
