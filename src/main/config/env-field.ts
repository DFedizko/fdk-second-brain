import { z } from "zod";

const MISSING_LABEL = " is missing: ";
const INVALID_LABEL = " is invalid: expected ";
const BLANK = "";

export interface EnvFieldSpec {
    readonly name: string;
    readonly expected: string;
    readonly pattern: RegExp;
}

export interface RequiredFieldSpec extends EnvFieldSpec {
    readonly whenMissing: string;
}

export function requiredEnvField(spec: RequiredFieldSpec) {
    const missing = spec.name + MISSING_LABEL + spec.whenMissing;
    const invalid = invalidMessage(spec);
    return z
        .string({ error: (issue) => (issue.input === undefined ? missing : invalid) })
        .min(1, { error: missing, abort: true })
        .regex(spec.pattern, { error: invalid });
}

export function optionalEnvField(spec: EnvFieldSpec, fallback: string) {
    const invalid = invalidMessage(spec);
    const field = z.string({ error: invalid }).regex(spec.pattern, { error: invalid }).default(fallback);
    return z.preprocess(treatBlankAsUnset, field);
}

function invalidMessage(spec: EnvFieldSpec): string {
    return spec.name + INVALID_LABEL + spec.expected;
}

function treatBlankAsUnset(value: unknown): unknown {
    return value === BLANK ? undefined : value;
}
