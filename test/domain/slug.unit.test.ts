import { Slug } from "../../src/domain/slug";

const MAX_SLUG_LENGTH = 60;

describe("Slug", () => {
  it("lowercases words and joins them with dashes", () => {
    const slug = Slug.from("Grow Tomatoes Indoors");

    expect(slug.value).toBe("grow-tomatoes-indoors");
  });

  it("strips accents", () => {
    const slug = Slug.from("Ideia de canção: Pão de Açúcar");

    expect(slug.value).toBe("ideia-de-cancao-pao-de-acucar");
  });

  it("drops punctuation at both ends", () => {
    const slug = Slug.from("  ¿What if...?  ");

    expect(slug.value).toBe("what-if");
  });

  it("falls back to idea when nothing usable is left", () => {
    const slug = Slug.from("!!! ???");

    expect(slug.value).toBe("idea");
  });

  it("caps a long title without a trailing dash", () => {
    const slug = Slug.from(`${"a".repeat(MAX_SLUG_LENGTH - 1)} bcd`);

    expect(slug.value).toBe("a".repeat(MAX_SLUG_LENGTH - 1));
  });
});
