type JsonValue = any;
export interface TransformContext {
    responseId: string;
    itemId: string;
    createdAt: number;
}
export declare function createTransformContext(): TransformContext;
export declare function transformChatCompletionsToResponses(chatBody: JsonValue, ctx: TransformContext): JsonValue;
export {};
//# sourceMappingURL=response.d.ts.map