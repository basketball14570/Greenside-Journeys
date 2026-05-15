// Desktop dashboard — secondary platform, 1440 wide

const D_BETS = [
  { book: 'DK', player: 'Scottie Scheffler',    market: 'Top 10 Finish', line: '+250',  stake: 1.0,  payout: 3.50,
    status: 'live', wave: 'AM', live: { score: '-9', thru: 'F' },  ev: 8,  sens: 0.18 },
  { book: 'PP', player: 'Patrick Cantlay',      market: 'Fairways Hit',  line: 'O 8.5', stake: 0.5,  payout: 1.40,
    status: 'live', wave: 'PM', live: { score: '-7', thru: '15' }, ev: -8, sens: 0.41 },
  { book: 'FD', player: 'Rory McIlroy',         market: 'R2 Score',      line: 'U 70',  stake: 1.5,  payout: 3.60,
    status: 'live', wave: 'AM', live: { score: '-8', thru: '14' }, ev: 22, sens: 0.22, hedge: true },
  { book: 'UD', player: 'Collin Morikawa',      market: 'Top 20 Finish', line: '+140',  stake: 1.0,  payout: 2.40,
    status: 'live', wave: 'AM', live: { score: '-6', thru: 'F' },  ev: 4,  sens: 0.31 },
  { book: 'DK', player: 'Schauffele vs Spieth', market: 'R2 Matchup',    line: '-115',  stake: 0.75, payout: 1.40,
    status: 'graded', wave: 'AM', live: { score: 'W', thru: 'F' },  ev: 0,  sens: 0.28, won: true },
  { book: 'FD', player: 'V. Hovland',           market: 'To Win',        line: '+2200', stake: 0.25, payout: 5.75,
    status: 'live', wave: 'PM', live: { score: '-6', thru: '13' }, ev: 3,  sens: 0.29 },
  { book: 'PP', player: 'J. Thomas',            market: 'Bogeys',        line: 'U 3.5', stake: 0.5,  payout: 1.45,
    status: 'live', wave: 'PM', live: { score: '-5', thru: '12' }, ev: -2, sens: 0.36 },
];

const D_LEADER = [
  { pos: '1',  name: 'Mike Scofield',      score: -10, thru: 'F',  wave: 'AM' },
  { pos: '2',  name: 'Scottie Scheffler',  score: -9,  thru: 'F',  wave: 'AM', mine: ['Top 10'] },
  { pos: 'T3', name: 'Rory McIlroy',       score: -8,  thru: '14', wave: 'AM', mine: ['R2 U70'] },
  { pos: 'T3', name: 'Xander Schauffele',  score: -8,  thru: 'F',  wave: 'AM', mine: ['Matchup'] },
  { pos: '5',  name: 'Patrick Cantlay',    score: -7,  thru: '15', wave: 'PM', mine: ['FH O8.5'] },
  { pos: 'T6', name: 'Collin Morikawa',    score: -6,  thru: 'F',  wave: 'AM', mine: ['Top 20'] },
  { pos: 'T6', name: 'Viktor Hovland',     score: -6,  thru: '13', wave: 'PM', mine: ['Win'] },
  { pos: '8',  name: 'Justin Thomas',      score: -5,  thru: '12', wave: 'PM', mine: ['Bogeys U3.5'] },
  { pos: 'T9', name: 'Jordan Spieth',      score: -4,  thru: 'F',  wave: 'AM' },
  { pos: 'T9', name: 'Sam Burns',          score: -4,  thru: '11', wave: 'PM' },
  { pos: 'T9', name: 'Ludvig Åberg',       score: -4,  thru: 'F',  wave: 'AM' },
  { pos: '12', name: 'Tony Finau',         score: -3,  thru: '10', wave: 'PM' },
];

