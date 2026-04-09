import { type QwenPluginConfig } from "./schema";
export interface LoadedConfig extends QwenPluginConfig {
    isExplicitStrategy: boolean;
}
export declare function loadConfig(directory: string): LoadedConfig;
//# sourceMappingURL=loader.d.ts.map