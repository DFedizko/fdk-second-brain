import type { ConfigParser } from "../../../src/main/config/env-config-parser";
import type { AppConfig } from "../../../src/main/config/env-schema";

export class FailingConfigParser implements ConfigParser {
    constructor(private readonly error: Error) {}

    parse(): AppConfig {
        throw this.error;
    }
}
