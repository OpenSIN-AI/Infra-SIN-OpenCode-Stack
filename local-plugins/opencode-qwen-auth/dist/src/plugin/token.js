import { refreshQwenToken } from "../qwen/oauth";
export class QwenTokenRefreshError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.name = "QwenTokenRefreshError";
        this.code = code;
    }
}
export async function refreshAccessToken(auth, options, client, providerId) {
    const result = await refreshQwenToken(options, auth.refresh);
    if (result.type === "failed") {
        throw new QwenTokenRefreshError(result.error, result.code);
    }
    const updated = {
        type: "oauth",
        refresh: result.refresh,
        access: result.access,
        expires: result.expires,
        resourceUrl: result.resourceUrl ?? auth.resourceUrl,
    };
    const body = updated;
    await client.auth.set({
        path: { id: providerId },
        body,
    });
    return updated;
}
//# sourceMappingURL=token.js.map