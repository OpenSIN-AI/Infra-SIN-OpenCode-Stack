#!/usr/bin/env node
export declare function install(options?: {
    global?: boolean;
}): {
    success: boolean;
    configPath: string;
    alreadyInstalled: boolean;
};
export declare function installWithPrompt(options?: {
    global?: boolean;
    skipPrompt?: boolean;
}): Promise<{
    success: boolean;
    configPath: string;
    alreadyInstalled: boolean;
}>;
export declare function main(args?: string[]): Promise<void>;
//# sourceMappingURL=install.d.ts.map