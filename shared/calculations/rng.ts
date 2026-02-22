export class SeededRNG {
  private state: number;

  constructor(seed?: number) {
    this.state = seed ?? (Date.now() ^ (Math.random() * 0xffffffff));
  }

  next(): number {
    this.state = (this.state * 1664525 + 1013904223) & 0xffffffff;
    return (this.state >>> 0) / 0xffffffff;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  intRange(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

let globalRng = new SeededRNG();

export function resetRng(seed?: number) {
  globalRng = new SeededRNG(seed);
}

export function rng(): SeededRNG {
  return globalRng;
}
