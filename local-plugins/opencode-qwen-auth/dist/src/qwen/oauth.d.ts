export interface QwenOAuthOptions {
    clientId: string;
    oauthBaseUrl: string;
    scopes?: string[];
}
export interface QwenDeviceAuthorization {
    deviceCode: string;
    userCode: string;
    verificationUri: string;
    verificationUriComplete?: string;
    expiresAt: number;
    intervalSeconds: number;
    codeVerifier: string;
}
export type QwenTokenResult = {
    type: "success";
    access: string;
    refresh: string;
    expires: number;
    resourceUrl?: string;
} | {
    type: "failed";
    error: string;
    code?: string;
};
export declare function authorizeQwenDevice(options: QwenOAuthOptions): Promise<QwenDeviceAuthorization>;
export declare function pollQwenDeviceToken(options: QwenOAuthOptions, deviceCode: string, intervalSeconds: number, expiresAt: number, codeVerifier: string): Promise<QwenTokenResult>;
export declare function refreshQwenToken(options: QwenOAuthOptions, refreshToken: string): Promise<QwenTokenResult>;
//# sourceMappingURL=oauth.d.ts.map