// ─── App bar ────────────────────────────────────────────────
function AppBar() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 28,
      padding: '14px 32px',
      borderBottom: `1px solid ${C.line}`,
      background: C.bgDeep,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 99,
          background: `radial-gradient(circle at 35% 35%, ${C.green} 0%, ${C.greenDeep} 60%, #1a3a26 100%)`,
          boxShadow: `inset 0 -2px 4px rgba(0,0,0,0.4), 0 0 0 1px ${C.line}`,
          position: 'relative',
        }}>
          <span style={{
            position: 'absolute', inset: 0, borderRadius: 99,
            background: 'radial-gradient(circle at 38% 32%, rgba(255,255,255,0.35) 0%, transparent 28%)',
          }}/>
        </div>
        <span style={{ fontFamily: F.serif, fontSize: 22, color: C.text, letterSpacing: -0.3 }}>Greenside</span>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {['Today', 'Tickets', 'DFS Optimizer', 'Course Lab', 'Bankroll'].map((t, i) => (
          <span key={t} style={{
            padding: '6px 12px', borderRadius: 6,
            fontFamily: F.sans, fontSize: 13.5,
            color: i === 0 ? C.text : C.textDim,
            background: i === 0 ? C.surface2 : 'transparent',
            fontWeight: i === 0 ? 600 : 400,
          }}>{t}</span>
        ))}
      </div>
      <span style={{ flex: 1 }}/>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 12px', borderRadius: 8,
        background: C.surface1, border: `1px solid ${C.line}`,
        fontFamily: F.mono, fontSize: 11.5, color: C.textDim, letterSpacing: 0.4,
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke={C.textMuted} strokeWidth="2"/>
          <path d="M20 20l-3.5-3.5" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round"/>
        </svg>
        Search players, books, markets… <span style={{ color: C.textMuted, marginLeft: 12 }}>⌘K</span>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '6px 12px 6px 8px', borderRadius: 99,
        background: C.surface1, border: `1px solid ${C.line}`,
      }}>
        <div style={{
          width: 24, height: 24, borderRadius: 99,
          background: `linear-gradient(135deg, ${C.amber}, ${C.greenDeep})`,
        }}/>
        <span style={{ fontFamily: F.sans, fontSize: 13, color: C.text }}>JS</span>
      </div>
    </div>
  );
}

// ─── Event strap ────────────────────────────────────────────
function DesktopEventStrap() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 24,
      padding: '14px 32px',
      borderBottom: `1px solid ${C.line}`,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{
          fontFamily: F.mono, fontSize: 9.5, letterSpacing: 1.3,
          color: C.textMuted, textTransform: 'uppercase',
        }}>This Week · PGA Tour</span>
        <span style={{
          fontFamily: F.serif, fontSize: 22, color: C.text, letterSpacing: -0.3,
        }}>Quail Hollow Championship</span>
      </div>
      <div style={{ height: 28, width: 1, background: C.line }}/>
      <Mini label="Round"  value="2 of 4"/>
      <Mini label="Status" value={<><StatusDot status="live"/> <span style={{ color: C.green, fontWeight: 600 }}>R2 Live</span></>}/>
      <Mini label="Cut Line" value="−1 (proj.)"/>
      <Mini label="Course" value="Quail Hollow Club · Charlotte, NC"/>
      <span style={{ flex: 1 }}/>
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center',
        padding: '6px 12px', borderRadius: 6,
        background: `${C.amber}1a`, border: `1px solid ${C.amber}44`,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: 99, background: C.amber,
          boxShadow: `0 0 8px ${C.amber}88`,
        }}/>
        <span style={{
          fontFamily: F.mono, fontSize: 11.5, color: C.amber, fontWeight: 600, letterSpacing: 0.4,
        }}>3 NEW ALERTS</span>
      </div>
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{
        fontFamily: F.mono, fontSize: 9, letterSpacing: 1.1,
        color: C.textMuted, textTransform: 'uppercase',
      }}>{label}</span>
      <span style={{
        fontFamily: F.sans, fontSize: 13, color: C.text,
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>{value}</span>
    </div>
  );
}

