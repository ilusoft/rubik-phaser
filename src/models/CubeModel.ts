import {
  Face,
  parseMove,
  ALL_MOVES,
  type MoveDefinition,
} from "./MoveNotation";

export { Face };

export type CubeColor =
  | "white"
  | "yellow"
  | "green"
  | "blue"
  | "red"
  | "orange";

export const FACE_COLORS: Record<Face, CubeColor> = {
  [Face.U]: "white",
  [Face.D]: "yellow",
  [Face.L]: "orange",
  [Face.R]: "red",
  [Face.F]: "green",
  [Face.B]: "blue",
};

const FACE_ORDER: Face[] = [Face.U, Face.D, Face.L, Face.R, Face.F, Face.B];

const FACE_TO_INDEX: Record<Face, number> = {
  [Face.U]: 0,
  [Face.D]: 1,
  [Face.L]: 2,
  [Face.R]: 3,
  [Face.F]: 4,
  [Face.B]: 5,
};

// The move permutations below are generated programmatically from the same
// 3D face geometry used by CubeRenderer (see FaceDef.cornerIndices /
// normalAxis / normalSign in src/rendering/CubeRenderer.ts), rather than
// hand-authored. This guarantees the model and the renderer always agree on
// which sticker occupies which physical position, which a hardcoded table
// cannot: a previous hand-authored table was found (via corner-integrity
// checks) to be self-consistent for any single move in isolation but
// geometrically inconsistent once moves on different faces were combined
// (e.g. "U R" produced a corner with two green stickers, which cannot happen
// on a real cube).
type Vec3 = [number, number, number];

// Per-face local basis vectors (col, row, normal) in cube-local space,
// derived directly from CubeRenderer's FaceDef corner ordering:
//   colVec  = projectedCorners[cornerIndices[1]] - projectedCorners[cornerIndices[0]]
//   rowVec  = projectedCorners[cornerIndices[3]] - projectedCorners[cornerIndices[0]]
//   normal  = normalAxis/normalSign
// Sticker (row, col) on a face sits at: normal + colVec*(col-1) + rowVec*(row-1).
const FACE_GEOMETRY: Record<Face, { col: Vec3; row: Vec3; normal: Vec3 }> = {
  [Face.F]: { col: [1, 0, 0], row: [0, 1, 0], normal: [0, 0, 1] },
  [Face.B]: { col: [-1, 0, 0], row: [0, 1, 0], normal: [0, 0, -1] },
  [Face.U]: { col: [1, 0, 0], row: [0, 0, 1], normal: [0, -1, 0] },
  [Face.D]: { col: [1, 0, 0], row: [0, 0, -1], normal: [0, 1, 0] },
  [Face.R]: { col: [0, 0, -1], row: [0, 1, 0], normal: [1, 0, 0] },
  [Face.L]: { col: [0, 0, 1], row: [0, 1, 0], normal: [-1, 0, 0] },
};

function stickerPosition(face: Face, row: number, col: number): Vec3 {
  const { col: c, row: r, normal } = FACE_GEOMETRY[face];
  return [
    normal[0] + c[0] * (col - 1) + r[0] * (row - 1),
    normal[1] + c[1] * (col - 1) + r[1] * (row - 1),
    normal[2] + c[2] * (col - 1) + r[2] * (row - 1),
  ];
}

// Rotate a point by `deg` degrees about the given axis (0=x, 1=y, 2=z), using
// the same right-handed rotation convention as CubeRenderer.rotate3D.
function rotateAxis(p: Vec3, axis: 0 | 1 | 2, deg: number): Vec3 {
  const rad = (deg * Math.PI) / 180;
  const cs = Math.cos(rad);
  const sn = Math.sin(rad);
  const [x, y, z] = p;
  if (axis === 0) return [x, y * cs - z * sn, y * sn + z * cs];
  if (axis === 1) return [x * cs + z * sn, y, -x * sn + z * cs];
  return [x * cs - y * sn, x * sn + y * cs, z];
}

interface MoveSpec {
  axis: 0 | 1 | 2;
  deg: number;
  layerAxis: 0 | 1 | 2;
  layerValue: -1 | 0 | 1;
}

// Unprimed base moves are defined as a -90deg*normalSign rotation about the
// face's own normal axis, i.e. clockwise as viewed from outside the cube
// looking at that face (the standard convention). M/E/S (middle slices)
// rotate in the same direction as L/D/F respectively (also standard).
const MOVE_SPECS: Record<string, MoveSpec> = {
  U: { axis: 1, deg: 90, layerAxis: 1, layerValue: -1 },
  D: { axis: 1, deg: -90, layerAxis: 1, layerValue: 1 },
  L: { axis: 0, deg: 90, layerAxis: 0, layerValue: -1 },
  R: { axis: 0, deg: -90, layerAxis: 0, layerValue: 1 },
  F: { axis: 2, deg: -90, layerAxis: 2, layerValue: 1 },
  B: { axis: 2, deg: 90, layerAxis: 2, layerValue: -1 },
  M: { axis: 0, deg: 90, layerAxis: 0, layerValue: 0 },
  E: { axis: 1, deg: -90, layerAxis: 1, layerValue: 0 },
  S: { axis: 2, deg: -90, layerAxis: 2, layerValue: 0 },
};

