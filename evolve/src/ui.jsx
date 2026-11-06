// EVOLVE — shared UI pieces.
import React, { useEffect, useRef } from "react";
import { exerciseImages } from "./lib/exercises.js";

const P = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" /></>,
  train: <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11" />,
  plus: <path d="M12 5v14M5 12h14" />,
  body: <><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><circle cx="12" cy="9.5" r="2.5" /><path d="M7.5 17.5a4.5 4.5 0 0 1 9 0" /></>,
  goal: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.3" fill="currentColor" /></>,
  check: <path d="m5 12 5 5 9-10" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  back: <path d="m15 5-7 7 7 7" />,
  next: <path d="m9 5 7 7-7 7" />,
  swap: <><path d="M7 7h12l-3-3" /><path d="M17 17H5l3 3" /></>,
  flame: <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-3.8 2.5-5 .3 1.6 1 2.5 2 3 0-3-1-5.5.5-8z" />,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  face: <><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" /><path d="M9 10v1M15 10v1M12 10v3h-1M9.5 15.5a3.5 3.5 0 0 0 5 0" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
  trash: <><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /></>,
  scale: <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M8.5 10a5 5 0 0 1 7 0l-2 2.5h-3z" /></>,
  ruler: <><path d="M3 17 17 3l4 4L7 21z" /><path d="M7 13l2 2M10 10l2 2M13 7l2 2" /></>,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></>,
  edit: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13 7 4 4" /></>,
  watch: <><rect x="6" y="6" width="12" height="12" rx="3" /><path d="M9 6l1-3h4l1 3M9 18l1 3h4l1-3M12 10v2.5l1.5 1" /></>,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></>,
  play: <path d="M8 5v14l11-7z" />,
  logo: <><path d="M4 16l5-5 3 3 7-7" /><path d="M14 7h5v5" /></>,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
};

export function Icon({ name, size = 20, stroke = 1.9, color = "currentColor", flip = false, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ flex: "none", ...(flip ? { transform: "scaleX(-1)" } : null), ...style }}>
      {P[name]}
    </svg>
  );
}

// The app mark: three rising chevrons, faint to bright, on a dark tile.
export const Logo = ({ big }) => (
  <span className={`logo${big ? " big" : ""}`}>
    <svg width={big ? 38 : 20} height={big ? 38 : 20} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6" aria-hidden="true">
      <path d="M6 19 L12 13.5 L18 19" stroke="#2FE57D" strokeOpacity="0.35" />
      <path d="M6 14.5 L12 9 L18 14.5" stroke="#2FE57D" strokeOpacity="0.65" />
      <path d="M6 10 L12 4.5 L18 10" stroke="#7DF5B0" />
    </svg>
  </span>
);

// Outer ring = progress to target (status colour). Inner ring = time used.
export function Ring({ value, unit, progress, time, color }) {
  const p = Math.max(0, Math.min(100, progress ?? 0));
  const t = Math.max(0, Math.min(100, time ?? 0));
  return (
    <div className="ring" style={{ background: `conic-gradient(${color} 0 ${p}%, var(--surface3) ${p}% 100%)` }}>
      <div><div style={{ background: `conic-gradient(var(--sub) 0 ${t}%, var(--surface3) ${t}% 100%)` }}><div>
        <span className="num v">{value}</span>
        <span className="u">{unit}</span>
      </div></div></div>
    </div>
  );
}

