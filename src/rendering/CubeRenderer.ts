import Phaser from "phaser";
import { Face, parseMove } from "../models/MoveNotation";
import type { CubeColor } from "../models/CubeModel";

const FACE_COLORS: Record<Face, CubeColor> = {
  [Face.U]: "white",
  [Face.D]: "yellow",
  [Face.L]: "orange",
  [Face.R]: "red",
  [Face.F]: "green",
  [Face.B]: "blue",
};

const COLOR_HEX: Record<CubeColor, number> = {
  white: 0xffffff,
  yellow: 0xffff00,
  green: 0x00cc44,
  blue: 0x0066ff,
  red: 0xff3333,
  orange: 0xff8800,
};

const OUTLINE = 0x111111;
const STICKER_BORDER = 0x222222;

interface FaceDef {
  face: Face;
  cornerIndices: number[];
  normalAxis: "x" | "y" | "z";
  normalSign: 1 | -1;
}

export class CubeRenderer {
  private scene: Phaser.Scene;
  private cubeContainer: Phaser.GameObjects.Container;
  private faceGraphics: Map<Face, Phaser.GameObjects.Graphics>;
  private edgeGraphics: Phaser.GameObjects.Graphics;
  private faceStickerColors: Map<Face, CubeColor[]>;
  private faceScreenPolygons: Map<Face, Phaser.Geom.Polygon>;
  private stickerScreenPolygons: Map<string, Phaser.Geom.Polygon>;
  private cubeX: number = 0;
  private cubeY: number = 0;
  private cubeSize: number = 130;
  private rotX: number = -0.5;
  private rotY: number = -0.5;
  private isAnimating: boolean = false;
  // when true, edges that belong to hidden faces (projections) are drawn.
  // default false so the cube looks solid when static.
  private showHiddenProjections: boolean = false;
  private focalLength: number = 500;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.faceGraphics = new Map();
    this.faceStickerColors = new Map();
    this.faceScreenPolygons = new Map();
    this.stickerScreenPolygons = new Map();
    this.cubeContainer = scene.add.container(0, 0);
    this.edgeGraphics = scene.add.graphics();

    this.cubeX = scene.cameras.main.width / 2;
    this.cubeY = scene.cameras.main.height / 2;

