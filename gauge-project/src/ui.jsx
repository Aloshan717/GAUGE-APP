// GAUGE — shared UI pieces. Every screen is built from these, so spacing,
// type and colour stay consistent across the app.
import React, { useId, useState } from "react";
import { chartLabels, computePace, ewmaTrend } from "./logic";
import { NUM_FONT } from "./theme";

// ─── ICONS ───────────────────────────────────────────────────────────────────
const ICONS = {
  today:    <><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/></>,
  body:     <><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="9.5" r="2.5"/><path d="M7.5 17.5a4.5 4.5 0 0 1 9 0"/></>,
  plus:     <path d="M12 5v14M5 12h14"/>,
  train:    <><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/></>,
  plan:     <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/></>,
  scale:    <><rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><path d="M8 10a5 5 0 0 1 8 0"/><path d="m12 10 1.6-2.2"/></>,
  scan:     <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></>,
  ruler:    <><path d="M3 17 17 3l4 4L7 21z"/><path d="m14 6 2 2M11 9l2 2M8 12l2 2"/></>,
  activity: <path d="M3 12h4l3-7 4 14 3-7h4"/>,
  flame:    <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-3.8 2.5-5 .3 1.6 1 2.5 2 3 0-3-1-5.5.5-8z"/>,
  clock:    <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  upload:   <><path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 21h14"/></>,
  camera:   <><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/></>,
  keyboard: <><rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M7.5 14h9"/></>,
  edit:     <><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></>,
  trash:    <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></>,
  sun:      <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
  moon:     <path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"/>,
  logout:   <><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="m10 16-4-4 4-4"/><path d="M6 12h10"/></>,
  bolt:     <path d="M13 2 4 14h7l-1 8 9-12h-7z"/>,
  check:    <path d="m5 12 5 5 9-10"/>,
  close:    <path d="M6 6l12 12M18 6 6 18"/>,
  chevR:    <path d="m9 6 6 6-6 6"/>,
  chevL:    <path d="m15 6-6 6 6 6"/>,
  chevD:    <path d="m6 9 6 6 6-6"/>,
  alert:    <><path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.2v.1"/></>,
  refresh:  <><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></>,
  trophy:   <><path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 3M16 6h3a3 3 0 0 1-3 3M12 13v4M9 20h6"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></>,
  user:     <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  info:     <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.1"/></>,
};

export function Icon({ name, size = 20, stroke = 1.8, style }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={stroke}
         strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", display: "block", ...style }} aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

// ─── LAYOUT ──────────────────────────────────────────────────────────────────
export function Card({ T, children, style, pad = 16, onClick, tone }) {
  return (
    <div onClick={onClick} className={onClick ? "g-press" : undefined} style={{
      background: T.surface, borderRadius: T.radius, padding: pad,
      border: `1px solid ${tone ? `${tone}55` : T.divider}`, boxShadow: T.shadow,
      display: "flex", flexDirection: "column", gap: 12, cursor: onClick ? "pointer" : undefined,
      ...style,
    }}>
      {children}
    </div>
  );
}

export const Kicker = ({ children, T, style }) => (
  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: T.n600, ...style }}>{children}</div>
);

// Card header: small caps label on the left, anything on the right.
export function CardHead({ T, label, right, icon, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minHeight: 22 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: color || T.n600, minWidth: 0 }}>
        {icon && <Icon name={icon} size={15} stroke={2} />}
        <Kicker T={T} style={{ color: "inherit" }}>{label}</Kicker>
      </span>
      {right}
    </div>
  );
}

export function ScreenTitle({ T, title, sub, right }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, padding: "2px 2px 4px" }}>
      <div style={{ minWidth: 0 }}>
        {sub && <div style={{ fontSize: 13, color: T.n600, fontWeight: 500, marginBottom: 2 }}>{sub}</div>}
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1, color: T.text }}>{title}</h1>
      </div>
      {right}
    </div>
  );
}

export const Muted = ({ T, children, style }) => (
  <div style={{ fontSize: 12, color: T.n600, lineHeight: 1.55, ...style }}>{children}</div>
);

