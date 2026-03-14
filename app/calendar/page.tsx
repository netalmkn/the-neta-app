"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type EventType = "homework" | "exam" | "personal" | "project" | "school";

interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  start_time: string;
  end_time: string;
  type: EventType;
  created_at?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

const TIME_OPTIONS: string[] = [];
for (let h = 6; h < 24; h++)
  for (let m = 0; m < 60; m += 30)
    TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ─── Design tokens ────────────────────────────────────────────────────────────

const N = {
  bg:       "#FAFAF9",
  sidebar:  "#F5F2EC",
  text:     "#1C1C1E",
  muted:    "#9B9894",
  border:   "#E8E4DA",
  hover:    "#F0EDE5",
  active:   "#E8E2D8",
  selected: "#EEF2FF",
  accent:   "#6366F1",
  accentBg: "#EEF2FF",
};

const TYPES: Record<EventType, { label: string; bg: string; text: string; accent: string }> = {
  homework: { label: "Homework", bg: "#EFF6FF", text: "#1D4ED8", accent: "#3B82F6" },
  exam:     { label: "Exam",     bg: "#FFF7ED", text: "#C2410C", accent: "#F97316" },
  personal: { label: "Personal", bg: "#F0FDF4", text: "#166534", accent: "#22C55E" },
  project:  { label: "Project",  bg: "#F5F3FF", text: "#6D28D9", accent: "#8B5CF6" },
  school:   { label: "School",   bg: "#FFF0FA", text: "#BE185D", accent: "#EC4899" },
};

// ─── Add Event Modal ───────────────────────────────────────────────────────────

