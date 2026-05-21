// Renders a parlay ticket to a branded PNG and shares it via the Web
// Share API (native share sheet on mobile), falling back to a file
// download on desktop / unsupported browsers. The image reflects the
// LIVE state passed in — each leg's bold standing (T36 / Up 2 / 4
// birdies / Win) and color — so a shared slip shows current tracking,
// not a static pre-game ticket.

export type ShareLeg = {
  player: string;
  market: string;
  line: string | null;
  standing?: string;
  standingNote?: string;
  status: "won" | "lost" | "live" | "push" | "unknown";
};

export type ShareData = {
  eventName?: string | null;
  legCount: number;
  book: string;
  combinedX: number;
  stake: number;
  payout: number;
  statusText: string;
  statusColor: string;
  legs: ShareLeg[];
};

const STATUS_COLOR: Record<ShareLeg["status"], string> = {
  won: "#7fd49a",
  lost: "#e57373",
  live: "#f5c558",
  push: "#a8b3ac",
  unknown: "#6c7a72",
};

const W = 1080;
const PAD = 72;
const HEADER_H = 500;
const LEG_H = 150;
const FOOTER_H = 120;

function money(n: number): string {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function drawTicket(data: ShareData): HTMLCanvasElement {
  const height = HEADER_H + data.legs.length * LEG_H + FOOTER_H;
  const canvas = document.createElement("canvas");
  const scale = 2; // retina-crisp text
  canvas.width = W * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "#0b1712");
  bg.addColorStop(1, "#0e1a14");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, height);

  // ── Header ──
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#8ee68e";
  ctx.font = "700 26px system-ui, -apple-system, sans-serif";
  ctx.fillText("● GREENSIDE  ·  LIVE TICKET", PAD, PAD + 26);

  if (data.eventName) {
    ctx.fillStyle = "#a8b3ac";
    ctx.font = "500 28px system-ui, -apple-system, sans-serif";
    ctx.fillText(data.eventName, PAD, PAD + 74);
  }

  ctx.fillStyle = "#f0ebe0";
  ctx.font = "800 92px Georgia, 'Times New Roman', serif";
  ctx.fillText(`${data.legCount}-leg parlay`, PAD, PAD + 176);

  // Status pill
  ctx.font = "700 30px system-ui, -apple-system, sans-serif";
  const pillText = data.statusText.toUpperCase();
  const pillW = ctx.measureText(pillText).width + 40;
  const pillY = PAD + 212;
  ctx.fillStyle = `${data.statusColor}26`;
  roundRect(ctx, PAD, pillY, pillW, 52, 10);
  ctx.fill();
  ctx.fillStyle = data.statusColor;
  ctx.fillText(pillText, PAD + 20, pillY + 36);

  // Economics
  ctx.fillStyle = "#a8b3ac";
  ctx.font = "600 30px system-ui, -apple-system, sans-serif";
  const econLeft = `${data.book.toUpperCase()}  ·  ${data.combinedX.toFixed(1)}x`;
  ctx.fillText(econLeft, PAD, PAD + 332);
  ctx.fillStyle = "#8ee68e";
  ctx.font = "800 34px system-ui, -apple-system, sans-serif";
  ctx.fillText(`${money(data.stake)} → ${money(data.payout)}`, PAD, PAD + 376);

  // Divider
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, HEADER_H - 28);
  ctx.lineTo(W - PAD, HEADER_H - 28);
  ctx.stroke();

  // ── Legs ──
  data.legs.forEach((leg, i) => {
    const top = HEADER_H + i * LEG_H;
    const color = STATUS_COLOR[leg.status] ?? STATUS_COLOR.unknown;

    // status dot
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(PAD + 9, top + 40, 9, 0, Math.PI * 2);
    ctx.fill();

    // player
    ctx.fillStyle = "#f0ebe0";
    ctx.font = "700 44px system-ui, -apple-system, sans-serif";
    ctx.fillText(truncate(ctx, leg.player, W - PAD * 2 - 280), PAD + 36, top + 52);

    // market · line
    ctx.fillStyle = "#9aa6a0";
    ctx.font = "500 30px system-ui, -apple-system, sans-serif";
    const sub = leg.line ? `${leg.market} · ${leg.line}` : leg.market;
    ctx.fillText(truncate(ctx, sub, W - PAD * 2 - 280), PAD + 36, top + 98);

    // standing (right-aligned, bold, status color)
    if (leg.standing) {
      ctx.textAlign = "right";
      ctx.fillStyle = leg.status === "live" ? "#ffffff" : color;
      ctx.font = "800 60px system-ui, -apple-system, sans-serif";
      ctx.fillText(leg.standing, W - PAD, top + 52);
      if (leg.standingNote) {
        ctx.fillStyle = "#9aa6a0";
        ctx.font = "700 26px system-ui, -apple-system, sans-serif";
        ctx.fillText(leg.standingNote, W - PAD, top + 92);
      }
      ctx.textAlign = "left";
    }

    // row separator
    if (i < data.legs.length - 1) {
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, top + LEG_H - 1);
      ctx.lineTo(W - PAD, top + LEG_H - 1);
      ctx.stroke();
    }
  });

  // ── Footer ──
  const fy = height - FOOTER_H + 60;
  ctx.fillStyle = "#6c7a72";
  ctx.font = "600 28px system-ui, -apple-system, sans-serif";
  ctx.fillText("greensideedge.com", PAD, fy);
  ctx.textAlign = "right";
  ctx.fillText(
    new Date().toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    W - PAD,
    fy,
  );
  ctx.textAlign = "left";

  return canvas;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t + "…";
}

export async function shareParlayImage(data: ShareData): Promise<void> {
  const canvas = drawTicket(data);
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png"),
  );
  if (!blob) throw new Error("Could not render image");

  const file = new File([blob], "greenside-parlay.png", { type: "image/png" });
  const nav = navigator as Navigator & {
    canShare?: (d: { files: File[] }) => boolean;
    share?: (d: unknown) => Promise<void>;
  };

  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({
        files: [file],
        title: "My Greenside parlay",
        text: `${data.legCount}-leg parlay — ${data.statusText} · ${money(data.stake)} → ${money(data.payout)}`,
      });
      return;
    } catch {
      // user cancelled or share failed — fall through to download
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "greenside-parlay.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
