import Link from "next/link";
import { PLAYER_LIST } from "@/lib/demo-players";
import {
  DesktopAppBar,
  DesktopEventStrap,
  MobileBottomNav,
  MobileTopBar,
} from "@/components/edge/chrome";

export default function PlayersIndex() {
  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      <div className="hidden lg:block">
        <DesktopAppBar active="Tickets" />
        <DesktopEventStrap />
      </div>
      <div className="lg:hidden pt-3">
        <MobileTopBar />
      </div>

      <main className="flex-1 px-5 lg:px-8 py-6 max-w-5xl mx-auto w-full">
        <header className="mb-6">
          <span
            className="num font-semibold uppercase"
            style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
          >
            ● Players
          </span>
          <h1
            className="serif-italic mt-1.5"
            style={{ fontSize: 36, letterSpacing: -0.4, fontStyle: "normal" }}
          >
            <em>Player profiles.</em>
          </h1>
          <p
            className="text-text-dim mt-2 max-w-xl"
            style={{ fontSize: 14 }}
          >
            Wind sensitivity, course fit, recent form, and your exposure
            history for every player you&apos;ve ever bet on.
          </p>
        </header>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLAYER_LIST.map((p) => {
            const tone =
              p.windSensitivity > 0.35
                ? "#e07868"
                : p.windSensitivity > 0.25
                  ? "#f5c558"
                  : "#8ee68e";
            return (
              <Link
                key={p.slug}
                href={`/players/${p.slug}`}
                className="rounded-[14px] bg-surface-1 border border-line p-4 hover:border-fairway/40 transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontSize: 20 }}>{p.countryFlag}</span>
                  <span
                    className="num text-text-muted"
                    style={{ fontSize: 10.5, letterSpacing: 0.6 }}
                  >
                    #{p.worldRank} WORLD
                  </span>
                </div>
                <div
                  className="serif-italic text-text mb-1"
                  style={{ fontSize: 22, letterSpacing: -0.3, fontStyle: "normal" }}
                >
                  {p.name}
                </div>
                <div
                  className="text-text-dim mb-3"
                  style={{ fontSize: 12.5, lineHeight: 1.4 }}
                >
                  SG baseline{" "}
                  <span className="num text-text font-semibold">
                    +{p.sgBaseline.toFixed(2)}
                  </span>{" "}
                  · Wind sens{" "}
                  <span className="num font-semibold" style={{ color: tone }}>
                    {p.windSensitivity.toFixed(2)}
                  </span>
                </div>
                <div
                  className="num text-text-muted"
                  style={{ fontSize: 10.5, letterSpacing: 0.4 }}
                >
                  Your bets · {p.exposure.lifetimeBets} ·{" "}
                  <span
                    className="font-semibold"
                    style={{
                      color:
                        p.exposure.lifetimeNetU > 0
                          ? "#8ee68e"
                          : p.exposure.lifetimeNetU < 0
                            ? "#e07868"
                            : "#a8b3ac",
                    }}
                  >
                    {p.exposure.lifetimeNetU > 0 ? "+" : ""}
                    {p.exposure.lifetimeNetU.toFixed(1)}u
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </main>

      <div className="lg:hidden">
        <MobileBottomNav active="bets" />
      </div>
    </div>
  );
}
