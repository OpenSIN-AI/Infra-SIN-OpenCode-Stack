// @bun
/**
 * brain-sync-enforcer.js
 *
 * Comprehensive enforcement hook for Oh-My-Opencode that ensures
 * critical completion checks before agent idleness/stoppage.
 *
 * Four mandatory checks:
 *
 * A) BRAIN CHECK: Have global Brain and local Brain been updated?
 * B) CODE CHECK: Repository workflow completion (commit, push, merge, issues)
 * C) DOCUMENTATION CHECK: All necessary documentation written/updated
 * D) ORGANIZATION & PROJECT MANAGEMENT CHECK: GitHub enterprise hygiene
 *
 * Each check requires exact matching response phrases. Agent must reply
 * with the specific confirmation phrase to pass and allow continuation.
 * Failed checks trigger re-injection every 10s (max 5 retries).
 *
 * Hook integration (in oh-my-opencode-sin):
 *   const brainSyncEnforcer = isHookEnabled("brain-sync-enforcer")
 *     ? safeHook("brain-sync-enforcer", () => createBrainSyncEnforcer(ctx, {
 *         retryIntervalMs: 10000,
 *         maxRetries: 5,
 *         enabledChecks: ["brain", "code", "docs", "org"]
 *       }))
 *     : null;
 *
 * Standalone:
 *   bun run scripts/brain-sync-enforcer.js --session=<session-id>
 */

import { readFileSync, writeFileSync, renameSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// ============================================================
// CHECK DEFINITIONS
// Each check has:
//   - directiveType: injected into [SYSTEM DIRECTIVE: OH-MY-OPENCODE - ...]
//   - prompt: the full text injected to the agent
//   - confirmationPatterns: regex array — any match = confirmed
//   - successPhrase: the canonical phrase the agent should reply with
// ============================================================

const CHECKS = {
  // A) BRAIN CHECK — ensures Global Brain (.pcpm/) and Local Brain (AGENTS.md) are synced
  brain: {
    directiveType: "BRAIN SYNC ENFORCER",
    prompt: `[SYSTEM DIRECTIVE: OH-MY-OPENCODE - BRAIN SYNC ENFORCER]

STOP! Before you continue or stop work:

Have global Brain and local Brain been updated?

- Global Brain = .pcpm/ files and Hive Mind sync
- Local Brain = Project-specific AGENTS.md and plans

If YES, reply ONLY with: "Brains updated"
If NO, perform the brain sync NOW, then reply: "Brains updated"

CRITICAL: You may NOT continue working or stop until this is confirmed.`,
    confirmationPatterns: [
      /brains?\s+updated?/i,
      /brain\s+sync\s+(done|complete|finished|ok)/i,
      /ja.*brain/i,
      /yes.*brain/i,
      /global.*local.*brain/i,
      /pcpm.*sync/i,
      /hive\s+mind\s+updated?/i,
    ],
    successPhrase: "Brains updated",
  },

  // B) CODE CHECK — ensures repos are committed, pushed, merged, and issues updated
  code: {
    directiveType: "CODE CHECK",
    prompt: `[SYSTEM DIRECTIVE: OH-MY-OPENCODE - CODE CHECK]

VERIFICATION REQUIRED: Have you completed ALL of the following?

1. Updated the associated repositories.
2. Committed all changes, pushed them, and successfully merged them into the 'main' branch.
3. Updated or created the priority lists and issues.

INSTRUCTION: If and only if all 3 steps are fully completed, reply STRICTLY with:
"Repositories updated"

If not complete, finish the steps first, then reply with the exact phrase.`,
    confirmationPatterns: [
      /repositories?\s+updated/i,
      /repo.*updated/i,
      /all.*(commit|push|merge|main).*done/i,
      /code.*complete/i,
    ],
    successPhrase: "Repositories updated",
  },

  // C) DOCUMENTATION CHECK — ensures README, API docs, ADRs, guides, changelogs are complete
  docs: {
    directiveType: "DOCUMENTATION CHECK",
    prompt: `[SYSTEM DIRECTIVE: OH-MY-OPENCODE - DOCUMENTATION CHECK]

VERIFICATION REQUIRED: Has all necessary documentation been written, updated, and recorded?

This includes:
- README.md updates (if needed)
- API documentation changes
- Architecture decision records (ADRs)
- User guides and inline comments
- Changelog entries

INSTRUCTION: If and only if documentation is fully complete, reply STRICTLY with:
"Docs updated"

If documentation is missing, create/update it first, then reply with the exact phrase.`,
    confirmationPatterns: [
      /docs?\s+updated/i,
      /documentation.*complete/i,
      /readme.*update/i,
      /all.*docs.*done/i,
    ],
    successPhrase: "Docs updated",
  },

  // D) ORGANIZATION & PROJECT MANAGEMENT CHECK — ensures GitHub enterprise hygiene
  org: {
    directiveType: "ORGANIZATION CHECK",
    prompt: `[SYSTEM DIRECTIVE: OH-MY-OPENCODE - ORGANIZATION CHECK]

VERIFICATION REQUIRED: Have you completed ALL enterprise-level GitHub tasks?

Checklist:
1. Issue & PR Management: All relevant GitHub Issues are correctly labeled, assigned to milestones, and explicitly linked to Pull Requests (using keywords like "Resolves #ID"). PR descriptions are fully populated with context and testing steps.
2. Traceability: All commits, PR discussions, and review comments contain proper cross-references to corresponding Issue IDs for strict auditability.
3. Backlog & Technical Debt: All edge cases, known bugs, or technical debt identified during development are logged as new GitHub Issues with appropriate priority labels.
4. Stakeholder Alignment: Comprehensive resolution/progress comments are posted on all touched Issues and PRs, necessary reviewers/teams are @mentioned, and in-repo changelogs are updated.
5. Compliance & Documentation: Architectural, structural, or security decisions made during the workflow are explicitly documented in GitHub PR comments, Issues, or committed directly to the repository's documentation files.

INSTRUCTION: If and only if ALL GitHub organization tasks are fully complete, reply EXACTLY with:
"Org updated"

If any task is incomplete, finish it first, then reply with the exact phrase.`,
    confirmationPatterns: [
      /org\s+updated/i,
      /organization.*complete/i,
      /github.*hygiene.*done/i,
      /all.*issues?.*label/i,
      /all.*prs?.*complete/i,
      /project.*management.*done/i,
    ],
    successPhrase: "Org updated",
  },
};

// ============================================================
// STATE MANAGEMENT
// State is stored in a temp file to survive restarts.
// State tracks per-session pending checks, retry counts, and confirmations.
// ============================================================

const STATE_FILE = join(tmpdir(), "opensin-brain-sync-state.json");

/** Load state from disk. Returns empty object if missing or corrupt. */
function loadState() {
  if (!existsSync(STATE_FILE)) return { sessions: {} };
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
  } catch {
    return { sessions: {} };
  }
}

