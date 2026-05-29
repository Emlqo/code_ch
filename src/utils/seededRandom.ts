/** Creates a stable 32-bit numeric seed from any string input. */
export function createSeedFromString(input: string): number {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

/** Creates a deterministic pseudo-random number generator that returns values in [0, 1). */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Returns a deterministic integer between min and max, inclusive. */
export function randomInt(min: number, max: number, random: () => number): number {
  const lower = Math.ceil(Math.min(min, max));
  const upper = Math.floor(Math.max(min, max));

  if (lower === upper) {
    return lower;
  }

  return Math.floor(random() * (upper - lower + 1)) + lower;
}

/** Picks one item without throwing when the array is empty. */
export function pickRandom<T>(items: readonly T[], random: () => number): T | undefined {
  if (items.length === 0) {
    return undefined;
  }

  return items[randomInt(0, items.length - 1, random)];
}

/** Returns a shuffled copy of the input array without mutating the original. */
export function shuffleWithSeed<T>(items: readonly T[], random: () => number): T[] {
  const shuffledItems = [...items];

  for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index, random);
    [shuffledItems[index], shuffledItems[swapIndex]] = [shuffledItems[swapIndex], shuffledItems[index]];
  }

  return shuffledItems;
}
