export interface OAuthSettings {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly ownerLogin: string;
  readonly cookieEncryptionKey: string;
  readonly publicUrl: string;
  readonly oauthUrl: string;
  readonly apiUrl: string;
}
