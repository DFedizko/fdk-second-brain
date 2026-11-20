import { OwnerGate } from "../../../../src/adapters/inbound/oauth/owner-gate";

const OWNER_ID = "583231";
const OWNER_LOGIN = "octo-cat";

describe("OwnerGate", () => {
  it("admits the owner's GitHub account", () => {
    const gate = new OwnerGate(OWNER_ID);

    const admitted = gate.admits({ login: OWNER_LOGIN, id: OWNER_ID });

    expect(admitted).toBe(true);
  });

  it("admits the owner after a rename, as the account ID never changes", () => {
    const gate = new OwnerGate(OWNER_ID);

    const admitted = gate.admits({ login: "renamed-octo", id: OWNER_ID });

    expect(admitted).toBe(true);
  });

  it("refuses another account that now holds the owner's old login", () => {
    const gate = new OwnerGate(OWNER_ID);

    const admitted = gate.admits({ login: OWNER_LOGIN, id: "999" });

    expect(admitted).toBe(false);
  });

  it("refuses an ID that only starts with the owner's", () => {
    const gate = new OwnerGate(OWNER_ID);

    const admitted = gate.admits({ login: OWNER_LOGIN, id: `${OWNER_ID}0` });

    expect(admitted).toBe(false);
  });
});