/** Atomically save state to disk via temp file rename. */
function saveState(state) {
  try {
    const tmp = STATE_FILE + ".tmp";
    writeFileSync(tmp, JSON.stringify(state, null, 2), "utf-8");
    renameSync(tmp, STATE_FILE);
  } catch (e) {
    console.error("[brain-sync] State save error:", e.message);
  }
}

// ============================================================
// SESSION TRACKING
// Each session gets its own tracking object.
// ============================================================

/** Get or create a session tracking object. */
function getOrCreateSession(state, sessionId) {
  if (!state.sessions[sessionId]) {
    state.sessions[sessionId] = {
      pending: false,       // Is a check currently pending?
      checkType: null,      // Which check is pending? ("brain", "code", "docs", "org")
      lastPromptAt: null,   // Timestamp of last prompt injection (ms)
      confirmedAt: null,    // ISO timestamp when confirmed
      retryCount: 0,        // How many retries so far
    };
  }
  return state.sessions[sessionId];
}

/**
 * Determine if we need to re-prompt.
 * Returns true if check is pending, unconfirmed, and retry interval has elapsed.
 */
function needsPrompt(session, now, retryMs) {
  if (!session.pending) return false;
  if (session.confirmedAt) return false;
  if (!session.lastPromptAt) return true;
  return now - session.lastPromptAt > retryMs;
}

// ============================================================
// CONFIRMATION MATCHING
// Checks agent replies against confirmation patterns for a given check type.
// ============================================================

/** Returns true if 'text' matches any confirmation pattern for 'checkType'. */
function isConfirmed(checkType, text) {
  if (!text) return false;
  const check = CHECKS[checkType];
  if (!check) return false;
  return check.confirmationPatterns.some((p) => p.test(text));
}

/** Returns the success phrase for a given check type. */
function getSuccessPhrase(checkType) {
  return CHECKS[checkType]?.successPhrase || "Confirmed";
}

// ============================================================
// PROMPT BUILDING
// Retry messages are escalated after 2 failed retries.
// ============================================================

