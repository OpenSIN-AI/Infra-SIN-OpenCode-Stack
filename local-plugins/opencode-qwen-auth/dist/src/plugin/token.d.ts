import { type QwenOAuthOptions } from "../qwen/oauth";
import type { OAuthAuthDetails, PluginClient } from "./types";
export declare class QwenTokenRefreshError extends Error {
    code?: string;
    constructor(message: string, code?: string);
}
export declare function refreshAccessToken(auth: OAuthAuthDetails, options: QwenOAuthOptions, client: PluginClient, providerId: string): Promise<OAuthAuthDetails | null>;
//# sourceMappingURL=token.d.ts.map