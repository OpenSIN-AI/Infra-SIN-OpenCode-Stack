import type { RotationStrategy } from "./config/schema";
import { type HealthScoreTracker, type TokenBucketTracker } from "./rotation";
export type { RotationStrategy } from "./config/schema";
/**
 * Options for selectAccount when using hybrid strategy.
 */
export interface SelectAccountOptions {
    /** Health score tracker for hybrid selection */
    healthTracker?: HealthScoreTracker;
    /** Token bucket tracker for hybrid selection */
    tokenTracker?: TokenBucketTracker;
    /** PID offset for distributing sessions across accounts */
    pidOffset?: number;
}
export interface AccountHealth {
    successCount: number;
    failureCount: number;
    consecutiveFailures: number;
    lastSuccess?: number;
    lastFailure?: number;
}
export interface QwenAccount {
    refreshToken: string;
    accessToken?: string;
    expires?: number;
    resourceUrl?: string;
    addedAt: number;
    lastUsed: number;
    rateLimitResetAt?: number;
    health?: AccountHealth;
}
export interface AccountStorage {
    version: 1;
    accounts: QwenAccount[];
    activeIndex: number;
}
export declare function getStoragePath(): string;
export declare function loadAccounts(): Promise<AccountStorage | null>;
export declare function saveAccounts(storage: AccountStorage): Promise<void>;
export declare function upsertAccount(storage: AccountStorage, account: QwenAccount): AccountStorage;
export declare function updateAccount(storage: AccountStorage, index: number, update: Partial<QwenAccount>): AccountStorage;
export declare function selectAccount(storage: AccountStorage, strategy: RotationStrategy, now: number, options?: SelectAccountOptions): {
    account: QwenAccount;
    index: number;
    storage: AccountStorage;
} | null;
export declare function markRateLimited(storage: AccountStorage, index: number, retryAfterMs: number): AccountStorage;
export declare function getMinRateLimitWait(storage: AccountStorage, now: number): number | null;
export declare function calculateHealthScore(account: QwenAccount): number;
export declare function recordSuccess(storage: AccountStorage, index: number): AccountStorage;
export declare function recordFailure(storage: AccountStorage, index: number): AccountStorage;
export declare function isAccountUsable(account: QwenAccount, threshold?: number): boolean;
//# sourceMappingURL=account.d.ts.map