import { ALL_MOVES, Face } from '../models/MoveNotation';

export interface ScrambleOptions {
    length?: number;
    includeRotations?: boolean;
    avoidRepeats?: boolean;
}

export function generateScramble(options: ScrambleOptions = {}): string[] {
    const {
        length = 20,
        avoidRepeats = true,
    } = options;

    const moves: string[] = [];
    let lastFace: string | null = null;
    let secondLastFace: string | null = null;

    const baseMoves = ALL_MOVES.filter(m => !m.includes("'") && !m.includes("2"));

    const opposites: Record<string, string> = {
        'U': 'D', 'D': 'U',
        'L': 'R', 'R': 'L',
        'F': 'B', 'B': 'F',
    };

    for (let i = 0; i < length; i++) {
        let availableMoves = baseMoves.filter(m => {
            const face = m.charAt(0);

            if (avoidRepeats) {
                if (face === lastFace) return false;
                if (lastFace && opposites[lastFace] === face) return false;
            }

            return true;
        });

        if (availableMoves.length === 0) {
            availableMoves = baseMoves;
        }

        const randomMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
        const modifier = Math.random() < 0.5 ? "'" : Math.random() < 0.5 ? "2" : "";

        moves.push(randomMove + modifier);

        secondLastFace = lastFace;
        lastFace = randomMove.charAt(0);
    }

    return moves;
}

export function formatScramble(moves: string[]): string {
    return moves.join(' ');
}

export function parseScramble(scramble: string): string[] {
    const regex = /[UDLRFB][2']?/g;
    const matches = scramble.match(regex);
    return matches || [];
}

export function getScrambleComplexity(scramble: string[]): number {
    let complexity = 0;
    let lastFace: string | null = null;

    for (const move of scramble) {
        const face = move.charAt(0);
        const modifier = move.slice(1);

        let moveValue = 1;
        if (modifier === "'") moveValue = 2;
        if (modifier === "2") moveValue = 3;

        if (lastFace && lastFace !== face) {
            complexity += moveValue;
        } else {
            complexity += moveValue * 2;
        }

        lastFace = face;
    }

    return complexity;
}