// ─── NUMBERS ─────────────────────────────────────────────────────────────────
export function Big({ T, value, unit, size = 44, color }) {
  return (
    <span style={{ fontFamily: NUM_FONT, fontWeight: 700, fontSize: size, lineHeight: 0.95, letterSpacing: "-0.01em", color: color || T.text, fontVariantNumeric: "tabular-nums" }}>
      {value ?? "—"}
      {unit && value != null && <span style={{ fontFamily: "inherit", fontSize: Math.max(13, size * 0.38), color: T.n600, fontWeight: 600, marginLeft: 3 }}>{unit}</span>}
    </span>
  );
}

// ▲/▼ change pill. goodDirection: 1 = up is good, -1 = down is good, 0 = neutral.
export function Delta({ T, value, unit = "", goodDirection = 0, size = 11.5 }) {
  if (value == null || isNaN(value)) return null;
  const v = +(+value).toFixed(1);
  const color = v === 0 || !goodDirection ? T.n600 : v * goodDirection > 0 ? T.ok : T.bad;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: size, fontWeight: 700, color, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
      {v === 0 ? "±" : v > 0 ? "▲" : "▼"} {Math.abs(v)}{unit}
    </span>
  );
}

export function StatTile({ T, label, value, unit, sub, color, icon }) {
  return (
    <div style={{ background: T.surface2, borderRadius: 14, padding: "11px 12px", minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: color || T.n600 }}>
        {icon && <Icon name={icon} size={13} stroke={2} />}{label}
      </span>
      <Big T={T} value={value} unit={unit} size={26} />
      {sub}
    </div>
  );
}

export const Grid = ({ cols = 3, gap = 8, children, style }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap, ...style }}>{children}</div>
);

// ─── CONTROLS ────────────────────────────────────────────────────────────────
export function Btn({ T, kind = "primary", icon, children, full, small, style, disabled, ...rest }) {
  const kinds = {
    primary:   { background: T.accent, color: T.accentInk, border: "none", boxShadow: `0 8px 22px ${T.glow}` },
    secondary: { background: T.accent100, color: T.accent600, border: `1px solid ${T.accent400}` },
    ghost:     { background: T.surface2, color: T.text, border: `1px solid ${T.divider}` },
    danger:    { background: "transparent", color: T.bad, border: `1px solid ${T.bad}66` },
  };
  return (
    <button type="button" className="g-press" disabled={disabled} {...rest} style={{
      minHeight: small ? 38 : 50, padding: small ? "0 14px" : "0 18px", borderRadius: small ? 11 : 14,
      fontFamily: "inherit", fontSize: small ? 13 : 15, fontWeight: 700, letterSpacing: "0.01em",
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.55 : 1,
      width: full ? "100%" : undefined, ...kinds[kind], ...style,
    }}>
      {icon && <Icon name={icon} size={small ? 16 : 18} stroke={2.2} />}
      {children}
    </button>
  );
}

export function IconBtn({ T, icon, label, onClick, color, style }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="g-press" style={{
      width: 38, height: 38, borderRadius: 12, border: `1px solid ${T.divider}`, background: T.surface2,
      color: color || T.n700, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flex: "none", ...style,
    }}>
      <Icon name={icon} size={18} />
    </button>
  );
}

export const inputStyle = (T) => ({
  width: "100%", background: T.surface2, border: `1px solid ${T.divider}`, borderRadius: T.radiusSm,
  color: T.text, padding: "10px 12px", fontSize: 16, outline: "none", boxSizing: "border-box",
  fontFamily: "inherit", minHeight: 48, fontWeight: 500,
});

export function Field({ T, label, hint, children, span }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, gridColumn: span ? "1 / -1" : undefined }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.n600 }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 11, color: T.n600, lineHeight: 1.45 }}>{hint}</span>}
    </label>
  );
}

export const Input = ({ T, style, ...rest }) => <input className="g-input" style={{ ...inputStyle(T), ...style }} {...rest} />;

