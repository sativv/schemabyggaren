import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Calendar, Check, Download, FilePlus, FolderOpen, Printer, Save, Settings, Trash2 } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

// --- Types ---
interface Activity {
  id: number;
  time: string;
  endTime: string;
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
  endTime: "",
  title: "",
  note: "",
  colorHex: PRESET_COLORS[0],
});

const sortActivities = (acts: Activity[]): Activity[] =>
  [...acts].sort((a, b) => a.time.localeCompare(b.time));

// --- Time-grid helpers ---
/** Convert "HH:MM" to minutes since midnight */
const parseTime = (t: string): number => {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Find min/max times across all weeks, returning a shared range rounded to 30-min boundaries.
 *  Adds a 1-hour buffer and ensures at least a 4-hour span. Returns [0,0] if no activities. */
const getSharedTimeRange = (weeks: Week[]): [number, number] => {
  let min = Infinity;
  let max = -Infinity;
  for (const week of weeks) {
    for (const day of week.days) {
      for (const act of day.activities) {
        const t = parseTime(act.time);
        if (t < min) min = t;
        if (t > max) max = t;
        if (act.endTime) {
          const te = parseTime(act.endTime);
          if (te > max) max = te;
        }
      }
    }
  }
  if (min === Infinity) return [0, 0];
  // Add 1-hour buffer on each side
  min = Math.floor((min - 60) / 30) * 30;
  max = Math.ceil((max + 60 + 1) / 30) * 30;
  // Ensure at least 4-hour span
  if (max - min < 240) {
    const mid = (min + max) / 2;
    min = Math.floor((mid - 120) / 30) * 30;
    max = Math.ceil((mid + 120) / 30) * 30;
  }
  if (min < 0) min = 0;
  return [min, max];
};

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
  const printPageRef = useRef<HTMLDivElement>(null);

  const handleSavePdf = async (): Promise<void> => {
    const el = printPageRef.current;
    if (!el) return;
    try {
      // Temporarily resize to A4 landscape proportions for capture
      const saved = { maxWidth: el.style.maxWidth, width: el.style.width, height: el.style.height };
      const targetWidth = el.offsetWidth;
      const targetHeight = Math.round(targetWidth / (297 / 210));
      el.style.maxWidth = "none";
      el.style.width = `${targetWidth}px`;
      el.style.height = `${targetHeight}px`;
      // Wait for reflow
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const canvas = await html2canvas(el, { scale: 2, useCORS: true });
      el.style.maxWidth = saved.maxWidth;
      el.style.width = saved.width;
      el.style.height = saved.height;
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, "PNG", 0, 0, pageW, pageH);

      // Try Tauri save dialog + binary write
      try {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { invoke } = await import("@tauri-apps/api/core");
        const path = await save({
          defaultPath: `${title || "schema"}.pdf`,
          filters: [{ name: "PDF", extensions: ["pdf"] }],
        });
        if (path) {
          const bytes = pdf.output("arraybuffer");
          await invoke("save_file_binary", { path, data: Array.from(new Uint8Array(bytes)) });
        }
      } catch {
        // Fallback: browser download
        pdf.save(`${title || "schema"}.pdf`);
      }
    } catch (err) {
      alert("Kunde inte skapa PDF: " + err);
    }
  };

  return (
    <div>
      <div className="no-print" style={{ background: "#1E293B", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 50 }}>
        <button onClick={onBack} style={{ ...btnStyle, background: "#334155", color: "white" }}><ArrowLeft size={16} /> Tillbaka</button>
        <span style={{ color: "#94A3B8", fontSize: 14 }}>Förhandsgranskning – så här ser utskriften ut</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleSavePdf} style={{ ...btnStyle, background: "#3B82F6", color: "white", fontSize: 16, padding: "10px 24px" }}>
            <Download size={18} /> Spara PDF
          </button>
          <button onClick={handlePrint} style={{ ...btnStyle, background: "#059669", color: "white", fontSize: 16, padding: "10px 24px" }}>
            <Printer size={18} /> Skriv ut
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .editor-root { background: none !important; min-height: 0 !important; padding: 0 !important; }
          @page { size: A4 landscape; margin: 0; }
          html, body { margin: 0; padding: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-page {
            width: 100%;
            height: 210mm;
            padding: 6mm;
            margin: 0 !important;
            max-width: none !important;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          .print-weeks-area {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 2mm;
            min-height: 0;
          }
          .print-week {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 0;
            margin-bottom: 0 !important;
          }
          .print-week-grid {
            flex: 1;
            min-height: 0;
          }
          .day-body { min-height: 0 !important; }
        }
      `}</style>

      <div ref={printPageRef} className="print-page" style={{ fontFamily: "'Segoe UI', Helvetica, sans-serif", maxWidth: 1200, margin: "0 auto", padding: 8, height: "calc(100vh - 60px)", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
        <div style={{ textAlign: "center", marginBottom: 4 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#1E293B", letterSpacing: "-0.3px" }}>{title}</div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 1, letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 600 }}>{subtitle}</div>
        </div>

        <div className="print-weeks-area" style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minHeight: 0 }}>
          {(() => {
            const [rangeStart, rangeEnd] = getSharedTimeRange(weeks);
            const totalRange = rangeEnd - rangeStart + 30;
            return weeks.map((week, wi) => {
            const dayColor = (di: number) => di >= 5 ? weekendColor : weekdayColor;

            return (
              <div key={wi} className="print-week" style={{ marginBottom: 6, flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                <div style={{ display: "inline-block", background: "#1E293B", color: "white", padding: "2px 12px", borderRadius: "8px 8px 0 0", fontSize: 11, fontWeight: 700 }}>
                  {week.label}
                </div>
                <div className="print-week-grid" style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gridTemplateRows: "auto 1fr",
                  border: "1px solid #D1D5DB", borderRadius: "0 6px 6px 6px", overflow: "hidden",
                  flex: 1, minHeight: 0,
                }}>
                  {week.days.map((day, di) => (
                    <div key={di} style={{
                      padding: "3px 2px", textAlign: "center",
                      background: hexBg(dayColor(di)),
                      borderBottom: `2px solid ${dayColor(di)}`,
                      borderRight: di < 6 ? "1px solid #94A3B8" : "none",
                    }}>
                      <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: dayColor(di) }}>{day.day}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: dayColor(di) }}>{day.date || ""}</div>
                    </div>
                  ))}
                  {week.days.map((day, di) => (
                      <div key={di} className="day-body" style={{
                        position: "relative",
                        borderRight: di < 6 ? "1px solid #94A3B8" : "none",
                        background: di >= 5 ? hexBgBody(weekendColor) : "white",
                      }}>
                        {(() => {
                          const sorted = sortActivities(day.activities);
                          const groups = new Map<string, Activity[]>();
                          for (const act of sorted) {
                            if (!groups.has(act.time)) groups.set(act.time, []);
                            groups.get(act.time)!.push(act);
                          }
                          return Array.from(groups.entries()).map(([time, acts]) => {
                            const startPct = ((parseTime(time) - rangeStart) / totalRange) * 100;
                            return (
                              <div key={`g-${time}`} style={{
                                position: "absolute",
                                top: `${startPct}%`,
                                left: 3, right: 3,
                              }}>
                                {acts.map((act) => {
                                  const hasEnd = act.endTime && parseTime(act.endTime) > parseTime(act.time);
                                  const heightPct = hasEnd
                                    ? ((parseTime(act.endTime) - parseTime(act.time)) / totalRange) * 100 : undefined;
                                  return (
                                    <div key={act.id} style={{
                                      minHeight: heightPct ? `${heightPct}%` : undefined,
                                      boxSizing: "border-box",
                                      background: hexBg(act.colorHex), borderLeft: `3px solid ${act.colorHex}`,
                                      borderRadius: 4, padding: "3px 5px", marginBottom: 3, fontSize: 10,
                                    }}>
                                      <div style={{ fontWeight: 700, color: act.colorHex, fontSize: 9 }}>
                                        {act.time}{hasEnd ? `–${act.endTime}` : ""}
                                      </div>
                                      <div style={{ fontWeight: 700, color: "#1F2937" }}>{act.title}</div>
                                      {act.note && <><div style={{ borderTop: `1px solid ${act.colorHex}33`, marginTop: 2 }} /><div style={{ fontSize: 10, color: "#1F2937", fontStyle: "italic", fontWeight: 700, marginTop: 2 }}>{act.note}</div></>}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          });
                        })()}
                      </div>
                  ))}
                </div>
              </div>
            );
          });
          })()}
        </div>

        {(footerTitle || footerText) && (
          <div style={{ background: "#FFFBEB", border: "1px solid #F59E0B", borderRadius: 8, padding: "6px 12px", marginTop: 4 }}>
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
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const handlePrint = (): void => setShowPrintPreview(true);
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
        if (Array.isArray(data.weeks)) {
          for (const w of data.weeks) {
            for (const d of w.days) {
              for (const a of d.activities) {
                if (a.endTime === undefined) a.endTime = "";
              }
            }
          }
          setWeeks(data.weeks);
        }
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


  if (showPrintPreview) {
    return (
      <PrintPreview
        title={title} subtitle={subtitle} weeks={activeWeeks}
        footerTitle={footerTitle} footerText={footerText}
        weekdayColor={weekdayColor} weekendColor={weekendColor}
        onBack={() => setShowPrintPreview(false)}
      />
    );
  }

  return (
    <div className="editor-root" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 1100, margin: "0 auto", padding: "16px", background: "#F8FAFC", minHeight: "100vh" }}>

      <div className="no-print">

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
          <button onClick={handlePrint} style={{ ...btnStyle, background: "#059669", color: "white", fontSize: 16 }}>
            <Printer size={16} /> Skriv ut
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

      {/* Title & Subtitle */}
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: "#1E293B", letterSpacing: "-0.3px" }}>{title || <span style={{ color: "#CBD5E1" }}>Ingen titel</span>}</div>
        {subtitle && <div style={{ fontSize: 13, color: "#475569", marginTop: 2, letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 600 }}>{subtitle}</div>}
      </div>

      {/* Weeks */}
      {(() => {
        const [rangeStart, rangeEnd] = getSharedTimeRange(activeWeeks);
        const hasActivities = rangeStart !== rangeEnd;
        const slotCount = hasActivities ? (rangeEnd - rangeStart) / 30 : 0;
        return activeWeeks.map((week, wi) => (
        <div key={wi} style={{ marginBottom: 16 }}>
          <div style={{ display: "inline-block", background: "#1E293B", color: "white", padding: "4px 14px", borderRadius: "10px 10px 0 0", fontSize: 13, fontWeight: 700 }}>
            {week.label}
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gridTemplateRows: hasActivities
              ? `auto repeat(${slotCount}, minmax(28px, auto)) auto`
              : `auto minmax(${weekCount === 1 ? 300 : 140}px, auto) auto`,
            border: "1px solid #D1D5DB", borderRadius: "0 8px 8px 8px", overflow: "hidden", background: "white",
          }}>
            {/* Header row */}
            {week.days.map((day, di) => (
              <div key={di} style={{
                padding: "6px 4px", textAlign: "center",
                background: hexBg(dayColor(di)),
                borderBottom: `2px solid ${dayColor(di)}`,
                borderRight: di < 6 ? "1px solid #94A3B8" : "none",
                gridColumn: di + 1, gridRow: 1,
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: dayColor(di), letterSpacing: "0.03em" }}>{day.day}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: dayColor(di) }}>{day.date || "–"}</div>
              </div>
            ))}
            {/* Day columns with absolutely positioned activity cards */}
            {week.days.map((day, di) => {
              const totalRange = hasActivities ? rangeEnd - rangeStart + 30 : 1;
              return (
                <div key={`col-${di}`} style={{
                  gridColumn: di + 1,
                  gridRow: `2 / ${hasActivities ? slotCount + 3 : 4}`,
                  borderRight: di < 6 ? "1px solid #94A3B8" : "none",
                  background: di >= 5 ? hexBgBody(weekendColor) : "white",
                  position: "relative",
                  minHeight: hasActivities ? undefined : (weekCount === 1 ? 300 : 140),
                }}>
                  {(() => {
                    const sorted = sortActivities(day.activities);
                    const groups = new Map<string, Activity[]>();
                    for (const act of sorted) {
                      const key = act.time;
                      if (!groups.has(key)) groups.set(key, []);
                      groups.get(key)!.push(act);
                    }
                    return Array.from(groups.entries()).map(([time, acts]) => {
                      const startPct = hasActivities
                        ? ((parseTime(time) - rangeStart) / totalRange) * 100 : 0;
                      return (
                        <div key={`g-${time}`} style={{
                          position: hasActivities ? "absolute" : "relative",
                          top: hasActivities ? `${startPct}%` : undefined,
                          left: 4, right: 4, zIndex: 1,
                        }}>
                          {acts.map((act) => {
                            const realIdx = day.activities.findIndex((a) => a.id === act.id);
                            const hasEnd = act.endTime && parseTime(act.endTime) > parseTime(act.time);
                            const heightPct = hasEnd
                              ? ((parseTime(act.endTime) - parseTime(act.time)) / totalRange) * 100 : undefined;
                            return (
                              <div key={act.id} onClick={() => startEdit(wi, di, realIdx)}
                                style={{
                                  minHeight: heightPct ? `${heightPct}%` : undefined,
                                  background: hexBg(act.colorHex), borderLeft: `3px solid ${act.colorHex}`,
                                  borderRadius: 5, padding: "4px 6px", marginBottom: 3,
                                  cursor: "pointer", transition: "transform 0.1s", fontSize: 11,
                                  boxSizing: "border-box",
                                }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1.03)"; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; }}
                              >
                                <div style={{ fontWeight: 700, color: act.colorHex, fontSize: 10 }}>
                                  {act.time}{hasEnd ? `–${act.endTime}` : ""}
                                </div>
                                <div style={{ fontWeight: 700, color: "#1F2937" }}>{act.title || "(tom)"}</div>
                                {act.note && <><div style={{ borderTop: `1px solid ${act.colorHex}33`, marginTop: 2 }} /><div style={{ fontSize: 11, color: "#1F2937", fontStyle: "italic", fontWeight: 700, marginTop: 2 }}>{act.note}</div></>}
                              </div>
                            );
                          })}
                        </div>
                      );
                    });
                  })()}
                </div>
              );
            })}
            {/* "+" buttons in the last row */}
            {week.days.map((_, di) => (
              <button key={`add-${di}`} onClick={() => addActivity(wi, di)} style={{
                gridColumn: di + 1,
                gridRow: hasActivities ? slotCount + 2 : 3,
                background: "none", border: "1px dashed #CBD5E1",
                borderRadius: 5, padding: "6px", cursor: "pointer", color: "#94A3B8",
                fontSize: 18, lineHeight: 1, transition: "all 0.15s",
                margin: "4px", zIndex: 1, alignSelf: "end",
              }}
                onMouseEnter={(e) => { const t = e.currentTarget as HTMLButtonElement; t.style.background = "#F1F5F9"; t.style.borderColor = "#94A3B8"; }}
                onMouseLeave={(e) => { const t = e.currentTarget as HTMLButtonElement; t.style.background = "none"; t.style.borderColor = "#CBD5E1"; }}
              >+</button>
            ))}
          </div>
        </div>
        ));
      })()}

      {/* Footer */}
      {(footerTitle || footerText) && (
        <div style={{ background: "#FFFBEB", border: "1px solid #F59E0B", borderRadius: 8, padding: "8px 14px", marginTop: 8 }}>
          {footerTitle && <div style={{ fontWeight: 700, color: "#92400E", fontSize: 12 }}>{footerTitle}</div>}
          {footerText && <div style={{ fontSize: 11, color: "#78350F", marginTop: 2 }}>{footerText}</div>}
        </div>
      )}

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

            <div style={{ display: "flex", gap: 12 }}>
              <label style={{ ...labelStyle, flex: 1 }}>
                Starttid
                <input
                  type="text"
                  value={tempActivity.time}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9:]/g, "");
                    if (v.length <= 5) setTempActivity({ ...tempActivity, time: v });
                  }}
                  onBlur={(e) => {
                    const m = e.target.value.match(/^(\d{1,2}):?(\d{2})$/);
                    if (m) {
                      const h = m[1].padStart(2, "0");
                      const min = m[2];
                      setTempActivity({ ...tempActivity, time: `${h}:${min}` });
                    }
                  }}
                  placeholder="HH:MM"
                  style={{ ...inputStyle, fontSize: 18, padding: 10 }}
                />
              </label>
              <label style={{ ...labelStyle, flex: 1 }}>
                Sluttid (valfritt)
                <input
                  type="text"
                  value={tempActivity.endTime}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9:]/g, "");
                    if (v.length <= 5) setTempActivity({ ...tempActivity, endTime: v });
                  }}
                  onBlur={(e) => {
                    if (!e.target.value) return;
                    const m = e.target.value.match(/^(\d{1,2}):?(\d{2})$/);
                    if (m) {
                      const h = m[1].padStart(2, "0");
                      const min = m[2];
                      setTempActivity({ ...tempActivity, endTime: `${h}:${min}` });
                    }
                  }}
                  placeholder="HH:MM"
                  style={{ ...inputStyle, fontSize: 18, padding: 10 }}
                />
              </label>
            </div>

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
      </div>{/* end no-print */}
    </div>
  );
}
