export declare function setLoggerQuietMode(value: boolean): void;
export declare function setDebugLevel(level: number): void;
export declare function initDebugFromEnv(): void;
export declare function createLogger(scope: string): {
    debug: (message: string, meta?: Record<string, unknown>) => void;
    verbose: (message: string, meta?: Record<string, unknown>) => void;
    info: (message: string, meta?: Record<string, unknown>) => void;
    warn: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, meta?: Record<string, unknown>) => void;
};
export type Logger = ReturnType<typeof createLogger>;
//# sourceMappingURL=logger.d.ts.map