// ─── Weather Hero — Desktop ─────────────────────────────────
function DesktopWeatherHero() {
  const hourly = [
    { v: 6, gust: 9 }, { v: 7, gust: 10 }, { v: 8, gust: 12 }, { v: 9, gust: 13 },
    { v: 11, gust: 16 }, { v: 13, gust: 19 }, { v: 16, gust: 23 },
    { v: 18, gust: 27, now: true }, { v: 20, gust: 28 }, { v: 21, gust: 29 },
    { v: 19, gust: 26 }, { v: 16, gust: 22 }, { v: 13, gust: 18 }, { v: 10, gust: 14 },
  ];

  return (
    <div style={{
      position: 'relative', borderRadius: 18, overflow: 'hidden',
      background: `linear-gradient(135deg, #1d3a26 0%, #112519 50%, #0b1a11 100%)`,
      border: `1px solid ${C.line}`,
      padding: '24px 28px',
      display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 32,
    }}>
      <div style={{
        position: 'absolute', top: -60, right: -60, width: 280, height: 280,
        borderRadius: 999,
        background: `radial-gradient(circle, ${C.amber}1f 0%, transparent 65%)`,
        pointerEvents: 'none',
      }}/>

      {/* LEFT — narrative + big stat */}
      <div style={{ position: 'relative' }}>
        <span style={{
          fontFamily: F.mono, fontSize: 10, letterSpacing: 1.4,
          color: C.amber, fontWeight: 600, textTransform: 'uppercase',
        }}>● Conditions Edge · 7:42 AM</span>
        <div style={{
          fontFamily: F.serif, fontSize: 30, lineHeight: 1.15,
          color: C.text, marginTop: 10, marginBottom: 18, letterSpacing: -0.4,
          textWrap: 'pretty',
        }}>
          <em>Wind's up at Quail Hollow.</em><br/>AM wave is banking strokes.
        </div>
        <Stat value="18" unit="mph" label="Sustained · WSW" accent={C.text}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
          <WindArrow degrees={245} size={20}/>
          <span style={{
            fontFamily: F.mono, fontSize: 11.5, color: C.textDim, letterSpacing: 0.5,
          }}>Gust 27 · ↑ +10 mph since 6:00 AM</span>
        </div>
      </div>

      {/* MIDDLE — hourly chart */}
      <div style={{ position: 'relative' }}>
        <span style={{
          fontFamily: F.mono, fontSize: 10, letterSpacing: 1.2,
          color: C.textMuted, fontWeight: 600, textTransform: 'uppercase',
        }}>Hourly Wind · 6 AM → 8 PM</span>
        <div style={{ marginTop: 18 }}>
          <WindSpark data={hourly} width={300} height={88}/>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontFamily: F.mono, fontSize: 10, color: C.textMuted, letterSpacing: 0.6,
          marginTop: 4,
        }}>
          <span>6A</span><span>9A</span><span>NOW</span><span>3P</span><span>6P</span><span>8P</span>
        </div>
        <div style={{
          display: 'flex', gap: 20, marginTop: 14,
          fontFamily: F.sans, fontSize: 12, color: C.textDim,
        }}>
          <span><span style={{ width: 8, height: 2, background: C.amber, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}/>Sustained</span>
          <span><span style={{ width: 8, height: 8, background: `${C.amber}40`, display: 'inline-block', verticalAlign: 'middle', marginRight: 6, borderRadius: 2 }}/>Gust band</span>
        </div>
      </div>

      {/* RIGHT — wave split + EV */}
      <div style={{ position: 'relative' }}>
        <span style={{
          fontFamily: F.mono, fontSize: 10, letterSpacing: 1.2,
          color: C.textMuted, fontWeight: 600, textTransform: 'uppercase',
        }}>Wave Split · Your Exposure</span>
        <div style={{ marginTop: 18 }}>
          <WaveSplit am={+0.4} pm={-0.4} width={300}/>
        </div>
        <div style={{
          marginTop: 14, padding: 12, borderRadius: 8,
          background: 'rgba(0,0,0,0.25)', border: `1px solid ${C.line}`,
          display: 'flex', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontFamily: F.mono, fontSize: 9.5, color: C.textMuted, letterSpacing: 1, marginBottom: 4 }}>BETS · AM</div>
            <div style={{ fontFamily: F.serif, fontSize: 24, fontStyle: 'italic', color: C.green, lineHeight: 1 }}>4</div>
          </div>
          <div>
            <div style={{ fontFamily: F.mono, fontSize: 9.5, color: C.textMuted, letterSpacing: 1, marginBottom: 4 }}>BETS · PM</div>
            <div style={{ fontFamily: F.serif, fontSize: 24, fontStyle: 'italic', color: C.red, lineHeight: 1 }}>3</div>
          </div>
          <div>
            <div style={{ fontFamily: F.mono, fontSize: 9.5, color: C.textMuted, letterSpacing: 1, marginBottom: 4 }}>NET ΔEV</div>
            <div style={{ fontFamily: F.serif, fontSize: 24, fontStyle: 'italic', color: C.green, lineHeight: 1 }}>+0.42<span style={{ fontFamily: F.mono, fontSize: 11, fontStyle: 'normal' }}>u</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Big bets table ─────────────────────────────────────────
function BetsTable() {
  return (
    <div style={{
      borderRadius: 14, overflow: 'hidden',
      background: C.surface1, border: `1px solid ${C.line}`,
    }}>
      {/* head */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '14px 16px', borderBottom: `1px solid ${C.line}`,
        background: 'rgba(0,0,0,0.18)',
      }}>
        <span style={{
          fontFamily: F.serif, fontSize: 17, color: C.text, letterSpacing: -0.2, flex: 1,
        }}>Open Tickets · This Event</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {['All', 'Live', 'Pending', 'Graded', 'Hedge'].map((t, i) => (
            <span key={t} style={{
              padding: '4px 10px', borderRadius: 6,
              fontFamily: F.mono, fontSize: 10.5, fontWeight: 600, letterSpacing: 0.6,
              color: i === 0 ? C.text : C.textDim,
              background: i === 0 ? C.surface3 : 'transparent',
              border: i === 0 ? `1px solid ${C.line}` : '1px solid transparent',
              textTransform: 'uppercase',
            }}>{t}</span>
          ))}
        </div>
      </div>
      {/* col head */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '52px 52px 1.8fr 1.2fr 80px 100px 70px 80px',
        gap: 10, padding: '10px 16px',
        fontFamily: F.mono, fontSize: 9.5, letterSpacing: 1.1,
        color: C.textMuted, textTransform: 'uppercase', fontWeight: 600,
        borderBottom: `1px solid ${C.line}`,
      }}>
        <span>Book</span>
        <span>Wave</span>
        <span>Player</span>
        <span>Market</span>
        <span style={{ textAlign: 'right' }}>Line</span>
        <span style={{ textAlign: 'right' }}>Risk → Win</span>
        <span style={{ textAlign: 'right' }}>Live</span>
        <span style={{ textAlign: 'right' }}>Δ EV</span>
      </div>
      {D_BETS.map((b, i) => {
        const ev = b.ev > 5 ? C.green : b.ev < -5 ? C.red : C.textDim;
        return (
          <div key={i} style={{
            display: 'grid',
            gridTemplateColumns: '52px 52px 1.8fr 1.2fr 80px 100px 70px 80px',
            gap: 10, padding: '14px 16px', alignItems: 'center',
            borderBottom: i < D_BETS.length - 1 ? `1px solid ${C.line}` : 'none',
            background: b.hedge ? `${C.red}0d` : 'transparent',
          }}>
            <span><BookChip book={b.book}/></span>
            <span style={{
              fontFamily: F.mono, fontSize: 10, fontWeight: 600, letterSpacing: 0.8,
              color: b.wave === 'AM' ? C.green : C.amber,
              padding: '2px 6px', borderRadius: 3,
              background: b.wave === 'AM' ? `${C.green}1f` : `${C.amber}1f`,
              width: 'fit-content',
            }}>{b.wave}</span>
            <div>
              <div style={{ fontFamily: F.sans, fontSize: 13.5, color: C.text, fontWeight: 600 }}>{b.player}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <StatusDot status={b.status} withLabel/>
                {b.hedge && (
                  <span style={{
                    fontFamily: F.mono, fontSize: 9, fontWeight: 600, letterSpacing: 0.8,
                    color: C.red, padding: '1px 5px', borderRadius: 3,
                    background: `${C.red}22`, border: `1px solid ${C.red}55`,
                    textTransform: 'uppercase',
                  }}>Hedge open</span>
                )}
              </div>
            </div>
            <span style={{ fontFamily: F.sans, fontSize: 13, color: C.textDim }}>{b.market}</span>
            <span style={{ fontFamily: F.mono, fontSize: 12.5, color: C.text, textAlign: 'right' }}>{b.line}</span>
            <span style={{
              fontFamily: F.mono, fontSize: 12.5, color: C.text, textAlign: 'right', fontWeight: 600,
            }}>{b.stake}u → {b.payout.toFixed(2)}u</span>
            <span style={{
              fontFamily: F.mono, fontSize: 12, color: b.won ? C.green : C.textDim, textAlign: 'right',
              fontWeight: b.won ? 700 : 400,
            }}>{b.live.score} · {b.live.thru}</span>
            <span style={{
              fontFamily: F.mono, fontSize: 12, fontWeight: 700,
              color: b.status === 'graded' ? C.textMuted : ev,
              textAlign: 'right',
            }}>
              {b.status === 'graded' ? '—' : `${b.ev > 0 ? '+' : ''}${b.ev}%`}
            </span>
          </div>
        );
      })}
      {/* footer summary */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        padding: '12px 16px', borderTop: `1px solid ${C.line}`,
        background: 'rgba(0,0,0,0.18)',
      }}>
        <span style={{ fontFamily: F.mono, fontSize: 11, color: C.textDim, letterSpacing: 0.4 }}>
          7 tickets · 6 live · 1 graded
        </span>
        <div style={{ display: 'flex', gap: 28 }}>
          <span style={{ fontFamily: F.mono, fontSize: 11, color: C.textDim, letterSpacing: 0.4 }}>
            RISK <span style={{ color: C.text, fontWeight: 600 }}>5.50u</span>
          </span>
          <span style={{ fontFamily: F.mono, fontSize: 11, color: C.textDim, letterSpacing: 0.4 }}>
            POTENTIAL <span style={{ color: C.text, fontWeight: 600 }}>19.50u</span>
          </span>
          <span style={{ fontFamily: F.mono, fontSize: 11, color: C.textDim, letterSpacing: 0.4 }}>
            LIVE Δ EV <span style={{ color: C.green, fontWeight: 600 }}>+0.42u</span>
          </span>
          <span style={{ fontFamily: F.mono, fontSize: 11, color: C.textDim, letterSpacing: 0.4 }}>
            GRADED P&amp;L <span style={{ color: C.green, fontWeight: 600 }}>+0.65u</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Alerts panel (right rail) ──────────────────────────────
