import { z } from "zod";

export const NOTE_PATH = z.string().describe("Note path, e.g. projects/plan.md");
export const EXPECTED_VERSION = z
  .string()
  .optional()
  .describe("Version from read_note; the call fails if the note changed since");
export const READ_ONLY = { readOnlyHint: true } as const;
