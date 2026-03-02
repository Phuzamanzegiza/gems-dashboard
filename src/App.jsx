import { useState, useMemo, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, ScatterChart, Scatter,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, ComposedChart
} from "recharts";
import {
  Activity, Heart, Baby, Stethoscope, ClipboardCheck, MapPin, Users,
  BarChart3, TrendingUp, AlertTriangle, CheckCircle2, XCircle, Shield,
  Calendar, ChevronRight, ArrowUpRight,
  ArrowDownRight, Minus, Scissors, Thermometer, Syringe,
  GraduationCap, Database
} from "lucide-react";

// ============================================================================
// SEED-BASED RANDOM NUMBER GENERATOR (Mulberry32)
// ============================================================================
function mulberry32(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function normalRand(rng, mean, std) {
  const u1 = rng(), u2 = rng();
  return mean + std * Math.sqrt(-2 * Math.log(u1 || 0.0001)) * Math.cos(2 * Math.PI * u2);
}
function clip(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function round1(v) { return Math.round(v * 10) / 10; }

// ============================================================================
// SYNTHETIC DATA GENERATOR
// ============================================================================
function generateData(n = 4800, seed = 42) {
  const rng = mulberry32(seed);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const provinces = ["Gauteng", "KwaZulu-Natal", "Western Cape", "Eastern Cape", "Limpopo", "Mpumalanga", "Free State", "North West", "Northern Cape"];
  const provWeights = [0.28, 0.16, 0.12, 0.10, 0.09, 0.08, 0.07, 0.06, 0.04];
  const provRisk = { "Gauteng": 0, "Western Cape": -0.02, "KwaZulu-Natal": 0.03, "Eastern Cape": 0.05, "Limpopo": 0.06, "Mpumalanga": 0.04, "Free State": 0.01, "North West": 0.04, "Northern Cape": 0.03 };
  const teenBoost = { "Gauteng": 0, "Western Cape": 0, "KwaZulu-Natal": 0.02, "Eastern Cape": 0.04, "Limpopo": 0.05, "Mpumalanga": 0.03, "Free State": 0.01, "North West": 0.03, "Northern Cape": 0.02 };

  function weightedChoice(items, weights) {
    let r = rng(), cumul = 0;
    for (let i = 0; i < items.length; i++) { cumul += weights[i]; if (r < cumul) return items[i]; }
    return items[items.length - 1];
  }

  const deliveries = [];
  for (let i = 0; i < n; i++) {
    const month = months[Math.floor(rng() * 12)];
    const province = weightedChoice(provinces, provWeights);
    let ga = clip(round1(normalRand(rng, 38.5, 2.5)), 24, 43);
    let bw = clip(Math.round(ga * 85 + normalRand(rng, 0, 250)), 500, 5500);
    const csProb = ga < 37 ? 0.35 : 0.28;
    const isCs = rng() < csProb;
    const mode = isCs ? "Caesarean Section" : (rng() < 0.08 ? "Assisted Vaginal" : "Normal Vaginal");
    const parity = weightedChoice([0, 1, 2, 3, 4], [0.30, 0.35, 0.20, 0.10, 0.05]);
    let maternalAge = clip(Math.round(normalRand(rng, 29, 5)), 16, 48);
    if (rng() < (0.08 + (teenBoost[province] || 0))) maternalAge = Math.floor(rng() * 6) + 14;
    const apgar5 = clip(Math.round(normalRand(rng, 8.5, 1.2)), 1, 10);
    const nicu = rng() < (ga < 32 ? 0.85 : ga < 37 ? 0.15 : 0.03);
    let stillbirth = rng() < (ga < 32 ? 0.04 : 0.008);
    if (!stillbirth && rng() < clip(provRisk[province] || 0, 0, 0.02)) stillbirth = true;
    const ennd = !stillbirth && rng() < (ga < 32 ? 0.03 : 0.002);
    const preterm = ga < 37;
    const lbw = bw < 2500;
    const isTeenage = maternalAge < 20;
    let ageGroup = "40+";
    if (maternalAge <= 15) ageGroup = "≤15";
    else if (maternalAge <= 17) ageGroup = "16-17";
    else if (maternalAge <= 19) ageGroup = "18-19";
    else if (maternalAge <= 24) ageGroup = "20-24";
    else if (maternalAge <= 29) ageGroup = "25-29";
    else if (maternalAge <= 34) ageGroup = "30-34";
    else if (maternalAge <= 39) ageGroup = "35-39";

    deliveries.push({ month, province, ga, bw, isCs, mode, parity, maternalAge, ageGroup, isTeenage, apgar5, nicu, stillbirth, ennd, perinatalDeath: stillbirth || ennd, preterm, lbw });
  }

  // Monthly aggregation
  const monthly = months.map(m => {
    const subset = deliveries.filter(d => d.month === m);
    const total = subset.length;
    const live = subset.filter(d => !d.stillbirth).length;
    const sb = subset.filter(d => d.stillbirth).length;
    const enndC = subset.filter(d => d.ennd).length;
    const pd = subset.filter(d => d.perinatalDeath).length;
    const cs = subset.filter(d => d.isCs).length;
    const pt = subset.filter(d => d.preterm).length;
    const lbwC = subset.filter(d => d.lbw).length;
    const nicuC = subset.filter(d => d.nicu).length;
    const lowApgar = subset.filter(d => d.apgar5 < 7).length;
    return {
      month: m, total, liveBirths: live, stillbirths: sb, ennd: enndC,
      perinatalDeaths: pd, csCount: cs, pretermCount: pt, lbwCount: lbwC,
      nicuCount: nicuC, lowApgarCount: lowApgar,
      csRate: round1(cs / total * 100),
      pretermRate: round1(pt / total * 100),
      lbwRate: round1(lbwC / total * 100),
      sbRate: round1(sb / total * 1000),
      pnmr: round1(pd / total * 1000),
      enndRate: round1(enndC / (live || 1) * 1000),
      meanBw: Math.round(subset.reduce((s, d) => s + d.bw, 0) / total),
      meanGa: round1(subset.reduce((s, d) => s + d.ga, 0) / total),
    };
  });

  // Province aggregation
  const provincial = provinces.map(p => {
    const subset = deliveries.filter(d => d.province === p);
    const total = subset.length;
    const live = subset.filter(d => !d.stillbirth).length;
    const sb = subset.filter(d => d.stillbirth).length;
    const enndC = subset.filter(d => d.ennd).length;
    const pd = subset.filter(d => d.perinatalDeath).length;
    const cs = subset.filter(d => d.isCs).length;
    const pt = subset.filter(d => d.preterm).length;
    const lbwC = subset.filter(d => d.lbw).length;
    const nicuC = subset.filter(d => d.nicu).length;
    const lowAp = subset.filter(d => d.apgar5 < 7).length;
    const teen = subset.filter(d => d.isTeenage).length;
    return {
      province: p, total, liveBirths: live, stillbirths: sb, ennd: enndC,
      perinatalDeaths: pd, csRate: round1(cs / total * 100),
      pretermRate: round1(pt / total * 100), lbwRate: round1(lbwC / total * 100),
      nicuRate: round1(nicuC / total * 100), lowApgarRate: round1(lowAp / total * 100),
      teenRate: round1(teen / total * 100),
      sbRate: round1(sb / total * 1000), pnmr: round1(pd / total * 1000),
      enndRate: round1(enndC / (live || 1) * 1000),
      meanAge: round1(subset.reduce((s, d) => s + d.maternalAge, 0) / total),
      meanBw: Math.round(subset.reduce((s, d) => s + d.bw, 0) / total),
    };
  });

  // Risk index
  const normalise = (arr, key) => {
    const vals = arr.map(a => a[key]);
    const mn = Math.min(...vals), mx = Math.max(...vals);
    return arr.map(a => mx === mn ? 50 : round1((a[key] - mn) / (mx - mn) * 100));
  };
  const mortScores = normalise(provincial, "pnmr");
  const ptScores = normalise(provincial, "pretermRate");
  const csScores = normalise(provincial, "csRate");
  const lbwScores = normalise(provincial, "lbwRate");
  const nicuScores = normalise(provincial, "nicuRate");
  const teenScores = normalise(provincial, "teenRate");
  provincial.forEach((p, i) => {
    p.mortScore = mortScores[i]; p.ptScore = ptScores[i]; p.csScore = csScores[i];
    p.lbwScore = lbwScores[i]; p.nicuScore = nicuScores[i]; p.teenScore = teenScores[i];
    p.riskIndex = round1(mortScores[i] * 0.25 + ptScores[i] * 0.20 + csScores[i] * 0.15 + lbwScores[i] * 0.15 + nicuScores[i] * 0.10 + teenScores[i] * 0.15);
  });

  // Robson data
  const robson = [
    { group: 1, desc: "Nullip, cephalic, ≥37w, spontaneous", deliveries: 960, cs: 82, target: 10 },
    { group: 2, desc: "Nullip, cephalic, ≥37w, induced/pre-CS", deliveries: 576, cs: 161, target: 25 },
    { group: 3, desc: "Multip (no prev CS), cephalic, ≥37w, spont", deliveries: 816, cs: 20, target: 3 },
    { group: 4, desc: "Multip (no prev CS), cephalic, ≥37w, ind/CS", deliveries: 384, cs: 65, target: 15 },
    { group: 5, desc: "Previous CS, cephalic, ≥37w", deliveries: 624, cs: 518, target: null },
    { group: 6, desc: "All nullip breeches", deliveries: 144, cs: 130, target: 90 },
    { group: 7, desc: "All multip breeches", deliveries: 96, cs: 77, target: 80 },
    { group: 8, desc: "All multiple pregnancies", deliveries: 144, cs: 86, target: 60 },
    { group: 9, desc: "All abnormal lies", deliveries: 48, cs: 46, target: 95 },
    { group: 10, desc: "Single cephalic, <37w", deliveries: 408, cs: 114, target: 30 },
  ];
  const totalDel = robson.reduce((s, r) => s + r.deliveries, 0);
  const totalCs = robson.reduce((s, r) => s + r.cs, 0);
  robson.forEach(r => {
    r.csRate = round1(r.cs / r.deliveries * 100);
    r.pctDeliveries = round1(r.deliveries / totalDel * 100);
    r.pctCs = round1(r.cs / totalCs * 100);
  });

  // ANC metrics
  const ancRng = mulberry32(77);
  const anc = months.map(m => ({
    month: m,
    earlyBooking: round1(clip(normalRand(ancRng, 62, 4), 45, 85)),
    anc8: round1(clip(normalRand(ancRng, 72, 5), 50, 92)),
    datingUs: round1(clip(normalRand(ancRng, 84, 3), 70, 97)),
    hivTest: round1(clip(normalRand(ancRng, 93, 2), 85, 99)),
    syphilis: round1(clip(normalRand(ancRng, 88, 3), 75, 98)),
    gdm: round1(clip(normalRand(ancRng, 78, 4), 60, 95)),
    corticosteroid: round1(clip(normalRand(ancRng, 74, 5), 55, 92)),
  }));

  // SMM events
  const smm = [
    { indicator: "PPH (intervention)", count: Math.round(n * 0.035), rate: 35.0 },
    { indicator: "ICU Admission", count: Math.round(n * 0.012), rate: 12.0 },
    { indicator: "Blood Transfusion ≥4U", count: Math.round(n * 0.008), rate: 8.0 },
    { indicator: "Eclampsia", count: Math.round(n * 0.004), rate: 4.0 },
    { indicator: "Sepsis", count: Math.round(n * 0.003), rate: 3.0 },
    { indicator: "Mech. Ventilation", count: Math.round(n * 0.002), rate: 2.0 },
    { indicator: "Hysterectomy", count: Math.round(n * 0.001), rate: 1.0 },
    { indicator: "Uterine Rupture", count: Math.round(n * 0.0008), rate: 0.8 },
    { indicator: "Dialysis", count: Math.round(n * 0.0004), rate: 0.4 },
    { indicator: "Cardiac Arrest", count: Math.round(n * 0.0002), rate: 0.2 },
  ];

  // Completeness
  const completeness = [
    { variable: "Gestational Age", pct: 96.2, target: 95.0 },
    { variable: "Birth Weight", pct: 98.7, target: 98.0 },
    { variable: "Mode of Delivery", pct: 99.4, target: 99.0 },
    { variable: "Robson Variables", pct: 93.1, target: 95.0 },
    { variable: "Pregnancy Outcome", pct: 99.9, target: 100.0 },
  ];

  // Summary stats
  const totalDelvs = deliveries.length;
  const liveBirths = deliveries.filter(d => !d.stillbirth).length;
  const summary = {
    totalDeliveries: totalDelvs, liveBirths,
    stillbirths: deliveries.filter(d => d.stillbirth).length,
    ennd: deliveries.filter(d => d.ennd).length,
    perinatalDeaths: deliveries.filter(d => d.perinatalDeath).length,
    csRate: round1(deliveries.filter(d => d.isCs).length / totalDelvs * 100),
    pretermRate: round1(deliveries.filter(d => d.preterm).length / totalDelvs * 100),
    lbwRate: round1(deliveries.filter(d => d.lbw).length / totalDelvs * 100),
    vlbwRate: round1(deliveries.filter(d => d.bw < 1500).length / totalDelvs * 100),
    nicuRate: round1(deliveries.filter(d => d.nicu).length / totalDelvs * 100),
    lowApgarRate: round1(deliveries.filter(d => d.apgar5 < 7).length / totalDelvs * 100),
    sbRate: round1(deliveries.filter(d => d.stillbirth).length / totalDelvs * 1000),
    pnmr: round1(deliveries.filter(d => d.perinatalDeath).length / totalDelvs * 1000),
    enndRate: round1(deliveries.filter(d => d.ennd).length / (liveBirths || 1) * 1000),
    meanGa: round1(deliveries.reduce((s, d) => s + d.ga, 0) / totalDelvs),
    meanBw: Math.round(deliveries.reduce((s, d) => s + d.bw, 0) / totalDelvs),
    meanAge: round1(deliveries.reduce((s, d) => s + d.maternalAge, 0) / totalDelvs),
  };

  return { deliveries, monthly, provincial, robson, anc, smm, completeness, summary };
}

// ============================================================================
// BENCHMARKS
// ============================================================================
const BM = {
  CS_HIGH: 15, CS_LOW: 10, SB_TARGET: 12, ENND_TARGET: 12, PMR_TARGET: 20,
  LBW_TARGET: 10, VLBW_TARGET: 1.5, APGAR_TARGET: 3, ICU_TARGET: 2,
  PPH_TARGET: 5, ECLAMPSIA_TARGET: 0.5, SMM_TARGET: 10,
  READMISSION_TARGET: 3, VERY_PRETERM: 2,
  EARLY_BOOKING: 70, ANC8: 80, DATING_US: 90, HIV: 95, SYPHILIS: 95, GDM: 85, CORTICO: 80,
};

// ============================================================================
// COLOUR PALETTE
// ============================================================================
const C = {
  primary: "#0F3460", secondary: "#1A6FB5", accent: "#D63031",
  success: "#00B894", warning: "#FDCB6E", neutral: "#636E72",
  bg: "#F7F9FC", card: "#FFFFFF", text: "#1E272E",
  textMuted: "#636E72", border: "#E1E8EF",
  chartBlue: "#1A6FB5", chartRed: "#D63031", chartGreen: "#00B894",
  chartOrange: "#E17055", chartPurple: "#6C5CE7", chartTeal: "#00CEC9",
  chartPink: "#FD79A8", chartYellow: "#FFEAA7",
  gradientStart: "#0F3460", gradientEnd: "#1A6FB5",
};
const CHART_COLORS = [C.chartBlue, C.chartRed, C.chartGreen, C.chartOrange, C.chartPurple, C.chartTeal, C.chartPink];

// ============================================================================
// KPI STATUS
// ============================================================================
function kpiStatus(value, target, lowerBetter = true) {
  if (target == null) return "neutral";
  if (lowerBetter) return value <= target ? "good" : value <= target * 1.2 ? "warn" : "bad";
  return value >= target ? "good" : value >= target * 0.8 ? "warn" : "bad";
}

function StatusIcon({ status }) {
  if (status === "good") return <CheckCircle2 size={16} className="inline" style={{ color: C.success }} />;
  if (status === "warn") return <AlertTriangle size={16} className="inline" style={{ color: "#F39C12" }} />;
  if (status === "bad") return <XCircle size={16} className="inline" style={{ color: C.accent }} />;
  return <Minus size={16} className="inline" style={{ color: C.neutral }} />;
}

// ============================================================================
// CUSTOM TOOLTIP
// ============================================================================
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(15,52,96,0.95)", padding: "10px 14px", borderRadius: 8, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.25)" }}>
      <p style={{ color: "#FFF", fontWeight: 600, margin: 0, fontSize: 12, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || "#FFF", margin: 0, fontSize: 11 }}>
          {p.name}: <b>{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</b>
        </p>
      ))}
    </div>
  );
}

