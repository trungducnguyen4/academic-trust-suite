// Deterministic PRNG using splitmix64 for seeding and xoroshiro128+ for generation
// Pure functions suitable for deterministic shuffling across environments.

export interface RNG {
  next(): bigint; // 64-bit unsigned
  nextDouble(): number; // [0,1)
}

function splitmix64(seed: bigint) {
  let z = seed + 0x9e3779b97f4a7c15n;
  z = (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n;
  z = (z ^ (z >> 27n)) * 0x94d049bb133111ebn;
  return z ^ (z >> 31n);
}

export function makeXoroshiro128Plus(seed64: bigint): RNG {
  // initialize state using splitmix64
  let s0 = splitmix64(seed64);
  let s1 = splitmix64(s0);

  function rotl(x: bigint, k: number) {
    return ((x << BigInt(k)) | (x >> BigInt(64 - k))) & ((1n << 64n) - 1n);
  }

  return {
    next(): bigint {
      const result = (s0 + s1) & ((1n << 64n) - 1n);
      let t = (s1 << 17n) & ((1n << 64n) - 1n);
      s1 = s1 ^ s0;
      s0 = rotl(s0, 49) ^ s1 ^ t;
      s1 = rotl(s1, 28);
      return result;
    },
    nextDouble(): number {
      const v = this.next();
      // use upper 53 bits to create double in [0,1)
      const upper53 = Number((v >> 11n) & ((1n << 53n) - 1n));
      return upper53 / Math.pow(2, 53);
    },
  };
}

export function seedFromNumbers(...nums: number[]) {
  // fold numbers into a 64-bit bigint seed deterministically
  let h = 0n;
  for (const n of nums) {
    h = (h * 0x9e3779b97f4a7c15n) ^ BigInt(n >>> 0);
    h = h & ((1n << 64n) - 1n);
  }
  return h || 1n;
}
