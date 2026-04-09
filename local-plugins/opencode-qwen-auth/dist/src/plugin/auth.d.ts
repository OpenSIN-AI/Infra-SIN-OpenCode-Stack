import type { AuthDetails, OAuthAuthDetails } from "./types";
export declare function isOAuthAuth(auth: AuthDetails): auth is OAuthAuthDetails;
export declare function calculateTokenExpiry(startTimeMs: number, expiresInSeconds: number): number;
export declare function accessTokenExpired(auth: OAuthAuthDetails, bufferSeconds?: number): boolean;
//# sourceMappingURL=auth.d.ts.map