import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Calendar, Check, FilePlus, FolderOpen, Printer, Save, Settings, Trash2 } from "lucide-react";

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

const DEFAULT_STATE = {
  title: "Fyra Famnar",
  subtitle: "V 28–29 · 14–27 juli",
  footerTitle: "Värdarna på plats i lokalen",
  footerText: "Vardagar 09–11 · Helger 09–10. Välkomna in för samtal, frågor och felanmälningar.",
  weekdayColor: "#059669",
  weekendColor: "#D97706",
};

// Derive a light background from any hex color (~20% opacity on white)
const hexBg = (hex: string): string => hex + "33";
// Lighter background (~10% opacity) for cell bodies
const hexBgBody = (hex: string): string => hex + "1A";

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

/** Returns the 7 dates (Mon–Sun) for a given ISO week number and year. */
const getISOWeekDates = (weekNum: number, year: number): Date[] => {
  const jan4 = new Date(year, 0, 4);
  const dow = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dow + 1 + (weekNum - 1) * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
};

// --- Styles ---
const btnStyle: React.CSSProperties = {
  border: "none", borderRadius: 8, padding: "8px 16px",
  fontWeight: 600, cursor: "pointer", fontSize: 14, transition: "all 0.15s",
  display: "flex", alignItems: "center", gap: 6,
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
  weekdayColor: string;
  weekendColor: string;
  onBack: () => void;
}

