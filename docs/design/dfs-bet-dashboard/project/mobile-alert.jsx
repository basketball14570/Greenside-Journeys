// Mobile Alert Detail — what you see after tapping the AM wave-shift alert

function AlertDetailHeader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 16px 18px',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 99,
        background: C.surface2, border: `1px solid ${C.line}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M15 5l-7 7 7 7" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <span style={{
          fontFamily: F.mono, fontSize: 9.5, letterSpacing: 1.2,
          color: C.green, fontWeight: 600, textTransform: 'uppercase',
        }}>◐ Wave Shift Alert</span>
        <span style={{
          fontFamily: F.mono, fontSize: 10, color: C.textMuted,
        }}>7:42 AM · 2 min ago</span>
      </div>
      <div style={{
        width: 32, height: 32, borderRadius: 99,
        background: C.surface2, border: `1px solid ${C.line}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M4 12v6a2 2 0 002 2h12a2 2 0 002-2v-6M16 6l-4-4-4 4M12 2v13" stroke={C.text} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}

function AlertHero() {
  return (
    <div style={{
      margin: '0 20px 22px',
      padding: '20px 18px',
      borderRadius: 18,
      background: `linear-gradient(155deg, ${C.greenDeep}66 0%, ${C.bg} 60%)`,
      border: `1px solid ${C.green}33`,
    }}>
      <div style={{
        fontFamily: F.serif, fontSize: 26, lineHeight: 1.18,
        color: C.text, letterSpacing: -0.3, marginBottom: 14,
        textWrap: 'pretty',
      }}>
        <em>AM wave gaining</em> <span style={{ color: C.green }}>~0.4 strokes</span> of EV.
      </div>
      <div style={{
        fontFamily: F.sans, fontSize: 14.5, color: C.textDim, lineHeight: 1.45,
        marginBottom: 18,
      }}>
        Wind forecast for Quail Hollow jumped from 8 → 18 mph since 6:00 AM.
        Your AM-wave players started early and are banking strokes before the PM wave tees off into stronger conditions.
      </div>
      {/* Inline mini split */}
      <div style={{
        display: 'flex', gap: 12,
      }}>
        <div style={{ flex: 1,
          padding: '10px 12px', borderRadius: 10,
          background: `${C.green}14`, border: `1px solid ${C.green}33`,
        }}>
          <div style={{
            fontFamily: F.mono, fontSize: 9.5, letterSpacing: 1.1,
            color: C.green, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4,
          }}>AM Wave · Yours</div>
          <div style={{
            fontFamily: F.serif, fontStyle: 'italic', fontSize: 28, lineHeight: 1,
            color: C.green, fontWeight: 400,
          }}>+0.4<span style={{ fontFamily: F.mono, fontSize: 11, fontStyle: 'normal', color: C.green }}>sg</span></div>
          <div style={{
            fontFamily: F.mono, fontSize: 10, color: C.textDim, marginTop: 6,
          }}>4 bets exposed</div>
        </div>
        <div style={{ flex: 1,
          padding: '10px 12px', borderRadius: 10,
          background: `${C.red}14`, border: `1px solid ${C.red}33`,
        }}>
          <div style={{
            fontFamily: F.mono, fontSize: 9.5, letterSpacing: 1.1,
            color: C.red, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4,
          }}>PM Wave · Yours</div>
          <div style={{
            fontFamily: F.serif, fontStyle: 'italic', fontSize: 28, lineHeight: 1,
            color: C.red, fontWeight: 400,
          }}>−0.4<span style={{ fontFamily: F.mono, fontSize: 11, fontStyle: 'normal', color: C.red }}>sg</span></div>
          <div style={{
            fontFamily: F.mono, fontSize: 10, color: C.textDim, marginTop: 6,
          }}>1 bet exposed
          </div>
        </div>
      </div>
    </div>
  );
}

const EXPOSURE = [
  { wave: 'AM', book: 'DK', player: 'Scottie Scheffler', market: 'Top 10', stake: 1.0,
    move: +12, before: '+250', after: '+205', sens: 0.18 },
  { wave: 'AM', book: 'FD', player: 'Rory McIlroy',     market: 'R2 U70', stake: 1.5,
    move: +22, before: '+140', after: '+105', sens: 0.22, hedge: true },
  { wave: 'AM', book: 'UD', player: 'Collin Morikawa',   market: 'Top 20', stake: 1.0,
    move:  +4, before: '+140', after: '+125', sens: 0.31 },
  { wave: 'AM', book: 'DK', player: 'Schauffele vs Spieth', market: 'R2 Matchup', stake: 0.75,
    move: +6, before: '-115', after: '-125', sens: 0.28 },
  { wave: 'PM', book: 'PP', player: 'Patrick Cantlay',   market: 'FH O8.5', stake: 0.5,
    move: -8, before: 'pick', after: 'pick', sens: 0.41 },
];

