/**
 * Server-side feed fetch, guarded (timeout + size cap + protocol check). Lives
 * apart from the server actions so both the dashboard actions and the scheduled
 * refresh route can share it. Dodges CORS by fetching from the server.
 */

const FEED_TIMEOUT_MS = 15_000;
const FEED_MAX_BYTES = 8 * 1024 * 1024; // 8 MB guard against huge/hostile responses.

export type FetchFeedResult =
  | { ok: true; xml: string }
  | { ok: false; error: string };

/** Fetch a feed URL server-side and return its raw XML, guarded. */
export async function fetchFeed(url: string): Promise<FetchFeedResult> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url.trim());
  } catch {
    return { ok: false, error: "That doesn't look like a valid URL." };
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return { ok: false, error: "The feed URL must start with http:// or https://." };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
  try {
    const res = await fetch(parsedUrl, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "CrewdogAlex/1.0 (+job feed importer)",
        accept:
          "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
    });
    if (!res.ok) {
      return {
        ok: false,
        error: `The feed URL returned HTTP ${res.status}. Check the link and that it's publicly accessible.`,
      };
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > FEED_MAX_BYTES) {
      return { ok: false, error: "The feed is too large to import (over 8 MB)." };
    }
    return { ok: true, xml: new TextDecoder("utf-8").decode(buf) };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return {
        ok: false,
        error: "The feed took too long to respond (15s). Try again later.",
      };
    }
    return {
      ok: false,
      error: "Couldn't reach the feed URL. Check the link and try again.",
    };
  } finally {
    clearTimeout(timer);
  }
}
