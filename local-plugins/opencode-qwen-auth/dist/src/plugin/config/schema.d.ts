import { z } from "zod";
export declare const HealthScoreConfigSchema: z.ZodObject<{
    initial: z.ZodDefault<z.ZodNumber>;
    success_reward: z.ZodDefault<z.ZodNumber>;
    rate_limit_penalty: z.ZodDefault<z.ZodNumber>;
    failure_penalty: z.ZodDefault<z.ZodNumber>;
    recovery_rate_per_hour: z.ZodDefault<z.ZodNumber>;
    min_usable: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    initial: number;
    success_reward: number;
    rate_limit_penalty: number;
    failure_penalty: number;
    recovery_rate_per_hour: number;
    min_usable: number;
}, {
    initial?: number | undefined;
    success_reward?: number | undefined;
    rate_limit_penalty?: number | undefined;
    failure_penalty?: number | undefined;
    recovery_rate_per_hour?: number | undefined;
    min_usable?: number | undefined;
}>;
export declare const TokenBucketConfigSchema: z.ZodObject<{
    max_tokens: z.ZodDefault<z.ZodNumber>;
    regeneration_rate_per_minute: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    max_tokens: number;
    regeneration_rate_per_minute: number;
}, {
    max_tokens?: number | undefined;
    regeneration_rate_per_minute?: number | undefined;
}>;
export declare const QwenConfigSchema: z.ZodObject<{
    client_id: z.ZodDefault<z.ZodString>;
    oauth_base_url: z.ZodDefault<z.ZodString>;
    base_url: z.ZodDefault<z.ZodString>;
    rotation_strategy: z.ZodDefault<z.ZodEnum<["round-robin", "sequential", "hybrid"]>>;
    proactive_refresh: z.ZodDefault<z.ZodBoolean>;
    refresh_window_seconds: z.ZodDefault<z.ZodNumber>;
    max_rate_limit_wait_seconds: z.ZodDefault<z.ZodNumber>;
    quiet_mode: z.ZodDefault<z.ZodBoolean>;
    pid_offset_enabled: z.ZodDefault<z.ZodBoolean>;
    health_score: z.ZodOptional<z.ZodObject<{
        initial: z.ZodDefault<z.ZodNumber>;
        success_reward: z.ZodDefault<z.ZodNumber>;
        rate_limit_penalty: z.ZodDefault<z.ZodNumber>;
        failure_penalty: z.ZodDefault<z.ZodNumber>;
        recovery_rate_per_hour: z.ZodDefault<z.ZodNumber>;
        min_usable: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        initial: number;
        success_reward: number;
        rate_limit_penalty: number;
        failure_penalty: number;
        recovery_rate_per_hour: number;
        min_usable: number;
    }, {
        initial?: number | undefined;
        success_reward?: number | undefined;
        rate_limit_penalty?: number | undefined;
        failure_penalty?: number | undefined;
        recovery_rate_per_hour?: number | undefined;
        min_usable?: number | undefined;
    }>>;
    token_bucket: z.ZodOptional<z.ZodObject<{
        max_tokens: z.ZodDefault<z.ZodNumber>;
        regeneration_rate_per_minute: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        max_tokens: number;
        regeneration_rate_per_minute: number;
    }, {
        max_tokens?: number | undefined;
        regeneration_rate_per_minute?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    client_id: string;
    oauth_base_url: string;
    base_url: string;
    rotation_strategy: "round-robin" | "sequential" | "hybrid";
    proactive_refresh: boolean;
    refresh_window_seconds: number;
    max_rate_limit_wait_seconds: number;
    quiet_mode: boolean;
    pid_offset_enabled: boolean;
    health_score?: {
        initial: number;
        success_reward: number;
        rate_limit_penalty: number;
        failure_penalty: number;
        recovery_rate_per_hour: number;
        min_usable: number;
    } | undefined;
    token_bucket?: {
        max_tokens: number;
        regeneration_rate_per_minute: number;
    } | undefined;
}, {
    client_id?: string | undefined;
    oauth_base_url?: string | undefined;
    base_url?: string | undefined;
    rotation_strategy?: "round-robin" | "sequential" | "hybrid" | undefined;
    proactive_refresh?: boolean | undefined;
    refresh_window_seconds?: number | undefined;
    max_rate_limit_wait_seconds?: number | undefined;
    quiet_mode?: boolean | undefined;
    pid_offset_enabled?: boolean | undefined;
    health_score?: {
        initial?: number | undefined;
        success_reward?: number | undefined;
        rate_limit_penalty?: number | undefined;
        failure_penalty?: number | undefined;
        recovery_rate_per_hour?: number | undefined;
        min_usable?: number | undefined;
    } | undefined;
    token_bucket?: {
        max_tokens?: number | undefined;
        regeneration_rate_per_minute?: number | undefined;
    } | undefined;
}>;
export type HealthScorePluginConfig = z.infer<typeof HealthScoreConfigSchema>;
export type TokenBucketPluginConfig = z.infer<typeof TokenBucketConfigSchema>;
export type QwenPluginConfig = z.infer<typeof QwenConfigSchema>;
export type RotationStrategy = QwenPluginConfig["rotation_strategy"];
//# sourceMappingURL=schema.d.ts.map