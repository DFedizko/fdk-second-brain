import type { SignedInUser } from "../../../shared/contracts/identity-provider";

export interface AccessPolicy {
  admits(user: SignedInUser): boolean;
}

export class OwnerGate implements AccessPolicy {
  private readonly owner: string;

  constructor(ownerLogin: string) {
    this.owner = ownerLogin.toLowerCase();
  }

  admits(user: SignedInUser): boolean {
    return user.login.toLowerCase() === this.owner;
  }
}
