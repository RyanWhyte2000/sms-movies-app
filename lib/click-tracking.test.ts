// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { captureClick, identifyClickActor } from "@/lib/click-tracking";

beforeEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
  identifyClickActor(undefined);
});

afterEach(() => vi.restoreAllMocks());

function click(target: Element) {
  const event = new MouseEvent("click", { bubbles: true });
  Object.defineProperty(event, "target", { value: target });
  captureClick(event);
}

describe("click tracking", () => {
  it("sends normalized click metadata without blocking the action", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    identifyClickActor("user-1");
    const button = document.createElement("button");
    button.textContent = "Save Rating!";
    button.dataset.trackSection = "details";
    document.body.append(button);

    click(button);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [url, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body));

    expect(url).toBe("/api/events/click");
    expect(body).toMatchObject({
      eventName: "save_rating",
      target: "button",
      actorId: "user-1",
      metadata: { section: "details" },
    });
    expect(init?.keepalive).toBe(true);
  });

  it("honors explicit names and tracking opt-out", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null));
    const named = document.createElement("a");
    named.dataset.trackEvent = "Open Movie";
    document.body.append(named);
    click(named);

    const ignored = document.createElement("button");
    ignored.dataset.track = "off";
    document.body.append(ignored);
    click(ignored);

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("ignores non-trackable and empty targets", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null));
    const div = document.createElement("div");
    document.body.append(div);
    click(div);
    captureClick(new MouseEvent("click"));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
