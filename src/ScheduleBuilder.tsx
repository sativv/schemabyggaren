import { useRef, useState } from "react";

// --- Types ---
interface Activity {
  id: number;
  time: string;
  title: string;
  note: string;
  colorHex: string;
}

interface Day {
  day: string;
  date: string;
  activities: Activity[];
}

interface Week {
  label: string;
  days: Day[];
}

interface EditRef {
  weekIdx: number;
  dayIdx: number;
  actIdx: number;
}

// --- Constants ---
const DAYS: string[] = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag", "Söndag"];

const PRESET_COLORS: string[] = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#06B6D4", "#EC4899", "#F97316",
];

// Derive a light background from any hex color (~20% opacity on white)
const hexBg = (hex: string): string => hex + "33";

const createWeeks = (): Week[] => [
  { label: "Vecka 1", days: DAYS.map((d) => ({ day: d, date: "", activities: [] })) },
  { label: "Vecka 2", days: DAYS.map((d) => ({ day: d, date: "", activities: [] })) },
];

const createActivity = (): Activity => ({
  id: Date.now() + Math.random(),
  time: "10:00",
  title: "",
  note: "",
  colorHex: PRESET_COLORS[0],
});

const sortActivities = (acts: Activity[]): Activity[] =>
  [...acts].sort((a, b) => a.time.localeCompare(b.time));

// --- Styles ---
const btnStyle: React.CSSProperties = {
  border: "none", borderRadius: 8, padding: "8px 16px",
  fontWeight: 600, cursor: "pointer", fontSize: 14, transition: "all 0.15s",
};

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "8px 10px", borderRadius: 8,
  border: "1px solid #CBD5E1", fontSize: 14, marginTop: 4, boxSizing: "border-box", outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 12,
};

// --- Print Preview ---
interface PrintPreviewProps {
  title: string;
  subtitle: string;
  weeks: Week[];
  footerTitle: string;
  footerText: string;
  onBack: () => void;
}

