// Greenside design system primitives
// Dark fairway green palette + shared components

const C = {
  bg: '#0a1f14',
  bgDeep: '#06140c',
  surface1: '#102619',
  surface2: '#173326',
  surface3: '#1e4030',
  line: 'rgba(255,255,255,0.06)',
  lineStrong: 'rgba(255,255,255,0.12)',
  text: '#f0ebe0',
  textDim: '#a8b3ac',
  textMuted: '#6c7a72',
  green: '#8ee68e',      // live / positive / +EV
  greenDeep: '#3f8a52',
  amber: '#f5c558',      // wind warning / wave shift
  amberDeep: '#a07a1f',
  red: '#e07868',        // negative EV / hedge needed
  redDeep: '#7a3027',
  blue: '#7cc0e8',       // info / pending
};

const F = {
  sans: '"Instrument Sans", -apple-system, system-ui, sans-serif',
  serif: '"Instrument Serif", "Iowan Old Style", Georgia, serif',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
};

// ─── Sportsbook chip ────────────────────────────────────────
// Original abbreviation chips — not recreating any book's branding.
const BookChip = ({ book, size = 'sm' }) => {
  const palette = {
    DK: { bg: '#1a3326', fg: '#cfe8d4', label: 'DK' },
    FD: { bg: '#1a2b33', fg: '#cfe1eb', label: 'FD' },
    PP: { bg: '#33291a', fg: '#ebd9bf', label: 'PP' },
    UD: { bg: '#2b1a33', fg: '#dccfeb', label: 'UD' },
  };
  const p = palette[book] || palette.DK;
  const h = size === 'sm' ? 18 : 22;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      height: h, minWidth: h * 1.7, padding: '0 6px', borderRadius: 4,
      background: p.bg, color: p.fg,
      fontFamily: F.mono, fontSize: size === 'sm' ? 10 : 11.5, fontWeight: 600,
      letterSpacing: 0.6, lineHeight: 1,
      border: '1px solid rgba(255,255,255,0.05)',
    }}>{p.label}</span>
  );
};

// ─── Status dot ─────────────────────────────────────────────
const StatusDot = ({ status, withLabel = false }) => {
  const map = {
    live:    { c: C.green, l: 'LIVE',    pulse: true },
    pending: { c: C.blue,  l: 'PENDING', pulse: false },
    graded:  { c: C.textMuted, l: 'GRADED', pulse: false },
    won:     { c: C.green, l: 'WON',     pulse: false },
    lost:    { c: C.red,   l: 'LOST',    pulse: false },
  };
  const s = map[status];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        width: 7, height: 7, borderRadius: 99, background: s.c,
        boxShadow: s.pulse ? `0 0 0 3px ${s.c}22, 0 0 8px ${s.c}66` : 'none',
        flexShrink: 0,
      }} />
      {withLabel && (
        <span style={{
          fontFamily: F.mono, fontSize: 10, fontWeight: 600, letterSpacing: 0.8,
          color: s.c,
        }}>{s.l}</span>
      )}
    </span>
  );
};

// ─── Section header ─────────────────────────────────────────
const SectionLabel = ({ children, action }) => (
  <div style={{
    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
    padding: '0 20px', marginBottom: 10,
  }}>
    <span style={{
      fontFamily: F.mono, fontSize: 10.5, fontWeight: 600, letterSpacing: 1.4,
      color: C.textMuted, textTransform: 'uppercase',
    }}>{children}</span>
    {action && (
      <span style={{
        fontFamily: F.sans, fontSize: 12, color: C.textDim,
        textDecoration: 'underline', textUnderlineOffset: 3,
      }}>{action}</span>
    )}
  </div>
);

// ─── Card ───────────────────────────────────────────────────
const Card = ({ children, style = {}, padding = 16 }) => (
  <div style={{
    background: C.surface1, borderRadius: 14,
    border: `1px solid ${C.line}`,
    padding,
    ...style,
  }}>{children}</div>
);

// ─── Big stat (serif italic numerics) ───────────────────────
const Stat = ({ value, unit, label, accent }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
      <span style={{
        fontFamily: F.serif, fontStyle: 'italic',
        fontSize: 56, lineHeight: 0.95, color: accent || C.text,
        fontWeight: 400, letterSpacing: -1,
      }}>{value}</span>
      {unit && <span style={{
        fontFamily: F.mono, fontSize: 12, color: C.textDim, letterSpacing: 0.5,
      }}>{unit}</span>}
    </div>
    {label && <span style={{
      fontFamily: F.mono, fontSize: 9.5, fontWeight: 600, letterSpacing: 1.2,
      color: C.textMuted, textTransform: 'uppercase',
    }}>{label}</span>}
  </div>
);

