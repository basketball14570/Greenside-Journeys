// Mobile Dashboard — the primary screen

const M_BETS = [
  { book: 'DK', player: 'Scottie Scheffler', market: 'Top 10 Finish', line: '+250', stake: 1.0, payout: 3.50, status: 'live', live: { score: '-9', thru: 'F', delta: 'IN' }, ev: 8 },
  { book: 'PP', player: 'Patrick Cantlay', market: 'Fairways Hit', line: 'Over 8.5', stake: 0.5, payout: 1.40, status: 'live', live: { score: '-7', thru: '15', delta: 'AT' }, ev: -8 },
  { book: 'FD', player: 'Rory McIlroy', market: 'Round 2 Score', line: 'Under 70', stake: 1.5, payout: 3.60, status: 'live', live: { score: '-8', thru: '14', delta: 'AT' }, ev: 22, hedge: true },
  { book: 'UD', player: 'Collin Morikawa', market: 'Top 20 Finish', line: '+140', stake: 1.0, payout: 2.40, status: 'live', live: { score: '-6', thru: 'F', delta: 'IN' }, ev: 4 },
  { book: 'DK', player: 'Schauffele vs. Spieth', market: 'R2 Matchup', line: '-115', stake: 0.75, payout: 1.40, status: 'graded', live: { score: 'WIN', thru: 'F', delta: '' }, ev: 0 },
];

const M_LEADER = [
  { pos: '1',  name: 'M. Scofield',      score: -10, thru: 'F',  wave: 'AM' },
  { pos: '2',  name: 'S. Scheffler',     score: -9,  thru: 'F',  wave: 'AM', mine: ['Top 10'] },
  { pos: 'T3', name: 'R. McIlroy',       score: -8,  thru: '14', wave: 'AM', mine: ['R2 U70'] },
  { pos: 'T3', name: 'X. Schauffele',    score: -8,  thru: 'F',  wave: 'AM', mine: ['Matchup'] },
  { pos: '5',  name: 'P. Cantlay',       score: -7,  thru: '15', wave: 'PM', mine: ['FH O8.5'] },
  { pos: 'T6', name: 'C. Morikawa',      score: -6,  thru: 'F',  wave: 'AM', mine: ['Top 20'] },
  { pos: 'T6', name: 'V. Hovland',       score: -6,  thru: '13', wave: 'PM' },
  { pos: '8',  name: 'J. Thomas',        score: -5,  thru: '12', wave: 'PM' },
];

const M_ALERTS = [
  { kind: 'wave',  time: '7:42 AM',
    title: 'AM wave gaining ~0.4 strokes EV',
    body: 'Wind jumped 8 → 18 mph since 6 AM. Your 4 AM-wave bets just got cheaper.',
    color: C.green },
  { kind: 'wind',  time: '7:31 AM',
    title: 'Cantlay Fairways Hit O8.5 — now −8% EV',
    body: '15 mph crosswind on holes 12–15. Historically loses 1.2 FH/round in these conds.',
    color: C.amber },
  { kind: 'hedge', time: '7:18 AM',
    title: 'Hedge available: McIlroy R2 Under 70',
    body: '−8 thru 14. Live FD +145 locks +1.1u profit vs. risk on closing 4.',
    color: C.red },
];

// ─── Top bar ────────────────────────────────────────────────
function TopBar() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 20px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
        <span style={{
          fontFamily: F.serif, fontSize: 22, color: C.text, letterSpacing: -0.3,
        }}>Greenside</span>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{
          width: 32, height: 32, borderRadius: 99,
          background: C.surface2, border: `1px solid ${C.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.36-6.36l-.71.71M6.34 17.66l-.71.71m12.02 0l-.71-.71M6.34 6.34l-.71-.71" stroke={C.textDim} strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="12" cy="12" r="3.5" stroke={C.textDim} strokeWidth="1.5"/>
          </svg>
        </span>
        <span style={{
          width: 32, height: 32, borderRadius: 99,
          background: C.surface2, border: `1px solid ${C.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9" stroke={C.textDim} strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M10 21a2 2 0 004 0" stroke={C.textDim} strokeWidth="1.5"/>
          </svg>
          <span style={{
            position: 'absolute', top: 5, right: 6,
            width: 7, height: 7, borderRadius: 99, background: C.amber,
            boxShadow: `0 0 0 2px ${C.bg}`,
          }}/>
        </span>
      </div>
    </div>
  );
}

