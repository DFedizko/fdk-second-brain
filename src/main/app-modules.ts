import type { ContainerModule } from "inversify";
import { createMcpModule } from "../adapters/inbound/mcp/mcp.container";
import { createOAuthModule } from "../adapters/inbound/oauth/oauth.container";
import { createIndexQueueModule } from "../adapters/inbound/queue/index-queue.container";
import { createWebhookModule } from "../adapters/inbound/webhook/webhook.container";
import { createGitHubOAuthModule } from "../adapters/outbound/github-oauth/github-oauth.container";
import { backgroundModule } from "../adapters/outbound/background/background.container";
import { clockModule } from "../adapters/outbound/clock/clock.container";
import { createD1SearchModule } from "../adapters/outbound/d1-search/d1-search.container";
import { githubContainer } from "../adapters/outbound/github/github.container";
import { loggingModule } from "../adapters/outbound/logging/logging.container";
import { createQueueModule } from "../adapters/outbound/queue/queue.container";
import { toNotesRepoSettings, toOAuthSettings, toWebhookSettings } from "./config/config-settings";
import { createConfigModule } from "./config/config.container";
import type { AppConfig } from "./config/env-schema";
import { indexingModule } from "./indexing/indexing.container";
import { INDEXING } from "./indexing/indexing.symbols";
import { searchModule } from "./search/search.container";
import { SEARCH } from "./search/search.symbols";
import { useCasesModule } from "./use-cases/use-cases.container";
import { USE_CASES } from "./use-cases/use-cases.symbols";
import type { WorkerBindings } from "./worker-bindings";

const TOOL_USE_CASES = { ...USE_CASES, searchNotes: SEARCH.searchNotes };

export type ModulesFactory = (config: AppConfig, bindings: WorkerBindings) => ContainerModule[];

export const appModules: ModulesFactory = (config, bindings) => [
  createConfigModule(config),
  githubContainer(toNotesRepoSettings(config)),
  createD1SearchModule(bindings.DB),
  clockModule,
  backgroundModule,
  loggingModule,
  searchModule,
  useCasesModule,
  createMcpModule(TOOL_USE_CASES),
  createGitHubOAuthModule(toOAuthSettings(config)),
  createOAuthModule(toOAuthSettings(config)),
  createQueueModule(bindings.INDEX_QUEUE),
  indexingModule,
  createIndexQueueModule(INDEXING.indexPushed),
  createWebhookModule({
    ...toWebhookSettings(config),
    branch: config.NOTES_BRANCH,
    changes: INDEXING.queueChanges,
    reconciler: INDEXING.reconcile,
  }),
];