/** Build the prompt for a check type, escalating if retryCount > 2. */
function buildPrompt(checkType, retryCount = 0) {
  const check = CHECKS[checkType];
  if (!check) return null;

  if (retryCount === 0) return check.prompt;
  if (retryCount <= 2) {
    return `${check.prompt}\n\n[Retry ${retryCount}/5] You have not yet confirmed completion of the ${check.directiveType}.`;
  }
  return `${check.prompt}\n\n[Retry ${retryCount}/5] WARNING: ${retryCount}x asked without response. Please confirm NOW: "${getSuccessPhrase(checkType)}"`;
}

// ============================================================
// MESSAGE PARSING
// Extracts text from OpenCode message objects (various formats).
// ============================================================

/** Extract text from a message object. Only processes user-role messages. */
function extractTextFromMessage(msg) {
  const role = msg.info?.role ?? msg.role;
  if (role !== "user") return null;

  // OpenCode v2 message format (parts array)
  if (msg.parts) {
    return msg.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("\n");
  }
  // Legacy format
  return msg.content?.text ?? msg.text ?? null;
}

// ============================================================
// INJECTION LOGIC
// Injects a check prompt into the active session via ctx.client.session.promptAsync.
// ============================================================

/** Inject a check prompt for a session. Updates state to track pending check. */
async function injectCheckPrompt(ctx, sessionId, checkType, retryCount = 0) {
  const state = loadState();
  const session = getOrCreateSession(state, sessionId);

  // Mark check as pending in state
  session.pending = true;
  session.checkType = checkType;
  session.lastPromptAt = Date.now();
  session.retryCount = retryCount;
  session.confirmedAt = null;

  saveState(state);

  const prompt = buildPrompt(checkType, retryCount);
  if (!prompt) {
    console.error(`[brain-sync] Invalid check type: ${checkType}`);
    return;
  }

  console.log(`[brain-sync] Injecting ${checkType} check for session ${sessionId} (retry: ${retryCount})`);

  try {
    // Inject the prompt into the running OpenCode session
    await ctx.client.session.promptAsync({
      path: { id: sessionId },
      body: {
        parts: [{ type: "text", text: prompt }],
      },
    });
    console.log(`[brain-sync] ${checkType} prompt injected successfully`);
  } catch (e) {
    console.error(`[brain-sync] Failed to inject ${checkType} prompt:`, e.message);
    session.pending = false;
    saveState(state);
  }
}

/**
 * Check if the agent has confirmed a pending check by scanning recent messages.
 * Returns true if confirmed (state updated), false otherwise.
 */
async function checkAndConfirm(sessionId, messages) {
  const state = loadState();
  const session = getOrCreateSession(state, sessionId);

  if (!session.pending || !session.checkType || session.confirmedAt) {
    return false;
  }

  // Scan messages in reverse (most recent first) for confirmation
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const text = extractTextFromMessage(msg);
    if (!text) continue;

    if (isConfirmed(session.checkType, text)) {
      // Confirmed! Mark session as done.
      session.confirmedAt = new Date().toISOString();
      session.pending = false;
      session.retryCount = 0;
      saveState(state);
      console.log(
        `[brain-sync] Session ${sessionId} confirmed ${session.checkType} at ${session.confirmedAt}`
      );
      return true;
    }
  }

  return false;
}

// ============================================================
// RETRY LOOP
// Polls state and re-injects the prompt every retryIntervalMs until confirmed or maxRetries exceeded.
// ============================================================

/**
 * Start a background retry loop for a pending check.
 * The loop fires every pollInterval ms and re-injects the prompt if unconfirmed.
 * Stops automatically on confirmation or maxRetries exhaustion.
 *
 * Returns { stop() } to cancel the loop externally.
 */
function startRetryLoop({
  sessionId,
  ctx,
  pollInterval = 10000,
  maxRetries = 5,
  onSuccess,
}) {
  const state = loadState();
  const session = getOrCreateSession(state, sessionId);

  if (!session.pending || !session.checkType) {
    console.log(`[brain-sync] No pending check for session ${sessionId}`);
    return { stop: () => {} };
  }

  console.log(
    `[brain-sync] Started retry loop for ${session.checkType} (interval: ${pollInterval}ms, max: ${maxRetries})`
  );

  const interval = setInterval(async () => {
    const now = Date.now();
    const currentState = loadState();
    const currentSession = getOrCreateSession(currentState, sessionId);

    // Stop if confirmed
    if (!currentSession.pending || currentSession.confirmedAt) {
      clearInterval(interval);
      if (onSuccess) onSuccess();
      return;
    }

    // Stop if max retries exceeded
    if (currentSession.retryCount >= maxRetries) {
      console.error(
        `[brain-sync] Max retries (${maxRetries}) reached for ${currentSession.checkType} in session ${sessionId}`
      );
      clearInterval(interval);
      // Future: trigger Telegram escalation here
      return;
    }

    // Re-inject prompt if interval elapsed
    if (needsPrompt(currentSession, now, pollInterval)) {
      const newRetryCount = currentSession.retryCount + 1;
      currentSession.retryCount = newRetryCount;
      currentSession.lastPromptAt = now;
      saveState(currentState);

      console.log(
        `[brain-sync] Retry ${newRetryCount}/${maxRetries} for ${currentSession.checkType} in session ${sessionId}`
      );

      const prompt = buildPrompt(currentSession.checkType, newRetryCount);
      if (prompt) {
        try {
          await ctx.client.session.promptAsync({
            path: { id: sessionId },
            body: { parts: [{ type: "text", text: prompt }] },
          });
        } catch (e) {
          console.error(`[brain-sync] Retry injection failed:`, e.message);
        }
      }
    }
  }, pollInterval);

  return {
    stop: () => clearInterval(interval),
    getSessionState: () => {
      const s = loadState().sessions[sessionId];
      return s ? { ...s } : null;
    },
  };
}

