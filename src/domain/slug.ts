const MAX_SLUG_LENGTH = 60;
const FALLBACK_SLUG = "idea";
const DASH = "-";
const NOTHING = "";
const DECOMPOSED_FORM = "NFD";
const COMBINING_MARKS = /\p{M}/gu;
const NOT_ALPHANUMERIC = /[^a-z0-9]+/g;
const EDGE_DASHES = /^-+|-+$/g;

export class Slug {
  private constructor(readonly value: string) {}

  static from(title: string): Slug {
    const words = Slug.trimDashes(
      Slug.toAscii(title).toLowerCase().replace(NOT_ALPHANUMERIC, DASH),
    );
    const capped = Slug.trimDashes(words.slice(0, MAX_SLUG_LENGTH));
    return new Slug(capped || FALLBACK_SLUG);
  }

  private static toAscii(text: string): string {
    return text.normalize(DECOMPOSED_FORM).replace(COMBINING_MARKS, NOTHING);
  }

  private static trimDashes(text: string): string {
    return text.replace(EDGE_DASHES, NOTHING);
  }
}
