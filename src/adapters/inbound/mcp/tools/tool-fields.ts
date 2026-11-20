import { z } from "zod";

const MAX_PATH_LENGTH = 1024;
const MAX_LABEL_LENGTH = 200;
const MAX_CONTENT_LENGTH = 1_000_000;
const GIT_HASH = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/;

export const NOTE_PATH = z.string().min(1).max(MAX_PATH_LENGTH).describe("Note path, e.g. projects/plan.md");
export const FOLDER = z.string().max(MAX_PATH_LENGTH);
export const LABEL = z.string().min(1).max(MAX_LABEL_LENGTH);
export const TEXT = z.string().max(MAX_CONTENT_LENGTH);
export const PASSAGE = TEXT.min(1);
export const EXPECTED_VERSION = z
    .string()
    .regex(GIT_HASH)
    .optional()
    .describe("Version from read_note; the call fails if the note changed since");
export const READ_ONLY = { readOnlyHint: true } as const;
export const DESTRUCTIVE = { destructiveHint: true } as const;