function ExposureRow({ b, last }) {
  const positive = b.move > 0;
  return (
    <div style={{
      padding: '12px 14px',
      borderBottom: last ? 'none' : `1px solid ${C.line}`,
      display: 'flex', flexDirection: 'column', gap: 8,
      background: b.wave === 'AM' ? 'rgba(142, 230, 142, 0.04)' : 'transparent',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 2,
        background: b.wave === 'AM' ? C.green : C.red,
      }}/>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontFamily: F.mono, fontSize: 9.5, fontWeight: 600, letterSpacing: 1,
          color: b.wave === 'AM' ? C.green : C.red,
          padding: '2px 5px', borderRadius: 3,
          background: b.wave === 'AM' ? `${C.green}22` : `${C.red}22`,
        }}>{b.wave} WAVE</span>
        <BookChip book={b.book}/>
        {b.hedge && (
          <span style={{
            fontFamily: F.mono, fontSize: 9.5, fontWeight: 600, letterSpacing: 0.8,
            color: C.amber, padding: '2px 6px', borderRadius: 4,
            background: `${C.amber}22`, border: `1px solid ${C.amber}55`,
            textTransform: 'uppercase',
          }}>Hedge Open</span>
        )}
        <span style={{ flex: 1 }}/>
        <span style={{
          fontFamily: F.mono, fontSize: 12, fontWeight: 700,
          color: positive ? C.green : C.red,
        }}>{positive ? '+' : ''}{b.move}% EV</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <div style={{
            fontFamily: F.sans, fontSize: 14.5, color: C.text, fontWeight: 600,
          }}>{b.player}</div>
          <div style={{
            fontFamily: F.sans, fontSize: 12.5, color: C.textDim, marginTop: 2,
          }}>{b.market} · <span style={{ fontFamily: F.mono }}>{b.stake}u</span></div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: F.mono, fontSize: 11.5, color: C.textDim,
          }}>
            <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>{b.before}</span>
            <span style={{ margin: '0 4px' }}>→</span>
            <span style={{ color: positive ? C.green : C.red, fontWeight: 600 }}>{b.after}</span>
          </div>
          <div style={{
            fontFamily: F.mono, fontSize: 10, color: C.textMuted, marginTop: 3,
            letterSpacing: 0.5,
          }}>Wind sens. <span style={{ color: C.text }}>{b.sens.toFixed(2)}</span></div>
        </div>
      </div>
    </div>
  );
}

function Exposure() {
  return (
    <div style={{ marginBottom: 22 }}>
      <SectionLabel>Exposed Tickets · 5</SectionLabel>
      <div style={{
        margin: '0 20px', borderRadius: 14,
        background: C.surface1, border: `1px solid ${C.line}`,
      }}>
        {EXPOSURE.map((b, i) => <ExposureRow key={i} b={b} last={i === EXPOSURE.length - 1}/>)}
      </div>
    </div>
  );
}

// ─── Sensitivity reference ──────────────────────────────────
function PlayerSensitivity() {
  const players = [
    { name: 'Cantlay',    v: 0.41, wave: 'PM' },
    { name: 'Morikawa',   v: 0.31, wave: 'AM' },
    { name: 'Schauffele', v: 0.28, wave: 'AM' },
    { name: 'McIlroy',    v: 0.22, wave: 'AM' },
    { name: 'Scheffler',  v: 0.18, wave: 'AM' },
  ];
  const max = 0.45;
  return (
    <div style={{ marginBottom: 22 }}>
      <SectionLabel>Wind Sensitivity · Your Players</SectionLabel>
      <div style={{
        margin: '0 20px', padding: 14, borderRadius: 14,
        background: C.surface1, border: `1px solid ${C.line}`,
      }}>
        <div style={{
          fontFamily: F.sans, fontSize: 12, color: C.textDim, marginBottom: 14, lineHeight: 1.4,
        }}>
          Strokes lost per round in <span style={{ color: C.text, fontWeight: 600 }}>15+ mph wind</span> vs. their no-wind baseline. Lower is better.
        </div>
        {players.map((p, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginBottom: i < players.length - 1 ? 10 : 0,
          }}>
            <span style={{
              fontFamily: F.sans, fontSize: 13, color: C.text, width: 88,
            }}>{p.name}</span>
            <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
              <div style={{
                width: `${(p.v / max) * 100}%`, height: '100%',
                background: p.v > 0.35 ? C.red : p.v > 0.25 ? C.amber : C.green,
                borderRadius: 99,
              }}/>
            </div>
            <span style={{
              fontFamily: F.mono, fontSize: 11.5, fontWeight: 600, color: C.text,
              width: 32, textAlign: 'right',
            }}>{p.v.toFixed(2)}</span>
            <span style={{
              fontFamily: F.mono, fontSize: 9.5, color: p.wave === 'AM' ? C.green : C.red,
              fontWeight: 600, letterSpacing: 0.6, width: 22, textAlign: 'right',
            }}>{p.wave}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Action bar ─────────────────────────────────────────────
function ActionBar() {
  return (
    <div style={{
      padding: '12px 20px 24px', display: 'flex', gap: 10,
      borderTop: `1px solid ${C.line}`, background: C.bgDeep,
    }}>
      <button style={{
        flex: 1, height: 48, borderRadius: 12,
        background: C.surface2, border: `1px solid ${C.line}`,
        color: C.text, fontFamily: F.sans, fontSize: 14, fontWeight: 600,
      }}>Snooze 1h</button>
      <button style={{
        flex: 1.4, height: 48, borderRadius: 12,
        background: C.green, border: 'none',
        color: C.bgDeep, fontFamily: F.sans, fontSize: 14, fontWeight: 700,
      }}>Review hedges →</button>
    </div>
  );
}

function MobileAlertDetail() {
  return (
    <div style={{
      width: 402, height: '100%',
      background: C.bg, color: C.text,
      fontFamily: F.sans,
      display: 'flex', flexDirection: 'column',
      paddingTop: 54,
    }}>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <AlertDetailHeader/>
        <AlertHero/>
        <Exposure/>
        <PlayerSensitivity/>
      </div>
      <ActionBar/>
    </div>
  );
}

Object.assign(window, { MobileAlertDetail });
