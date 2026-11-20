import {
  MAX_COMMIT_FILES,
  PUSH_SCHEMA,
  PushEvent,
} from "../../../../src/adapters/inbound/webhook/push-event";
import { buildPushPayload, type FileChanges } from "./__fake__/push-payload";

const BRANCH = "notes/main";
const PLAN = "projects/plan.md";

function pushOf(commits: readonly FileChanges[]): PushEvent {
  return new PushEvent(PUSH_SCHEMA.parse(buildPushPayload({ branch: BRANCH, commits })));
}

function manyFiles(count: number): string[] {
  return Array.from({ length: count }, (_, place) => `notes/n-${place}.md`);
}

describe("PushEvent", () => {
  it("lists every change of a push with fewer files than GitHub's cap", () => {
    const push = pushOf([{ modified: manyFiles(MAX_COMMIT_FILES - 1) }]);

    expect(push.listsEveryChange).toBe(true);
  });

  it("may miss changes when a commit reaches GitHub's file cap", () => {
    const push = pushOf([{ modified: manyFiles(MAX_COMMIT_FILES) }]);

    expect(push.listsEveryChange).toBe(false);
  });

  it("reads a commit that leaves out its file lists", () => {
    const body = { ...buildPushPayload({ branch: BRANCH, commits: [] }), commits: [{ id: "1" }] };

    const push = new PushEvent(PUSH_SCHEMA.parse(body));

    expect(push.changedPaths()).toEqual([]);
  });

  it("knows the branch it was pushed to", () => {
    const push = pushOf([{ added: [PLAN] }]);

    expect(push.isTo(BRANCH)).toBe(true);
  });
});