function buildMovePermutations(): Record<string, number[]> {
  // A sticker's identity is NOT fully determined by its (x, y, z) position
  // alone: corner and edge stickers from *different* faces sit at the same
  // cubie corner/edge coordinate (e.g. U's row2/col0 sticker and F's
  // row0/col0 sticker are both at the ULF corner position [-1,-1,1]).
  // The outward face normal disambiguates them, so both position AND
  // normal must be rotated together and matched as a pair when looking up
  // a sticker's destination.
  const globalPos: Vec3[] = [];
  const globalNormal: Vec3[] = [];
  const stickerToIndex = new Map<string, number>();
  const keyOf = (p: Vec3, n: Vec3) =>
    `${Math.round(p[0])},${Math.round(p[1])},${Math.round(p[2])}|${Math.round(n[0])},${Math.round(n[1])},${Math.round(n[2])}`;

  for (let f = 0; f < FACE_ORDER.length; f++) {
    const normal = FACE_GEOMETRY[FACE_ORDER[f]].normal;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const idx = f * 9 + row * 3 + col;
        const p = stickerPosition(FACE_ORDER[f], row, col);
        globalPos[idx] = p;
        globalNormal[idx] = normal;
        stickerToIndex.set(keyOf(p, normal), idx);
      }
    }
  }

  const buildPermutation = (spec: MoveSpec, deg: number): number[] => {
    const perm = globalPos.map((_, i) => i);
    for (let i = 0; i < globalPos.length; i++) {
      const p = globalPos[i];
      if (Math.round(p[spec.layerAxis]) !== spec.layerValue) continue;
      const newPos = rotateAxis(p, spec.axis, deg);
      const newNormal = rotateAxis(globalNormal[i], spec.axis, deg);
      const dest = stickerToIndex.get(keyOf(newPos, newNormal));
      if (dest === undefined) {
        throw new Error(
          `No destination sticker found for rotated sticker pos=${newPos} normal=${newNormal}`,
        );
      }
      perm[i] = dest;
    }
    return perm;
  };

  const permutations: Record<string, number[]> = {};
  for (const [name, spec] of Object.entries(MOVE_SPECS)) {
    permutations[name] = buildPermutation(spec, spec.deg);
    permutations[`${name}'`] = buildPermutation(spec, -spec.deg);
  }
  return permutations;
}

const MOVE_PERMUTATIONS: Record<string, number[]> = buildMovePermutations();

export class CubeModel {
  private state: CubeColor[];
  private moveHistory: string[];

  constructor() {
    this.state = this.createSolvedState();
    this.moveHistory = [];
  }

  private createSolvedState(): CubeColor[] {
    return FACE_ORDER.flatMap((face) => Array(9).fill(FACE_COLORS[face]));
  }

  public reset(): void {
    this.state = this.createSolvedState();
    this.moveHistory = [];
  }

  public applyMove(move: string): void {
    const definition = parseMove(move);
    if (!definition) return;

    const times = definition.double ? 2 : 1;
    const moveKey = definition.double ? move[0] : move;
    const permutation = MOVE_PERMUTATIONS[moveKey];
    if (!permutation) return;

    for (let i = 0; i < times; i++) {
      this.applyPermutation(permutation);
    }

    this.moveHistory.push(move);
  }

  public applyMoves(moves: string[]): void {
    for (const move of moves) {
      this.applyMove(move);
    }
  }

  private applyPermutation(permutation: number[]): void {
    const nextState = [...this.state];
    for (let i = 0; i < permutation.length; i++) {
      nextState[permutation[i]] = this.state[i];
    }
    this.state = nextState;
  }

  public isSolved(): boolean {
    for (const face of FACE_ORDER) {
      const faceIdx = FACE_TO_INDEX[face];
      const base = this.state[faceIdx * 9];
      for (let i = 1; i < 9; i++) {
        if (this.state[faceIdx * 9 + i] !== base) {
          return false;
        }
      }
    }
    return true;
  }

  public generateScramble(length: number = 20): string[] {
    const moves: string[] = [];
    let lastFace: string | null = null;

    const baseMoves = ALL_MOVES.filter(
      (m) => !m.includes("'") && !m.includes("2"),
    );

    for (let i = 0; i < length; i++) {
      let availableMoves = baseMoves.filter((m) => {
        const face = m.charAt(0);
        if (lastFace === face) return false;
        if (lastFace && this.areOppositeFaces(lastFace, face)) return false;
        return true;
      });

      if (availableMoves.length === 0) {
        availableMoves = baseMoves;
      }

      const randomMove =
        availableMoves[Math.floor(Math.random() * availableMoves.length)];
      const modifier =
        Math.random() < 0.5 ? "'" : Math.random() < 0.5 ? "2" : "";

      moves.push(randomMove + modifier);
      lastFace = randomMove.charAt(0);
    }

    return moves;
  }

  private areOppositeFaces(a: string, b: string): boolean {
    const opposites: Record<string, string> = {
      U: "D",
      D: "U",
      L: "R",
      R: "L",
      F: "B",
      B: "F",
    };
    return opposites[a] === b;
  }

  public getState(): CubeColor[][] {
    const faces: CubeColor[][] = [];
    for (let faceIdx = 0; faceIdx < FACE_ORDER.length; faceIdx++) {
      faces.push(this.state.slice(faceIdx * 9, faceIdx * 9 + 9));
    }
    return faces;
  }

  public getFaceColors(face: Face): CubeColor[] {
    const faceIdx = FACE_TO_INDEX[face];
    return this.state.slice(faceIdx * 9, faceIdx * 9 + 9);
  }

  public getMoveHistory(): string[] {
    return [...this.moveHistory];
  }
}
