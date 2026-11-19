import { PassageEdit } from "../../src/domain/passage-edit";
import { PassageNotFound } from "../../src/domain/errors/passage-not-found";
import { PassageNotUnique } from "../../src/domain/errors/passage-not-unique";

const CONTENT = "# Plan\n\n- buy milk\n- call Ana\n";

describe("PassageEdit", () => {
  it("replaces a passage that appears exactly once", () => {
    const edit = new PassageEdit("buy milk", "buy bread");

    expect(edit.applyTo(CONTENT)).toBe("# Plan\n\n- buy bread\n- call Ana\n");
  });

  it("keeps replacement patterns literally", () => {
    const edit = new PassageEdit("call Ana", "pay $& and $1");

    expect(edit.applyTo(CONTENT)).toBe("# Plan\n\n- buy milk\n- pay $& and $1\n");
  });

  it("rejects a passage that is missing", () => {
    const edit = new PassageEdit("walk the dog", "feed the cat");

    expect(() => edit.applyTo(CONTENT)).toThrow(PassageNotFound);
  });

  it("rejects a passage that appears more than once", () => {
    const edit = new PassageEdit("- ", "* ");

    expect(() => edit.applyTo(CONTENT)).toThrow(PassageNotUnique);
  });

  it("says how many times an ambiguous passage appears", () => {
    const edit = new PassageEdit("- ", "* ");

    expect(() => edit.applyTo(CONTENT)).toThrow(/2 times/);
  });

  it("rejects an empty passage", () => {
    const edit = new PassageEdit("", "anything");

    expect(() => edit.applyTo(CONTENT)).toThrow(PassageNotUnique);
  });
});
