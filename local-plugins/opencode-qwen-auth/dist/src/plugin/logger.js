let quietMode = false;
let debugLevel = 0;
export function setLoggerQuietMode(value) {
    quietMode = value;
}
export function setDebugLevel(level) {
    debugLevel = level;
}
export function initDebugFromEnv() {
    const envDebug = process.env.QWEN_DEBUG;
    if (envDebug === "true" || envDebug === "1") {
        debugLevel = 1;
    }
    else if (envDebug === "2") {
        debugLevel = 2;
    }
    else if (process.env.DEBUG?.includes("qwen")) {
        debugLevel = 1;
    }
}
export function createLogger(scope) {
    const prefix = `[qwen-oauth:${scope}]`;
    return {
        debug: (message, meta) => {
            if (debugLevel < 1)
                return;
            if (meta) {
                console.error(prefix, message, meta);
            }
            else {
                console.error(prefix, message);
            }
        },
        verbose: (message, meta) => {
            if (debugLevel < 2)
                return;
            if (meta) {
                console.error(prefix, "[verbose]", message, meta);
            }
            else {
                console.error(prefix, "[verbose]", message);
            }
        },
        info: (message, meta) => {
            if (quietMode)
                return;
            if (meta) {
                console.log(prefix, message, meta);
            }
            else {
                console.log(prefix, message);
            }
        },
        warn: (message, meta) => {
            if (quietMode)
                return;
            if (meta) {
                console.warn(prefix, message, meta);
            }
            else {
                console.warn(prefix, message);
            }
        },
        error: (message, meta) => {
            if (meta) {
                console.error(prefix, message, meta);
            }
            else {
                console.error(prefix, message);
            }
        },
    };
}
//# sourceMappingURL=logger.js.map