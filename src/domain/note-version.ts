export class NoteVersion {
  private constructor(readonly value: string) {}

  static of(hash: string): NoteVersion {
    return new NoteVersion(hash);
  }

  equals(other: NoteVersion): boolean {
    return this.value === other.value;
  }
}
