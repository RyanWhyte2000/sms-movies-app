import { afterEach, describe, expect, it, vi } from "vitest";

import { logger } from "@/lib/logger";

afterEach(() => vi.restoreAllMocks());

describe("logger", () => {
  it("writes structured messages at each enabled level", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const debug = vi.spyOn(console, "debug").mockImplementation(() => undefined);

    logger.info("request.completed", { status: 200 });
    logger.warn("request.slow");
    logger.error("request.failed");
    logger.debug("request.started");

    expect(info).toHaveBeenCalledWith(expect.stringContaining('"status":200'));
    expect(warn).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledOnce();
    expect(debug).toHaveBeenCalledOnce();
  });

  it("redacts sensitive context", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logger.info("auth", { email: "private@example.test", sessionId: "secret", safe: "visible" });
    const message = String(info.mock.calls[0][0]);

    expect(message).not.toContain("private@example.test");
    expect(message).toContain('"email":"[REDACTED]"');
    expect(message).toContain('"safe":"visible"');
  });
});