// ============================================================================
// REUSABLE UI COMPONENTS
// ============================================================================
function KPICard({ icon: Icon, label, value, unit, target, lowerBetter = true, delta, subtitle }) {
  const status = target != null ? kpiStatus(parseFloat(value), target, lowerBetter) : "neutral";
  const borderColor = status === "good" ? C.success : status === "warn" ? "#F39C12" : status === "bad" ? C.accent : C.border;
  return (
    <div style={{
      background: C.card, borderRadius: 10, padding: "16px 18px", borderLeft: `4px solid ${borderColor}`,
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)", minWidth: 0, flex: 1,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        {Icon && <Icon size={15} style={{ color: C.secondary, flexShrink: 0 }} />}
        <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 500, lineHeight: 1.2 }}>{label}</span>
        {target != null && <StatusIcon status={status} />}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, lineHeight: 1 }}>
        {value}{unit && <span style={{ fontSize: 13, fontWeight: 500, color: C.textMuted }}> {unit}</span>}
      </div>
      {delta != null && (
        <div style={{ fontSize: 11, marginTop: 4, color: delta > 0 ? (lowerBetter ? C.accent : C.success) : (lowerBetter ? C.success : C.accent), fontWeight: 600, display: "flex", alignItems: "center", gap: 2 }}>
          {delta > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(delta)}pp vs target
        </div>
      )}
      {subtitle && <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>{subtitle}</div>}
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }) {
  return (
    <div style={{ marginBottom: 16, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {Icon && <Icon size={20} style={{ color: C.secondary }} />}
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>{title}</h3>
      </div>
      {subtitle && <p style={{ margin: "4px 0 0 28px", fontSize: 12, color: C.textMuted }}>{subtitle}</p>}
    </div>
  );
}

function ChartCard({ title, children, height = 300 }) {
  return (
    <div style={{
      background: C.card, borderRadius: 10, padding: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      border: `1px solid ${C.border}`,
    }}>
      {title && <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: C.text }}>{title}</p>}
      <div style={{ width: "100%", height }}>{children}</div>
    </div>
  );
}

