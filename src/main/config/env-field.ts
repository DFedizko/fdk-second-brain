import { z } from "zod";

export interface EnvFieldSpec {
  readonly name: string;
  readonly whenMissing: string;
  readonly expected: string;
  readonly pattern: RegExp;
}

export function envField(spec: EnvFieldSpec) {
  const missing = `${spec.name} is missing: ${spec.whenMissing}`;
  const invalid = `${spec.name} is invalid: expected ${spec.expected}`;
  return z
    .string({ error: (issue) => (issue.input === undefined ? missing : invalid) })
    .min(1, { error: missing, abort: true })
    .regex(spec.pattern, { error: invalid });
}
