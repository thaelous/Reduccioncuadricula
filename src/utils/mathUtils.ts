import { GridCell } from '../types';

/**
 * Calculates the standard digital root (repeated sum of digits until 1 digit).
 * For 0, returns 0.
 * For positive integers, returns 1..9.
 */
export function calculateDigitalRoot(sum: number): number {
  if (sum <= 0) return 0;
  return ((sum - 1) % 9) + 1;
}

/**
 * Returns the human-readable steps of reducing a sum to its digital root.
 * e.g., 68 -> "6 + 8 = 14" -> "1 + 4 = 5"
 */
export function getDigitalRootSteps(sum: number): { steps: string[]; finalRoot: number } {
  if (sum < 10) {
    return { steps: [`${sum}`], finalRoot: sum };
  }

  const steps: string[] = [`Total = ${sum}`];
  let current = sum;

  while (current >= 10) {
    const digits = current.toString().split('').map(Number);
    const nextSum = digits.reduce((acc, d) => acc + d, 0);
    steps.push(`${digits.join(' + ')} = ${nextSum}`);
    current = nextSum;
  }

  return { steps, finalRoot: current };
}

/**
 * Generates an engaging grid of digits (0-9) designed for digital root reduction.
 * Intentionally crafts pairs and triplets summing to 9, along with 0s and 9s,
 * leaving natural residuals for mental calculation.
 * Supports an optional numerical seed for synchronized classroom sessions.
 */
export function generateReductionGrid(rows: number, cols: number, seed?: number): GridCell[] {
  // Simple seedable PRNG for synchronized classroom rounds
  const rng = seed !== undefined
    ? (() => {
        let s = Math.abs(seed) || 12345;
        return () => {
          s = (s * 16807) % 2147483647;
          return (s - 1) / 2147483646;
        };
      })()
    : Math.random;

  const total = rows * cols;
  const numbers: number[] = [];

  // Pairings that sum to 9
  const pairs = [
    [1, 8], [2, 7], [3, 6], [4, 5],
    [5, 4], [6, 3], [7, 2], [8, 1]
  ];
  const triplets = [
    [1, 2, 6], [1, 3, 5], [2, 3, 4], [1, 4, 4], [2, 2, 5]
  ];

  let placed = 0;

  // Add 1 or 2 instant 9s and 0s
  const specialCount = Math.max(2, Math.floor(total * 0.15));
  for (let i = 0; i < specialCount && placed < total; i++) {
    numbers.push(i % 2 === 0 ? 9 : 0);
    placed++;
  }

  // Add some pairs that sum to 9
  const targetPairs = Math.floor((total - placed) * 0.45 / 2);
  for (let i = 0; i < targetPairs && placed + 2 <= total; i++) {
    const pair = pairs[Math.floor(rng() * pairs.length)];
    numbers.push(pair[0], pair[1]);
    placed += 2;
  }

  // Add a triplet if space permits
  if (placed + 3 <= total && rng() > 0.4) {
    const trip = triplets[Math.floor(rng() * triplets.length)];
    numbers.push(trip[0], trip[1], trip[2]);
    placed += 3;
  }

  // Fill remaining with random digits 1-8
  while (placed < total) {
    numbers.push(Math.floor(rng() * 9) + 1);
    placed++;
  }

  // Shuffle array thoroughly
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }

  // Create grid cells
  const cells: GridCell[] = [];
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        id: idx,
        row: r,
        col: c,
        value: numbers[idx]
      });
      idx++;
    }
  }

  return cells;
}

