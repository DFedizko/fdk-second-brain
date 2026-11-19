import { PassageNotFound } from "./errors/passage-not-found";
import { PassageNotUnique } from "./errors/passage-not-unique";

const SINGLE_MATCH = 1;

export class PassageEdit {
  constructor(
    private readonly passage: string,
    private readonly replacement: string,
  ) {}

  applyTo(content: string): string {
    this.rejectEmptyPassage();
    const pieces = content.split(this.passage);
    this.rejectAmbiguous(pieces.length - 1);
    return pieces.join(this.replacement);
  }

  private rejectEmptyPassage(): void {
    if (this.passage === "") throw new PassageNotFound(this.passage);
  }

  private rejectAmbiguous(occurrences: number): void {
    if (occurrences < SINGLE_MATCH) throw new PassageNotFound(this.passage);
    if (occurrences > SINGLE_MATCH) throw new PassageNotUnique(this.passage, occurrences);
  }
}