// ─── Wind direction arrow ───────────────────────────────────
const WindArrow = ({ degrees = 245, size = 18, color = C.amber }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{
    transform: `rotate(${degrees}deg)`,
  }}>
    <path d="M12 3 L12 21 M12 3 L7 8 M12 3 L17 8"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      fill="none"/>
  </svg>
);

// ─── Wave split bar (AM vs PM) ──────────────────────────────
const WaveSplit = ({ am, pm, width = 240 }) => {
  // am, pm are strokes-gained values (e.g. +0.2, -0.2)
  const max = Math.max(Math.abs(am), Math.abs(pm), 0.5);
  const amW = Math.abs(am) / max * (width / 2 - 30);
  const pmW = Math.abs(pm) / max * (width / 2 - 30);
  const center = width / 2;
  return (
    <div style={{ width, position: 'relative' }}>
      {/* axis */}
      <div style={{ position: 'relative', height: 38 }}>
        {/* center line */}
        <div style={{
          position: 'absolute', left: center - 0.5, top: 0, bottom: 0,
          width: 1, background: C.lineStrong,
        }} />
        {/* AM bar (top half) */}
        <div style={{
          position: 'absolute', top: 6, height: 10,
          left: am >= 0 ? center : center - amW,
          width: amW,
          background: am >= 0 ? C.green : C.red,
          borderRadius: 2,
        }} />
        {/* PM bar (bottom half) */}
        <div style={{
          position: 'absolute', top: 22, height: 10,
          left: pm >= 0 ? center : center - pmW,
          width: pmW,
          background: pm >= 0 ? C.green : C.red,
          borderRadius: 2,
        }} />
        {/* AM label */}
        <span style={{
          position: 'absolute', left: 0, top: 4,
          fontFamily: F.mono, fontSize: 10, color: C.textDim, letterSpacing: 0.8,
        }}>AM</span>
        {/* PM label */}
        <span style={{
          position: 'absolute', left: 0, top: 20,
          fontFamily: F.mono, fontSize: 10, color: C.textDim, letterSpacing: 0.8,
        }}>PM</span>
        {/* values */}
        <span style={{
          position: 'absolute', right: 0, top: 4,
          fontFamily: F.mono, fontSize: 10.5, fontWeight: 600,
          color: am >= 0 ? C.green : C.red,
        }}>{am > 0 ? '+' : ''}{am.toFixed(1)}</span>
        <span style={{
          position: 'absolute', right: 0, top: 20,
          fontFamily: F.mono, fontSize: 10.5, fontWeight: 600,
          color: pm >= 0 ? C.green : C.red,
        }}>{pm > 0 ? '+' : ''}{pm.toFixed(1)}</span>
      </div>
    </div>
  );
};

// ─── Hourly wind sparkline ──────────────────────────────────
const WindSpark = ({ data, width = 320, height = 56 }) => {
  const max = Math.max(...data.map(d => d.gust || d.v));
  const min = Math.min(...data.map(d => d.v));
  const pad = 2;
  const w = width;
  const h = height;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (w - pad * 2) + pad;
    const y = h - pad - ((d.v - min) / (max - min + 0.0001)) * (h - pad * 2);
    return [x, y];
  });
  const gustPts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (w - pad * 2) + pad;
    const y = h - pad - (((d.gust || d.v) - min) / (max - min + 0.0001)) * (h - pad * 2);
    return [x, y];
  });
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const gustArea = `M ${gustPts[0][0]} ${h} L ` +
    gustPts.map(p => `${p[0]} ${p[1]}`).join(' L ') +
    ` L ${gustPts[gustPts.length-1][0]} ${h} Z`;
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="windGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.amber} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={C.amber} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={gustArea} fill="url(#windGrad)" />
      <path d={linePath} stroke={C.amber} strokeWidth="1.5" fill="none" />
      {/* now marker */}
      {(() => {
        const nowIdx = data.findIndex(d => d.now);
        if (nowIdx < 0) return null;
        const [nx, ny] = pts[nowIdx];
        return <g>
          <line x1={nx} x2={nx} y1={0} y2={h} stroke={C.text} strokeWidth="0.5" strokeDasharray="2 2" opacity="0.3" />
          <circle cx={nx} cy={ny} r="3" fill={C.amber} stroke={C.bg} strokeWidth="1.5" />
        </g>;
      })()}
    </svg>
  );
};

Object.assign(window, { C, F, BookChip, StatusDot, SectionLabel, Card, Stat, WindArrow, WaveSplit, WindSpark });
