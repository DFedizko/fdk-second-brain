export interface SignInChallenge {
  readonly state: string;
  readonly codeChallenge: string;
}

export interface SignedInUser {
  readonly login: string;
  readonly id: string;
}

export interface IdentityProvider {
  authorizeUrl(challenge: SignInChallenge): string;
  identify(code: string, codeVerifier: string): Promise<SignedInUser>;
}
