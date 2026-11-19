const HEADLINE = "The Worker's environment is invalid:";
const BULLET = "\n- ";

export class InvalidEnvError extends Error {
  override readonly name = "InvalidEnvError";

  constructor(readonly problems: readonly string[]) {
    super(HEADLINE + BULLET + problems.join(BULLET));
  }
}
