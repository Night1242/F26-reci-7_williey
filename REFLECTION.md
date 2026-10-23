# Reflection

**Name / Andrew ID:**
Willie Yang / williey

**Recitation group members (Task 2):**
Toby Y.
Wunwan W.
Zoe C.

---

### 1. Valid but weak

Pick a property you wrote that passes on the correct implementation but
kills few or no mutants. Why is it still a *valid* property? Describe a
concrete bug (not one of our mutants) that it *would* catch.

In the Wordle test, I wrote a property that checks whether swapping the secret and guess gives the same number of greens and the same number of credited letters (G or Y). It only killed one mutant, singlePass, which my other properties already kill, but I think it is still valid because these counts should stay the same based on the rules. Swapping the words does not change which positions match or how many letters the words share. One bug it can catch is comparing guess[i] with secret[i + 1] instead of secret[i] such that the index is mismatched. For secret BAAAA and guess AAAAA, this would give 4 greens, but swapping them would not give us 4 greens.

### 2. A generator problem, not a property problem

Describe a mutant, from either task, that survived or was flaky because of
your **generator** rather than your property. What did the generator fail to
produce? How did you fix it? Paste the runner output from before and after.

In the Wordle task, the singlePass mutant was flaky (killed in only 3 of 5 runs) when I used all 26 letters in my generator. My property checked how many times each letter was credited, but the generator did not produce enough repeated-letter cases where the bug would show up.

I fixed this by using fc.oneof(wordFrom('ABC'), wordFrom(ALPHABET)). The ABC words make repeated letters much more common. Keeping the full alphabet also gives the test more variety, including letters that are not in the secret.

Before (`const word = wordFrom(ALPHABET);`):

```
~ singlePass     flaky: killed in 3/5 runs  by: never credits a letter more times than the secret contains it
      Counterexample: ["AOAAA","OOAAA"]
      AssertionError: expected 2 to be less than or equal to 1

```

After (`const word = fc.oneof(wordFrom('ABC'), wordFrom(ALPHABET));`):

```
✔ singlePass     killed  by: credits each letter as many times as both words share it; swapping secret and guess keeps the same green and credited counts; never credits a letter more times than the secret contains it
      Counterexample: ["AAACA","AACCA"]
      AssertionError: expected 2 to be 1 // Object.is equality

```

### 3. Reading a counterexample

Paste one counterexample that the mutation runner printed for a killed
mutant. In 2–3 sentences, explain using the *specification* why that input
exposes the bug.

```
  ✔ greensOnly     killed  by: credits each letter as many times as both words share it; gives no blacks when the guess is an anagram of the secret
      Counterexample: ["AAAAC","CAAAA"]
      AssertionError: expected +0 to be 1 // Object.is equality
```

The secret is AAAAC and the guess is CAAAA. The C is in both words but in different positions, so the rules say it should be yellow and count as one credited C. The greensOnly mutant does not give yellows, so it counted zero instead of one.

### 4. Your project

Name one function or module in your team's project that would benefit from
property-based testing. State two properties in English, name the pattern of
each, and describe the generator you'd need, including anything about its
inputs that a naive generator would get wrong.

I think our text-to-speech feature in `speech.ts` would benefit from property-based testing. It reads chat replies aloud, and its `edgeChunks(text)` function splits the text into smaller pieces that fit under Microsoft's TTS limit of 4096 bytes.

- **Invariant:** Every chunk should be less than 4096 bytes when encoded as UTF-8.
- **Algebraic:** Joining the chunks back together should give the original text, ignoring whitespace at the split points. This checks that splitting does not remove or repeat any words.

The generator that I'll make would make sentences with random words and mix regular letters with characters like `é`, `中`, and emoji (to ensure that it is able to handle letters of different byte size) and tt should generate both short text and text much longer than 4096 bytes. I would also include really long sentences without periods to check that the function can split those too and if anything is lost.