// Small trend chart: the line, a dashed target line, and a dashed projection to the target.
export function Spark({ points, target, color = "var(--accent)", height = 74, label, targetDate }) {
  const W = 300, H = height;
  const vals = points.map((p) => p.v);
  if (!vals.length) return null;
  const all = target != null ? [...vals, target] : vals;
  let min = Math.min(...all), max = Math.max(...all);
  const pad = (max - min) * 0.15 || 1;
  min -= pad; max += pad;
  const y = (v) => (H - 6) - ((v - min) / (max - min)) * (H - 12);
  const span = target != null ? W * 0.72 : W;
  const ts = points.map((p) => p.t);
  const t0 = Math.min(...ts), t1 = Math.max(...ts);
  const x = (t) => (t1 === t0 ? span : ((t - t0) / (t1 - t0)) * span);
  const line = points.map((p) => `${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const lx = x(last.t), ly = y(last.v);
  return (
    <svg className="chart ltr" viewBox={`0 0 ${W} ${H}`} height={H} role="img" aria-label={label} preserveAspectRatio="none">
      {target != null && <line x1="0" y1={y(target)} x2={W} y2={y(target)} stroke="var(--grid)" strokeWidth="1" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />}
      {target != null && <polyline points={`${lx},${ly} ${W - 4},${y(target)}`} fill="none" stroke="var(--faint)" strokeWidth="1.6" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />}
      {points.length > 1 && <polyline points={line} fill="none" stroke={color} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
      <circle cx={lx} cy={ly} r="4" fill={color} />
      {target != null && <circle cx={W - 4} cy={y(target)} r="4" fill="var(--surface)" stroke="var(--muted)" strokeWidth="1.6" />}
    </svg>
  );
}

export function Sheet({ title, onClose, onBack, children, closeLabel = "Close", backLabel = "Back", rtl }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="sheet-wrap">
      <button className="scrim" aria-label={closeLabel} onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="grabber"><span /></div>
        <div className="row">
          {onBack && <button className="icon-btn" aria-label={backLabel} onClick={onBack}><Icon name="back" flip={rtl} /></button>}
          <span className="sheet-title">{title}</span>
          <button className="icon-btn" aria-label={closeLabel} onClick={onClose}><Icon name="close" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Seg({ options, value, onChange, label }) {
  return (
    <div className="seg" role="tablist" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={String(v)} type="button" role="tab" aria-selected={value === v} onClick={() => onChange(v)}>{text}</button>
      ))}
    </div>
  );
}

export function Chips({ options, value, onChange, multi, small }) {
  const on = (v) => (multi ? (value || []).includes(v) : value === v);
  return (
    <div className="chips">
      {options.map(([v, text]) => (
        <button key={String(v)} type="button" className={`chip${small ? " sm" : ""}`} aria-pressed={on(v)} onClick={() => onChange(v)}>{text}</button>
      ))}
    </div>
  );
}

export function Field({ label, hint, hintFrom, children, span }) {
  return (
    <label className="field" style={span ? { gridColumn: "1 / -1" } : null}>
      {label}
      {children}
      {hint && <span className={`hint${hintFrom ? " from" : ""}`}>{hint}</span>}
    </label>
  );
}

export function Note({ kind = "", icon = "check", children }) {
  const color = kind === "warn" ? "var(--warn)" : kind === "bad" ? "var(--bad)" : kind === "plain" ? "var(--muted)" : "var(--accent)";
  return <div className={`note ${kind}`}><Icon name={icon} size={16} stroke={2.2} color={color} /><span>{children}</span></div>;
}

export function Empty({ icon, title, text, action }) {
  return (
    <div className="empty">
      <span className="ic"><Icon name={icon} size={24} /></span>
      <div className="strong">{title}</div>
      {text && <div className="small muted">{text}</div>}
      {action}
    </div>
  );
}

// Exercise photo with a graceful fallback when offline or missing.
export function Photo({ ex, small }) {
  const srcs = exerciseImages(ex);
  const [i, setI] = React.useState(0);
  React.useEffect(() => setI(0), [ex?.id]);
  return (
    <div className={`ex-photo${small ? " sm" : ""}`}>
      {i < srcs.length
        ? <img src={srcs[i]} alt="" loading="lazy" onError={() => setI((n) => n + 1)} />
        : <Icon name="train" size={small ? 22 : 26} />}
    </div>
  );
}

export function Bar({ pct, color }) {
  return <div className="bar"><div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} /></div>;
}