export function Select({ T, children, style, ...rest }) {
  return (
    <span style={{ position: "relative", display: "block" }}>
      <select className="g-input" style={{ ...inputStyle(T), paddingRight: 36, ...style }} {...rest}>{children}</select>
      <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: T.n600, pointerEvents: "none" }}>
        <Icon name="chevD" size={16} />
      </span>
    </span>
  );
}

export const FormGrid = ({ children, cols = 2 }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 12 }}>{children}</div>
);

export function Segmented({ T, options, value, onChange, size = "md" }) {
  return (
    <div role="tablist" style={{ display: "flex", gap: 4, padding: 4, borderRadius: 14, background: T.surface2, border: `1px solid ${T.divider}` }}>
      {options.map(([v, label]) => {
        const on = v === value;
        return (
          <button key={v} role="tab" aria-selected={on} type="button" onClick={() => onChange(v)} className="g-press" style={{
            flex: 1, minHeight: size === "sm" ? 32 : 38, border: "none", borderRadius: 10, fontFamily: "inherit",
            fontSize: size === "sm" ? 12 : 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
            background: on ? T.accent : "transparent", color: on ? T.accentInk : T.n600,
          }}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

// Toggle chips. multi → value is an array.
export function Chips({ T, options, value, onChange, multi = false, scroll = false }) {
  const isOn = (v) => (multi ? (value || []).includes(v) : v === value);
  return (
    <div className={scroll ? "g-hscroll" : undefined} style={{ display: "flex", gap: 8, flexWrap: scroll ? "nowrap" : "wrap", margin: scroll ? "0 -16px" : 0, padding: scroll ? "2px 16px" : 0 }}>
      {options.map((o) => {
        const [v, label] = Array.isArray(o) ? o : [o, o];
        const on = isOn(v);
        return (
          <button key={v} type="button" onClick={() => onChange(v)} className="g-press" style={{
            flex: "none", minHeight: 38, padding: "0 14px", borderRadius: 999, fontFamily: "inherit",
            fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
            border: `1px solid ${on ? T.accent : T.divider}`, background: on ? T.accent100 : T.surface2,
            color: on ? T.accent600 : T.n700, display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            {multi && on && <Icon name="check" size={14} stroke={2.6} />}
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ─── FEEDBACK ────────────────────────────────────────────────────────────────
export function Banner({ T, tone = "warn", children, onClose, action }) {
  const c = T[tone] || T.warn;
  return (
    <div className="g-fadein" style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 14, background: `${c}16`, border: `1px solid ${c}55`, color: T.text, fontSize: 12.5, lineHeight: 1.5 }}>
      <span style={{ color: c, marginTop: 1 }}><Icon name="alert" size={16} stroke={2} /></span>
      <span style={{ flex: 1, minWidth: 0 }}>{children}</span>
      {action}
      {onClose && (
        <button type="button" aria-label="Dismiss" onClick={onClose} style={{ border: "none", background: "transparent", color: T.n600, cursor: "pointer", padding: 0, marginTop: 1 }}>
          <Icon name="close" size={16} />
        </button>
      )}
    </div>
  );
}

export function Empty({ T, icon, title, text, action }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 8, padding: "18px 8px" }}>
      {icon && <span style={{ width: 48, height: 48, borderRadius: 16, background: T.accent100, color: T.accent, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon name={icon} size={24} /></span>}
      <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{title}</div>
      {text && <Muted T={T} style={{ maxWidth: 280 }}>{text}</Muted>}
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  );
}

export const Spinner = ({ T, size = 34 }) => (
  <span style={{ width: size, height: size, border: `3px solid ${T.accent200}`, borderTopColor: T.accent, borderRadius: "50%", display: "inline-block", animation: "g-spin 0.8s linear infinite" }} />
);

// One row in a history list.
export function Row({ T, title, sub, right, last }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: last ? "none" : `1px solid ${T.divider}` }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 650, color: T.text, fontVariantNumeric: "tabular-nums" }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: T.n600, marginTop: 2, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>{sub}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>{right}</div>
    </div>
  );
}

// "Show all" for long lists: the first `limit` rows, then everything on demand.
export function useShowMore(T, list, limit = 8) {
  const [all, setAll] = useState(false);
  const rows = all ? list : list.slice(0, limit);
  const toggle = list.length > limit ? (
    <button type="button" onClick={() => setAll((v) => !v)} className="g-press" style={{
      alignSelf: "center", border: `1px solid ${T.divider}`, background: T.surface2, color: T.n700,
      fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: "7px 14px", borderRadius: 999,
    }}>
      {all ? "Show less" : `Show all ${list.length}`}
    </button>
  ) : null;
  return [rows, toggle];
}

export const Tag = ({ T, children, color }) => (
  <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: color || T.n600, border: `1px solid ${color ? `${color}66` : T.divider}`, background: color ? `${color}14` : "transparent", borderRadius: 6, padding: "2px 6px" }}>
    {children}
  </span>
);

export function DelBtn({ T, onClick }) {
  return (
    <button type="button" aria-label="Delete" onClick={onClick} className="g-press" style={{ width: 34, height: 34, borderRadius: 10, border: "none", background: `${T.bad}14`, color: T.bad, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
      <Icon name="trash" size={16} />
    </button>
  );
}

// Seven day squares, oldest → today; filled = trained (Gentler Streak / Apple style).
export function WeekStrip({ T, days }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 4 }}>
      {days.map((d) => (
        <div key={d.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: d.today ? T.text : T.n600 }}>{d.label}</span>
          <span style={{ width: 30, height: 30, borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center",
            background: d.trained ? T.accent : T.surface2, color: d.trained ? T.accentInk : T.n500,
            border: d.today ? `1.5px solid ${d.trained ? T.accent : T.n600}` : "1.5px solid transparent",
            boxShadow: d.trained ? `0 0 12px ${T.glow}` : "none" }}>
            {d.trained ? <Icon name="check" size={15} stroke={3} /> : <span style={{ width: 4, height: 4, borderRadius: 2, background: T.n500 }} />}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── SHEET (bottom drawer) ───────────────────────────────────────────────────
export function Sheet({ T, title, onClose, onBack, children }) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div className="g-fadein" onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.62)", backdropFilter: "blur(2px)" }} />
      <div className="g-sheet" role="dialog" aria-label={title} style={{
        position: "relative", maxHeight: "90%", display: "flex", flexDirection: "column",
        background: T.bg, borderTop: `1px solid ${T.divider}`, borderRadius: "26px 26px 0 0",
        boxShadow: "0 -20px 60px rgba(0,0,0,0.5)", paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
          <span style={{ width: 38, height: 5, borderRadius: 3, background: T.surface3 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px 6px" }}>
          {onBack && <IconBtn T={T} icon="chevL" label="Back" onClick={onBack} />}
          <div style={{ flex: 1, minWidth: 0, fontSize: 19, fontWeight: 800, letterSpacing: "-0.01em", color: T.text }}>{title}</div>
          <IconBtn T={T} icon="close" label="Close" onClick={onClose} />
        </div>
        <div className="gauge-scroll" style={{ overflowY: "auto", padding: "8px 16px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── RING ────────────────────────────────────────────────────────────────────
// progress 0–100 (null = no target, track only). marker = where you should be.
export function Ring({ T, size = 96, stroke = 9, progress, color, marker, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = progress == null ? 0 : Math.max(0, Math.min(100, progress));
  const angle = marker == null ? null : (Math.max(0, Math.min(100, marker)) / 100) * 2 * Math.PI - Math.PI / 2;
  const mx = (rad) => size / 2 + rad * Math.cos(angle);
  const my = (rad) => size / 2 + rad * Math.sin(angle);
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.surface3} strokeWidth={stroke} />
        {p > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
                  strokeDasharray={`${(p / 100) * c} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  style={{ transition: "stroke-dasharray 0.8s cubic-bezier(.2,.8,.2,1)", filter: `drop-shadow(0 0 6px ${color}66)` }} />
        )}
        {angle != null && (
          <line x1={mx(r - stroke / 2 - 2)} y1={my(r - stroke / 2 - 2)} x2={mx(r + stroke / 2 + 2)} y2={my(r + stroke / 2 + 2)}
                stroke={T.text} strokeWidth={2.2} strokeLinecap="round" opacity={0.85} />
        )}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        {children}
      </div>
    </div>
  );
}

// ─── TREND CHART (real time axis; optional smoothed trend line) ──────────────
export function TrendChart({ data, field, color, T, h = 150, target = null, goodDirection = -1, unit = "", smooth = false, footer = true }) {
  const gid = `g${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const rows = smooth ? ewmaTrend(data || [], field) : (data || []);
  const pts = rows
    .map((d) => ({ t: new Date(d.date + "T00:00:00").getTime(), v: +d[field], tr: smooth ? d.trend : null }))
    .filter((p) => !isNaN(p.v) && !isNaN(p.t))
    .sort((a, b) => a.t - b.t);

  if (pts.length === 0) return null;

  const PW = 340, PH = h;
  const padL = 34, padR = 10, padT = 12, padB = 22;
  const iw = PW - padL - padR;
  const ih = PH - padT - padB;

  let tMin = pts[0].t;
  let tMax = pts[pts.length - 1].t;
  const tgtT = target?.date ? new Date(target.date + "T00:00:00").getTime() : null;
  if (tgtT && tgtT > tMax) tMax = tgtT;
  if (tMax === tMin) { tMin -= 86400000 * 3; tMax += 86400000 * 3; }

  const vals = pts.map((p) => p.v);
  if (target?.value != null) vals.push(+target.value);
  let vMin = Math.min(...vals), vMax = Math.max(...vals);
  if (vMax === vMin) { vMin -= 1; vMax += 1; }
  const padV = (vMax - vMin) * 0.18;
  vMin -= padV; vMax += padV;

  const X = (t) => padL + ((t - tMin) / (tMax - tMin)) * iw;
  const Y = (v) => padT + (1 - (v - vMin) / (vMax - vMin)) * ih;

  // The drawn line is the trend when smoothing, the raw readings otherwise.
  const lineVals = pts.map((p) => (smooth && p.tr != null ? p.tr : p.v));
  const line = pts.map((p, i) => `${X(p.t).toFixed(1)},${Y(lineVals[i]).toFixed(1)}`).join(" ");
  const baseY = (padT + ih).toFixed(1);
  const area = `${X(pts[0].t).toFixed(1)},${baseY} ${line} ${X(pts[pts.length - 1].t).toFixed(1)},${baseY}`;

  // Drop axis labels that would overlap (e.g. a start label right before a month).
  const labels = chartLabels(tMin, tMax, pts.map((p) => p.t), tgtT)
    .reduceRight((kept, L) => (kept.length && X(kept[0].t) - X(L.t) < 34 ? kept : [L, ...kept]), []);
  const anchorFor = (x) => (x < padL + 16 ? "start" : x > PW - padR - 16 ? "end" : "middle");

  let tgtLine = null;
  if (target?.value != null && tgtT) {
    const last = pts[pts.length - 1];
    tgtLine = `${X(last.t).toFixed(1)},${Y(lineVals[lineVals.length - 1]).toFixed(1)} ${X(tgtT).toFixed(1)},${Y(+target.value).toFixed(1)}`;
  }

  const first = pts[0].v, last = pts[pts.length - 1].v;
  const change = +(last - first).toFixed(1);
  const lastX = X(pts[pts.length - 1].t), lastY = Y(lineVals[lineVals.length - 1]);

  return (
    <div>
      <svg viewBox={`0 0 ${PW} ${PH}`} style={{ width: "100%", height: h, display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.32} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((f) => (
          <line key={f} x1={padL} x2={PW - padR} y1={padT + f * ih} y2={padT + f * ih} stroke={T.divider} strokeWidth={1} strokeDasharray={f === 1 ? undefined : "3,4"} />
        ))}
        <text x={0} y={padT + 4} fill={T.n600} fontSize={9.5} fontFamily="inherit">{vMax.toFixed(1)}</text>
        <text x={0} y={padT + ih + 3} fill={T.n600} fontSize={9.5} fontFamily="inherit">{vMin.toFixed(1)}</text>
        {labels.map((L) => (
          <text key={L.t} x={X(L.t)} y={PH - 5} fill={T.n600} fontSize={9} textAnchor={anchorFor(X(L.t))} fontFamily="inherit" letterSpacing="0.05em">{L.text}</text>
        ))}

        {tgtLine && <polyline points={tgtLine} fill="none" stroke={T.n500} strokeWidth={1.5} strokeDasharray="4,4" />}
        {pts.length > 1 && <polygon points={area} fill={`url(#${gid})`} />}
        {smooth && pts.map((p, i) => (
          <circle key={`r${i}`} cx={X(p.t)} cy={Y(p.v)} r={2.4} fill={T.surface} stroke={color} strokeOpacity={0.7} strokeWidth={1.2} />
        ))}
        {pts.length > 1 && <polyline points={line} fill="none" stroke={color} strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round" />}
        {!smooth && pts.slice(0, -1).map((p, i) => (
          <circle key={i} cx={X(p.t)} cy={Y(p.v)} r={2} fill={T.surface} stroke={color} strokeWidth={1.4} />
        ))}
        <circle cx={lastX} cy={lastY} r={7} fill={color} opacity={0.2} />
        <circle cx={lastX} cy={lastY} r={3.8} fill={color} stroke={T.surface} strokeWidth={1.5} />
        {target?.value != null && tgtT && (
          <circle cx={X(tgtT)} cy={Y(+target.value)} r={4} fill={T.surface} stroke={T.n500} strokeWidth={1.6} />
        )}
      </svg>

      {footer && pts.length > 1 && (
        <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12, color: T.n600, flexWrap: "wrap" }}>
          <span>Start <strong style={{ color: T.text }}>{first}{unit}</strong></span>
          <span>Now <strong style={{ color: T.text }}>{last}{unit}</strong></span>
          <span>Change <Delta T={T} value={change} unit={unit} goodDirection={goodDirection} size={12} /></span>
          {smooth && <span style={{ color: T.n500 }}>Line = trend · dots = weigh-ins</span>}
        </div>
      )}
    </div>
  );
}

// ─── PACE BAR ────────────────────────────────────────────────────────────────
export function PaceBar({ label, curr, start, target, startDate, targetDate, goodDirection, unit, T, color }) {
  const p = computePace({ curr, start, target, startDate, targetDate, goodDirection });
  if (!p) return null;
  const palette = { ok: T.ok, warn: T.warn, bad: T.bad, neutral: T.n500 };
  const c = palette[p.color];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 700, color: T.text }}>
          <span style={{ width: 8, height: 8, borderRadius: 3, background: color || c }} />{label}
        </span>
        <span style={{ fontSize: 12, color: T.n600, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
          <strong style={{ color: T.text, fontSize: 14 }}>{curr}{unit}</strong> → {target}{unit}
        </span>
      </div>
      <div style={{ position: "relative", height: 10, borderRadius: 6, background: T.surface3 }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${p.progress.toFixed(1)}%`, background: c, borderRadius: 6, transition: "width 0.6s ease", boxShadow: `0 0 10px ${c}55` }} />
        {p.elapsed != null && !p.reached && (
          <div title="Where you should be by now" style={{ position: "absolute", left: `${p.elapsed.toFixed(1)}%`, top: -3, bottom: -3, width: 2, borderRadius: 1, background: T.text, opacity: 0.7 }} />
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: c }}>{p.status}</span>
        {p.elapsed != null && !p.reached && <span style={{ fontSize: 10.5, color: T.n600 }}>| marks where you should be</span>}
      </div>
      <div style={{ fontSize: 12, color: T.n700, lineHeight: 1.5 }}>{p.note}</div>
    </div>
  );
}
