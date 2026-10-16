import { afterAll, describe, expect, it, vi } from "vitest";

const ESC = String.fromCharCode(27);

/**
 * The wizard decides once, when it is first evaluated, from the stream it
 * writes to — so a test that wants a different answer has to change the stream
 * and have the module evaluated again.
 */
const stderr = process.stderr as unknown as { isTTY?: boolean };
const wasTTY = stderr.isTTY;

// Put back whatever it was: `process` outlives a test file, and a stderr left
// claiming to be a terminal would change what the next file's renderers emit.
afterAll(() => {
  stderr.isTTY = wasTTY;
});

type Wizard = typeof import("../../src/setup/wizard.js");

async function wizardWritingTo(terminal: boolean): Promise<Wizard> {
  stderr.isTTY = terminal;
  vi.resetModules();
  return await import("../../src/setup/wizard.js");
}

describe("the stream the wizard's colour is decided from", () => {
  it("paints when stderr is a terminal, whatever stdout is", async () => {
    // picocolors' default instance decides from *stdout*, and once: a frame
    // drawn on the terminal went plain the moment stdout was redirected
    // somewhere else. Under the runner stdout is a pipe, which is that case.
    expect(process.stdout.isTTY).not.toBe(true);

    const { wizardEmphasis } = await wizardWritingTo(true);

    expect(wizardEmphasis("instrument")).toContain(`${ESC}[1m`);
  });

  it("writes nothing but text when stderr is not a terminal", async () => {
    // The other direction, and the one a forced colour in the environment used
    // to win: the default instance painted a frame that was on its way into a
    // file, so `traceroot setup 2> setup.log` filled the log with escape codes.
    const { wizardAside, wizardEmphasis, wizardValue } = await wizardWritingTo(false);

    for (const text of [wizardEmphasis("x"), wizardValue("demo"), wizardAside("note")]) {
      expect(text).not.toContain(ESC);
    }
  });
});
