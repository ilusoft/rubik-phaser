export enum Face {
  U = "U",
  D = "D",
  L = "L",
  R = "R",
  F = "F",
  B = "B",
}

export enum FaceIndex {
  U = 0,
  D = 1,
  L = 2,
  R = 3,
  F = 4,
  B = 5,
}

export type MoveFace = Face | "M" | "E" | "S";

export interface MoveDefinition {
  face: MoveFace;
  clockwise: boolean;
  double: boolean;
}

export const MOVE_DEFINITIONS: Record<string, MoveDefinition> = {
  U: { face: Face.U, clockwise: true, double: false },
  "U'": { face: Face.U, clockwise: false, double: false },
  U2: { face: Face.U, clockwise: true, double: true },
  "U'2": { face: Face.U, clockwise: true, double: true },
  "U2'": { face: Face.U, clockwise: true, double: true },
  D: { face: Face.D, clockwise: true, double: false },
  "D'": { face: Face.D, clockwise: false, double: false },
  D2: { face: Face.D, clockwise: true, double: true },
  "D'2": { face: Face.D, clockwise: true, double: true },
  "D2'": { face: Face.D, clockwise: true, double: true },
  L: { face: Face.L, clockwise: true, double: false },
  "L'": { face: Face.L, clockwise: false, double: false },
  L2: { face: Face.L, clockwise: true, double: true },
  "L'2": { face: Face.L, clockwise: true, double: true },
  "L2'": { face: Face.L, clockwise: true, double: true },
  R: { face: Face.R, clockwise: true, double: false },
  "R'": { face: Face.R, clockwise: false, double: false },
  R2: { face: Face.R, clockwise: true, double: true },
  "R'2": { face: Face.R, clockwise: true, double: true },
  "R2'": { face: Face.R, clockwise: true, double: true },
  F: { face: Face.F, clockwise: true, double: false },
  "F'": { face: Face.F, clockwise: false, double: false },
  F2: { face: Face.F, clockwise: true, double: true },
  "F'2": { face: Face.F, clockwise: true, double: true },
  "F2'": { face: Face.F, clockwise: true, double: true },
  B: { face: Face.B, clockwise: true, double: false },
  "B'": { face: Face.B, clockwise: false, double: false },
  B2: { face: Face.B, clockwise: true, double: true },
  "B'2": { face: Face.B, clockwise: true, double: true },
  "B2'": { face: Face.B, clockwise: true, double: true },
  M: { face: "M", clockwise: true, double: false },
  "M'": { face: "M", clockwise: false, double: false },
  M2: { face: "M", clockwise: true, double: true },
  "M'2": { face: "M", clockwise: true, double: true },
  "M2'": { face: "M", clockwise: true, double: true },
  E: { face: "E", clockwise: true, double: false },
  "E'": { face: "E", clockwise: false, double: false },
  E2: { face: "E", clockwise: true, double: true },
  "E'2": { face: "E", clockwise: true, double: true },
  "E2'": { face: "E", clockwise: true, double: true },
  S: { face: "S", clockwise: true, double: false },
  "S'": { face: "S", clockwise: false, double: false },
  S2: { face: "S", clockwise: true, double: true },
  "S'2": { face: "S", clockwise: true, double: true },
  "S2'": { face: "S", clockwise: true, double: true },
};

export const ALL_MOVES = Object.keys(MOVE_DEFINITIONS);

export const FACE_CYCLE: Record<Face, number[]> = {
  [Face.U]: [0, 1, 2, 3, 4, 5, 6, 7, 8],
  [Face.D]: [18, 19, 20, 21, 22, 23, 24, 25, 26],
  [Face.L]: [0, 3, 6, 9, 12, 15, 18, 21, 24],
  [Face.R]: [2, 5, 8, 11, 14, 17, 20, 23, 26],
  [Face.F]: [6, 7, 8, 15, 16, 17, 24, 25, 26],
  [Face.B]: [0, 1, 2, 9, 10, 11, 18, 19, 20],
};

export function parseMove(move: string): MoveDefinition | null {
  return MOVE_DEFINITIONS[move] || null;
}

export function isValidMove(move: string): boolean {
  return move in MOVE_DEFINITIONS;
}