function PrintPreview({ title, subtitle, weeks, footerTitle, footerText, onBack }: PrintPreviewProps) {
  const handlePrint = (): void => window.print();

  return (
    <div>
      <div className="no-print" style={{ background: "#1E293B", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 50 }}>
        <button onClick={onBack} style={{ ...btnStyle, background: "#334155", color: "white" }}>← Tillbaka</button>
        <span style={{ color: "#94A3B8", fontSize: 14 }}>Förhandsgranskning – så här ser utskriften ut</span>
        <button onClick={handlePrint} style={{ ...btnStyle, background: "#059669", color: "white", fontSize: 16, padding: "10px 24px" }}>
          🖨️ Skriv ut / Spara PDF
        </button>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: landscape; margin: 8mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div style={{ fontFamily: "'Segoe UI', Helvetica, sans-serif", maxWidth: 1200, margin: "0 auto", padding: 16 }}>
        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <div style={{ display: "inline-block", background: "#FFE4E6", border: "2px solid #FB7185", borderRadius: 12, padding: "12px 40px" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#881337" }}>{title}</div>
            <div style={{ fontSize: 13, color: "#BE123C", marginTop: 4 }}>{subtitle}</div>
          </div>
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} style={{ marginBottom: 10 }}>
            <div style={{ display: "inline-block", background: "#1E293B", color: "white", padding: "2px 12px", borderRadius: "8px 8px 0 0", fontSize: 11, fontWeight: 700 }}>
              {week.label}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", border: "1px solid #D1D5DB", borderRadius: "0 6px 6px 6px", overflow: "hidden" }}>
              {week.days.map((day, di) => (
                <div key={di} style={{
                  padding: "4px 2px", textAlign: "center",
                  background: di >= 5 ? "#FDE68A" : "#A7F3D0",
                  borderBottom: `2px solid ${di >= 5 ? "#D97706" : "#059669"}`,
                  borderRight: di < 6 ? "1px solid #94A3B8" : "none",
                }}>
                  <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: di >= 5 ? "#92400E" : "#064E3B" }}>{day.day}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: di >= 5 ? "#78350F" : "#022C22" }}>{day.date || ""}</div>
                </div>
              ))}
              {week.days.map((day, di) => (
                <div key={di} style={{
                  minHeight: 120, padding: 3,
                  borderRight: di < 6 ? "1px solid #94A3B8" : "none",
                  background: di >= 5 ? "#FFFBEB" : "white",
                }}>
                  {sortActivities(day.activities).map((act) => (
                    <div key={act.id} style={{
                      background: hexBg(act.colorHex), borderLeft: `3px solid ${act.colorHex}`,
                      borderRadius: 4, padding: "3px 5px", marginBottom: 3, fontSize: 10,
                    }}>
                      <div style={{ fontWeight: 700, color: act.colorHex, fontSize: 9 }}>{act.time}</div>
                      <div style={{ fontWeight: 700, color: "#1F2937" }}>{act.title}</div>
                      {act.note && <div style={{ fontSize: 9, color: "#6B7280", fontStyle: "italic", marginTop: 2 }}>{act.note}</div>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}

        {(footerTitle || footerText) && (
          <div style={{ background: "#FFFBEB", border: "1px solid #F59E0B", borderRadius: 8, padding: "8px 12px", marginTop: 6 }}>
            {footerTitle && <div style={{ fontWeight: 700, color: "#92400E", fontSize: 11 }}>{footerTitle}</div>}
            {footerText && <div style={{ fontSize: 10, color: "#78350F", marginTop: 2 }}>{footerText}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main Component ---
export default function ScheduleBuilder(): React.JSX.Element {
  const [title, setTitle] = useState<string>("Fyra Famnar");
  const [subtitle, setSubtitle] = useState<string>("V 28–29 · 14–27 juli");
  const [weeks, setWeeks] = useState<Week[]>(createWeeks);
  const [editingActivity, setEditingActivity] = useState<EditRef | null>(null);
  const [tempActivity, setTempActivity] = useState<Activity | null>(null);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [footerTitle, setFooterTitle] = useState<string>("Värdarna på plats i lokalen");
  const [footerText, setFooterText] = useState<string>("Vardagar 09–11 · Helger 09–10. Välkomna in för samtal, frågor och felanmälningar.");
  const [editingSettings, setEditingSettings] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveToFile = (): void => {
    const data = { title, subtitle, weeks, footerTitle, footerText };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "schema"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadFromFile = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.title !== undefined) setTitle(data.title);
        if (data.subtitle !== undefined) setSubtitle(data.subtitle);
        if (data.footerTitle !== undefined) setFooterTitle(data.footerTitle);
        if (data.footerText !== undefined) setFooterText(data.footerText);
        if (Array.isArray(data.weeks)) setWeeks(data.weeks);
      } catch {
        alert("Kunde inte läsa filen. Är det en giltig schemafil?");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const updateWeeks = (fn: (w: Week[]) => void): void => {
    setWeeks((prev) => {
      const copy: Week[] = JSON.parse(JSON.stringify(prev));
      fn(copy);
      return copy;
    });
  };

  const addActivity = (wi: number, di: number): void => {
    const act = createActivity();
    updateWeeks((w) => w[wi].days[di].activities.push(act));
    setTempActivity(act);
    setEditingActivity({ weekIdx: wi, dayIdx: di, actIdx: weeks[wi].days[di].activities.length });
  };

  const saveActivity = (): void => {
    if (!tempActivity || !editingActivity) return;
    updateWeeks((w) => {
      const acts = w[editingActivity.weekIdx].days[editingActivity.dayIdx].activities;
      const idx = acts.findIndex((a) => a.id === tempActivity.id);
      if (idx >= 0) acts[idx] = { ...tempActivity };
    });
    setEditingActivity(null);
    setTempActivity(null);
  };

  const startEdit = (wi: number, di: number, ai: number): void => {
    const act = weeks[wi].days[di].activities[ai];
    setTempActivity({ ...act });
    setEditingActivity({ weekIdx: wi, dayIdx: di, actIdx: ai });
  };

  const deleteActivity = (): void => {
    if (!editingActivity || !tempActivity) return;
    updateWeeks((w) => {
      const acts = w[editingActivity.weekIdx].days[editingActivity.dayIdx].activities;
      const idx = acts.findIndex((a) => a.id === tempActivity.id);
      if (idx >= 0) acts.splice(idx, 1);
    });
    setEditingActivity(null);
    setTempActivity(null);
  };

  const cancelEdit = (): void => {
    if (tempActivity && !tempActivity.title && editingActivity) {
      updateWeeks((w) => {
        const acts = w[editingActivity.weekIdx].days[editingActivity.dayIdx].activities;
        const idx = acts.findIndex((a) => a.id === tempActivity.id);
        if (idx >= 0 && !acts[idx].title) acts.splice(idx, 1);
      });
    }
    setEditingActivity(null);
    setTempActivity(null);
  };

  if (showPreview) {
    return (
      <PrintPreview
        title={title} subtitle={subtitle} weeks={weeks}
        footerTitle={footerTitle} footerText={footerText}
        onBack={() => setShowPreview(false)}
      />
    );
  }

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 1100, margin: "0 auto", padding: "16px", background: "#F8FAFC", minHeight: "100vh" }}>

      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 22, color: "#1E293B" }}>📅 Schemabyggaren</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <input ref={fileInputRef} type="file" accept=".json" onChange={loadFromFile} style={{ display: "none" }} />
          <button onClick={() => fileInputRef.current?.click()} style={{ ...btnStyle, background: "#F1F5F9", color: "#475569", border: "1px solid #CBD5E1" }}>
            📂 Öppna
          </button>
          <button onClick={saveToFile} style={{ ...btnStyle, background: "#F1F5F9", color: "#475569", border: "1px solid #CBD5E1" }}>
            💾 Spara
          </button>
          <button onClick={() => setEditingSettings(!editingSettings)} style={{ ...btnStyle, background: "#F1F5F9", color: "#475569", border: "1px solid #CBD5E1" }}>
            ⚙️ Inställningar
          </button>
          <button onClick={() => setShowPreview(true)} style={{ ...btnStyle, background: "#059669", color: "white", fontSize: 16 }}>
            🖨️ Förhandsgranska & Skriv ut
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {editingSettings && (
        <div style={{ background: "white", borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: "1px solid #E2E8F0" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 16, color: "#334155" }}>Inställningar</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={labelStyle}>
              Titel
              <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} placeholder="T.ex. Fyra Famnar" />
            </label>
            <label style={labelStyle}>
              Underrubrik
              <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} style={inputStyle} placeholder="T.ex. V 28–29" />
            </label>
            <label style={labelStyle}>
              Fotnot titel
              <input value={footerTitle} onChange={(e) => setFooterTitle(e.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Fotnot text
              <input value={footerText} onChange={(e) => setFooterText(e.target.value)} style={inputStyle} />
            </label>
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ marginTop: 12 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ ...labelStyle, flex: "0 0 auto" }}>
                  {week.label}
                  <input value={week.label} onChange={(e) => updateWeeks((w) => { w[wi].label = e.target.value; })} style={{ ...inputStyle, width: 120 }} />
                </label>
                {week.days.map((day, di) => (
                  <label key={di} style={{ ...labelStyle, flex: "0 0 auto" }}>
                    {day.day}
                    <input value={day.date} onChange={(e) => updateWeeks((w) => { w[wi].days[di].date = e.target.value; })} style={{ ...inputStyle, width: 60, textAlign: "center" }} placeholder="14/7" />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} style={{ marginBottom: 16 }}>
          <div style={{ display: "inline-block", background: "#1E293B", color: "white", padding: "4px 14px", borderRadius: "10px 10px 0 0", fontSize: 13, fontWeight: 700 }}>
            {week.label}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", border: "1px solid #D1D5DB", borderRadius: "0 8px 8px 8px", overflow: "hidden", background: "white" }}>
            {/* Day headers */}
            {week.days.map((day, di) => (
              <div key={di} style={{
                padding: "6px 4px", textAlign: "center",
                background: di >= 5 ? "#FDE68A" : "#A7F3D0",
                borderBottom: `2px solid ${di >= 5 ? "#D97706" : "#059669"}`,
                borderRight: di < 6 ? "1px solid #94A3B8" : "none",
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: di >= 5 ? "#92400E" : "#064E3B", letterSpacing: "0.03em" }}>{day.day}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: di >= 5 ? "#78350F" : "#022C22" }}>{day.date || "–"}</div>
              </div>
            ))}
            {/* Activity cells */}
            {week.days.map((day, di) => (
              <div key={di} style={{
                minHeight: 140, padding: 4,
                borderRight: di < 6 ? "1px solid #94A3B8" : "none",
                background: di >= 5 ? "#FFFBEB" : "white",
                display: "flex", flexDirection: "column",
              }}>
                {sortActivities(day.activities).map((act) => {
                  const realIdx = day.activities.findIndex((a) => a.id === act.id);
                  return (
                    <div key={act.id} onClick={() => startEdit(wi, di, realIdx)}
                      style={{
                        background: hexBg(act.colorHex), borderLeft: `3px solid ${act.colorHex}`,
                        borderRadius: 5, padding: "4px 6px", marginBottom: 4,
                        cursor: "pointer", transition: "transform 0.1s", fontSize: 11,
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1.03)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; }}
                    >
                      <div style={{ fontWeight: 700, color: act.colorHex, fontSize: 10 }}>{act.time}</div>
                      <div style={{ fontWeight: 700, color: "#1F2937" }}>{act.title || "(tom)"}</div>
                      {act.note && <div style={{ fontSize: 10, color: "#6B7280", fontStyle: "italic", marginTop: 1 }}>{act.note}</div>}
                    </div>
                  );
                })}
                <button onClick={() => addActivity(wi, di)} style={{
                  marginTop: "auto", background: "none", border: "1px dashed #CBD5E1",
                  borderRadius: 5, padding: "6px", cursor: "pointer", color: "#94A3B8",
                  fontSize: 18, lineHeight: 1, transition: "all 0.15s",
                }}
                  onMouseEnter={(e) => { const t = e.currentTarget as HTMLButtonElement; t.style.background = "#F1F5F9"; t.style.borderColor = "#94A3B8"; }}
                  onMouseLeave={(e) => { const t = e.currentTarget as HTMLButtonElement; t.style.background = "none"; t.style.borderColor = "#CBD5E1"; }}
                >+</button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Edit modal */}
      {editingActivity && tempActivity && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={cancelEdit}>
          <div style={{ background: "white", borderRadius: 16, padding: 24, width: 380, maxWidth: "90vw", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 16px", fontSize: 18, color: "#1E293B" }}>
              {tempActivity.title ? "Redigera aktivitet" : "Ny aktivitet"}
            </h3>

            <label style={labelStyle}>
              Tid
              <input type="time" value={tempActivity.time} onChange={(e) => setTempActivity({ ...tempActivity, time: e.target.value })} style={{ ...inputStyle, fontSize: 18, padding: 10 }} />
            </label>

            <label style={labelStyle}>
              Titel
              <input value={tempActivity.title} onChange={(e) => setTempActivity({ ...tempActivity, title: e.target.value })} style={{ ...inputStyle, fontSize: 16, padding: 10 }} placeholder="T.ex. Promenadgrupp" autoFocus />
            </label>

            <label style={labelStyle}>
              Beskrivning (valfritt)
              <input value={tempActivity.note} onChange={(e) => setTempActivity({ ...tempActivity, note: e.target.value })} style={inputStyle} placeholder="T.ex. Vid rätt väder" />
            </label>

            <label style={labelStyle}>
              Färg
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4, alignItems: "center" }}>
                {PRESET_COLORS.map((hex) => (
                  <button key={hex} onClick={() => setTempActivity({ ...tempActivity, colorHex: hex })} style={{
                    width: 36, height: 36, borderRadius: 8, background: hexBg(hex),
                    border: tempActivity.colorHex === hex ? `3px solid ${hex}` : `2px solid ${hex}`,
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, flexShrink: 0,
                  }}>
                    {tempActivity.colorHex === hex ? "✓" : ""}
                  </button>
                ))}
                <input
                  type="color"
                  value={tempActivity.colorHex.length === 7 ? tempActivity.colorHex : "#3B82F6"}
                  onChange={(e) => setTempActivity({ ...tempActivity, colorHex: e.target.value })}
                  style={{ width: 36, height: 36, borderRadius: 8, border: "2px solid #CBD5E1", cursor: "pointer", padding: 2, flexShrink: 0 }}
                  title="Välj valfri färg"
                />
              </div>
            </label>

            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button onClick={saveActivity} style={{ ...btnStyle, flex: 1, background: "#059669", color: "white", fontSize: 16, padding: 12 }}>
                ✓ Spara
              </button>
              <button onClick={deleteActivity} style={{ ...btnStyle, background: "#FEE2E2", color: "#DC2626", padding: 12 }}>
                🗑️
              </button>
              <button onClick={cancelEdit} style={{ ...btnStyle, background: "#F1F5F9", color: "#64748B", padding: 12 }}>
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
