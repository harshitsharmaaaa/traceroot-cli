import { describe, expect, it } from "vitest";
import { ExitCode } from "../../src/output.js";
import { SETUP_EXIT_CODES, type SetupErrorCode, SetupError } from "../../src/setup/errors.js";

/** The numbers the rest of the CLI has already spent, and what they mean there. */
const SHARED: ReadonlyMap<number, string> = new Map([
  [ExitCode.usage, "usage"],
  [ExitCode.auth, "auth"],
  [ExitCode.notFound, "not_found"],
  [ExitCode.network, "network"],
]);

/**
 * Setup's own outcomes: the ones no other command can produce and the shared
 * table therefore has no word for.
 */
const OWN: readonly SetupErrorCode[] = [
  "AMBIGUOUS",
  "UNSUPPORTED",
  "AGENT_FAILED",
  "APP_VERIFICATION_FAILED",
  "TRACE_TIMEOUT",
  "BACKEND_UNSUPPORTED",
  "UNSAFE_OVERWRITE",
];

describe("setup's exit codes against the table the whole CLI publishes", () => {
  it("reuses a shared number only where it means the same thing", () => {
    // The numbers are a published contract and they are not setup's to spend.
    // Numbered from 2 up, setup said `usage` for a run that was not logged in
    // and `network` for an agent that crashed — including in the `--json`
    // envelope, which derives its `code` string from the number, so a caller
    // branching on either was told about a failure that never happened.
    expect(SETUP_EXIT_CODES.NOT_AUTHENTICATED).toBe(ExitCode.auth);
    expect(SETUP_EXIT_CODES.UNEXPECTED).toBe(ExitCode.internal);
    for (const code of OWN) {
      expect(SHARED.get(SETUP_EXIT_CODES[code])).toBeUndefined();
    }
  });

  it("numbers its own outcomes above everything the shared table could claim", () => {
    // Above rather than around: the shared table owns the numbers below 10
    // whether or not it has used them yet, so a class added there later cannot
    // land on one of these.
    for (const code of OWN) {
      expect(SETUP_EXIT_CODES[code]).toBeGreaterThanOrEqual(10);
    }
  });

  it("separates a question answered no from a question never answered", () => {
    // Declining is a decision and exits 0. An interrupt is not an answer, and a
    // shell reads 130 as "ended by SIGINT" — which is what stops
    // `traceroot setup && <next step>` from running the next step over an
    // abandoned run.
    expect(SETUP_EXIT_CODES.CANCELLED).toBe(0);
    expect(SETUP_EXIT_CODES.INTERRUPTED).toBe(130);
  });

  it("hands the mapped status to the error the central handler sees", () => {
    const failed = new SetupError({
      stage: "instrument",
      code: "AGENT_FAILED",
      message: "the agent exited non-zero",
    });

    expect(failed.exitCode).toBe(SETUP_EXIT_CODES.AGENT_FAILED);
    expect(failed.exitCode).not.toBe(ExitCode.network);
  });
});
