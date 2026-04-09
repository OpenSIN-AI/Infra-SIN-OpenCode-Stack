export function isOAuthAuth(auth) {
    return (auth.type === "oauth" &&
        typeof auth.refresh === "string" &&
        auth.refresh.length > 0);
}
export function calculateTokenExpiry(startTimeMs, expiresInSeconds) {
    return startTimeMs + expiresInSeconds * 1000;
}
export function accessTokenExpired(auth, bufferSeconds = 0) {
    if (!auth.expires) {
        return true;
    }
    const now = Date.now();
    return auth.expires - bufferSeconds * 1000 <= now;
}
//# sourceMappingURL=auth.js.map