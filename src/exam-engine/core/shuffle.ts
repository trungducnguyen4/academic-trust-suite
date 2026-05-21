import type { RNG } from "./prng";

export function shuffleWithRng<T>(arr: T[], rng: RNG): { result: T[]; permutation: number[] } {
  const a = arr.slice();
  const n = a.length;
  const perm = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    // get random integer in [0, i]
    const r = Math.floor(rng.nextDouble() * (i + 1));
    const tmp = a[i];
    a[i] = a[r];
    a[r] = tmp;
    const t2 = perm[i];
    perm[i] = perm[r];
    perm[r] = t2;
  }
  return { result: a, permutation: perm };
}