function PrintPreview({ title, subtitle, weeks, footerTitle, footerText, weekdayColor, weekendColor, onBack }: PrintPreviewProps) {
  const handlePrint = (): void => window.print();

  return (
    <div>
      <div className="no-print" style={{ background: "#1E293B", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 50 }}>
        <button onClick={onBack} style={{ ...btnStyle, background: "#334155", color: "white" }}><ArrowLeft size={16} /> Tillbaka</button>
        <span style={{ color: "#94A3B8", fontSize: 14 }}>Förhandsgranskning – så här ser utskriften ut</span>
        <button onClick={handlePrint} style={{ ...btnStyle, background: "#059669", color: "white", fontSize: 16, padding: "10px 24px" }}>
          <Printer size={18} /> Skriv ut / Spara PDF
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
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <div style={{ display: "inline-block", background: "white", border: "1.5px solid #CBD5E1", borderRadius: 10, padding: "14px 48px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#1E293B", letterSpacing: "-0.3px" }}>{title}</div>
            <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 3, letterSpacing: "0.04em", textTransform: "uppercase" }}>{subtitle}</div>
          </div>
        </div>

        {weeks.map((week, wi) => {
          const dayColor = (di: number) => di >= 5 ? weekendColor : weekdayColor;
          return (
            <div key={wi} style={{ marginBottom: 10 }}>
              <div style={{ display: "inline-block", background: "#1E293B", color: "white", padding: "2px 12px", borderRadius: "8px 8px 0 0", fontSize: 11, fontWeight: 700 }}>
                {week.label}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", border: "1px solid #D1D5DB", borderRadius: "0 6px 6px 6px", overflow: "hidden" }}>
                {week.days.map((day, di) => (
                  <div key={di} style={{
                    padding: "4px 2px", textAlign: "center",
                    background: hexBg(dayColor(di)),
                    borderBottom: `2px solid ${dayColor(di)}`,
                    borderRight: di < 6 ? "1px solid #94A3B8" : "none",
                  }}>
                    <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: dayColor(di) }}>{day.day}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: dayColor(di) }}>{day.date || ""}</div>
                  </div>
                ))}
                {week.days.map((day, di) => (
                  <div key={di} style={{
                    minHeight: 120, padding: 3,
                    borderRight: di < 6 ? "1px solid #94A3B8" : "none",
                    background: di >= 5 ? hexBgBody(weekendColor) : "white",
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
          );
        })}

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
  const [title, setTitle] = useState<string>(DEFAULT_STATE.title);
  const [subtitle, setSubtitle] = useState<string>(DEFAULT_STATE.subtitle);
  const [weeks, setWeeks] = useState<Week[]>(createWeeks);
  const [weekCount, setWeekCount] = useState<1 | 2>(2);
  const [editingActivity, setEditingActivity] = useState<EditRef | null>(null);
  const [tempActivity, setTempActivity] = useState<Activity | null>(null);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [footerTitle, setFooterTitle] = useState<string>(DEFAULT_STATE.footerTitle);
  const [footerText, setFooterText] = useState<string>(DEFAULT_STATE.footerText);
  const [editingSettings, setEditingSettings] = useState<boolean>(false);
  const [weekdayColor, setWeekdayColor] = useState<string>(DEFAULT_STATE.weekdayColor);
  const [weekendColor, setWeekendColor] = useState<string>(DEFAULT_STATE.weekendColor);
  const [weekNums, setWeekNums] = useState<[string, string]>(["", ""]);
  const [dirty, setDirty] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<"close" | "new" | "open" | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dirtyRef = useRef<boolean>(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const appWindowRef = useRef<any>(null);

  // Mark state as dirty
  const markDirty = () => { setDirty(true); dirtyRef.current = true; };
  const markClean = () => { setDirty(false); dirtyRef.current = false; };

  // Intercept OS window close when there are unsaved changes
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
      const appWindow = getCurrentWindow();
      appWindowRef.current = appWindow;
      appWindow.onCloseRequested(async (event) => {
        if (dirtyRef.current) {
          event.preventDefault();
          setPendingAction("close");
        } else {
          await appWindow.destroy();
        }
      }).then((fn) => { unlisten = fn; });
    }).catch(() => { /* running in browser dev mode */ });
    return () => { unlisten?.(); };
  }, []);

  /** Build a filename from week numbers + title: e.g. "v28-29-Fyra-Famnar.json" */
  const buildFilename = (): string => {
    const nums = weekNums.slice(0, weekCount).filter((n) => n.trim());
    const weekPart = nums.length > 0 ? `v${nums.join("-")}` : "";
    const titlePart = title.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9åäöÅÄÖ-]/g, "");
    return [weekPart, titlePart].filter(Boolean).join("-") + ".json";
  };

  const getScheduleData = () => ({
    title, subtitle, weeks, weekCount, footerTitle, footerText, weekdayColor, weekendColor,
  });

  const saveAsFile = async (): Promise<void> => {
    const content = JSON.stringify(getScheduleData(), null, 2);
    try {
      const [{ save }, { invoke }] = await Promise.all([
        import("@tauri-apps/plugin-dialog"),
        import("@tauri-apps/api/core"),
      ]);
      const path = await save({
        defaultPath: buildFilename(),
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (path) {
        await invoke("save_file", { path, content });
        markClean();
      }
    } catch {
      // Fallback for browser dev mode
      const blob = new Blob([content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = buildFilename();
      a.click();
      URL.revokeObjectURL(url);
      markClean();
    }
  };

  const doNew = (): void => {
    setTitle(DEFAULT_STATE.title);
    setSubtitle(DEFAULT_STATE.subtitle);
    setWeeks(createWeeks());
    setWeekCount(2);
    setWeekdayColor(DEFAULT_STATE.weekdayColor);
    setWeekendColor(DEFAULT_STATE.weekendColor);
    setFooterTitle(DEFAULT_STATE.footerTitle);
    setFooterText(DEFAULT_STATE.footerText);
    setWeekNums(["", ""]);
    markClean();
  };

  const handleNew = (): void => {
    if (dirtyRef.current) { setPendingAction("new"); return; }
    doNew();
  };

  const handleOpen = (): void => {
    if (dirtyRef.current) { setPendingAction("open"); return; }
    fileInputRef.current?.click();
  };

  const executePendingAction = async (): Promise<void> => {
    const action = pendingAction;
    setPendingAction(null);
    if (action === "close") {
      markClean(); // dirtyRef.current = false so the handler lets the next close through
      if (appWindowRef.current) await appWindowRef.current.close();
    } else if (action === "new") {
      doNew();
    } else if (action === "open") {
      fileInputRef.current?.click();
    }
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
        if (data.weekdayColor !== undefined) setWeekdayColor(data.weekdayColor);
        if (data.weekendColor !== undefined) setWeekendColor(data.weekendColor);
        if (data.weekCount === 1 || data.weekCount === 2) setWeekCount(data.weekCount);
        if (Array.isArray(data.weeks)) setWeeks(data.weeks);
        markClean();
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
    markDirty();
  };

  /** Fill a week's dates from an ISO week number. Also updates the week label. */
  const applyWeekNum = (wi: number, num: string, year: number): void => {
    const n = parseInt(num);
    if (!num || isNaN(n) || n < 1 || n > 53) return;
    const dates = getISOWeekDates(n, year);
    setWeeks((prev) => {
      const copy: Week[] = JSON.parse(JSON.stringify(prev));
      copy[wi].label = `Vecka ${n}`;
      for (let di = 0; di < 7; di++) {
        copy[wi].days[di].date = `${dates[di].getDate()}/${dates[di].getMonth() + 1}`;
      }
      return copy;
    });
    markDirty();
  };

  const addActivity = (wi: number, di: number): void => {
    const act = createActivity();
    setWeeks((prev) => {
      const copy: Week[] = JSON.parse(JSON.stringify(prev));
      copy[wi].days[di].activities.push(act);
      return copy;
    });
    markDirty();
    setTempActivity(act);
    setEditingActivity({ weekIdx: wi, dayIdx: di, actIdx: weeks[wi].days[di].activities.length });
  };

  const saveActivity = (): void => {
    if (!tempActivity || !editingActivity) return;
    setWeeks((prev) => {
      const copy: Week[] = JSON.parse(JSON.stringify(prev));
      const acts = copy[editingActivity.weekIdx].days[editingActivity.dayIdx].activities;
      const idx = acts.findIndex((a) => a.id === tempActivity.id);
      if (idx >= 0) acts[idx] = { ...tempActivity };
      return copy;
    });
    markDirty();
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
    setWeeks((prev) => {
      const copy: Week[] = JSON.parse(JSON.stringify(prev));
      const acts = copy[editingActivity.weekIdx].days[editingActivity.dayIdx].activities;
      const idx = acts.findIndex((a) => a.id === tempActivity.id);
      if (idx >= 0) acts.splice(idx, 1);
      return copy;
    });
    markDirty();
    setEditingActivity(null);
    setTempActivity(null);
  };

  const cancelEdit = (): void => {
    if (tempActivity && !tempActivity.title && editingActivity) {
      setWeeks((prev) => {
        const copy: Week[] = JSON.parse(JSON.stringify(prev));
        const acts = copy[editingActivity.weekIdx].days[editingActivity.dayIdx].activities;
        const idx = acts.findIndex((a) => a.id === tempActivity.id);
        if (idx >= 0 && !acts[idx].title) acts.splice(idx, 1);
        return copy;
      });
    }
    setEditingActivity(null);
    setTempActivity(null);
  };

  const dayColor = (di: number) => di >= 5 ? weekendColor : weekdayColor;
  const activeWeeks = weeks.slice(0, weekCount);
  const cellMinHeight = weekCount === 1 ? 300 : 140;

  if (showPreview) {
    return (
      <PrintPreview
        title={title} subtitle={subtitle} weeks={activeWeeks}
        footerTitle={footerTitle} footerText={footerText}
        weekdayColor={weekdayColor} weekendColor={weekendColor}
        onBack={() => setShowPreview(false)}
      />
    );
  }

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 1100, margin: "0 auto", padding: "16px", background: "#F8FAFC", minHeight: "100vh" }}>

      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 22, color: "#1E293B", display: "flex", alignItems: "center", gap: 8 }}><Calendar size={22} /> Schemabyggaren</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <input ref={fileInputRef} type="file" accept=".json" onChange={loadFromFile} style={{ display: "none" }} />
          <button onClick={handleNew} style={{ ...btnStyle, background: "#F1F5F9", color: "#475569", border: "1px solid #CBD5E1" }}>
            <FilePlus size={16} /> Ny
          </button>
          <button onClick={handleOpen} style={{ ...btnStyle, background: "#F1F5F9", color: "#475569", border: "1px solid #CBD5E1" }}>
            <FolderOpen size={16} /> Öppna
          </button>
          <button onClick={saveAsFile} style={{ ...btnStyle, background: "#F1F5F9", color: dirty ? "#B45309" : "#475569", border: dirty ? "1px solid #F59E0B" : "1px solid #CBD5E1" }}>
            <Save size={16} /> {dirty ? "Spara som *" : "Spara som"}
          </button>
          <button onClick={() => setEditingSettings(!editingSettings)} style={{ ...btnStyle, background: "#F1F5F9", color: "#475569", border: "1px solid #CBD5E1" }}>
            <Settings size={16} /> Inställningar
          </button>
          <button onClick={() => setShowPreview(true)} style={{ ...btnStyle, background: "#059669", color: "white", fontSize: 16 }}>
            <Printer size={16} /> Förhandsgranska & Skriv ut
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
              <input value={title} onChange={(e) => { setTitle(e.target.value); markDirty(); }} style={inputStyle} placeholder="T.ex. Fyra Famnar" />
            </label>
            <label style={labelStyle}>
              Underrubrik
              <input value={subtitle} onChange={(e) => { setSubtitle(e.target.value); markDirty(); }} style={inputStyle} placeholder="T.ex. V 28–29" />
            </label>
            <label style={labelStyle}>
              Fotnot titel
              <input value={footerTitle} onChange={(e) => { setFooterTitle(e.target.value); markDirty(); }} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Fotnot text
              <input value={footerText} onChange={(e) => { setFooterText(e.target.value); markDirty(); }} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Vardagsfärg (mån–fre)
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <input type="color" value={weekdayColor} onChange={(e) => { setWeekdayColor(e.target.value); markDirty(); }}
                  style={{ width: 40, height: 36, borderRadius: 8, border: "2px solid #CBD5E1", cursor: "pointer", padding: 2 }} />
              </div>
            </label>
            <label style={labelStyle}>
              Helgfärg (lör–sön)
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <input type="color" value={weekendColor} onChange={(e) => { setWeekendColor(e.target.value); markDirty(); }}
                  style={{ width: 40, height: 36, borderRadius: 8, border: "2px solid #CBD5E1", cursor: "pointer", padding: 2 }} />
              </div>
            </label>
          </div>

          {/* Week count */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 4, marginBottom: 16, paddingTop: 16, borderTop: "1px solid #E2E8F0" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Antal veckor</span>
            {([1, 2] as const).map((n) => (
              <button key={n} onClick={() => { setWeekCount(n); markDirty(); }} style={{
                ...btnStyle,
                background: weekCount === n ? "#1E293B" : "#F1F5F9",
                color: weekCount === n ? "white" : "#475569",
                border: "1px solid #CBD5E1",
                padding: "6px 20px",
              }}>{n}</button>
            ))}
          </div>

          {/* Per-week settings */}
          {([0, 1] as const).filter((wi) => wi < weekCount).map((wi) => (
            <div key={wi} style={{ marginBottom: 16, paddingTop: 16, borderTop: "1px solid #E2E8F0" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 10 }}>
                <label style={{ ...labelStyle, marginBottom: 0, flex: "0 0 auto" }}>
                  Vecka
                  <input
                    type="number" min={1} max={53}
                    value={weekNums[wi]}
                    placeholder="t.ex. 28"
                    onChange={(e) => {
                      const val = e.target.value;
                      setWeekNums((prev) => wi === 0 ? [val, prev[1]] : [prev[0], val]);
                      applyWeekNum(wi, val, new Date().getFullYear());
                    }}
                    style={{ ...inputStyle, width: 90 }}
                  />
                </label>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {weeks[wi].days.map((day, di) => (
                  <label key={di} style={{ ...labelStyle, flex: "0 0 auto", marginBottom: 0 }}>
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
      {activeWeeks.map((week, wi) => (
        <div key={wi} style={{ marginBottom: 16 }}>
          <div style={{ display: "inline-block", background: "#1E293B", color: "white", padding: "4px 14px", borderRadius: "10px 10px 0 0", fontSize: 13, fontWeight: 700 }}>
            {week.label}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", border: "1px solid #D1D5DB", borderRadius: "0 8px 8px 8px", overflow: "hidden", background: "white" }}>
            {week.days.map((day, di) => (
              <div key={di} style={{
                padding: "6px 4px", textAlign: "center",
                background: hexBg(dayColor(di)),
                borderBottom: `2px solid ${dayColor(di)}`,
                borderRight: di < 6 ? "1px solid #94A3B8" : "none",
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: dayColor(di), letterSpacing: "0.03em" }}>{day.day}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: dayColor(di) }}>{day.date || "–"}</div>
              </div>
            ))}
            {week.days.map((day, di) => (
              <div key={di} style={{
                minHeight: cellMinHeight, padding: 4,
                borderRight: di < 6 ? "1px solid #94A3B8" : "none",
                background: di >= 5 ? hexBgBody(weekendColor) : "white",
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

      {/* Unsaved changes modal */}
      {pendingAction && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{ background: "white", borderRadius: 16, padding: 28, width: 360, maxWidth: "90vw", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 17, color: "#1E293B" }}>Osparade ändringar</h3>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "#64748B", lineHeight: 1.5 }}>
              Du har osparade ändringar. Vill du fortsätta utan att spara?
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setPendingAction(null)} style={{ ...btnStyle, background: "#F1F5F9", color: "#475569" }}>
                Avbryt
              </button>
              <button onClick={executePendingAction} style={{ ...btnStyle, background: "#DC2626", color: "white" }}>
                Fortsätt utan att spara
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingActivity && tempActivity && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={cancelEdit}>
          <div style={{ background: "white", borderRadius: 16, padding: 24, width: 380, maxWidth: "90vw", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 16px", fontSize: 18, color: "#1E293B" }}>
              {tempActivity.title ? "Redigera aktivitet" : "Ny aktivitet"}
            </h3>

            <label style={labelStyle}>
              Tid
              <input
                type="time"
                value={tempActivity.time}
                onChange={(e) => setTempActivity({ ...tempActivity, time: e.target.value })}
                style={{ ...inputStyle, fontSize: 18, padding: 10 }}
              />
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
                    {tempActivity.colorHex === hex ? <Check size={14} /> : null}
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
                <Check size={18} /> Spara
              </button>
              <button onClick={deleteActivity} style={{ ...btnStyle, background: "#FEE2E2", color: "#DC2626", padding: 12 }}>
                <Trash2 size={18} />
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
