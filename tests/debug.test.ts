import { describe, expect, it } from "vitest";
import { describeSelector } from "../src/debug";

describe("describeSelector", () => {
  it("includes the tag, id, classes, and role", () => {
    const article = document.createElement("article");
    article.id = "story";
    article.className = "feature primary";
    article.setAttribute("role", "main");

    expect(describeSelector(article)).toBe(
      'article[role="main"]#story.feature.primary',
    );
  });

  it("uses only the lowercase tag when optional attributes are absent", () => {
    const main = document.createElement("main");

    expect(describeSelector(main)).toBe("main");
  });
});
