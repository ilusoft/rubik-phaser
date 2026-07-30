import Phaser from "phaser";
import type { CubeModel } from "../models/CubeModel";
import type { CubeRenderer } from "../rendering/CubeRenderer";
import { Face } from "../models/MoveNotation";

interface StickerHit {
  face: Face;
  row: number;
  col: number;
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export class CubeInputController extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private cubeModel: CubeModel;
  private cubeRenderer: CubeRenderer;
  private isDragging: boolean = false;
  private isCubeRotation: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private lastDragX: number = 0;
  private lastDragY: number = 0;
  private dragStartSticker: StickerHit | null = null;

  constructor(
    scene: Phaser.Scene,
    cubeModel: CubeModel,
    cubeRenderer: CubeRenderer,
  ) {
    super();
    this.scene = scene;
    this.cubeModel = cubeModel;
    this.cubeRenderer = cubeRenderer;

    this.setupKeyboardInput();
    this.setupPointerInput();
  }

  private setupKeyboardInput(): void {
    this.scene.input.keyboard?.on("keydown", this.onKeyDown, this);
  }

  private onKeyDown(event: KeyboardEvent): void {
    const key = event.key.toUpperCase();
    if (!["U", "D", "L", "R", "F", "B", "M", "E", "S"].includes(key)) {
      return;
    }

    const move = event.shiftKey ? `${key}'` : key;
    this.emit("move", move);
  }

  private setupPointerInput(): void {
    this.scene.input.on("pointerdown", this.onPointerDown, this);
    this.scene.input.on("pointermove", this.onPointerMove, this);
    this.scene.input.on("pointerup", this.onPointerUp, this);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (pointer.rightButtonDown()) {
      return;
    }

    this.isDragging = true;
    this.dragStartX = pointer.x;
    this.dragStartY = pointer.y;
    this.lastDragX = pointer.x;
    this.lastDragY = pointer.y;

    const stickerHit = this.cubeRenderer.getStickerAtScreenPosition(
      pointer.x,
      pointer.y,
    );
    this.dragStartSticker = stickerHit;
    this.isCubeRotation = !stickerHit;

    this.cubeRenderer.setShowProjectionLines(false);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isDragging) return;

    if (!this.isCubeRotation) return;

    const deltaX = pointer.x - this.lastDragX;
    const deltaY = pointer.y - this.lastDragY;

    this.lastDragX = pointer.x;
    this.lastDragY = pointer.y;

