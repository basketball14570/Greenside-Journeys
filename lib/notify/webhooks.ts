// Outbound webhook fan-out. Used by /api/cron/newsletter to push the
// daily digest into Discord, Slack, or any generic JSON sink. Add a new
// target by extending DispatchTarget below.
//
// Env vars:
//   DISCORD_WEBHOOK_URL    — Discord channel webhook (Server Settings →
//                            Integrations → Webhooks)
//   SLACK_WEBHOOK_URL      — Slack incoming webhook
//   NEWSLETTER_WEBHOOK_URL — generic POST sink (Beehiiv, Substack,
//                            Mailgun route, your own Lambda, etc.)
//
// All targets are optional — if no env var is set, dispatch is a no-op.

export type DispatchOutcome = {
  target: string;
  ok: boolean;
  status: number | null;
  error?: string;
};

type Payload = {
  title: string;
  markdown: string;
  html: string;
  url?: string; // canonical link back to the in-app preview
};

export async function dispatchAll(payload: Payload): Promise<DispatchOutcome[]> {
  const tasks: Promise<DispatchOutcome>[] = [];

  if (process.env.DISCORD_WEBHOOK_URL) {
    tasks.push(toDiscord(process.env.DISCORD_WEBHOOK_URL, payload));
  }
  if (process.env.SLACK_WEBHOOK_URL) {
    tasks.push(toSlack(process.env.SLACK_WEBHOOK_URL, payload));
  }
  if (process.env.NEWSLETTER_WEBHOOK_URL) {
    tasks.push(toGeneric(process.env.NEWSLETTER_WEBHOOK_URL, payload));
  }

  if (tasks.length === 0) {
    return [
      {
        target: "none",
        ok: false,
        status: null,
        error:
          "No webhook env vars set (DISCORD_WEBHOOK_URL / SLACK_WEBHOOK_URL / NEWSLETTER_WEBHOOK_URL).",
      },
    ];
  }

  return Promise.all(tasks);
}

// Discord caps a message at 2000 chars; for digests longer than that we
// post a teaser + link. Channels with embeds enabled get a clean card.
async function toDiscord(url: string, p: Payload): Promise<DispatchOutcome> {
  const trimmed = p.markdown.length > 1800 ? p.markdown.slice(0, 1800) + "\n…(truncated)" : p.markdown;
  const body = {
    username: "Greenside",
    embeds: [
      {
        title: p.title,
        description: trimmed,
        color: 0x3f8a52, // fairway green
        url: p.url ?? null,
        timestamp: new Date().toISOString(),
      },
    ],
  };
  return postJson("discord", url, body);
}

// Slack supports Block Kit for nicer formatting, but mrkdwn is enough
// for a daily preview.
async function toSlack(url: string, p: Payload): Promise<DispatchOutcome> {
  const body = {
    text: p.title,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: p.title.slice(0, 150) },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: p.markdown.slice(0, 2900),
        },
      },
      p.url
        ? {
            type: "actions",
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: "Open in Greenside" },
                url: p.url,
              },
            ],
          }
        : null,
    ].filter(Boolean),
  };
  return postJson("slack", url, body);
}

// Generic JSON sink — emits the full payload as-is for downstream tools.
async function toGeneric(url: string, p: Payload): Promise<DispatchOutcome> {
  return postJson("generic", url, p);
}

async function postJson(
  name: string,
  url: string,
  body: unknown,
): Promise<DispatchOutcome> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        target: name,
        ok: false,
        status: res.status,
        error: text.slice(0, 200),
      };
    }
    return { target: name, ok: true, status: res.status };
  } catch (err) {
    return {
      target: name,
      ok: false,
      status: null,
      error: (err as Error).message,
    };
  }
}
