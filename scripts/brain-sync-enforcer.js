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
// ============================================================

const CHECKS = {
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

  org: {
    directiveType: "ORGANIZATION & PROJECT MANAGEMENT CHECK",
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
// ============================================================

const STATE_FILE = join(tmpdir(), "opensin-brain-sync-state.json");

function loadState() {
  if (!existsSync(STATE_FILE)) return { sessions: {} };
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
  } catch {
    return { sessions: {} };
  }
}

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
// ============================================================

function getOrCreateSession(state, sessionId) {
  if (!state.sessions[sessionId]) {
    state.sessions[sessionId] = {
      pending: false,
      checkType: null,
      lastPromptAt: null,
      confirmedAt: null,
      retryCount: 0,
    };
  }
  return state.sessions[sessionId];
}

function needsPrompt(session, now, retryMs) {
  if (!session.pending) return false;
  if (session.confirmedAt) return false;
  if (!session.lastPromptAt) return true;
  return now - session.lastPromptAt > retryMs;
}

// ============================================================
// CONFIRMATION MATCHING
// ============================================================

function isConfirmed(checkType, text) {
  if (!text) return false;
  const check = CHECKS[checkType];
  if (!check) return false;
  return check.confirmationPatterns.some((p) => p.test(text));
}

function getSuccessPhrase(checkType) {
  return CHECKS[checkType]?.successPhrase || "Confirmed";
}

// ============================================================
// PROMPT BUILDING
// ============================================================

function buildPrompt(checkType) {
  const check = CHECKS[checkType];
  if (!check) return null;

  if (check.retryCount === 0) return check.prompt;
  if (check.retryCount <= 2) {
    return `${check.prompt}\n\n[Retry ${check.retryCount}/5] You have not yet confirmed completion of the ${check.directiveType}.`;
  }
  return `${check.prompt}\n\n[Retry ${check.retryCount}/5] WARNING: ${check.retryCount}x asked without response. Please confirm NOW: "${getSuccessPhrase(checkType)}"`;
}

// ============================================================
// MESSAGE PARSING
// ============================================================

function extractTextFromMessage(msg) {
  const role = msg.info?.role ?? msg.role;
  if (role !== "user") return null;

  if (msg.parts) {
    return msg.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("\n");
  }
  return msg.content?.text ?? msg.text ?? null;
}

// ============================================================
// INJECTION LOGIC
// ============================================================

async function injectCheckPrompt(ctx, sessionId, checkType) {
  const state = loadState();
  const session = getOrCreateSession(state, sessionId);

  session.pending = true;
  session.checkType = checkType;
  session.lastPromptAt = Date.now();
  session.retryCount = 0;
  session.confirmedAt = null;

  saveState(state);

  const prompt = buildPrompt(checkType);
  if (!prompt) {
    console.error(`[brain-sync] Invalid check type: ${checkType}`);
    return;
  }

  console.log(`[brain-sync] Injecting ${checkType} check for session ${sessionId}`);

  try {
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

async function checkAndConfirm(sessionId, messages) {
  const state = loadState();
  const session = getOrCreateSession(state, sessionId);

  if (!session.pending || !session.checkType || session.confirmedAt) {
    return false;
  }

  // Check messages in reverse (most recent first)
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const text = extractTextFromMessage(msg);
    if (!text) continue;

    if (isConfirmed(session.checkType, text)) {
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
// ============================================================

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

    if (!currentSession.pending || currentSession.confirmedAt) {
      clearInterval(interval);
      if (onSuccess) onSuccess();
      return;
    }

    if (currentSession.retryCount >= maxRetries) {
      console.error(
        `[brain-sync] Max retries (${maxRetries}) reached for ${currentSession.checkType} in session ${sessionId}`
      );
      clearInterval(interval);
      // Could trigger escalation here (e.g., notify via Telegram)
      return;
    }

    if (needsPrompt(currentSession, now, pollInterval)) {
      currentSession.retryCount++;
      currentSession.lastPromptAt = now;
      saveState(currentState);

      console.log(
        `[brain-sync] Retry ${currentSession.retryCount}/${maxRetries} for ${currentSession.checkType} in session ${sessionId}`
      );

      const prompt = buildPrompt(currentSession.checkType);
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
// EVENT HANDLER (for hook integration)
// ============================================================

function createHandler(ctx, options = {}) {
  const {
    retryIntervalMs = 10000,
    maxRetries = 5,
    enabledChecks = ["brain", "code", "docs", "org"],
  } = options;

  // Filter checks based on enabledChecks
  const activeChecks = Object.keys(CHECKS).filter((k) => enabledChecks.includes(k));

  return async ({ event, sessionId, messages }) => {
    // This handler is meant to be called on session.idle events
    if (event.type !== "session.idle") return;

    console.log(`[brain-sync] session.idle for ${sessionId}`);

    // Check if any check is pending and needs confirmation
    const state = loadState();
    const session = getOrCreateSession(state, sessionId);

    if (session.pending && session.checkType) {
      const confirmed = await checkAndConfirm(sessionId, messages);
      if (confirmed) {
        console.log(`[brain-sync] ${session.checkType} confirmed for ${sessionId}`);
        return;
      }
    }

    // If no pending check or not confirmed, inject the first pending check
    // (Based on todo list or always start with brain check)
    const firstCheck = activeChecks[0];
    if (firstCheck && !session.pending) {
      await injectCheckPrompt(ctx, sessionId, firstCheck);

      // Start retry loop
      const loop = startRetryLoop({
        sessionId,
        ctx,
        pollInterval: retryIntervalMs,
        maxRetries: maxRetries,
        onSuccess: () => {
          console.log(`[brain-sync] Check ${firstCheck} completed for ${sessionId}`);
        },
      });

      // Store loop reference if needed later
      return loop;
    }
  };
}

// ============================================================
// PUBLIC API
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

// For standalone usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const sessionId = args.find((a) => a.startsWith("--session="))?.split("=")[1];

  if (!sessionId) {
    console.error("Usage: brain-sync-enforcer.js --session=<session-id>");
    process.exit(1);
  }

  console.log(`[brain-sync] Standalone mode for session ${sessionId}`);
  console.log(`[brain-sync] Available checks: ${Object.keys(CHECKS).join(", ")}`);
  console.log(`[brain-sync] This script is designed to be used as a hook within oh-my-opencode-sin`);
  console.log(`[brain-sync] For standalone operation, integrate with your session manager.`);
}