    const currentRot = this.cubeRenderer.getCubeRotation();
    this.cubeRenderer.setCubeRotation(
      currentRot.x + deltaY * 0.005,
      currentRot.y + deltaX * 0.005,
    );
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.isDragging) return;

    const deltaX = pointer.x - this.dragStartX;
    const deltaY = pointer.y - this.dragStartY;
    const dragDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    this.isDragging = false;
    this.isCubeRotation = false;

    this.cubeRenderer.setShowProjectionLines(false);

    if (this.dragStartSticker && dragDistance >= 15) {
      this.handleDragToMove(deltaX, deltaY);
    } else if (dragDistance < 10) {
      this.handleTap(pointer);
    }

    this.dragStartSticker = null;
  }

  private handleTap(pointer: Phaser.Input.Pointer): void {
    const clickedFace = this.cubeRenderer.getFaceAtScreenPosition(
      pointer.x,
      pointer.y,
    );
    if (!clickedFace) return;

    const event = pointer.event as MouseEvent | undefined;
    const hasShift = event?.shiftKey ?? false;
    const hasAltModifier = event?.altKey ?? false;
    const hasMetaModifier = event?.metaKey ?? false;

    let move: string = clickedFace;
    if (hasShift && (hasAltModifier || hasMetaModifier)) {
      move = `${clickedFace}'2`;
    } else if (hasAltModifier || hasMetaModifier) {
      move = `${clickedFace}2`;
    } else if (hasShift) {
      move = `${clickedFace}'`;
    }

    this.emit("move", move);
  }

  // Per-face local basis vectors in cube-local (model) space. These are fixed
  // and independent of the current view rotation. col/row correspond to the
  // sticker grid's local column/row directions (matching CubeRenderer's
  // corner ordering), and normal is the outward face normal.
  private static readonly FACE_AXES: Record<
    Face,
    { col: Vec3; row: Vec3; normal: Vec3 }
  > = {
    [Face.F]: {
      col: { x: 1, y: 0, z: 0 },
      row: { x: 0, y: 1, z: 0 },
      normal: { x: 0, y: 0, z: 1 },
    },
    [Face.B]: {
      col: { x: -1, y: 0, z: 0 },
      row: { x: 0, y: 1, z: 0 },
      normal: { x: 0, y: 0, z: -1 },
    },
    [Face.U]: {
      col: { x: 1, y: 0, z: 0 },
      row: { x: 0, y: 0, z: 1 },
      normal: { x: 0, y: -1, z: 0 },
    },
    [Face.D]: {
      col: { x: 1, y: 0, z: 0 },
      row: { x: 0, y: 0, z: -1 },
      normal: { x: 0, y: 1, z: 0 },
    },
    [Face.R]: {
      col: { x: 0, y: 0, z: -1 },
      row: { x: 0, y: 1, z: 0 },
      normal: { x: 1, y: 0, z: 0 },
    },
    [Face.L]: {
      col: { x: 0, y: 0, z: 1 },
      row: { x: 0, y: 1, z: 0 },
      normal: { x: -1, y: 0, z: 0 },
    },
  };

  // For each global axis, the three moves found at coordinate -1 (neg pole),
  // 0 (middle slice) and +1 (pos pole) along that axis.
  private static readonly AXIS_POLES: Record<
    "x" | "y" | "z",
    { neg: string; mid: string; pos: string }
  > = {
    x: { neg: "L", mid: "M", pos: "R" },
    y: { neg: "U", mid: "E", pos: "D" },
    z: { neg: "B", mid: "S", pos: "F" },
  };

  // Rotation-sign convention for each unprimed base move, matching
  // CubeModel's MOVE_SPECS exactly (axis + degree used to build
  // MOVE_PERMUTATIONS from the same face geometry as FACE_AXES above).
  private static readonly MOVE_AXIS_SIGN: Record<
    string,
    { axis: "x" | "y" | "z"; sign: 1 | -1 }
  > = {
    U: { axis: "y", sign: 1 },
    D: { axis: "y", sign: -1 },
    E: { axis: "y", sign: -1 },
    L: { axis: "x", sign: 1 },
    R: { axis: "x", sign: -1 },
    M: { axis: "x", sign: 1 },
    F: { axis: "z", sign: -1 },
    B: { axis: "z", sign: 1 },
    S: { axis: "z", sign: -1 },
  };

  private static scale(v: Vec3, s: number): Vec3 {
    return { x: v.x * s, y: v.y * s, z: v.z * s };
  }

  private static add(a: Vec3, b: Vec3): Vec3 {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  }

  private static dot(a: Vec3, b: Vec3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  // Rotate a point by `deg` degrees about the given axis, using the exact
  // same right-handed rotation convention as CubeModel.rotateAxis /
  // CubeRenderer.rotate3D.
  private static rotateAxis(p: Vec3, axis: "x" | "y" | "z", deg: number): Vec3 {
    const rad = (deg * Math.PI) / 180;
    const cs = Math.cos(rad);
    const sn = Math.sin(rad);
    if (axis === "x") {
      return { x: p.x, y: p.y * cs - p.z * sn, z: p.y * sn + p.z * cs };
    }
    if (axis === "y") {
      return { x: p.x * cs + p.z * sn, y: p.y, z: -p.x * sn + p.z * cs };
    }
    return { x: p.x * cs - p.y * sn, y: p.x * sn + p.y * cs, z: p.z };
  }

  private static dominantAxis(
    v: Vec3,
  ): { axis: "x" | "y" | "z"; sign: 1 | -1 } | null {
    const absX = Math.abs(v.x);
    const absY = Math.abs(v.y);
    const absZ = Math.abs(v.z);
    const max = Math.max(absX, absY, absZ);
    if (max < 1e-6) return null;
    if (absX === max) return { axis: "x", sign: v.x > 0 ? 1 : -1 };
    if (absY === max) return { axis: "y", sign: v.y > 0 ? 1 : -1 };
    return { axis: "z", sign: v.z > 0 ? 1 : -1 };
  }

  private handleDragToMove(deltaX: number, deltaY: number): void {
    if (!this.dragStartSticker) return;
    const { face, row, col } = this.dragStartSticker;

    const axes = this.cubeRenderer.getFaceScreenAxes(face);
    if (!axes) return;

    // Project the screen-space drag delta onto the face's current
    // (rotation-aware) screen-projected col/row axes. This tells us, in the
    // face's own local coordinate system, whether the drag moved along the
    // local column or row direction, and in which local sign (+/-),
    // regardless of how the cube is currently rotated on screen.
    const colProj = deltaX * axes.colX + deltaY * axes.colY;
    const rowProj = deltaX * axes.rowX + deltaY * axes.rowY;

    const absCol = Math.abs(colProj);
    const absRow = Math.abs(rowProj);

    const minProjectionPx = 6;
    if (absCol < minProjectionPx && absRow < minProjectionPx) return;

    const isHorizontal = absCol > absRow;
    const dragSign: 1 | -1 = isHorizontal
      ? colProj > 0
        ? 1
        : -1
      : rowProj > 0
        ? 1
        : -1;

    const faceAxes = CubeInputController.FACE_AXES[face];

    // The drag direction in cube-local 3D space.
    const dragLocalVec = isHorizontal
      ? CubeInputController.scale(faceAxes.col, dragSign)
      : CubeInputController.scale(faceAxes.row, dragSign);

    // The rotation axis is always axis-aligned (±X/±Y/±Z), and its *identity*
    // (which of x/y/z) is exactly the axis of the local basis vector that is
    // NOT involved in the drag direction: the row vector's axis for
    // horizontal drags, the col vector's axis for vertical drags. (normal,
    // col, and row form an orthogonal axis-aligned basis per face.)
    const layerAxisVec = isHorizontal ? faceAxes.row : faceAxes.col;
    const layerAxisInfo = CubeInputController.dominantAxis(layerAxisVec);
    if (!layerAxisInfo) return;
    const axisKey = layerAxisInfo.axis;

    // The layer (which of the 3 slices along that axis) is selected by the
    // sticker's row (for horizontal drags) or col (for vertical drags).
    const layerIndex = isHorizontal ? row : col;
    const layerCoordVec = CubeInputController.scale(
      layerAxisVec,
      layerIndex - 1,
    );

    const poles = CubeInputController.AXIS_POLES[axisKey];

    let baseMove: string;
    if (layerIndex === 1) {
      baseMove = poles.mid;
    } else {
      const coordOnAxis = layerCoordVec[axisKey];
      baseMove = coordOnAxis < 0 ? poles.neg : poles.pos;
    }

    const signInfo = CubeInputController.MOVE_AXIS_SIGN[baseMove];
    if (!signInfo) return;

    // Determine rotation sign by comparing the two candidate moves (unprimed
    // vs primed) directly in SCREEN SPACE, using the exact same
    // rotate3D/project3D pipeline the renderer uses (via
    // CubeRenderer.projectLocalPoint), rather than comparing in local cube
    // space. This matters because a candidate rotation's displacement is
    // not confined to the clicked face's own tangent plane (e.g. a corner
    // sticker rotating about a different face's axis), so comparing it
    // against the local drag direction can disagree with how it actually
    // projects to the screen under the current (possibly rotated) view.
    const stickerPos = CubeInputController.add(
      faceAxes.normal,
      CubeInputController.add(
        CubeInputController.scale(faceAxes.col, col - 1),
        CubeInputController.scale(faceAxes.row, row - 1),
      ),
    );
    const rotatedPlus = CubeInputController.rotateAxis(stickerPos, axisKey, 90);
    const rotatedMinus = CubeInputController.rotateAxis(stickerPos, axisKey, -90);

    const screenOf = (p: Vec3) => this.cubeRenderer.projectLocalPoint(p.x, p.y, p.z);
    const originScreen = screenOf(stickerPos);
    const plusScreen = screenOf(rotatedPlus);
    const minusScreen = screenOf(rotatedMinus);

    const alignPlus =
      (plusScreen.x - originScreen.x) * deltaX +
      (plusScreen.y - originScreen.y) * deltaY;
    const alignMinus =
      (minusScreen.x - originScreen.x) * deltaX +
      (minusScreen.y - originScreen.y) * deltaY;
    const desiredSign: 1 | -1 = alignPlus >= alignMinus ? 1 : -1;

    const isUnprimed = desiredSign === signInfo.sign;

    const move = isUnprimed ? baseMove : `${baseMove}'`;
    this.emit("move", move);
  }

  public destroy(): void {
    this.scene.input.keyboard?.off("keydown", this.onKeyDown, this);
    this.scene.input.off("pointerdown", this.onPointerDown, this);
    this.scene.input.off("pointermove", this.onPointerMove, this);
    this.scene.input.off("pointerup", this.onPointerUp, this);
  }
}
