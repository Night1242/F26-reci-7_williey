import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { mergeIntervals, type Interval } from '../src/intervals';

// Recitation Part 2 (groups) and problem set Task 2.
// Read the spec in src/intervals/mergeIntervals.ts, then check your progress
// with `npm run mutants:intervals`.
//
// Label every property with its pattern, on the line above its `it(`:
//   // Pattern: invariant. The output is sorted.
// (invariant, algebraic, metamorphic, differential, or conditional)

// A first attempt at a generator. It has a problem: run the tests and read
// the counterexample. We need ensure that the min and max is each is valid 
const interval: fc.Arbitrary<Interval> = fc
  .tuple(fc.integer({ min: -20, max: 20 }), fc.nat(5))
  .map(([s, len]): Interval => [s, s + len]);

const intervalList = fc.array(interval, { maxLength: 8 });



describe('mergeIntervals', () => {
  // Pattern: invariant. Every input interval lies inside some output interval.
  it('every input interval lies inside some output interval', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);
        const uncovered = xs.filter(([s, e]) => !out.some(([a, b]) => a <= s && e <= b));
        expect(uncovered).toEqual([]);
      }),
    );
  });

  // Add your properties here. Aim for at least one of each pattern:
  // invariant, algebraic, metamorphic, differential, conditional.
});


// Helper function that checks if point p covered by some interval in the list
const covered = (list: readonly Interval[], p: number) =>
  list.some(([s, e]) => s <= p && p <= e);

// Targeted generator: intervals that neither overlap nor touch
const disjointList = fc
  .tuple(
    fc.integer({ min: -20, max: 20 }),
    fc.array(fc.tuple(fc.integer({ min: 1, max: 3 }), fc.nat(4)), { maxLength: 6 }),
  )
  .map(([first, pieces]) => {
    const sorted: Interval[] = [];
    let cursor = first;
    for (const [gap, len] of pieces) {
      const s = cursor + gap;
      sorted.push([s, s + len]);
      cursor = s + len;
    }
    return sorted;
  })
  .chain(sorted =>
    fc
      .shuffledSubarray(sorted, { minLength: sorted.length, maxLength: sorted.length })
      .map(shuffled => [sorted, shuffled] as const),
  );

// A list of intervals together with a shuffled copy of it.
const listAndShuffle = intervalList.chain(xs =>
  fc
    .shuffledSubarray(xs, { minLength: xs.length, maxLength: xs.length })
    .map(ys => [xs, ys] as const),
);

// Two intervals that overlap or touch
const overlappingPair = fc
  .tuple(fc.integer({ min: -20, max: 20 }), fc.nat(5), fc.nat(5), fc.nat(5))
  .map(([s, len1, offset, len2]) => {
    const a: Interval = [s, s + len1];
    const bStart = s + Math.min(offset, len1);
    const b: Interval = [bStart, bStart + len2];
    return [a, b] as const;
  });

// Two intervals with a gap between them
const separatePair = fc
  .tuple(fc.integer({ min: -20, max: 20 }), fc.nat(5), fc.integer({ min: 1, max: 3 }), fc.nat(5))
  .map(([s, len1, gap, len2]) => {
    const a: Interval = [s, s + len1];
    const bStart = s + len1 + gap;
    const b: Interval = [bStart, bStart + len2];
    return [a, b] as const;
  });

// An outer interval and an inner interval 
const enclosedPair = fc
  .tuple(fc.integer({ min: -20, max: 20 }), fc.nat(8))
  .chain(([s, len]) =>
    fc.integer({ min: s, max: s + len }).chain(innerStart =>
      fc.integer({ min: innerStart, max: s + len }).map(innerEnd => {
        const outer: Interval = [s, s + len];
        const inner: Interval = [innerStart, innerEnd];
        return [outer, inner] as const;
      }),
    ),
  );


describe('mergeIntervals', () => {
  // Pattern: invariant. Every input interval lies inside some output interval.
  it('every input interval lies inside some output interval', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);
        const uncovered = xs.filter(([s, e]) => !out.some(([a, b]) => a <= s && e <= b));
        expect(uncovered).toEqual([]);
      }),
    );
  });

  // Pattern: invariant. The input array and its intervals are not modified.
  it('does not modify the input', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const before = xs.map(([s, e]) => [s, e]);
        mergeIntervals(xs);
        expect(xs).toEqual(before);
      }),
    );
  });

  // Pattern: metamorphic. Shuffling the order of the input does not change the output.
  it('gives the same result for any order of the input', () => {
    fc.assert(
      fc.property(listAndShuffle, ([xs, shuffled]) => {
        expect(mergeIntervals(shuffled)).toEqual(mergeIntervals(xs));
      }),
    );
  });

  // Pattern: algebraic. Merging an already-merged list changes nothing.
  it('merging twice is the same as merging once', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const once = mergeIntervals(xs);
        expect(mergeIntervals(once)).toEqual(once);
      }),
    );
  });

  // Pattern: conditional. If the input intervals already neither overlap nor touch, the output is the same intervals sorted by start.
  it('leaves already-disjoint intervals unchanged except for sorting', () => {
    fc.assert(
      fc.property(disjointList, ([sorted, shuffled]) => {
        expect(mergeIntervals(shuffled)).toEqual(sorted);
      }),
    );
  });

  // Pattern: conditional. If the input is empty, the output is empty.
  it('returns an empty list for an empty input', () => {
    expect(mergeIntervals([])).toEqual([]);
  });

  // Pattern: conditional. If the same interval appears twice, the output is just that interval.
  it('merges a duplicated interval into one', () => {
    fc.assert(
      fc.property(interval, x => {
        expect(mergeIntervals([x, [x[0], x[1]]])).toEqual([x]);
      }),
    );
  });

  // Pattern: conditional. If two intervals overlap or touch, the output is one interval from the lower start to the higher end.
  it('merges two overlapping or touching intervals into one', () => {
    fc.assert(
      fc.property(overlappingPair, ([a, b]) => {
        const expected = [[a[0], Math.max(a[1], b[1])]];
        expect(mergeIntervals([a, b])).toEqual(expected);
        expect(mergeIntervals([b, a])).toEqual(expected);
      }),
    );
  });

  // Pattern: conditional. If two intervals do not overlap or touch, the output still has two intervals.
  it('keeps two separate intervals as two', () => {
    fc.assert(
      fc.property(separatePair, ([a, b]) => {
        expect(mergeIntervals([a, b])).toHaveLength(2);
        expect(mergeIntervals([b, a])).toHaveLength(2);
      }),
    );
  });

  // Pattern: invariant. The output never has more intervals than the input.
  it('never returns more intervals than it was given', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        expect(mergeIntervals(xs).length).toBeLessThanOrEqual(xs.length);
      }),
    );
  });

  // Pattern: conditional. If one interval is enclosed by another, only the outer interval is left.
  it('drops an interval that is enclosed by another', () => {
    fc.assert(
      fc.property(enclosedPair, ([outer, inner]) => {
        expect(mergeIntervals([outer, inner])).toEqual([outer]);
        expect(mergeIntervals([inner, outer])).toEqual([outer]);
      }),
    );
  });
});

  // Pattern: differential. We want to ensure that every point from the input intervals is the same as the output intervals such that we know that no data point is lost.
  it('covers exactly the same points as the input', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);
        for (let p = -25; p <= 30; p += 0.5) {
          expect(covered(out, p)).toBe(covered(xs, p));
        }
      }),
    );
  });