function InsightBox({ type = "warning", children }) {
  const bg = type === "warning" ? "#FFF3E0" : type === "error" ? "#FFEBEE" : type === "success" ? "#E8F5E9" : "#E3F2FD";
  const border = type === "warning" ? "#E65100" : type === "error" ? C.accent : type === "success" ? C.success : C.secondary;
  const icon = type === "warning" ? AlertTriangle : type === "error" ? XCircle : type === "success" ? CheckCircle2 : Activity;
  const Ic = icon;
  return (
    <div style={{ background: bg, borderLeft: `4px solid ${border}`, borderRadius: 6, padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12, lineHeight: 1.5, color: C.text }}>
      <Ic size={16} style={{ color: border, flexShrink: 0, marginTop: 2 }} />
      <div>{children}</div>
    </div>
  );
}

function DataTable({ data, columns }) {
  return (
    <div style={{ overflowX: "auto", borderRadius: 8, border: `1px solid ${C.border}` }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: C.primary }}>
            {columns.map((col, i) => (
              <th key={i} style={{ padding: "8px 12px", color: "#FFF", fontWeight: 600, textAlign: col.align || "left", whiteSpace: "nowrap" }}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? "#FFF" : "#F8FAFC", borderBottom: `1px solid ${C.border}` }}>
              {columns.map((col, ci) => (
                <td key={ci} style={{ padding: "7px 12px", textAlign: col.align || "left", whiteSpace: "nowrap" }}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const Grid = ({ cols = 2, gap = 16, children }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap }}>{children}</div>
);

const Flex = ({ gap = 10, wrap = true, children, style }) => (
  <div style={{ display: "flex", flexWrap: wrap ? "wrap" : "nowrap", gap, ...style }}>{children}</div>
);

// ============================================================================
// TAB COMPONENTS
// ============================================================================

// ---------- OVERVIEW ----------
function OverviewTab({ data }) {
  const { summary: s, monthly: m } = data;
  return (
    <div>
      <div style={{
        background: `linear-gradient(135deg, ${C.gradientStart}, ${C.gradientEnd})`,
        borderRadius: 12, padding: "20px 24px", marginBottom: 20, color: "#FFF",
      }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Executive Overview</h2>
        <p style={{ margin: "4px 0 0", opacity: 0.8, fontSize: 13 }}>Government Employees Medical Scheme · January – December 2025</p>
      </div>

      <Flex gap={12}>
        <KPICard icon={Users} label="Total Deliveries" value={s.totalDeliveries.toLocaleString()} />
        <KPICard icon={Heart} label="Live Births" value={s.liveBirths.toLocaleString()} />
        <KPICard icon={Scissors} label="CS Rate" value={s.csRate} unit="%" target={BM.CS_HIGH} />
        <KPICard icon={Thermometer} label="Preterm Rate" value={s.pretermRate} unit="%" />
        <KPICard icon={Baby} label="LBW Rate" value={s.lbwRate} unit="%" target={BM.LBW_TARGET} />
      </Flex>

      <div style={{ height: 16 }} />
      <Flex gap={12}>
        <KPICard icon={Activity} label="Stillbirth Rate" value={s.sbRate} unit="/1 000" target={BM.SB_TARGET} subtitle="per 1 000 total births" />
        <KPICard icon={Heart} label="ENND Rate" value={s.enndRate} unit="/1 000 LB" target={BM.ENND_TARGET} subtitle="per 1 000 live births" />
        <KPICard icon={Shield} label="PNMR" value={s.pnmr} unit="/1 000 TB" target={BM.PMR_TARGET} subtitle="perinatal mortality" />
        <KPICard icon={Stethoscope} label="NICU Admission" value={s.nicuRate} unit="%" />
      </Flex>

      <div style={{ height: 20 }} />
      <Grid cols={2} gap={16}>
        <ChartCard title="Monthly Caesarean Section Rate (%)" height={280}>
          <ResponsiveContainer>
            <ComposedChart data={m} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="csGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.chartBlue} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={C.chartBlue} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[20, 40]} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="csRate" fill="url(#csGrad)" stroke="none" />
              <Line type="monotone" dataKey="csRate" stroke={C.chartBlue} strokeWidth={2.5} dot={{ r: 4, fill: C.chartBlue, stroke: "#FFF", strokeWidth: 2 }} name="CS Rate" />
              <ReferenceLine y={BM.CS_HIGH} stroke={C.accent} strokeDasharray="6 4" label={{ value: `WHO ceiling (${BM.CS_HIGH}%)`, fill: C.accent, fontSize: 10, position: "insideTopRight" }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Monthly Perinatal Mortality Rate (per 1 000 TB)" height={280}>
          <ResponsiveContainer>
            <ComposedChart data={m} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="pnmrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.chartRed} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={C.chartRed} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="pnmr" fill="url(#pnmrGrad)" stroke="none" />
              <Line type="monotone" dataKey="pnmr" stroke={C.chartRed} strokeWidth={2.5} dot={{ r: 4, fill: C.chartRed, stroke: "#FFF", strokeWidth: 2 }} name="PNMR" />
              <ReferenceLine y={BM.PMR_TARGET} stroke={C.success} strokeDasharray="6 4" label={{ value: `PPIP target (${BM.PMR_TARGET})`, fill: C.success, fontSize: 10, position: "insideTopRight" }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </Grid>

      <div style={{ height: 16 }} />
      <ChartCard title="Monthly Delivery Volume" height={240}>
        <ResponsiveContainer>
          <BarChart data={m} margin={{ top: 15, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEE" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="total" fill={C.chartBlue} radius={[4, 4, 0, 0]} name="Deliveries" barSize={36}>
              {m.map((_, i) => <Cell key={i} fill={i % 2 === 0 ? C.chartBlue : C.secondary} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

// ---------- DESCRIPTIVE STATISTICS ----------
function DescriptiveStatsTab({ data }) {
  const { deliveries, monthly } = data;
  const gaBins = useMemo(() => {
    const bins = {};
    deliveries.forEach(d => {
      const b = Math.floor(d.ga);
      bins[b] = (bins[b] || 0) + 1;
    });
    return Object.entries(bins).sort((a, b) => a[0] - b[0]).map(([ga, count]) => ({ ga: +ga, count }));
  }, [deliveries]);

  const bwBins = useMemo(() => {
    const bins = {};
    deliveries.forEach(d => {
      const b = Math.floor(d.bw / 100) * 100;
      bins[b] = (bins[b] || 0) + 1;
    });
    return Object.entries(bins).sort((a, b) => a[0] - b[0]).map(([bw, count]) => ({ bw: +bw, count }));
  }, [deliveries]);

  const ageBins = useMemo(() => {
    const bins = {};
    deliveries.forEach(d => { bins[d.maternalAge] = (bins[d.maternalAge] || 0) + 1; });
    return Object.entries(bins).sort((a, b) => a[0] - b[0]).map(([age, count]) => ({ age: +age, count }));
  }, [deliveries]);

  const pretermCats = useMemo(() => {
    const cats = { "Extremely Preterm": 0, "Very Preterm": 0, "Moderate Preterm": 0, "Late Preterm": 0, "Term": 0, "Post-term": 0 };
    deliveries.forEach(d => {
      if (d.ga < 28) cats["Extremely Preterm"]++;
      else if (d.ga < 32) cats["Very Preterm"]++;
      else if (d.ga < 34) cats["Moderate Preterm"]++;
      else if (d.ga < 37) cats["Late Preterm"]++;
      else if (d.ga <= 42) cats["Term"]++;
      else cats["Post-term"]++;
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [deliveries]);

  const ptColors = [C.accent, C.chartOrange, "#FDCB6E", "#FFEAA7", C.chartGreen, C.chartTeal];

  // Scatter data (sampled)
  const scatter = useMemo(() => {
    const step = Math.max(1, Math.floor(deliveries.length / 800));
    return deliveries.filter((_, i) => i % step === 0).map(d => ({
      ga: d.ga, bw: d.bw, preterm: d.preterm ? 1 : 0,
    }));
  }, [deliveries]);

  return (
    <div>
      <SectionTitle icon={BarChart3} title="Descriptive Statistics" subtitle="Population-level distributions for key clinical variables" />
      <Grid cols={2}>
        <ChartCard title="Gestational Age Distribution (weeks)">
          <ResponsiveContainer>
            <BarChart data={gaBins} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEE" vertical={false} />
              <XAxis dataKey="ga" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Deliveries" radius={[2, 2, 0, 0]} barSize={14}>
                {gaBins.map((entry, i) => <Cell key={i} fill={entry.ga < 37 ? C.chartOrange : C.chartBlue} />)}
              </Bar>
              <ReferenceLine x={37} stroke={C.accent} strokeDasharray="6 4" label={{ value: "Preterm", fill: C.accent, fontSize: 10 }} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Birth Weight Distribution (grams)">
          <ResponsiveContainer>
            <BarChart data={bwBins} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEE" vertical={false} />
              <XAxis dataKey="bw" tick={{ fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${v / 1000}k` : v} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Deliveries" radius={[2, 2, 0, 0]} barSize={10}>
                {bwBins.map((entry, i) => <Cell key={i} fill={entry.bw < 2500 ? C.chartOrange : C.primary} />)}
              </Bar>
              <ReferenceLine x={2500} stroke={C.accent} strokeDasharray="6 4" label={{ value: "LBW", fill: C.accent, fontSize: 10 }} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </Grid>
      <div style={{ height: 16 }} />
      <Grid cols={2}>
        <ChartCard title="Maternal Age Distribution">
          <ResponsiveContainer>
            <AreaChart data={ageBins} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="ageGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.chartPurple} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={C.chartPurple} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
              <XAxis dataKey="age" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="count" fill="url(#ageGrad)" stroke={C.chartPurple} strokeWidth={2} name="Count" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Preterm Classification (WHO Stratification)">
          <ResponsiveContainer>
            <BarChart data={pretermCats} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEE" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                {pretermCats.map((_, i) => <Cell key={i} fill={ptColors[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </Grid>
      <div style={{ height: 16 }} />
      <ChartCard title="Birth Weight vs Gestational Age (SGA/LGA Identification)" height={340}>
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
            <XAxis dataKey="ga" name="GA (weeks)" tick={{ fontSize: 10 }} label={{ value: "GA (weeks)", position: "insideBottom", offset: -2, fontSize: 11 }} />
            <YAxis dataKey="bw" name="Birth Weight (g)" tick={{ fontSize: 10 }} label={{ value: "Weight (g)", angle: -90, position: "insideLeft", fontSize: 11 }} />
            <Tooltip content={<ChartTooltip />} />
            <Scatter data={scatter.filter(d => !d.preterm)} fill={C.chartBlue} opacity={0.35} name="Term" />
            <Scatter data={scatter.filter(d => d.preterm)} fill={C.chartOrange} opacity={0.5} name="Preterm" />
            <ReferenceLine y={2500} stroke={C.accent} strokeDasharray="6 4" />
            <ReferenceLine x={37} stroke={C.accent} strokeDasharray="6 4" />
          </ScatterChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

// ---------- MATERNAL OUTCOMES ----------
function MaternalOutcomesTab({ data }) {
  const { smm, summary: s, monthly: m } = data;
  const smmTotal = smm.reduce((a, b) => a + b.count, 0);
  const smmRate = round1(smmTotal / s.totalDeliveries * 1000);
  const readmitRng = mulberry32(99);
  const readmit = m.map(mo => ({ month: mo.month, rate: round1(clip(normalRand(readmitRng, 2.5, 0.6), 1, 5)) }));
  const smmSorted = [...smm].sort((a, b) => b.count - a.count);

  return (
    <div>
      <SectionTitle icon={Heart} title="Maternal Outcome KPIs" subtitle="Benchmarked against WHO targets (Section 4.1)" />
      <Flex gap={12}>
        <KPICard icon={Stethoscope} label="ICU Admission" value={round1(smm.find(s => s.indicator === "ICU Admission").rate / 10)} unit="%" target={BM.ICU_TARGET} />
        <KPICard icon={Activity} label="PPH Rate" value={round1(smm.find(s => s.indicator.includes("PPH")).rate / 10)} unit="%" target={BM.PPH_TARGET} />
        <KPICard icon={AlertTriangle} label="Eclampsia" value={round1(smm.find(s => s.indicator === "Eclampsia").rate / 10)} unit="%" target={BM.ECLAMPSIA_TARGET} />
        <KPICard icon={Shield} label="SMM Rate" value={smmRate} unit="/1 000" target={BM.SMM_TARGET} />
      </Flex>
      <div style={{ height: 16 }} />
      <Grid cols={2}>
        <ChartCard title="Severe Maternal Morbidity Events (WHO Near-Miss)" height={360}>
          <ResponsiveContainer>
            <BarChart data={smmSorted} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEE" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="indicator" type="category" tick={{ fontSize: 10 }} width={130} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Events" radius={[0, 4, 4, 0]} barSize={18}>
                {smmSorted.map((entry, i) => <Cell key={i} fill={entry.rate > 10 ? C.accent : entry.rate > 3 ? C.chartOrange : C.chartGreen} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="SMM Proportional Distribution" height={360}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={smm} dataKey="count" nameKey="indicator" cx="50%" cy="50%" outerRadius={120} innerRadius={55} paddingAngle={2} label={({ name, percent }) => `${name.split(" ")[0]} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: C.neutral, strokeWidth: 1 }} style={{ fontSize: 10 }}>
                {smm.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </Grid>
      <div style={{ height: 16 }} />
      <ChartCard title="Maternal Readmission Rate ≤42 Days (%)" height={250}>
        <ResponsiveContainer>
          <ComposedChart data={readmit} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="readGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.chartBlue} stopOpacity={0.2} />
                <stop offset="100%" stopColor={C.chartBlue} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={[0, 6]} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="rate" fill="url(#readGrad)" stroke="none" />
            <Line type="monotone" dataKey="rate" stroke={C.chartBlue} strokeWidth={2.5} dot={{ r: 4, fill: C.chartBlue, stroke: "#FFF", strokeWidth: 2 }} name="Readmission %" />
            <ReferenceLine y={BM.READMISSION_TARGET} stroke={C.accent} strokeDasharray="6 4" label={{ value: "Target (<3%)", fill: C.accent, fontSize: 10, position: "insideTopRight" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

// ---------- PERINATAL OUTCOMES ----------
function PerinatalOutcomesTab({ data }) {
  const { summary: s, monthly: m, deliveries } = data;
  const bwCats = useMemo(() => {
    const cats = { ELBW: 0, VLBW: 0, LBW: 0, Normal: 0, Macrosomic: 0 };
    deliveries.forEach(d => {
      if (d.bw < 1000) cats.ELBW++; else if (d.bw < 1500) cats.VLBW++;
      else if (d.bw < 2500) cats.LBW++; else if (d.bw < 4000) cats.Normal++; else cats.Macrosomic++;
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [deliveries]);
  const bwColors = { ELBW: "#C0392B", VLBW: C.accent, LBW: C.chartOrange, Normal: C.chartGreen, Macrosomic: C.chartBlue };

  const apgarDist = useMemo(() => {
    const bins = {};
    deliveries.forEach(d => { bins[d.apgar5] = (bins[d.apgar5] || 0) + 1; });
    return Object.entries(bins).sort((a, b) => a[0] - b[0]).map(([score, count]) => ({ score: +score, count }));
  }, [deliveries]);

  return (
    <div>
      <SectionTitle icon={Baby} title="Perinatal Outcome KPIs" subtitle="WHO SDG Targets 3.1/3.2 and PPIP benchmarks (Section 4.2)" />
      <Flex gap={12}>
        <KPICard icon={Activity} label="Stillbirth /1 000" value={s.sbRate} target={BM.SB_TARGET} />
        <KPICard icon={Heart} label="ENND /1 000 LB" value={s.enndRate} target={BM.ENND_TARGET} />
        <KPICard icon={Shield} label="PNMR /1 000 TB" value={s.pnmr} target={BM.PMR_TARGET} />
        <KPICard icon={Thermometer} label="Very Preterm (%)" value={round1(deliveries.filter(d => d.ga < 32).length / deliveries.length * 100)} target={BM.VERY_PRETERM} />
        <KPICard icon={AlertTriangle} label="Low Apgar <7 (%)" value={s.lowApgarRate} target={BM.APGAR_TARGET} />
      </Flex>
      <div style={{ height: 16 }} />
      <Grid cols={2}>
        <ChartCard title="Monthly Mortality Rates (per 1 000)">
          <ResponsiveContainer>
            <LineChart data={m} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="sbRate" stroke={C.accent} strokeWidth={2.5} dot={{ r: 3.5 }} name="Stillbirth" />
              <Line type="monotone" dataKey="enndRate" stroke={C.warning} strokeWidth={2.5} dot={{ r: 3.5 }} name="ENND" />
              <ReferenceLine y={BM.SB_TARGET} stroke={C.neutral} strokeDasharray="6 4" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Monthly Preterm & LBW Rates (%)">
          <ResponsiveContainer>
            <LineChart data={m} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="pretermRate" stroke={C.chartBlue} strokeWidth={2.5} dot={{ r: 3.5 }} name="Preterm %" />
              <Line type="monotone" dataKey="lbwRate" stroke={C.chartPurple} strokeWidth={2.5} dot={{ r: 3.5 }} name="LBW %" />
              <ReferenceLine y={BM.LBW_TARGET} stroke={C.neutral} strokeDasharray="6 4" label={{ value: `LBW target (${BM.LBW_TARGET}%)`, fill: C.neutral, fontSize: 10 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </Grid>
      <div style={{ height: 16 }} />
      <Grid cols={2}>
        <ChartCard title="Birth Weight Stratification">
          <ResponsiveContainer>
            <BarChart data={bwCats} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEE" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                {bwCats.map((entry, i) => <Cell key={i} fill={bwColors[entry.name] || C.chartBlue} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="5-Minute Apgar Score Distribution">
          <ResponsiveContainer>
            <BarChart data={apgarDist} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEE" vertical={false} />
              <XAxis dataKey="score" tick={{ fontSize: 11 }} label={{ value: "Apgar Score", position: "insideBottom", offset: -2, fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Count" radius={[3, 3, 0, 0]}>
                {apgarDist.map((entry, i) => <Cell key={i} fill={entry.score < 7 ? C.accent : C.chartGreen} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </Grid>
    </div>
  );
}

// ---------- ROBSON AUDIT ----------
function RobsonAuditTab({ data }) {
  const { robson: r, summary: s } = data;
  const chartData = r.map(row => ({ name: `G${row.group}`, csRate: row.csRate, target: row.target }));
  const contribData = [...r].sort((a, b) => a.pctCs - b.pctCs).map(row => ({ name: `G${row.group}`, pctCs: row.pctCs }));

  return (
    <div>
      <SectionTitle icon={Scissors} title="Caesarean Section Audit – Robson Classification" subtitle="WHO 2015 mandatory classification system (Section 3.5 / 4.3)" />
      <Flex gap={12}>
        <KPICard icon={Scissors} label="Overall CS Rate" value={s.csRate} unit="%" target={BM.CS_HIGH} subtitle={`WHO range: ${BM.CS_LOW}–${BM.CS_HIGH}%`} />
        <KPICard icon={ClipboardCheck} label="Group 1 CS Rate" value={r[0].csRate} unit="%" target={10} />
        <KPICard icon={ClipboardCheck} label="Group 3 CS Rate" value={r[2].csRate} unit="%" target={3} />
      </Flex>
      <div style={{ height: 16 }} />
      <ChartCard title="CS Rate by Robson Group (%) with Benchmark Targets" height={340}>
        <ResponsiveContainer>
          <ComposedChart data={chartData} margin={{ top: 15, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEE" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="csRate" name="Actual CS Rate %" fill={C.chartBlue} radius={[4, 4, 0, 0]} barSize={28} />
            <Line type="monotone" dataKey="target" stroke={C.accent} strokeWidth={0} dot={{ r: 7, fill: C.accent, stroke: "#FFF", strokeWidth: 2 }} name="Target" connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
      <div style={{ height: 16 }} />
      <Grid cols={2}>
        <ChartCard title="Delivery Distribution by Robson Group">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={r} dataKey="deliveries" nameKey="group" cx="50%" cy="50%" outerRadius={110} innerRadius={45} paddingAngle={2}
                label={({ name, percent }) => `G${name} ${(percent * 100).toFixed(0)}%`} style={{ fontSize: 10 }}>
                {r.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Contribution to Total CS Volume (%)">
          <ResponsiveContainer>
            <BarChart data={contribData} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEE" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="pctCs" name="% of Total CS" fill={C.primary} radius={[0, 4, 4, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </Grid>
      <div style={{ height: 16 }} />
      <DataTable data={r} columns={[
        { key: "group", label: "Group", align: "center" },
        { key: "desc", label: "Description" },
        { key: "deliveries", label: "Deliveries", align: "right" },
        { key: "cs", label: "CS", align: "right" },
        { key: "csRate", label: "CS Rate %", align: "right", render: v => <b>{v}%</b> },
        { key: "pctDeliveries", label: "% Deliveries", align: "right" },
        { key: "pctCs", label: "% Total CS", align: "right" },
        { key: "target", label: "Target %", align: "right", render: v => v ?? "—" },
      ]} />
    </div>
  );
}

// ---------- ANC QUALITY ----------
function ANCQualityTab({ data }) {
  const { anc } = data;
  const latest = anc[anc.length - 1];
  const targets = [
    { label: "Early Booking <12w", key: "earlyBooking", target: BM.EARLY_BOOKING },
    { label: "ANC 8+ Contacts", key: "anc8", target: BM.ANC8 },
    { label: "Dating US <24w", key: "datingUs", target: BM.DATING_US },
    { label: "HIV Testing", key: "hivTest", target: BM.HIV },
    { label: "Syphilis Screening", key: "syphilis", target: BM.SYPHILIS },
    { label: "GDM Screening", key: "gdm", target: BM.GDM },
    { label: "Corticosteroids", key: "corticosteroid", target: BM.CORTICO },
  ];

  const radarData = targets.map(t => ({
    subject: t.label.split(" ").slice(0, 2).join(" "),
    actual: latest[t.key], target: t.target,
  }));

  return (
    <div>
      <SectionTitle icon={ClipboardCheck} title="Antenatal Care Process Quality" subtitle="WHO 2016 ANC guidelines and PMTCT targets (Section 3.6 / 4.4)" />
      <Flex gap={12}>
        {targets.slice(0, 4).map(t => (
          <KPICard key={t.key} icon={Syringe} label={t.label} value={latest[t.key]} unit="%" target={t.target} lowerBetter={false} />
        ))}
      </Flex>
      <div style={{ height: 8 }} />
      <Flex gap={12}>
        {targets.slice(4).map(t => (
          <KPICard key={t.key} icon={Syringe} label={t.label} value={latest[t.key]} unit="%" target={t.target} lowerBetter={false} />
        ))}
      </Flex>
      <div style={{ height: 16 }} />
      <Grid cols={2}>
        {[
          { key: "earlyBooking", title: "Early Booking <12 weeks (%)", target: BM.EARLY_BOOKING, color: C.chartBlue },
          { key: "anc8", title: "ANC 8+ Contacts (%)", target: BM.ANC8, color: C.chartPurple },
          { key: "hivTest", title: "HIV Testing Coverage (%)", target: BM.HIV, color: C.chartGreen },
          { key: "syphilis", title: "Syphilis Screening (%)", target: BM.SYPHILIS, color: C.chartOrange },
        ].map(cfg => (
          <ChartCard key={cfg.key} title={cfg.title} height={250}>
            <ResponsiveContainer>
              <ComposedChart data={anc} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id={`ancGrad${cfg.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={cfg.color} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={cfg.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 105]} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey={cfg.key} fill={`url(#ancGrad${cfg.key})`} stroke="none" />
                <Line type="monotone" dataKey={cfg.key} stroke={cfg.color} strokeWidth={2.5} dot={{ r: 3.5, fill: cfg.color, stroke: "#FFF", strokeWidth: 2 }} name="Actual" />
                <ReferenceLine y={cfg.target} stroke={C.success} strokeDasharray="6 4" label={{ value: `Target (${cfg.target}%)`, fill: C.success, fontSize: 10 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        ))}
      </Grid>
      <div style={{ height: 16 }} />
      <ChartCard title="ANC Quality Gap Analysis – Actual vs Target (Latest Month)" height={350}>
        <ResponsiveContainer>
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={120}>
            <PolarGrid stroke="#DDD" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: C.text }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
            <Radar name="Actual" dataKey="actual" stroke={C.chartBlue} fill={C.chartBlue} fillOpacity={0.2} strokeWidth={2} />
            <Radar name="Target" dataKey="target" stroke={C.accent} fill={C.accent} fillOpacity={0.08} strokeWidth={2} strokeDasharray="6 4" />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

// ---------- GEOGRAPHICAL ----------
function GeographicalTab({ data }) {
  const { provincial: prov } = data;
  const sorted = [...prov].sort((a, b) => b.riskIndex - a.riskIndex);
  const worst = sorted[0], best = sorted[sorted.length - 1];
  const [metric, setMetric] = useState("csRate");
  const metricOpts = [
    { key: "csRate", label: "CS Rate (%)", target: BM.CS_HIGH },
    { key: "pretermRate", label: "Preterm Rate (%)" },
    { key: "sbRate", label: "Stillbirth /1 000", target: BM.SB_TARGET },
    { key: "pnmr", label: "PNMR /1 000", target: BM.PMR_TARGET },
    { key: "lbwRate", label: "LBW Rate (%)", target: BM.LBW_TARGET },
    { key: "nicuRate", label: "NICU Admission (%)" },
    { key: "teenRate", label: "Teenage Pregnancy (%)" },
  ];
  const currentOpt = metricOpts.find(m => m.key === metric);
  const metricData = [...prov].sort((a, b) => b[metric] - a[metric]);
  const natAvg = round1(prov.reduce((s, p) => s + p[metric], 0) / prov.length);

  const radarDomains = ["Mortality", "Preterm", "CS Rate", "LBW", "NICU", "Teen Preg"];
  const radarKeys = ["mortScore", "ptScore", "csScore", "lbwScore", "nicuScore", "teenScore"];
  const radarData = radarDomains.map((d, i) => ({
    subject: d,
    [worst.province]: worst[radarKeys[i]],
    [best.province]: best[radarKeys[i]],
  }));

  const heatData = sorted.map(p => ({
    province: p.province,
    values: [p.csRate, p.pretermRate, p.lbwRate, p.sbRate, p.pnmr, p.nicuRate, p.lowApgarRate, p.teenRate],
  }));
  const heatLabels = ["CS %", "Preterm %", "LBW %", "SB /1k", "PNMR /1k", "NICU %", "Low Apgar %", "Teen %"];

  return (
    <div>
      <SectionTitle icon={MapPin} title="Provincial Geographical Analysis" subtitle="Composite risk profiling across all nine provinces" />
      <div style={{
        background: `linear-gradient(135deg, #922B21, #C0392B)`, borderRadius: 10,
        padding: "14px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap",
      }}>
        <span style={{ color: "#FFF", fontWeight: 700, fontSize: 14 }}>
          <XCircle size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
          Highest Risk: {worst.province} (PRI {worst.riskIndex}/100)
        </span>
        <span style={{ color: "#D5F5E3", fontWeight: 600, fontSize: 14 }}>
          <CheckCircle2 size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
          Lowest Risk: {best.province} (PRI {best.riskIndex}/100)
        </span>
      </div>

      <Grid cols={2}>
        <ChartCard title="Provincial Risk Index (PRI) – Composite /100" height={360}>
          <ResponsiveContainer>
            <BarChart data={[...sorted].reverse()} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEE" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
              <YAxis dataKey="province" type="category" tick={{ fontSize: 10 }} width={100} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="riskIndex" name="Risk Index" radius={[0, 4, 4, 0]} barSize={18}>
                {[...sorted].reverse().map((p, i) => (
                  <Cell key={i} fill={p.riskIndex > 60 ? C.accent : p.riskIndex > 40 ? C.chartOrange : C.chartGreen} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: "0 0 8px" }}>Risk Index Breakdown</p>
          <DataTable data={sorted} columns={[
            { key: "province", label: "Province" },
            { key: "riskIndex", label: "PRI", align: "right", render: v => <b style={{ color: v > 60 ? C.accent : v > 40 ? C.chartOrange : C.chartGreen }}>{v}</b> },
            { key: "mortScore", label: "Mort.", align: "right" },
            { key: "ptScore", label: "Prem.", align: "right" },
            { key: "csScore", label: "CS", align: "right" },
            { key: "lbwScore", label: "LBW", align: "right" },
            { key: "nicuScore", label: "NICU", align: "right" },
            { key: "teenScore", label: "Teen", align: "right" },
          ]} />
        </div>
      </Grid>

      <div style={{ height: 16 }} />
      <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: "0 0 8px" }}>Province-Level KPI Comparison</p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {metricOpts.map(opt => (
          <button key={opt.key} onClick={() => setMetric(opt.key)}
            style={{
              padding: "5px 12px", borderRadius: 6, border: `1px solid ${metric === opt.key ? C.secondary : C.border}`,
              background: metric === opt.key ? C.secondary : "#FFF", color: metric === opt.key ? "#FFF" : C.text,
              fontSize: 11, fontWeight: 500, cursor: "pointer", transition: "all 0.15s",
            }}>
            {opt.label}
          </button>
        ))}
      </div>
      <ChartCard title={`${currentOpt?.label || ""} by Province`} height={300}>
        <ResponsiveContainer>
          <BarChart data={metricData} margin={{ top: 15, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEE" vertical={false} />
            <XAxis dataKey="province" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey={metric} name={currentOpt?.label} radius={[4, 4, 0, 0]} barSize={32}>
              {metricData.map((p, i) => (
                <Cell key={i} fill={p[metric] > natAvg * 1.1 ? C.accent : p[metric] > natAvg ? C.chartOrange : C.chartGreen} />
              ))}
            </Bar>
            <ReferenceLine y={natAvg} stroke={C.neutral} strokeDasharray="6 4" label={{ value: `Avg: ${natAvg}`, fill: C.neutral, fontSize: 10 }} />
            {currentOpt?.target && <ReferenceLine y={currentOpt.target} stroke={C.accent} strokeDasharray="4 4" label={{ value: `Target: ${currentOpt.target}`, fill: C.accent, fontSize: 10 }} />}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div style={{ height: 16 }} />
      <ChartCard title={`Risk Domain Comparison: ${worst.province} vs ${best.province}`} height={360}>
        <ResponsiveContainer>
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={120}>
            <PolarGrid stroke="#DDD" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: C.text }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
            <Radar name={worst.province} dataKey={worst.province} stroke={C.accent} fill={C.accent} fillOpacity={0.15} strokeWidth={2} />
            <Radar name={best.province} dataKey={best.province} stroke={C.chartGreen} fill={C.chartGreen} fillOpacity={0.15} strokeWidth={2} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div style={{ height: 16 }} />
      <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: "0 0 8px" }}>Provincial Performance Heatmap</p>
      <div style={{ overflowX: "auto", borderRadius: 8, border: `1px solid ${C.border}` }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: C.primary }}>
              <th style={{ padding: "8px 10px", color: "#FFF", textAlign: "left" }}>Province</th>
              {heatLabels.map((l, i) => <th key={i} style={{ padding: "8px 6px", color: "#FFF", textAlign: "center", fontSize: 10 }}>{l}</th>)}
            </tr>
          </thead>
          <tbody>
            {heatData.map((row, ri) => {
              const colMins = heatLabels.map((_, ci) => Math.min(...heatData.map(r => r.values[ci])));
              const colMaxs = heatLabels.map((_, ci) => Math.max(...heatData.map(r => r.values[ci])));
              return (
                <tr key={ri} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "7px 10px", fontWeight: 600 }}>{row.province}</td>
                  {row.values.map((v, ci) => {
                    const norm = colMaxs[ci] === colMins[ci] ? 0.5 : (v - colMins[ci]) / (colMaxs[ci] - colMins[ci]);
                    const r = Math.round(180 + norm * 75), g = Math.round(230 - norm * 100), b = Math.round(180 - norm * 40);
                    return <td key={ci} style={{ padding: "7px 6px", textAlign: "center", background: `rgb(${r},${g},${b})`, fontWeight: 500 }}>{v}</td>;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- TEENAGE PREGNANCY ----------
function TeenagePregnancyTab({ data }) {
  const { deliveries, summary: s } = data;
  const teen = deliveries.filter(d => d.isTeenage), adult = deliveries.filter(d => !d.isTeenage);
  const nTeen = teen.length, total = deliveries.length, teenPct = round1(nTeen / total * 100);

  const teenCs = round1(teen.filter(d => d.isCs).length / nTeen * 100);
  const adultCs = round1(adult.filter(d => d.isCs).length / adult.length * 100);
  const teenPt = round1(teen.filter(d => d.preterm).length / nTeen * 100);
  const adultPt = round1(adult.filter(d => d.preterm).length / adult.length * 100);
  const teenLbw = round1(teen.filter(d => d.lbw).length / nTeen * 100);
  const adultLbw = round1(adult.filter(d => d.lbw).length / adult.length * 100);
  const teenSb = round1(teen.filter(d => d.stillbirth).length / nTeen * 1000);
  const adultSb = round1(adult.filter(d => d.stillbirth).length / adult.length * 1000);
  const teenNicu = round1(teen.filter(d => d.nicu).length / nTeen * 100);
  const adultNicu = round1(adult.filter(d => d.nicu).length / adult.length * 100);

  const ageGroups = ["≤15", "16-17", "18-19", "20-24", "25-29", "30-34", "35-39", "40+"];
  const ageDist = ageGroups.map(g => ({ group: g, count: deliveries.filter(d => d.ageGroup === g).length, isTeen: g === "≤15" || g === "16-17" || g === "18-19" }));

  const compGroups = ["≤15", "16-17", "18-19", "20-24"];
  const compData = compGroups.map(g => {
    const sub = deliveries.filter(d => d.ageGroup === g);
    if (!sub.length) return { group: g, cs: 0, preterm: 0, lbw: 0, nicu: 0 };
    return {
      group: g,
      cs: round1(sub.filter(d => d.isCs).length / sub.length * 100),
      preterm: round1(sub.filter(d => d.preterm).length / sub.length * 100),
      lbw: round1(sub.filter(d => d.lbw).length / sub.length * 100),
      nicu: round1(sub.filter(d => d.nicu).length / sub.length * 100),
    };
  });

  const provTeen = data.provincial.map(p => ({ province: p.province, teenRate: p.teenRate })).sort((a, b) => b.teenRate - a.teenRate);
  const natAvg = teenPct;

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyTeen = months.map(m => {
    const sub = deliveries.filter(d => d.month === m);
    const t = sub.filter(d => d.isTeenage).length;
    return { month: m, rate: round1(t / sub.length * 100) };
  });

  return (
    <div>
      <SectionTitle icon={GraduationCap} title="Teenage Pregnancy Analysis" subtitle="Comprehensive assessment of pregnancies in mothers aged <20 years" />
      <div style={{
        background: "linear-gradient(135deg, #6C3483, #8E44AD)", borderRadius: 10,
        padding: "14px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
      }}>
        <span style={{ color: "#FFF", fontWeight: 700, fontSize: 16 }}>{nTeen} teenage deliveries ({teenPct}%)</span>
        <span style={{ color: "#D7BDE2", fontSize: 13 }}>out of {total.toLocaleString()} total · Jan–Dec 2025</span>
      </div>

      <Flex gap={12}>
        <KPICard icon={Scissors} label="Teen CS Rate" value={teenCs} unit="%" delta={round1(teenCs - adultCs)} subtitle="vs adult" />
        <KPICard icon={Thermometer} label="Teen Preterm" value={teenPt} unit="%" delta={round1(teenPt - adultPt)} />
        <KPICard icon={Baby} label="Teen LBW" value={teenLbw} unit="%" delta={round1(teenLbw - adultLbw)} />
        <KPICard icon={Activity} label="Teen Stillbirth" value={teenSb} unit="/1k" delta={round1(teenSb - adultSb)} />
        <KPICard icon={Stethoscope} label="Teen NICU" value={teenNicu} unit="%" delta={round1(teenNicu - adultNicu)} />
      </Flex>

      <div style={{ height: 16 }} />
      <Grid cols={2}>
        <ChartCard title="Delivery Volume by Maternal Age Group">
          <ResponsiveContainer>
            <BarChart data={ageDist} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEE" vertical={false} />
              <XAxis dataKey="group" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Deliveries" radius={[4, 4, 0, 0]}>
                {ageDist.map((d, i) => <Cell key={i} fill={d.isTeen ? C.chartPurple : C.chartBlue} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Outcome Comparison: Teen Sub-Groups vs 20-24 Reference">
          <ResponsiveContainer>
            <BarChart data={compData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEE" vertical={false} />
              <XAxis dataKey="group" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="cs" name="CS Rate %" fill={C.accent} barSize={12} />
              <Bar dataKey="preterm" name="Preterm %" fill={C.chartOrange} barSize={12} />
              <Bar dataKey="lbw" name="LBW %" fill={C.chartPurple} barSize={12} />
              <Bar dataKey="nicu" name="NICU %" fill={C.chartBlue} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </Grid>

      <div style={{ height: 16 }} />
      <Grid cols={2}>
        <ChartCard title="Teenage Pregnancy Rate by Province (%)">
          <ResponsiveContainer>
            <BarChart data={provTeen} margin={{ top: 15, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEE" vertical={false} />
              <XAxis dataKey="province" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="teenRate" name="Teen Rate %" radius={[4, 4, 0, 0]}>
                {provTeen.map((p, i) => <Cell key={i} fill={p.teenRate > natAvg * 1.2 ? C.accent : p.teenRate > natAvg ? C.chartOrange : C.chartGreen} />)}
              </Bar>
              <ReferenceLine y={natAvg} stroke={C.neutral} strokeDasharray="6 4" label={{ value: `National avg: ${natAvg}%`, fill: C.neutral, fontSize: 10 }} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Monthly Teenage Pregnancy Rate Trend (%)">
          <ResponsiveContainer>
            <ComposedChart data={monthlyTeen} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="teenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.chartPurple} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={C.chartPurple} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="rate" fill="url(#teenGrad)" stroke="none" />
              <Line type="monotone" dataKey="rate" stroke={C.chartPurple} strokeWidth={2.5} dot={{ r: 4, fill: C.chartPurple, stroke: "#FFF", strokeWidth: 2 }} name="Teen Rate %" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </Grid>
    </div>
  );
}

// ---------- DATA QUALITY ----------
function DataQualityTab({ data }) {
  const { completeness } = data;
  const checklist = [
    { req: "Mother-Baby Linkage Algorithm", detail: "Documented", status: "good" },
    { req: "Linkage Success Rate Monitoring", detail: "Active", status: "good" },
    { req: "GA Data Source Hierarchy", detail: "Early US > 2nd Tri US > LMP", status: "good" },
    { req: "ICD-10 Coding QA Protocol", detail: "Sampling methodology defined", status: "warn" },
    { req: "Clinical Validation vs Source Records", detail: "Quarterly audit cycle", status: "good" },
    { req: "Coding Consistency Cross-Facility", detail: "Monitoring in progress", status: "warn" },
    { req: "Robson Classification Capability", detail: "93.1% classifiable", status: "bad" },
  ];

  return (
    <div>
      <SectionTitle icon={Database} title="Data Quality & Completeness Monitoring" subtitle="Minimum thresholds per Section 5.4" />

      <Grid cols={5} gap={12}>
        {completeness.map((c, i) => {
          const met = c.pct >= c.target;
          const pctFill = Math.min(100, (c.pct - 80) / (100 - 80) * 100);
          return (
            <div key={i} style={{ background: C.card, borderRadius: 10, padding: 16, border: `1px solid ${C.border}`, textAlign: "center" }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: C.text, margin: "0 0 8px" }}>{c.variable}</p>
              <div style={{ position: "relative", width: 80, height: 80, margin: "0 auto" }}>
                <svg viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke="#EEE" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke={met ? C.success : C.accent} strokeWidth="3"
                    strokeDasharray={`${pctFill}, 100`} strokeLinecap="round" />
                </svg>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 14, fontWeight: 700, color: met ? C.success : C.accent }}>
                  {c.pct}%
                </div>
              </div>
              <p style={{ fontSize: 10, color: C.textMuted, margin: "6px 0 0" }}>Target: {c.target}%</p>
              <StatusIcon status={met ? "good" : "bad"} />
            </div>
          );
        })}
      </Grid>

      <div style={{ height: 16 }} />
      <DataTable data={completeness.map(c => ({
        ...c, status: c.pct >= c.target ? "Met" : "Below Target",
        gap: round1(c.pct - c.target), statusColor: c.pct >= c.target ? C.success : C.accent,
      }))} columns={[
        { key: "variable", label: "Data Element" },
        { key: "pct", label: "Completeness (%)", align: "right", render: v => <b>{v}%</b> },
        { key: "target", label: "Target (%)", align: "right" },
        { key: "gap", label: "Gap (pp)", align: "right", render: (v, r) => <span style={{ color: r.statusColor, fontWeight: 600 }}>{v > 0 ? "+" : ""}{v}</span> },
        { key: "status", label: "Status", render: (v, r) => <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><StatusIcon status={v === "Met" ? "good" : "bad"} /> {v}</span> },
      ]} />

      <div style={{ height: 16 }} />
      <SectionTitle icon={ClipboardCheck} title="Technical Requirements Compliance" subtitle="Section 5" />
      <DataTable data={checklist} columns={[
        { key: "req", label: "Requirement" },
        { key: "detail", label: "Detail" },
        { key: "status", label: "Status", align: "center", render: v => <StatusIcon status={v} /> },
      ]} />
    </div>
  );
}

// ============================================================================
// MAS LOGO COMPONENT
// ============================================================================
function MASLogo({ size = 38 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="rgba(255,255,255,0.15)" />
      <rect x="2" y="2" width="44" height="44" rx="8" stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none" />
      {/* Shield shape */}
      <path d="M24 6 L40 12 L40 26 C40 34 33 40 24 44 C15 40 8 34 8 26 L8 12 Z"
        fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
      {/* Cross symbol */}
      <rect x="22" y="14" width="4" height="16" rx="1" fill="rgba(255,255,255,0.5)" />
      <rect x="16" y="20" width="16" height="4" rx="1" fill="rgba(255,255,255,0.5)" />
      {/* MAS text */}
      <text x="24" y="43" textAnchor="middle" fill="white" fontSize="7.5" fontWeight="700"
        fontFamily="'DM Sans', 'Segoe UI', sans-serif" letterSpacing="1.5">MAS</text>
    </svg>
  );
}

// ============================================================================
// TAB DEFINITIONS
// ============================================================================
const TABS = [
  { id: "overview", label: "Overview", icon: BarChart3, Component: OverviewTab },
  { id: "descriptive", label: "Descriptive Statistics", icon: TrendingUp, Component: DescriptiveStatsTab },
  { id: "maternal", label: "Maternal Outcomes", icon: Heart, Component: MaternalOutcomesTab },
  { id: "perinatal", label: "Perinatal Outcomes", icon: Baby, Component: PerinatalOutcomesTab },
  { id: "robson", label: "C-Section Audit", icon: Scissors, Component: RobsonAuditTab },
  { id: "anc", label: "ANC Quality", icon: ClipboardCheck, Component: ANCQualityTab },
  { id: "geo", label: "Geographical", icon: MapPin, Component: GeographicalTab },
  { id: "teen", label: "Teenage Pregnancy", icon: GraduationCap, Component: TeenagePregnancyTab },
  { id: "quality", label: "Data Quality", icon: Database, Component: DataQualityTab },
];

// ============================================================================
// MAIN DASHBOARD
// ============================================================================
export default function MaternityDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const data = useMemo(() => generateData(4800, 42), []);
  const ActiveComponent = TABS.find(t => t.id === activeTab)?.Component || OverviewTab;

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif", background: C.bg, minHeight: "100vh", color: C.text }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={{
        background: `linear-gradient(135deg, ${C.gradientStart} 0%, ${C.gradientEnd} 100%)`,
        padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "3px solid rgba(255,255,255,0.15)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <MASLogo size={40} />
          <div>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#FFF", letterSpacing: "-0.3px" }}>GEMS Maternity Analytics</h1>
            <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Medical Advisory Services · MAS/Tshela/2025/MAT-001</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.8)", fontSize: 11 }}>
            <Calendar size={13} /><span>Jan–Dec 2025</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.8)", fontSize: 11 }}>
            <Users size={13} /><span>{data.summary.totalDeliveries.toLocaleString()} deliveries</span>
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>WHO · PPIP · ENAP</div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav style={{
        background: "#FFF", borderBottom: `1px solid ${C.border}`, padding: "0 20px",
        display: "flex", gap: 2, overflowX: "auto",
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "10px 14px", border: "none", background: "none", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
                fontSize: 12, fontWeight: isActive ? 600 : 400,
                color: isActive ? C.secondary : C.textMuted,
                borderBottom: isActive ? `2.5px solid ${C.secondary}` : "2.5px solid transparent",
                transition: "all 0.15s",
              }}>
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <main style={{ padding: "20px 24px", maxWidth: 1280, margin: "0 auto" }}>
        <ActiveComponent data={data} />
      </main>

      {/* Footer */}
      <footer style={{ padding: "12px 24px", borderTop: `1px solid ${C.border}`, textAlign: "center", fontSize: 10, color: C.textMuted }}>
        Government Employees Medical Scheme · Medical Advisory Services Division · Dr Francis Ngema · Benchmarks: WHO · PPIP · ENAP · SA PMTCT
      </footer>
    </div>
  );
}
