import type { SignedInUser } from "../../../shared/contracts/identity-provider";

export interface AccessPolicy {
  admits(user: SignedInUser): boolean;
}

export class OwnerGate implements AccessPolicy {
  constructor(private readonly ownerId: string) {}

  admits(user: SignedInUser): boolean {
    return user.id === this.ownerId;
  }
}
