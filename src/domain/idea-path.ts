import { NotePath } from "./note-path";
import type { Slug } from "./slug";

export const IDEAS_FOLDER = "ideas";
const NOTE_EXTENSION = ".md";
const ISO_DATE_LENGTH = 10;
const FIRST_ATTEMPT = 1;
const NO_SUFFIX = "";

export class IdeaPath {
  constructor(
    private readonly createdAt: Date,
    private readonly slug: Slug,
  ) {}

  attempt(number: number): NotePath {
    const date = this.createdAt.toISOString().slice(0, ISO_DATE_LENGTH);
    const suffix = number === FIRST_ATTEMPT ? NO_SUFFIX : `-${number}`;
    return NotePath.of(`${IDEAS_FOLDER}/${date}-${this.slug.value}${suffix}${NOTE_EXTENSION}`);
  }
}
