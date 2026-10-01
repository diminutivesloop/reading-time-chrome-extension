import { describe, expect, it } from "vitest";
import {
  MAX_WORDS_PER_MINUTE,
  MIN_WORDS_PER_MINUTE,
  countWords,
  isValidWordsPerMinute,
} from "../src/shared";

describe("countWords", () => {
  it("counts tokens separated by arbitrary whitespace", () => {
    expect(countWords("  One\n two\tthree  ")).toBe(3);
  });

  it("returns zero for empty or whitespace-only text", () => {
    expect(countWords("")).toBe(0);
    expect(countWords(" \n\t ")).toBe(0);
  });

  it("keeps punctuation attached to words", () => {
    expect(countWords("Hello, world! This is a test.")).toBe(6);
  });
});

describe("isValidWordsPerMinute", () => {
  it("accepts the configured boundaries", () => {
    expect(isValidWordsPerMinute(MIN_WORDS_PER_MINUTE)).toBe(true);
    expect(isValidWordsPerMinute(MAX_WORDS_PER_MINUTE)).toBe(true);
  });

  it("rejects values outside the range and NaN", () => {
    expect(isValidWordsPerMinute(MIN_WORDS_PER_MINUTE - 1)).toBe(false);
    expect(isValidWordsPerMinute(MAX_WORDS_PER_MINUTE + 1)).toBe(false);
    expect(isValidWordsPerMinute(Number.NaN)).toBe(false);
  });
});
