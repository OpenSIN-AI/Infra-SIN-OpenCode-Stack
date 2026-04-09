/**
 * Account Rotation System
 *
 * Implements advanced account selection algorithms:
 * - Health Score: Track account wellness based on success/failure
 * - Token Bucket: Client-side rate limiting to prevent 429s
 * - LRU Selection: Prefer accounts with longest rest periods
 * - Hybrid Selection: Weighted combination of all signals
 *
 * Used by 'hybrid' strategy for improved load distribution.
 */
export interface HealthScoreConfig {
    /** Initial score for new accounts (default: 70) */
    initial: number;
    /** Points added on successful request (default: 1) */
    successReward: number;
    /** Points removed on rate limit (default: -10) */
    rateLimitPenalty: number;
    /** Points removed on failure (auth, network, etc.) (default: -20) */
    failurePenalty: number;
    /** Points recovered per hour of rest (default: 2) */
    recoveryRatePerHour: number;
    /** Minimum score to be considered usable (default: 50) */
    minUsable: number;
    /** Maximum score cap (default: 100) */
    maxScore: number;
}
export declare const DEFAULT_HEALTH_SCORE_CONFIG: HealthScoreConfig;
export interface HealthScoreState {
    score: number;
    lastUpdated: number;
    lastSuccess: number;
    consecutiveFailures: number;
}
/**
 * Tracks health scores for accounts.
 * Higher score = healthier account = preferred for selection.
 */
export declare class HealthScoreTracker {
    private readonly scores;
    readonly config: HealthScoreConfig;
    constructor(config?: Partial<HealthScoreConfig>);
    /**
     * Get current health score for an account, applying time-based recovery.
     */
    getScore(accountIndex: number): number;
    /**
     * Record a successful request - improves health score.
     */
    recordSuccess(accountIndex: number): void;
    /**
     * Record a rate limit hit - moderate penalty.
     */
    recordRateLimit(accountIndex: number): void;
    /**
     * Record a failure (auth, network, etc.) - larger penalty.
     */
    recordFailure(accountIndex: number): void;
    /**
     * Check if account is healthy enough to use.
     */
    isUsable(accountIndex: number): boolean;
    /**
     * Get consecutive failure count for an account.
     */
    getConsecutiveFailures(accountIndex: number): number;
    /**
     * Reset health state for an account (e.g., after removal).
     */
    reset(accountIndex: number): void;
    /**
     * Export state for persistence.
     */
    toJSON(): Record<string, HealthScoreState>;
    /**
     * Load state from persisted data.
     */
    loadFromJSON(data: Record<string, HealthScoreState>): void;
    /**
     * Get all scores for debugging/logging.
     */
    getSnapshot(): Map<number, {
        score: number;
        consecutiveFailures: number;
    }>;
}
export interface TokenBucketConfig {
    /** Maximum tokens per account (default: 50) */
    maxTokens: number;
    /** Tokens regenerated per minute (default: 6) */
    regenerationRatePerMinute: number;
    /** Initial tokens for new accounts (default: 50) */
    initialTokens: number;
}
export declare const DEFAULT_TOKEN_BUCKET_CONFIG: TokenBucketConfig;
export interface TokenBucketState {
    tokens: number;
    lastUpdated: number;
}
/**
 * Client-side rate limiting using Token Bucket algorithm.
 * Helps prevent hitting server 429s by tracking "cost" of requests.
 */
export declare class TokenBucketTracker {
    private readonly buckets;
    private readonly config;
    constructor(config?: Partial<TokenBucketConfig>);
    /**
     * Get current token balance for an account, applying regeneration.
     */
    getTokens(accountIndex: number): number;
    /**
     * Check if account has enough tokens for a request.
     * @param cost Cost of the request (default: 1)
     */
    hasTokens(accountIndex: number, cost?: number): boolean;
    /**
     * Consume tokens for a request.
     * @returns true if tokens were consumed, false if insufficient
     */
    consume(accountIndex: number, cost?: number): boolean;
    /**
     * Refund tokens (e.g., if request wasn't actually sent).
     */
    refund(accountIndex: number, amount?: number): void;
    /**
     * Get max tokens config value.
     */
    getMaxTokens(): number;
    /**
     * Export state for persistence.
     */
    toJSON(): Record<string, TokenBucketState>;
    /**
     * Load state from persisted data.
     */
    loadFromJSON(data: Record<string, TokenBucketState>): void;
}
export interface AccountWithMetrics {
    index: number;
    lastUsed: number;
    healthScore: number;
    tokens: number;
    isRateLimited: boolean;
}
export interface ScoreBreakdown {
    health: number;
    tokens: number;
    freshness: number;
}
export interface HybridSelectionResult {
    index: number;
    score: number;
    breakdown: ScoreBreakdown;
}
/**
 * Calculate hybrid score for an account.
 * Score = (health × 2) + (tokens × 5) + (freshness × 0.1)
 *
 * Weight breakdown:
 * - Token balance: 50% influence (500 points max)
 * - Health score: 20% influence (200 points max)
 * - Freshness (LRU): 36% influence (360 points max)
 */
export declare function calculateHybridScore(account: AccountWithMetrics, maxTokens: number): {
    score: number;
    breakdown: ScoreBreakdown;
};
/**
 * Select account using hybrid strategy.
 *
 * Algorithm:
 * 1. Filter available accounts (not rate-limited, healthy, has tokens)
 * 2. Calculate priority score for each
 * 3. Sort by score descending
 * 4. Return the best candidate (deterministic - highest score)
 *
 * @param accounts - All accounts with their metrics
 * @param minHealthScore - Minimum health score to be considered (default: 50)
 * @param maxTokens - Maximum tokens for percentage calculation (default: 50)
 * @returns Best account selection result, or null if none available
 */
export declare function selectHybridAccount(accounts: AccountWithMetrics[], minHealthScore?: number, maxTokens?: number): HybridSelectionResult | null;
/**
 * Get the global health score tracker instance.
 * Creates one with default config if not initialized.
 */
export declare function getHealthTracker(): HealthScoreTracker;
/**
 * Initialize the global health tracker with custom config.
 * Call this at plugin startup if custom config is needed.
 */
export declare function initHealthTracker(config?: Partial<HealthScoreConfig>): HealthScoreTracker;
/**
 * Get the global token bucket tracker instance.
 * Creates one with default config if not initialized.
 */
export declare function getTokenTracker(): TokenBucketTracker;
/**
 * Initialize the global token tracker with custom config.
 * Call this at plugin startup if custom config is needed.
 */
export declare function initTokenTracker(config?: Partial<TokenBucketConfig>): TokenBucketTracker;
/**
 * Reset all global trackers. Used for testing.
 */
export declare function resetTrackers(): void;
//# sourceMappingURL=rotation.d.ts.map