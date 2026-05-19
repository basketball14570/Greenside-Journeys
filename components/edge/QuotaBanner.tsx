import Link from "next/link";

// Yellow "you hit your daily cap" panel with an upgrade CTA. Rendered
// by any page that gates a Claude-calling action on the free-tier quota.
export function QuotaLimitBanner({
  body,
  className,
}: {
  body: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-md p-3 border ${className ?? ""}`}
      style={{
        background: "rgba(245,197,88,0.08)",
        borderColor: "rgba(245,197,88,0.3)",
      }}
    >
      <div
        className="num font-semibold uppercase mb-1"
        style={{ fontSize: 10, letterSpacing: 1.2, color: "#f5c558" }}
      >
        ● Daily cap reached
      </div>
      <p className="text-text-dim" style={{ fontSize: 12.5, lineHeight: 1.45 }}>
        {body}{" "}
        <Link
          href="/pricing"
          className="font-semibold"
          style={{ color: "#8ee68e" }}
        >
          Upgrade to Pro
        </Link>{" "}
        for unlimited access.
      </p>
    </div>
  );
}