function AlertsPanel() {
  const alerts = [
    { kind: 'wave', time: '7:42', title: 'AM wave gaining ~0.4 strokes EV',
      body: '4 of your bets in AM wave just got cheaper.', color: C.green },
    { kind: 'wind', time: '7:31', title: 'Cantlay FH O8.5 — now −8% EV',
      body: '15 mph cross on holes 12–15. Loses ~1.2 FH in these conds.', color: C.amber },
    { kind: 'hedge', time: '7:18', title: 'Hedge open: McIlroy R2 U70',
      body: '−8 thru 14. FD +145 locks +1.1u profit.', color: C.red },
    { kind: 'wave', time: '6:55', title: 'PM tee times confirmed',
      body: 'Wind forecast on PM wave revised up: 18 → 22 mph.', color: C.amber },
  ];
  return (
    <div style={{
      borderRadius: 14, overflow: 'hidden',
      background: C.surface1, border: `1px solid ${C.line}`,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderBottom: `1px solid ${C.line}`,
        background: 'rgba(0,0,0,0.18)',
      }}>
        <span style={{ fontFamily: F.serif, fontSize: 17, color: C.text, letterSpacing: -0.2 }}>Live Alerts</span>
        <span style={{
          padding: '2px 8px', borderRadius: 99,
          fontFamily: F.mono, fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
          color: C.bgDeep, background: C.amber,
        }}>3 NEW</span>
      </div>
      {alerts.map((a, i) => (
        <div key={i} style={{
          display: 'flex', gap: 10, padding: '12px 16px',
          borderBottom: i < alerts.length - 1 ? `1px solid ${C.line}` : 'none',
        }}>
          <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 99, background: a.color, flexShrink: 0 }}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
              <span style={{
                fontFamily: F.mono, fontSize: 9.5, fontWeight: 600, letterSpacing: 1,
                color: a.color, textTransform: 'uppercase',
              }}>
                {a.kind === 'wave' && '◐ Wave Shift'}
                {a.kind === 'wind' && '⌇ Wind Alert'}
                {a.kind === 'hedge' && '◇ Hedge Available'}
              </span>
              <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textMuted }}>{a.time} AM</span>
            </div>
            <div style={{ fontFamily: F.sans, fontSize: 13, color: C.text, fontWeight: 500, lineHeight: 1.35, marginBottom: 2 }}>{a.title}</div>
            <div style={{ fontFamily: F.sans, fontSize: 12, color: C.textDim, lineHeight: 1.4 }}>{a.body}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Leaderboard ────────────────────────────────────────────
function DesktopLeaderboard() {
  return (
    <div style={{
      borderRadius: 14, overflow: 'hidden',
      background: C.surface1, border: `1px solid ${C.line}`,
    }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        padding: '14px 16px', borderBottom: `1px solid ${C.line}`,
        background: 'rgba(0,0,0,0.18)',
      }}>
        <span style={{ fontFamily: F.serif, fontSize: 17, color: C.text, letterSpacing: -0.2 }}>Leaderboard</span>
        <span style={{
          fontFamily: F.mono, fontSize: 10.5, color: C.textMuted, letterSpacing: 0.6,
        }}>R2 · 7 of your players in top 12</span>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '40px 1fr 36px 50px 36px',
        gap: 8, padding: '8px 16px',
        fontFamily: F.mono, fontSize: 9, letterSpacing: 1.1,
        color: C.textMuted, textTransform: 'uppercase', fontWeight: 600,
        borderBottom: `1px solid ${C.line}`,
      }}>
        <span>Pos</span><span>Player</span><span style={{ textAlign: 'right' }}>Wv</span>
        <span style={{ textAlign: 'right' }}>Par</span><span style={{ textAlign: 'right' }}>Thru</span>
      </div>
      {D_LEADER.map((r, i) => {
        const mine = r.mine && r.mine.length > 0;
        return (
          <div key={i} style={{
            display: 'grid',
            gridTemplateColumns: '40px 1fr 36px 50px 36px',
            gap: 8, padding: '9px 16px', alignItems: 'center',
            borderBottom: i < D_LEADER.length - 1 ? `1px solid ${C.line}` : 'none',
            background: mine ? 'rgba(142, 230, 142, 0.05)' : 'transparent',
            position: 'relative',
          }}>
            {mine && <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: C.green,
            }}/>}
            <span style={{ fontFamily: F.mono, fontSize: 11, color: C.textDim, fontWeight: 600 }}>{r.pos}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: F.sans, fontSize: 13,
                color: mine ? C.text : C.textDim, fontWeight: mine ? 600 : 400,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{r.name}</div>
              {mine && (
                <div style={{
                  fontFamily: F.mono, fontSize: 9.5, color: C.green, fontWeight: 600, letterSpacing: 0.4, marginTop: 1,
                }}>★ {r.mine.join(' · ')}</div>
              )}
            </div>
            <span style={{
              fontFamily: F.mono, fontSize: 9.5, fontWeight: 600, letterSpacing: 0.6,
              color: r.wave === 'AM' ? C.green : C.amber, textAlign: 'right',
            }}>{r.wave}</span>
            <span style={{ fontFamily: F.mono, fontSize: 13, color: C.text, fontWeight: 600, textAlign: 'right' }}>{r.score}</span>
            <span style={{ fontFamily: F.mono, fontSize: 11, color: C.textDim, textAlign: 'right' }}>{r.thru}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Composed desktop screen ────────────────────────────────
function DesktopDashboard() {
  return (
    <div style={{
      width: 1440, height: 1024, background: C.bg, color: C.text,
      fontFamily: F.sans, display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <AppBar/>
      <DesktopEventStrap/>
      <div style={{
        flex: 1, padding: '24px 32px',
        display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 24,
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
          <DesktopWeatherHero/>
          <BetsTable/>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
          <AlertsPanel/>
          <DesktopLeaderboard/>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DesktopDashboard });
