import { OwnerGate } from "../../../../src/adapters/inbound/oauth/owner-gate";

const OWNER_LOGIN = "octo-cat";
const USER_ID = "583231";

describe("OwnerGate", () => {
  it("admits the owner", () => {
    const gate = new OwnerGate(OWNER_LOGIN);

    const admitted = gate.admits({ login: OWNER_LOGIN, id: USER_ID });

    expect(admitted).toBe(true);
  });

  it("admits the owner whatever the letter case, as GitHub logins ignore case", () => {
    const gate = new OwnerGate(OWNER_LOGIN);

    const admitted = gate.admits({ login: "Octo-Cat", id: USER_ID });

    expect(admitted).toBe(true);
  });

  it("refuses any other GitHub user", () => {
    const gate = new OwnerGate(OWNER_LOGIN);

    const admitted = gate.admits({ login: "octo-dog", id: USER_ID });

    expect(admitted).toBe(false);
  });

  it("refuses a login that only contains the owner's", () => {
    const gate = new OwnerGate(OWNER_LOGIN);

    const admitted = gate.admits({ login: `${OWNER_LOGIN}-fan`, id: USER_ID });

    expect(admitted).toBe(false);
  });
});
