import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { matchGuess } from '../src/wordle';

// Recitation Part 1: follow along with your TA, filling in the todos below.
// Problem set Task 1: keep adding properties until `npm run mutants:wordle`
// kills every mutant. Read the spec in src/wordle/matchGuess.ts.
//
// Label every property with its pattern, on the line above its `it(`:
//   // Pattern: invariant. The result always has exactly five colors.
// (invariant, algebraic, metamorphic, differential, or conditional)

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const wordFrom = (letters: string) =>
    fc.array(fc.constantFrom(...letters), {minLength: 5, maxLength: 5}).map(cs => cs.join(''));

const word = fc.oneof(wordFrom('ABC'), wordFrom(ALPHABET));

//making a targeted generator

// Helper function such that it counts how many time the letter occurs in w
const count = (w: string, letter: string) => [...w].filter(c => c === letter).length;

// Targeted generator: guess is a rearrangement of the secret's letters.
const anagram_guess = word.chain(secret =>
  fc.shuffledSubarray([...secret], { minLength: 5, maxLength: 5 })
    .map(cs => [secret, cs.join('')] as const),
);

// Pattern: invariant. Each letter is credited exactly the amount both word shares it
// Solves greenOnly 
it('credits each letter as many times as both words share it', () => {
  fc.assert(
    fc.property(word, word, (secret, guess) => {
      const result = matchGuess(secret, guess);
      for (const letter of new Set(guess)) {
        const credited = [...guess].filter((c, i) => c === letter && result[i] !== 'B').length;
        expect(credited).toBe(Math.min(count(guess, letter), count(secret, letter)));
      }
    }),
  );
});

// Pattern: conditional. If the guess is just an rearrangement of the secret, there should be no B in the output
// Uses the targeted generator (requirement)
it('gives no blacks when the guess is an anagram of the secret', () => {
  fc.assert(
    fc.property(anagram_guess, ([secret, guess]) => {
      expect(matchGuess(secret, guess)).not.toContain('B');
    }),
  );
});

// Pattern: metamorphic. Swapping the secret and the guess should still result in the same output
// requires at least one metamorphic 
it('swapping secret and guess keeps the same green and credited counts', () => {
  const greens = (r: readonly string[]) => r.filter(c => c === 'G').length;
  const credited = (r: readonly string[]) => r.filter(c => c !== 'B').length;
  fc.assert(
    fc.property(word, word, (secret, guess) => {
      const before = matchGuess(secret, guess);
      const after = matchGuess(guess, secret);
      expect(greens(after)).toBe(greens(before));
      expect(credited(after)).toBe(credited(before));
    }),
  );
});


// Pattern: invariant. Only uses valid colors
it('only uses the color G Y B', () => {
  fc.assert (
    fc.property(word, word, (secret, guess) => {
      for (const c of matchGuess(secret, guess)) expect(['G', 'Y', 'B']).toContain(c);
    }),
  );
});

// Pattern: conditional. If the guess equals the secret, every position is green.
it('guessing the secret gives all greens', () => {
  fc.assert (
    fc.property(word, w => {
      expect (matchGuess(w, w)).toEqual(['G', 'G', 'G', 'G', 'G']);
    }),
  );
});

// Pattern: invariant. No double counting
it('never credits a letter more times than the secret contains it', () => {
  fc.assert (
    fc.property(word, word, (secret, guess) => {
      const result = matchGuess(secret, guess);
      for (const letter of new Set(guess)) {
        const credited = [... guess].filter((c, i) => c == letter && result[i] != 'B').length;
        const inScecret = [...secret].filter(c => c == letter).length;
        expect(credited).toBeLessThanOrEqual(inScecret);
      }
    }),
  );
});

describe('matchGuess', () => {
  it.todo('returns exactly five colors');
  it.todo('only uses the colors G, Y, B');
  it.todo('guessing the secret gives all greens');
  it.todo('never credits a letter more times than the secret contains it');
});