// ─── Tournament strap ───────────────────────────────────────
function EventStrap() {
  return (
    <div style={{
      margin: '0 20px 18px', padding: '12px 14px',
      borderRadius: 12, background: C.surface1,
      border: `1px solid ${C.line}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{
          fontFamily: F.mono, fontSize: 9.5, letterSpacing: 1.3,
          color: C.textMuted, textTransform: 'uppercase',
        }}>This Week · Round 2</span>
        <span style={{
          fontFamily: F.serif, fontSize: 18, color: C.text, letterSpacing: -0.2,
        }}>Quail Hollow Championship</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <StatusDot status="live" />
        <span style={{
          fontFamily: F.mono, fontSize: 10.5, fontWeight: 600,
          letterSpacing: 0.8, color: C.green,
        }}>R2 LIVE</span>
      </div>
    </div>
  );
}

// ─── Weather Hero — top of dashboard ────────────────────────
function WeatherHero() {
  // 24h hourly wind data with "now" at index 7
  const hourly = [
    { v: 6, gust: 9 },
    { v: 7, gust: 10 },
    { v: 8, gust: 12 },
    { v: 9, gust: 13 },
    { v: 11, gust: 16 },
    { v: 13, gust: 19 },
    { v: 16, gust: 23 },
    { v: 18, gust: 27, now: true },
    { v: 20, gust: 28 },
    { v: 21, gust: 29 },
    { v: 19, gust: 26 },
    { v: 16, gust: 22 },
    { v: 13, gust: 18 },
    { v: 10, gust: 14 },
  ];

  return (
    <div style={{ margin: '0 20px 26px' }}>
      <div style={{
        position: 'relative', borderRadius: 18, overflow: 'hidden',
        background: `linear-gradient(160deg, #1d3a26 0%, #112519 50%, #0b1a11 100%)`,
        border: `1px solid ${C.line}`,
        padding: '18px 18px 16px',
      }}>
        {/* warm wash from amber to suggest "advantage" */}
        <div style={{
          position: 'absolute', top: -40, right: -40, width: 180, height: 180,
          borderRadius: 999,
          background: `radial-gradient(circle, ${C.amber}22 0%, transparent 65%)`,
          pointerEvents: 'none',
        }}/>

        {/* Friendly headline */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <span style={{
            fontFamily: F.mono, fontSize: 10, letterSpacing: 1.4,
            color: C.amber, textTransform: 'uppercase', fontWeight: 600,
          }}>● Conditions Edge</span>
          <div style={{
            fontFamily: F.serif, fontSize: 22, lineHeight: 1.18,
            color: C.text, marginTop: 6, letterSpacing: -0.2,
            textWrap: 'pretty',
          }}>
            <em>Wind's up at Quail Hollow.</em> AM wave is gaining strokes by the hour.
          </div>
        </div>

        {/* Big stat row */}
        <div style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          gap: 16, marginBottom: 16, position: 'relative',
        }}>
          <Stat value="18" unit="mph" label="Sustained" accent={C.text}/>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <WindArrow degrees={245} size={20}/>
              <span style={{
                fontFamily: F.mono, fontSize: 12, color: C.textDim, letterSpacing: 0.6,
              }}>WSW · gust 27</span>
            </div>
            <span style={{
              fontFamily: F.mono, fontSize: 10.5, color: C.amber, letterSpacing: 0.4,
              fontWeight: 600,
            }}>↑ +10 since 6:00 AM</span>
          </div>
        </div>

        {/* Hourly spark */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <WindSpark data={hourly} width={326} height={48}/>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontFamily: F.mono, fontSize: 9, color: C.textMuted, letterSpacing: 0.6,
            marginTop: 2,
          }}>
            <span>6A</span><span>9A</span><span>NOW</span><span>3P</span><span>6P</span>
          </div>
        </div>

        {/* Wave split */}
        <div style={{
          padding: '12px 14px', borderRadius: 10,
          background: 'rgba(0,0,0,0.25)',
          border: `1px solid ${C.line}`,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            marginBottom: 8,
          }}>
            <span style={{
              fontFamily: F.mono, fontSize: 10, letterSpacing: 1.2,
              color: C.textDim, textTransform: 'uppercase', fontWeight: 600,
            }}>Wave Split · Strokes Gained</span>
            <span style={{
              fontFamily: F.mono, fontSize: 10, color: C.textMuted,
            }}>R2 · vs field</span>
          </div>
          <WaveSplit am={+0.4} pm={-0.4} width={300}/>
        </div>

        {/* Tap-out */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 14,
          fontFamily: F.sans, fontSize: 12.5, color: C.textDim,
        }}>
          <span>You have <strong style={{ color: C.green }}>4 AM-wave bets</strong> · 1 PM</span>
          <span style={{ color: C.text, fontWeight: 600 }}>See exposure →</span>
        </div>
      </div>
    </div>
  );
}

