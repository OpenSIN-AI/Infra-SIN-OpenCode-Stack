import { createHash, randomBytes } from "node:crypto";
import { QWEN_DEFAULT_CLIENT_ID, QWEN_DEFAULT_SCOPES, QWEN_DEVICE_CODE_ENDPOINT, QWEN_OAUTH_BASE_URL, QWEN_TOKEN_ENDPOINT, } from "../constants";
import { calculateTokenExpiry } from "../plugin/auth";
function createOAuthBody(entries) {
    return new URLSearchParams(entries);
}
function parseJsonResponseText(responseText, context, response) {
    const text = typeof responseText === "string" ? responseText : "";
    try {
        return JSON.parse(text);
    }
    catch (error) {
        const preview = text.trim().replace(/\s+/g, " ").slice(0, 240);
        const contentType = response.headers.get("content-type") ?? "unknown content-type";
        const details = preview
            ? `${response.status} ${response.statusText} (${contentType}) — ${preview}`
            : `${response.status} ${response.statusText} (${contentType})`;
        const message = `${context}: expected JSON but received non-JSON response (${details})`;
        throw new Error(message, { cause: error });
    }
}
function resolveOAuthUrl(base, endpoint) {
    const normalized = typeof base === "string" && base.trim() ? base : QWEN_OAUTH_BASE_URL;
    try {
        return new URL(endpoint, normalized).toString();
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Invalid OAuth base URL: ${normalized}. ${message}`);
    }
}
function resolveClientId(clientId) {
    const trimmed = typeof clientId === "string" ? clientId.trim() : "";
    return trimmed || QWEN_DEFAULT_CLIENT_ID;
}
function base64UrlEncode(buffer) {
    return buffer
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}
function createPkcePair() {
    const verifier = base64UrlEncode(randomBytes(32));
    const challenge = base64UrlEncode(createHash("sha256").update(verifier).digest());
    return { verifier, challenge };
}
export async function authorizeQwenDevice(options) {
    const scopes = options.scopes ?? QWEN_DEFAULT_SCOPES;
    const { verifier, challenge } = createPkcePair();
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 10_000);
    let response;
    try {
        response = await fetch(resolveOAuthUrl(options.oauthBaseUrl, QWEN_DEVICE_CODE_ENDPOINT), {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: createOAuthBody({
                client_id: resolveClientId(options.clientId),
                scope: scopes.join(" "),
                code_challenge: challenge,
                code_challenge_method: "S256",
            }),
            signal: ac.signal,
        });
    }
    catch (err) {
        clearTimeout(to);
        if (err.name === "AbortError" || err.code === "ABORT_ERR") {
            throw new Error("Qwen device auth request timed out after 10s");
        }
        throw err;
    }
    clearTimeout(to);
    const responseText = await response.text();
    const ct = response.headers.get("content-type") ?? "";
    if (!response.ok) {
        throw new Error(responseText || "Failed to start Qwen device flow");
    }
    if (!ct.includes("application/json")) {
        throw new Error(`Qwen device auth: non-JSON response (${response.status} ${ct})`);
    }
    let payload;
    try { payload = JSON.parse(responseText); } catch { throw new Error("Qwen device auth: malformed JSON"); }
    const expiresAt = calculateTokenExpiry(Date.now(), payload.expires_in);
    const intervalSeconds = payload.interval ?? 5;
    return {
        deviceCode: payload.device_code,
        userCode: payload.user_code,
        verificationUri: payload.verification_uri,
        verificationUriComplete: payload.verification_uri_complete,
        expiresAt,
        intervalSeconds,
        codeVerifier: verifier,
    };
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export async function pollQwenDeviceToken(options, deviceCode, intervalSeconds, expiresAt, codeVerifier) {
    let currentInterval = intervalSeconds;
    while (Date.now() < expiresAt) {
        const ac = new AbortController();
        const to = setTimeout(() => ac.abort(), 10_000);
        let response;
        try {
            response = await fetch(resolveOAuthUrl(options.oauthBaseUrl, QWEN_TOKEN_ENDPOINT), {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: createOAuthBody({
                    client_id: resolveClientId(options.clientId),
                    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
                    device_code: deviceCode,
                    code_verifier: codeVerifier,
                }),
                signal: ac.signal,
            });
        }
        catch (err) {
            clearTimeout(to);
            if (err.name === "AbortError" || err.code === "ABORT_ERR") {
                return { type: "failed", error: "Polling request timed out after 10s", code: "timeout" };
            }
            throw err;
        }
        clearTimeout(to);
        if (response.ok) {
            const responseText = await response.text();
            const ct = response.headers.get("content-type") ?? "";
            // WAF/CDN may return 200 OK with HTML — detect and fail gracefully
            if (!ct.includes("application/json")) {
                const preview = responseText.trim().replace(/\s+/g, " ").slice(0, 200);
                return { type: "failed", error: `Non-JSON polling response (${response.status} ${ct}): ${preview}`, code: "waf_challenge" };
            }
            let payload;
            try { payload = JSON.parse(responseText); } catch { return { type: "failed", error: "Malformed JSON in polling response", code: "parse_error" }; }
            if (!payload.refresh_token) {
                return { type: "failed", error: "Missing refresh token" };
            }
            return {
                type: "success",
                access: payload.access_token,
                refresh: payload.refresh_token,
                expires: calculateTokenExpiry(Date.now(), payload.expires_in),
                resourceUrl: payload.resource_url,
            };
        }
        const errorText = await response.text();
        let errorPayload = {};
        try {
            errorPayload = JSON.parse(errorText);
        }
        catch {
            errorPayload = {};
        }
        const code = errorPayload.error;
        if (code === "authorization_pending") {
            await sleep(currentInterval * 1000);
            continue;
        }
        if (code === "slow_down") {
            currentInterval += 5;
            await sleep(currentInterval * 1000);
            continue;
        }
        if (code === "expired_token") {
            return { type: "failed", error: "Device code expired", code };
        }
        return {
            type: "failed",
            error: errorPayload.error_description ?? "OAuth polling failed",
            code,
        };
    }
    return { type: "failed", error: "Device authorization expired" };
}
export async function refreshQwenToken(options, refreshToken) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    let response;
    try {
        response = await fetch(resolveOAuthUrl(options.oauthBaseUrl, QWEN_TOKEN_ENDPOINT), {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: createOAuthBody({
                client_id: resolveClientId(options.clientId),
                grant_type: "refresh_token",
                refresh_token: refreshToken,
            }),
            signal: controller.signal,
        });
    }
    catch (err) {
        clearTimeout(timeoutId);
        if (err.name === "AbortError" || err.code === "ABORT_ERR") {
            return { type: "failed", error: "Token refresh request timed out after 10s", code: "timeout" };
        }
        throw err;
    }
    clearTimeout(timeoutId);
    // Read body once — WAF/CDN may return 200 OK with HTML challenge
    const responseText = await response.text();
    const contentType = response.headers.get("content-type") ?? "";
    // Detect WAF/non-JSON responses (Aliyun WAF returns 200 + text/html)
    if (!contentType.includes("application/json")) {
        const preview = responseText.trim().replace(/\s+/g, " ").slice(0, 200);
        return {
            type: "failed",
            error: `Non-JSON response (${response.status} ${contentType}): ${preview}`,
            code: "waf_challenge",
        };
    }
    // Parse JSON safely — never crash on malformed body
    let payload;
    try {
        payload = JSON.parse(responseText);
    } catch {
        return {
            type: "failed",
            error: "Malformed JSON in token refresh response",
            code: "parse_error",
        };
    }
    // Handle HTTP error responses (400, 401, etc.)
    if (!response.ok) {
        return {
            type: "failed",
            error: payload.error_description ?? "Failed to refresh token",
            code: payload.error,
        };
    }
    // Success — valid JSON token response
    return {
        type: "success",
        access: payload.access_token,
        refresh: payload.refresh_token ?? refreshToken,
        expires: calculateTokenExpiry(Date.now(), payload.expires_in),
        resourceUrl: payload.resource_url,
    };
}
//# sourceMappingURL=oauth.js.map
