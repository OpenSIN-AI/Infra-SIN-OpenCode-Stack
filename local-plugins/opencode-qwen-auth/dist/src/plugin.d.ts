import type { Plugin } from "@opencode-ai/plugin";
declare function sanitizeMalformedUrl(url: string): string;
declare function applyResourceUrl(input: RequestInfo | URL, baseUrl?: string): {
    url: string;
};
export declare const createQwenOAuthPlugin: (providerId: string) => Plugin;
export declare const QwenCLIOAuthPlugin: Plugin;
export declare const QwenOAuthPlugin: Plugin;
export { sanitizeMalformedUrl, applyResourceUrl };
export default QwenOAuthPlugin;
//# sourceMappingURL=plugin.d.ts.map