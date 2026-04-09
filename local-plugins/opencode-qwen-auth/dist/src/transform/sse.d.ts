import type { Logger } from "../plugin/logger";
export interface SSETransformContext {
    responseId: string;
    itemId: string;
    createdAt: number;
    logger?: Logger;
}
export declare function createSSETransformContext(logger?: Logger): SSETransformContext;
export declare function createSSETransformStream(ctx: SSETransformContext): TransformStream<Uint8Array, Uint8Array>;
//# sourceMappingURL=sse.d.ts.map