function AddEventModal({ date, onClose, onAdd }: {
  date: string;
  onClose: () => void;
  onAdd: (e: Omit<CalendarEvent, "id" | "created_at">) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventType>("personal");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [eventDate, setEventDate] = useState(date);
  const [saving, setSaving] = useState(false);

  const [y, m, d] = date.split("-").map(Number);
  const label = new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center lg:justify-center">
      <div className="overlay-enter absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="modal-enter relative w-full lg:max-w-md rounded-t-2xl lg:rounded-2xl"
        style={{ background: N.bg, border: `1px solid ${N.border}`, boxShadow: "0 8px 40px rgba(0,0,0,0.14)" }}>
        <div className="w-8 h-1 rounded-full mx-auto mt-3 lg:hidden" style={{ background: N.border }} />
        <div className="px-5 py-5 pb-10 lg:pb-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: N.muted }}>{label}</p>
          <div className="text-[18px] mb-0.5">🗓</div>
          <h3 className="text-[17px] font-bold mb-4" style={{ color: N.text }}>New Event</h3>
          <div className="space-y-3">
            <input autoFocus type="text" placeholder="Event title" value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-[14px] outline-none"
              style={{ background: N.hover, border: `1px solid ${N.border}`, color: N.text }} />

            {/* Date */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: N.muted }}>Date</p>
              <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl text-[13px] outline-none"
                style={{ background: N.hover, border: `1px solid ${N.border}`, color: N.text }} />
            </div>

            {/* Type */}
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(TYPES) as EventType[]).map((k) => (
                <button key={k} onClick={() => setType(k)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
                  style={{
                    background: type === k ? TYPES[k].bg : N.hover,
                    color: type === k ? TYPES[k].text : N.muted,
                    border: type === k ? `1.5px solid ${TYPES[k].accent}` : "1.5px solid transparent",
                  }}>
                  {TYPES[k].label}
                </button>
              ))}
            </div>

            {/* Times */}
            <div className="grid grid-cols-2 gap-2">
              {([["Start", startTime, setStartTime], ["End", endTime, setEndTime]] as const).map(([lbl, val, set]) => (
                <div key={lbl}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: N.muted }}>{lbl}</p>
                  <select value={val} onChange={(e) => (set as (v: string) => void)(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-xl text-[13px] outline-none"
                    style={{ background: N.hover, border: `1px solid ${N.border}`, color: N.text }}>
                    {TIME_OPTIONS.map((t) => <option key={t} value={t}>{formatTime(t)}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <button
              onClick={async () => {
                if (!title.trim()) return;
                setSaving(true);
                await onAdd({ date: eventDate, title: title.trim(), start_time: startTime, end_time: endTime, type });
                setSaving(false);
              }}
              disabled={saving || !title.trim()}
              className="w-full py-2.5 rounded-xl text-[13px] font-semibold transition-colors disabled:opacity-40"
              style={{ background: N.text, color: "white" }}>
              {saving ? "Saving…" : "Add Event"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const today = new Date();
  const todayStr = toDateStr(today);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [modal, setModal] = useState(false);

  useEffect(() => {
    supabase.from("calendar_entries").select("*").order("start_time")
      .then(({ data }) => { if (data) setEvents(data as CalendarEvent[]); });
  }, []);

  const addEvent = async (event: Omit<CalendarEvent, "id" | "created_at">) => {
    const { data } = await supabase.from("calendar_entries").insert(event).select().single();
    if (data) setEvents((p) => [...p, data as CalendarEvent].sort((a, b) => a.start_time.localeCompare(b.start_time)));
    setModal(false);
  };

  const deleteEvent = async (id: string) => {
    setEvents((p) => p.filter((e) => e.id !== id));
    await supabase.from("calendar_entries").delete().eq("id", id);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };
  const goToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDate(todayStr);
  };

  // Build 6×7 grid
  const cells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();
    const arr: { date: Date; current: boolean }[] = [];
    for (let i = firstDay - 1; i >= 0; i--)
      arr.push({ date: new Date(viewYear, viewMonth - 1, daysInPrev - i), current: false });
    for (let d = 1; d <= daysInMonth; d++)
      arr.push({ date: new Date(viewYear, viewMonth, d), current: true });
    let next = 1;
    while (arr.length < 42)
      arr.push({ date: new Date(viewYear, viewMonth + 1, next++), current: false });
    return arr;
  }, [viewYear, viewMonth]);

  const eventsByDate = useMemo(() => {
    const m: Record<string, CalendarEvent[]> = {};
    events.forEach((e) => { if (!m[e.date]) m[e.date] = []; m[e.date].push(e); });
    return m;
  }, [events]);

  const selectedEvents = useMemo(
    () => events.filter((e) => e.date === selectedDate).sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [events, selectedDate]
  );

  const [selY, selM, selD] = selectedDate.split("-").map(Number);
  const selObj = new Date(selY, selM - 1, selD);

  return (
    <div className="min-h-screen pb-24 lg:pb-8" style={{ background: N.bg }}>

      {/* ── Header ── */}
      <div className="sticky top-0 z-30 flex items-center gap-2 px-4 pt-12 pb-3 lg:pt-6"
        style={{ background: N.bg, borderBottom: `1px solid ${N.border}` }}>
        <h1 className="text-[18px] font-bold flex-1 leading-tight" style={{ color: N.text }}>
          {MONTHS[viewMonth]}{" "}
          <span className="font-normal" style={{ color: N.muted }}>{viewYear}</span>
        </h1>
        <button onClick={goToday}
          className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors"
          style={{ background: N.hover, color: N.text }}
          onMouseEnter={(e) => (e.currentTarget.style.background = N.active)}
          onMouseLeave={(e) => (e.currentTarget.style.background = N.hover)}>
          Today
        </button>
        <div className="flex gap-0.5">
          {[{ dir: -1, label: "‹" }, { dir: 1, label: "›" }].map(({ dir, label }) => (
            <button key={dir} onClick={dir === -1 ? prevMonth : nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[18px] font-light transition-colors"
              style={{ color: N.muted }}
              onMouseEnter={(e) => (e.currentTarget.style.background = N.hover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12px] font-semibold transition-all active:scale-95"
          style={{ background: N.accent, color: "white", boxShadow: "0 2px 8px rgba(99,102,241,0.35)" }}>
          + Event
        </button>
      </div>

      {/* ── Day headers ── */}
      <div className="grid grid-cols-7 px-2 mt-2">
        {DAYS_SHORT.map((d) => (
          <div key={d} className="text-center py-1 text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: N.muted }}>
            {d}
          </div>
        ))}
      </div>

      {/* ── Calendar grid ── */}
      <div className="px-2">
        {/* Border around grid */}
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${N.border}` }}>
          <div className="grid grid-cols-7" style={{ gap: "1px", background: N.border }}>
            {cells.map(({ date, current }) => {
              const ds = toDateStr(date);
              const isToday = ds === todayStr;
              const isSel = ds === selectedDate;
              const dayEvents = eventsByDate[ds] ?? [];
              const isSun = date.getDay() === 0;
              const isSat = date.getDay() === 6;

              return (
                <div
                  key={ds}
                  onClick={() => { setSelectedDate(ds); if (!current) { setViewYear(date.getFullYear()); setViewMonth(date.getMonth()); } }}
                  className="min-h-[72px] lg:min-h-[100px] p-1.5 cursor-pointer transition-colors"
                  style={{
                    background: isSel ? N.accentBg : N.bg,
                    opacity: current ? 1 : 0.45,
                  }}
                  onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = N.hover; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = isSel ? N.accentBg : N.bg; }}
                >
                  {/* Date number */}
                  <div
                    className="w-6 h-6 flex items-center justify-center rounded-full text-[12px] font-semibold mb-1 leading-none"
                    style={{
                      background: isToday ? N.accent : "transparent",
                      color: isToday ? "white" : (isSun || isSat) ? "#EF4444" : current ? N.text : N.muted,
                    }}>
                    {date.getDate()}
                  </div>

                  {/* Event pills */}
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev) => {
                      const t = TYPES[ev.type] ?? TYPES.personal;
                      return (
                        <div key={ev.id}
                          className="truncate text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                          style={{ background: t.bg, color: t.text }}>
                          {ev.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] px-1.5 font-medium" style={{ color: N.muted }}>
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Selected day events ── */}
      <div className="px-4 mt-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-semibold" style={{ color: N.text }}>
            {selObj.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <button
            onClick={() => setModal(true)}
            className="text-[12px] font-medium px-2.5 py-1 rounded-lg transition-colors"
            style={{ color: N.accent, background: N.accentBg }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
            + Add event
          </button>
        </div>

        {selectedEvents.length === 0 ? (
          <p className="text-[13px] py-6 text-center rounded-2xl" style={{ color: N.muted, background: N.hover }}>
            No events — tap + Add event to create one
          </p>
        ) : (
          <div className="space-y-2">
            {selectedEvents.map((ev) => {
              const t = TYPES[ev.type] ?? TYPES.personal;
              return (
                <div key={ev.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl group"
                  style={{ background: t.bg, border: `1px solid ${t.accent}22` }}>
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: t.accent }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: N.text }}>{ev.title}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: N.muted }}>
                      {formatTime(ev.start_time)}{ev.end_time ? ` – ${formatTime(ev.end_time)}` : ""}
                    </p>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-lg font-semibold flex-shrink-0"
                    style={{ background: "white", color: t.text }}>
                    {t.label}
                  </span>
                  <button onClick={() => deleteEvent(ev.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    style={{ color: N.muted }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#EF4444")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = N.muted)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M3 6H21M8 6V4H16V6M19 6L18.1 19.1C18 20.2 17.1 21 16 21H8C6.9 21 6 20.2 5.9 19.1L5 6"
                        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {modal && <AddEventModal date={selectedDate} onClose={() => setModal(false)} onAdd={addEvent} />}
    </div>
  );
}
