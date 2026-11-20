import type { ConfigParser } from "../../../src/main/config/env-config-parser";
import type { AppConfig } from "../../../src/main/config/env-schema";
import { VALID_ENV } from "../__stub__/valid-env";

export class SpyConfigParser implements ConfigParser {
    readonly parsedEnvs: unknown[] = [];

    parse(env: unknown): AppConfig {
        this.parsedEnvs.push(env);
        return { ...VALID_ENV };
    }
}
