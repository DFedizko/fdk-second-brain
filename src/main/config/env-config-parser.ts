import { ENV_SCHEMA, type AppConfig } from "./env-schema";
import { InvalidEnvError } from "./invalid-env-error";

export interface ConfigParser {
  parse(env: unknown): AppConfig;
}

export class EnvConfigParser implements ConfigParser {
  parse(env: unknown): AppConfig {
    const result = ENV_SCHEMA.safeParse(env);
    if (!result.success) {
      throw new InvalidEnvError(result.error.issues.map((i) => i.message));
    }
    return result.data;
  }
}