// ============================================================
// EVENT HANDLER (for hook integration into oh-my-opencode-sin)
// ============================================================

/**
 * Create a session.idle event handler that triggers the brain sync enforcement flow.
 *
 * Usage in oh-my-opencode-sin plugin:
 *   import { createHandler } from "./brain-sync-enforcer.js";
 *   const handler = createHandler(ctx, { enabledChecks: ["brain", "code", "docs", "org"] });
 *   ctx.on("session.idle", handler);
 */
function createHandler(ctx, options = {}) {
  const {
    retryIntervalMs = 10000,   // How often to re-prompt (default: 10s)
    maxRetries = 5,             // Max re-prompt attempts per check
    enabledChecks = ["brain", "code", "docs", "org"], // Which checks to run
  } = options;

  // Filter to only configured and valid checks
  const activeChecks = Object.keys(CHECKS).filter((k) => enabledChecks.includes(k));

  return async ({ event, sessionId, messages }) => {
    // This handler is only for session.idle events
    if (event.type !== "session.idle") return;

    console.log(`[brain-sync] session.idle for ${sessionId}`);

    const state = loadState();
    const session = getOrCreateSession(state, sessionId);

    // If a check is already pending, check if the agent confirmed it
    if (session.pending && session.checkType) {
      const confirmed = await checkAndConfirm(sessionId, messages);
      if (confirmed) {
        console.log(`[brain-sync] ${session.checkType} confirmed for ${sessionId}`);
        return;
      }
    }

    // No pending check or not yet confirmed — inject the first enabled check
    const firstCheck = activeChecks[0];
    if (firstCheck && !session.pending) {
      await injectCheckPrompt(ctx, sessionId, firstCheck, 0);

      // Start retry loop to follow up if no confirmation arrives
      const loop = startRetryLoop({
        sessionId,
        ctx,
        pollInterval: retryIntervalMs,
        maxRetries: maxRetries,
        onSuccess: () => {
          console.log(`[brain-sync] Check ${firstCheck} completed for ${sessionId}`);
        },
      });

      return loop;
    }
  };
}

// ============================================================
// PUBLIC API — exported for hook integration
// ============================================================

export {
  CHECKS,
  createHandler,
  injectCheckPrompt,
  checkAndConfirm,
  startRetryLoop,
  isConfirmed,
  getSuccessPhrase,
  loadState,
  saveState,
};

// ============================================================
// STANDALONE USAGE (when run directly with bun)
// ============================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const sessionId = args.find((a) => a.startsWith("--session="))?.split("=")[1];

  if (!sessionId) {
    console.log("[brain-sync] brain-sync-enforcer.js — Standalone Info");
    console.log(`[brain-sync] Available checks: ${Object.keys(CHECKS).join(", ")}`);
    console.log(`[brain-sync] State file: ${STATE_FILE}`);
    console.log("[brain-sync] This script is designed to be used as a hook within oh-my-opencode-sin.");
    console.log("[brain-sync] For hook integration, import createHandler from this file.");
    console.log("[brain-sync] For standalone usage, provide --session=<session-id>");
    process.exit(0);
  }

  console.log(`[brain-sync] Standalone mode for session ${sessionId}`);
  console.log(`[brain-sync] Available checks: ${Object.keys(CHECKS).join(", ")}`);
  console.log(`[brain-sync] State file: ${STATE_FILE}`);
  console.log(`[brain-sync] This script is designed to be used as a hook within oh-my-opencode-sin.`);
  console.log(`[brain-sync] For standalone operation, integrate with your session manager.`);
}