// ─── Alerts feed ────────────────────────────────────────────
function AlertsFeed() {
  return (
    <div style={{ marginBottom: 26 }}>
      <SectionLabel action="See all">Live Alerts · 3 New</SectionLabel>
      <div style={{
        margin: '0 20px', borderRadius: 14,
        background: C.surface1, border: `1px solid ${C.line}`,
        overflow: 'hidden',
      }}>
        {M_ALERTS.map((a, i) => (
          <div key={i} style={{
            display: 'flex', gap: 12, padding: '12px 14px',
            borderBottom: i < M_ALERTS.length - 1 ? `1px solid ${C.line}` : 'none',
          }}>
            <div style={{
              width: 4, alignSelf: 'stretch', borderRadius: 99,
              background: a.color, flexShrink: 0,
            }}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                <span style={{
                  fontFamily: F.mono, fontSize: 9.5, letterSpacing: 1.1,
                  color: a.color, fontWeight: 600, textTransform: 'uppercase',
                }}>
                  {a.kind === 'wave' && '◐ Wave Shift'}
                  {a.kind === 'wind' && '⌇ Wind Alert'}
                  {a.kind === 'hedge' && '◇ Hedge Avail.'}
                </span>
                <span style={{
                  fontFamily: F.mono, fontSize: 10, color: C.textMuted,
                }}>{a.time}</span>
              </div>
              <div style={{
                fontFamily: F.sans, fontSize: 13.5, color: C.text, lineHeight: 1.35,
                marginBottom: 2, fontWeight: 500,
              }}>{a.title}</div>
              <div style={{
                fontFamily: F.sans, fontSize: 12, color: C.textDim, lineHeight: 1.4,
              }}>{a.body}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Bet row ────────────────────────────────────────────────
function BetRow({ b, last }) {
  const evColor = b.ev > 5 ? C.green : b.ev < -5 ? C.red : C.textDim;
  return (
    <div style={{
      padding: '12px 14px',
      borderBottom: last ? 'none' : `1px solid ${C.line}`,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {/* top row: book + status + ev */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <BookChip book={b.book}/>
        <StatusDot status={b.status} withLabel/>
        {b.hedge && (
          <span style={{
            fontFamily: F.mono, fontSize: 9.5, fontWeight: 600, letterSpacing: 0.8,
            color: C.red, padding: '2px 6px', borderRadius: 4,
            background: `${C.red}22`, border: `1px solid ${C.red}44`,
            textTransform: 'uppercase',
          }}>Hedge</span>
        )}
        <span style={{ flex: 1 }}/>
        {b.status === 'live' && (
          <span style={{
            fontFamily: F.mono, fontSize: 10.5, fontWeight: 600,
            color: evColor, letterSpacing: 0.4,
          }}>
            {b.ev > 0 ? '+' : ''}{b.ev}% EV
          </span>
        )}
      </div>
      {/* mid: player + market */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontFamily: F.sans, fontSize: 14.5, fontWeight: 600,
            color: C.text, lineHeight: 1.2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{b.player}</div>
          <div style={{
            fontFamily: F.sans, fontSize: 12.5, color: C.textDim, marginTop: 2,
          }}>{b.market} · <span style={{ fontFamily: F.mono, color: C.textDim }}>{b.line}</span></div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: F.mono, fontSize: 13, color: C.text, fontWeight: 600,
          }}>{b.stake}u → {b.payout.toFixed(2)}u</div>
          {b.status === 'live' && (
            <div style={{
              fontFamily: F.mono, fontSize: 10.5, color: C.textDim, marginTop: 2,
            }}>{b.live.score} · {b.live.thru}</div>
          )}
          {b.status === 'graded' && (
            <div style={{
              fontFamily: F.mono, fontSize: 10.5, color: C.green, marginTop: 2, fontWeight: 600,
            }}>WON · +0.65u</div>
          )}
        </div>
      </div>
    </div>
  );
}

function OpenBets() {
  return (
    <div style={{ marginBottom: 26 }}>
      <SectionLabel action="5 of 7 →">Open Tickets · This Event</SectionLabel>
      <div style={{
        margin: '0 20px', borderRadius: 14,
        background: C.surface1, border: `1px solid ${C.line}`,
      }}>
        {M_BETS.map((b, i) => <BetRow key={i} b={b} last={i === M_BETS.length - 1}/>)}
      </div>
      {/* Bankroll summary */}
      <div style={{
        margin: '10px 20px 0',
        padding: '10px 14px', borderRadius: 10,
        background: 'rgba(255,255,255,0.02)',
        border: `1px dashed ${C.line}`,
        display: 'flex', justifyContent: 'space-between',
        fontFamily: F.mono, fontSize: 11, color: C.textDim, letterSpacing: 0.4,
      }}>
        <span>RISK <span style={{ color: C.text, fontWeight: 600 }}>4.75u</span></span>
        <span>POTENTIAL <span style={{ color: C.text, fontWeight: 600 }}>12.30u</span></span>
        <span>LIVE EV <span style={{ color: C.green, fontWeight: 600 }}>+0.42u</span></span>
      </div>
    </div>
  );
}

// ─── Leaderboard ────────────────────────────────────────────
function LeaderRow({ r, last }) {
  const mine = r.mine && r.mine.length > 0;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 14px',
      borderBottom: last ? 'none' : `1px solid ${C.line}`,
      background: mine ? 'rgba(142, 230, 142, 0.05)' : 'transparent',
      position: 'relative',
    }}>
      {mine && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 2,
          background: C.green,
        }}/>
      )}
      <span style={{
        fontFamily: F.mono, fontSize: 11, color: C.textDim,
        minWidth: 22, fontWeight: 600,
      }}>{r.pos}</span>
      <span style={{
        fontFamily: F.sans, fontSize: 13.5,
        color: mine ? C.text : C.textDim, fontWeight: mine ? 600 : 400,
        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{r.name}</span>
      {mine && (
        <span style={{
          fontFamily: F.mono, fontSize: 9.5, color: C.green, fontWeight: 600,
          letterSpacing: 0.6, padding: '2px 5px', borderRadius: 3,
          background: `${C.green}1f`,
        }}>★ {r.mine.join(' · ')}</span>
      )}
      <span style={{
        fontFamily: F.mono, fontSize: 9.5, color: r.wave === 'AM' ? C.green : C.amber,
        fontWeight: 600, letterSpacing: 0.6, width: 22, textAlign: 'right',
      }}>{r.wave}</span>
      <span style={{
        fontFamily: F.mono, fontSize: 13, color: C.text, fontWeight: 600,
        width: 30, textAlign: 'right',
      }}>{r.score}</span>
      <span style={{
        fontFamily: F.mono, fontSize: 11, color: C.textDim, width: 28, textAlign: 'right',
      }}>{r.thru}</span>
    </div>
  );
}

function Leaderboard() {
  return (
    <div style={{ marginBottom: 16 }}>
      <SectionLabel action="Full board →">Leaderboard · R2 In Progress</SectionLabel>
      <div style={{
        margin: '0 20px', borderRadius: 14,
        background: C.surface1, border: `1px solid ${C.line}`,
        overflow: 'hidden',
      }}>
        {/* header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 14px', borderBottom: `1px solid ${C.line}`,
          background: 'rgba(0,0,0,0.18)',
          fontFamily: F.mono, fontSize: 9.5, letterSpacing: 1.1,
          color: C.textMuted, textTransform: 'uppercase', fontWeight: 600,
        }}>
          <span style={{ minWidth: 22 }}>Pos</span>
          <span style={{ flex: 1 }}>Player</span>
          <span style={{ width: 22, textAlign: 'right' }}>Wv</span>
          <span style={{ width: 30, textAlign: 'right' }}>To Par</span>
          <span style={{ width: 28, textAlign: 'right' }}>Thru</span>
        </div>
        {M_LEADER.map((r, i) => <LeaderRow key={i} r={r} last={i === M_LEADER.length - 1}/>)}
      </div>
    </div>
  );
}

// ─── Bottom nav ─────────────────────────────────────────────
function BottomNav() {
  const tabs = [
    { id: 'home', label: 'Today', active: true, icon: (c) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M3 11l9-7 9 7v9a2 2 0 01-2 2h-4v-6h-6v6H5a2 2 0 01-2-2v-9z" stroke={c} strokeWidth="1.7" strokeLinejoin="round"/>
      </svg>
    )},
    { id: 'bets', label: 'Tickets', icon: (c) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="6" width="18" height="12" rx="2" stroke={c} strokeWidth="1.7"/>
        <path d="M8 10v4M12 10v4M16 10v4" stroke={c} strokeWidth="1.7" strokeLinecap="round"/>
      </svg>
    )},
    { id: 'opt', label: 'DFS', icon: (c) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M4 18V8m6 10V4m6 14v-7m4 7H4" stroke={c} strokeWidth="1.7" strokeLinecap="round"/>
      </svg>
    )},
    { id: 'course', label: 'Course', icon: (c) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M5 21V5l8-2v18M5 9l8 2M19 11v10M19 11l-3-3v6l3-3z" stroke={c} strokeWidth="1.7" strokeLinejoin="round"/>
      </svg>
    )},
    { id: 'me', label: 'You', icon: (c) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke={c} strokeWidth="1.7"/>
        <path d="M4 21c0-4 4-7 8-7s8 3 8 7" stroke={c} strokeWidth="1.7" strokeLinecap="round"/>
      </svg>
    )},
  ];
  return (
    <div style={{
      padding: '10px 8px 28px', display: 'flex', justifyContent: 'space-around',
      borderTop: `1px solid ${C.line}`, background: C.bgDeep,
    }}>
      {tabs.map(t => (
        <div key={t.id} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          flex: 1,
        }}>
          {t.icon(t.active ? C.green : C.textMuted)}
          <span style={{
            fontFamily: F.mono, fontSize: 9.5, fontWeight: 600, letterSpacing: 0.6,
            color: t.active ? C.green : C.textMuted, textTransform: 'uppercase',
          }}>{t.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Composed screen ────────────────────────────────────────
function MobileDashboard() {
  return (
    <div style={{
      width: 402, height: '100%',
      background: C.bg, color: C.text,
      fontFamily: F.sans,
      display: 'flex', flexDirection: 'column',
      paddingTop: 54, // status bar clearance
    }}>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <TopBar/>
        <EventStrap/>
        <WeatherHero/>
        <AlertsFeed/>
        <OpenBets/>
        <Leaderboard/>
      </div>
      <BottomNav/>
    </div>
  );
}

Object.assign(window, { MobileDashboard });
