export interface Point3D {
    x: number;
    y: number;
    z: number;
}

export interface Point2D {
    x: number;
    y: number;
}

export function rotatePoint(x: number, y: number, angle: number): Point2D {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
        x: x * cos - y * sin,
        y: x * sin + y * cos,
    };
}

export function project3DTo2D(
    x: number,
    y: number,
    z: number,
    rotX: number,
    rotY: number,
    distance: number
): { x: number; y: number; depth: number; rotation: number } {
    let newX = x;
    let newY = y * Math.cos(rotX) - z * Math.sin(rotX);
    let newZ = y * Math.sin(rotX) + z * Math.cos(rotX);

    const x2 = newX * Math.cos(rotY) + newZ * Math.sin(rotY);
    const z2 = -newX * Math.sin(rotY) + newZ * Math.cos(rotY);

    const scale = distance / (distance + z2);

    return {
        x: x2 * scale,
        y: newY * scale,
        depth: z2,
        rotation: 0,
    };
}

export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

export function easeInOutCubic(t: number): number {
    return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function degToRad(degrees: number): number {
    return degrees * (Math.PI / 180);
}

export function radToDeg(radians: number): number {
    return radians * (180 / Math.PI);
}
