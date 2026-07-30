import type { CubeColor } from '../models/CubeModel';

export const CUBE_MATERIALS: Record<CubeColor, number> = {
    'white': 0xffffff,
    'yellow': 0xffff00,
    'green': 0x00ff00,
    'blue': 0x0088ff,
    'red': 0xff0000,
    'orange': 0xff8800,
};

export const CUBE_OUTLINE = 0x111111;
export const CUBE_SHADOW = 0x000000;