    this.initializeFaces();
    this.updatePosition();
  }

  private initializeFaces(): void {
    const faces: Face[] = [Face.U, Face.D, Face.L, Face.R, Face.F, Face.B];

    for (const face of faces) {
      const graphics = this.scene.add.graphics();
      graphics.setDepth(0);
      this.faceGraphics.set(face, graphics);
      this.cubeContainer.add(graphics);
      this.faceStickerColors.set(
        face,
        [...Array(9)].map(() => FACE_COLORS[face]) as CubeColor[],
      );
    }

    this.edgeGraphics.setDepth(100);
    this.cubeContainer.add(this.edgeGraphics);
  }

  public render(state?: CubeColor[][]): void {
    if (state) {
      const faceOrder: Face[] = [
        Face.U,
        Face.D,
        Face.L,
        Face.R,
        Face.F,
        Face.B,
      ];
      for (let i = 0; i < faceOrder.length; i++) {
        this.faceStickerColors.set(faceOrder[i], state[i]);
      }
    }
    this.updatePosition();
  }

  private updatePosition(): void {
    this.cubeX = this.scene.cameras.main.width / 2;
    this.cubeY = this.scene.cameras.main.height / 2;

    const half = this.cubeSize;

    const corners3D: { x: number; y: number; z: number }[] = [
      { x: -half, y: -half, z: -half },
      { x: half, y: -half, z: -half },
      { x: half, y: half, z: -half },
      { x: -half, y: half, z: -half },
      { x: -half, y: -half, z: half },
      { x: half, y: -half, z: half },
      { x: half, y: half, z: half },
      { x: -half, y: half, z: half },
    ];

    const rotatedCorners = corners3D.map((c) =>
      this.rotate3D(c.x, c.y, c.z, this.rotX, this.rotY),
    );

    const projectedCorners = rotatedCorners.map((c) =>
      this.project3D(c.x, c.y, c.z),
    );

    const faceDefs: FaceDef[] = [
      {
        face: Face.F,
        cornerIndices: [4, 5, 6, 7],
        normalAxis: "z",
        normalSign: 1,
      },
      {
        face: Face.B,
        cornerIndices: [1, 0, 3, 2],
        normalAxis: "z",
        normalSign: -1,
      },
      {
        face: Face.U,
        cornerIndices: [0, 1, 5, 4],
        normalAxis: "y",
        normalSign: -1,
      },
      {
        face: Face.D,
        cornerIndices: [7, 6, 2, 3],
        normalAxis: "y",
        normalSign: 1,
      },
      {
        face: Face.R,
        cornerIndices: [5, 1, 2, 6],
        normalAxis: "x",
        normalSign: 1,
      },
      {
        face: Face.L,
        cornerIndices: [0, 4, 7, 3],
        normalAxis: "x",
        normalSign: -1,
      },
    ];

    const visibleFaces: { face: Face; depth: number; def: FaceDef }[] = [];

    // Determine which faces are visible and collect them (for painter's algorithm)
    for (const def of faceDefs) {
      const idx = def.cornerIndices[0];
      const center = rotatedCorners[idx];
      const normal = this.getFaceNormal(def, this.rotX, this.rotY);

      if (normal.z < -0.25) {
        visibleFaces.push({
          face: def.face,
          depth: center.z,
          def: def,
        });
      }
    }

    visibleFaces.sort((a, b) => b.depth - a.depth);

    this.faceScreenPolygons.clear();
    this.stickerScreenPolygons.clear();

    // Clear and hide all face graphics initially
    for (const face of this.faceGraphics.keys()) {
      const graphics = this.faceGraphics.get(face);
      if (graphics) {
        graphics.clear();
        graphics.setVisible(false);
      }
    }

    // Draw visible faces in depth order
    for (let i = 0; i < visibleFaces.length; i++) {
      const { face, def } = visibleFaces[i];
      const graphics = this.faceGraphics.get(face);
      if (!graphics) continue;

      graphics.setVisible(true);
      graphics.setDepth(i * 10);

      this.drawFace(graphics, def, projectedCorners);
    }

    // Build a set of edges that belong to visible faces. When projection lines are
    // disabled, only these edges will be drawn to avoid showing lines from hidden faces.
    const edgesOfVisibleFaces = new Set<string>();
    for (const vf of visibleFaces) {
      const ci = vf.def.cornerIndices;
      const faceEdges: [number, number][] = [
        [ci[0], ci[1]],
        [ci[1], ci[2]],
        [ci[2], ci[3]],
        [ci[3], ci[0]],
      ];
      for (const [a, b] of faceEdges) {
        const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
        edgesOfVisibleFaces.add(key);
      }
    }

    this.drawCubeEdges(rotatedCorners, projectedCorners, edgesOfVisibleFaces);
  }

  // edgesOfVisibleFaces: set of normalized edge keys ("min-max") that belong to faces
  // currently visible. When showHiddenProjections is false, only edges in this set
  // are drawn (so hidden-face projection lines are suppressed).
  private drawCubeEdges(
    rotatedCorners: { x: number; y: number; z: number }[],
    projectedCorners: { x: number; y: number }[],
    edgesOfVisibleFaces: Set<string>,
  ): void {
    this.edgeGraphics.clear();

    const edges: [number, number][] = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 4],
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ];

    const cornerDepths = rotatedCorners.map((c) => c.z);
    const edgeDepths = edges.map(([a, b]) =>
      Math.min(cornerDepths[a], cornerDepths[b]),
    );

    const sortedEdgeIndices = edgeDepths
      .map((depth, index) => ({ depth, index }))
      .sort((a, b) => a.depth - b.depth);

    // Base line style for edges visible in front; opacity will vary slightly by depth
    this.edgeGraphics.lineStyle(2, 0x000000, 0.9);

    for (const { index } of sortedEdgeIndices) {
      const [a, b] = edges[index];

      // If projection lines for hidden faces are disabled, skip edges that are
      // not part of any currently visible face.
      const edgeKey = `${Math.min(a, b)}-${Math.max(a, b)}`;
      if (!this.showHiddenProjections && !edgesOfVisibleFaces.has(edgeKey)) {
        continue;
      }

      const p1 = projectedCorners[a];
      const p2 = projectedCorners[b];

      const avgZ = (cornerDepths[a] + cornerDepths[b]) / 2;
      this.edgeGraphics.lineStyle(2, 0x000000, 0.6 + avgZ / 500);

      this.edgeGraphics.beginPath();
      this.edgeGraphics.moveTo(this.cubeX + p1.x, this.cubeY + p1.y);
      this.edgeGraphics.lineTo(this.cubeX + p2.x, this.cubeY + p2.y);
      this.edgeGraphics.strokePath();
    }
  }

  private drawFace(
    graphics: Phaser.GameObjects.Graphics,
    def: FaceDef,
    projectedCorners: { x: number; y: number }[],
  ): void {
    const corners: { x: number; y: number }[] = def.cornerIndices.map(
      (i: number) => projectedCorners[i],
    );

    const colors: CubeColor[] = this.faceStickerColors.get(def.face) || [];

    const screenCorners = corners.map((c) => ({
      x: this.cubeX + c.x,
      y: this.cubeY + c.y,
    }));

    this.faceScreenPolygons.set(
      def.face,
      new Phaser.Geom.Polygon(
        screenCorners.map(
          (corner) => new Phaser.Geom.Point(corner.x, corner.y),
        ),
      ),
    );

    graphics.fillStyle(COLOR_HEX[FACE_COLORS[def.face]], 1);
    graphics.beginPath();
    graphics.moveTo(screenCorners[0].x, screenCorners[0].y);
    for (let i = 1; i < 4; i++) {
      graphics.lineTo(screenCorners[i].x, screenCorners[i].y);
    }
    graphics.closePath();
    graphics.fillPath();

    const gridSize = 3;
    const inset = 0.06;

    const lerp = (
      a: { x: number; y: number },
      b: { x: number; y: number },
      t: number,
    ) => ({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    });

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const stickerIdx = row * gridSize + col;
        const color: CubeColor = colors[stickerIdx] || FACE_COLORS[def.face];
        const colorHex = COLOR_HEX[color];

        const u0 = col / gridSize;
        const u1 = (col + 1) / gridSize;
        const v0 = row / gridSize;
        const v1 = (row + 1) / gridSize;

        const topLeft = lerp(screenCorners[0], screenCorners[1], u0);
        const topRight = lerp(screenCorners[0], screenCorners[1], u1);
        const bottomLeft = lerp(screenCorners[3], screenCorners[2], u0);
        const bottomRight = lerp(screenCorners[3], screenCorners[2], u1);

        const p0 = lerp(topLeft, bottomLeft, v0);
        const p1 = lerp(topRight, bottomRight, v0);
        const p2 = lerp(topRight, bottomRight, v1);
        const p3 = lerp(topLeft, bottomLeft, v1);

        const cx = (p0.x + p1.x + p2.x + p3.x) / 4;
        const cy = (p0.y + p1.y + p2.y + p3.y) / 4;

        const stickerCorners = [p0, p1, p2, p3].map((p) => ({
          x: cx + (p.x - cx) * (1 - inset),
          y: cy + (p.y - cy) * (1 - inset),
        }));

        this.stickerScreenPolygons.set(
          `${def.face}:${stickerIdx}`,
          new Phaser.Geom.Polygon(
            stickerCorners.map(
              (corner) => new Phaser.Geom.Point(corner.x, corner.y),
            ),
          ),
        );

        graphics.fillStyle(colorHex, 1);
        graphics.beginPath();
        graphics.moveTo(stickerCorners[0].x, stickerCorners[0].y);
        for (let i = 1; i < 4; i++) {
          graphics.lineTo(stickerCorners[i].x, stickerCorners[i].y);
        }
        graphics.closePath();
        graphics.fillPath();

        graphics.lineStyle(1, STICKER_BORDER, 1);
        graphics.beginPath();
        graphics.moveTo(stickerCorners[0].x, stickerCorners[0].y);
        for (let i = 1; i < 4; i++) {
          graphics.lineTo(stickerCorners[i].x, stickerCorners[i].y);
        }
        graphics.closePath();
        graphics.strokePath();
      }
    }
  }

  private getFaceNormal(
    def: FaceDef,
    rotX: number,
    rotY: number,
  ): { x: number; y: number; z: number } {
    let nx = 0,
      ny = 0,
      nz = 0;
    if (def.normalAxis === "x") nx = def.normalSign;
    if (def.normalAxis === "y") ny = def.normalSign;
    if (def.normalAxis === "z") nz = def.normalSign;

    return this.rotate3D(nx, ny, nz, rotX, rotY);
  }

  private rotate3D(
    x: number,
    y: number,
    z: number,
    rotX: number,
    rotY: number,
  ): { x: number; y: number; z: number } {
    let y1 = y * Math.cos(rotX) - z * Math.sin(rotX);
    let z1 = y * Math.sin(rotX) + z * Math.cos(rotX);

    let x2 = x * Math.cos(rotY) + z1 * Math.sin(rotY);
    let z2 = -x * Math.sin(rotY) + z1 * Math.cos(rotY);

    return { x: x2, y: y1, z: z2 };
  }

  private project3D(x: number, y: number, z: number): { x: number; y: number } {
    const scale = this.focalLength / (this.focalLength + z);
    return {
      x: x * scale,
      y: y * scale,
    };
  }

  public animateMove(move: string, onComplete: () => void): void {
    const definition = parseMove(move);
    if (!definition) {
      onComplete();
      return;
    }

    this.isAnimating = true;
    const duration = 120;

    this.scene.tweens.add({
      targets: this.cubeContainer,
      scaleX: 1.03,
      scaleY: 1.03,
      duration: duration,
      yoyo: true,
      ease: "Quad.easeInOut",
      onComplete: () => {
        this.isAnimating = false;
        onComplete();
      },
    });
  }

  public setCubeRotation(rotX: number, rotY: number): void {
    this.rotX = rotX;
    this.rotY = rotY;
    this.updatePosition();
  }

  // Toggle whether projection (hidden-face) lines are drawn. When false (default)
  // projection lines from faces facing away from the camera are hidden to give a
  // more solid look. Set to true while the user is dragging/rotating the cube.
  public setShowProjectionLines(enabled: boolean): void {
    this.showHiddenProjections = enabled;
    this.updatePosition();
  }

  public getCubeRotation(): { x: number; y: number } {
    return { x: this.rotX, y: this.rotY };
  }

  // Projects a point in cube-local unit space (i.e. coordinates in [-1, 1],
  // matching CubeInputController's face-local basis vectors) to screen space
  // using the current cube rotation, via the same rotate3D/project3D
  // pipeline used for rendering. Used by CubeInputController to compare
  // candidate drag-to-move rotations directly in screen space.
  public projectLocalPoint(x: number, y: number, z: number): { x: number; y: number } {
    const half = this.cubeSize;
    const rotated = this.rotate3D(x * half, y * half, z * half, this.rotX, this.rotY);
    return this.project3D(rotated.x, rotated.y, rotated.z);
  }

  public getFaceAtScreenPosition(x: number, y: number): Face | null {
    for (const [face, polygon] of this.faceScreenPolygons.entries()) {
      if (Phaser.Geom.Polygon.Contains(polygon, x, y)) {
        return face;
      }
    }

    return null;
  }

  public getStickerAtScreenPosition(
    x: number,
    y: number,
  ): { face: Face; stickerIndex: number; row: number; col: number } | null {
    for (const [key, polygon] of this.stickerScreenPolygons.entries()) {
      if (Phaser.Geom.Polygon.Contains(polygon, x, y)) {
        const [faceStr, stickerStr] = key.split(":");
        const face = faceStr as Face;
        const stickerIndex = parseInt(stickerStr, 10);
        const row = Math.floor(stickerIndex / 3);
        const col = stickerIndex % 3;
        return { face, stickerIndex, row, col };
      }
    }

    return null;
  }

  public getFaceScreenAxes(face: Face): { colX: number; colY: number; rowX: number; rowY: number } | null {
    const polygon = this.faceScreenPolygons.get(face);
    if (!polygon || polygon.points.length < 4) return null;

    const p0 = polygon.points[0];
    const p1 = polygon.points[1];
    const p3 = polygon.points[3];

    const cx = p1.x - p0.x;
    const cy = p1.y - p0.y;
    const rx = p3.x - p0.x;
    const ry = p3.y - p0.y;

    const cLen = Math.sqrt(cx * cx + cy * cy);
    const rLen = Math.sqrt(rx * rx + ry * ry);
    if (cLen === 0 || rLen === 0) return null;

    return {
      colX: cx / cLen,
      colY: cy / cLen,
      rowX: rx / rLen,
      rowY: ry / rLen,
    };
  }

  public getStickerCenter(face: Face, stickerIndex: number): { x: number; y: number } | null {
    const key = `${face}:${stickerIndex}`;
    const polygon = this.stickerScreenPolygons.get(key);
    if (!polygon) return null;

    const points = polygon.points;
    let sumX = 0;
    let sumY = 0;
    for (const point of points) {
      sumX += point.x;
      sumY += point.y;
    }
    return { x: sumX / points.length, y: sumY / points.length };
  }

  public handleResize(): void {
    this.updatePosition();
  }

  public isMoveAnimating(): boolean {
    return this.isAnimating;
  }

  public renderFromModel(model: { getState: () => CubeColor[][] }): void {
    this.render(model.getState());
  }
}
