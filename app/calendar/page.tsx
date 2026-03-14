"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type EventType = "homework" | "exam" | "personal" | "project" | "school" | "class" | "errands" | "workout";
type Recurrence = "none" | "daily" | "weekly" | "monthly";

interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  start_time: string;
  end_time: string;
  all_day?: boolean | null;
  type: EventType;
  recurrence?: Recurrence | null;
  recurrence_end?: string | null;
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
  bg:       "#F8F9FA",
  sidebar:  "#FFFFFF",
  text:     "#1E293B",
  muted:    "#7A8FA3",
  border:   "#E2E8EF",
  hover:    "#F1F5F9",
  active:   "#E2ECF5",
  selected: "#D1E4F0",
  accent:   "#3C96D9",
  accentBg: "#EDF5FB",
};

const TYPES: Record<EventType, { label: string; bg: string; text: string; accent: string }> = {
  homework: { label: "Homework", bg: "#EFF6FF", text: "#1D4ED8", accent: "#3B82F6" },
  exam:     { label: "Exam",     bg: "#FFF0F0", text: "#B91C1C", accent: "#F87171" },
  personal: { label: "Personal", bg: "#F0FDF4", text: "#15803D", accent: "#22C55E" },
  project:  { label: "Project",  bg: "#F5F3FF", text: "#6D28D9", accent: "#8B5CF6" },
  school:   { label: "School",   bg: "#F0F9FF", text: "#0369A1", accent: "#0EA5E9" },
  class:    { label: "Class",    bg: "#EFF6FF", text: "#1E40AF", accent: "#60A5FA" },
  errands:  { label: "Errands",  bg: "#FFF7ED", text: "#C2410C", accent: "#F97316" },
  workout:  { label: "Workout",  bg: "#F0FDF4", text: "#166534", accent: "#4ADE80" },
};

const CAL_TYPES: EventType[] = ["personal", "school", "exam", "class", "errands", "workout"];

const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: "none",    label: "Does not repeat" },
  { value: "daily",   label: "Every day" },
  { value: "weekly",  label: "Every week" },
  { value: "monthly", label: "Every month" },
];

// ─── Event Form Fields (shared by Add + Edit modals) ──────────────────────────

function EventForm({
  title, setTitle,
  type, setType,
  eventDate, setEventDate,
  allDay, setAllDay,
  startTime, setStartTime,
  endTime, setEndTime,
  recurrence, setRecurrence,
  recurrenceEnd, setRecurrenceEnd,
  saving, onSubmit, submitLabel,
}: {
  title: string; setTitle: (v: string) => void;
  type: EventType; setType: (v: EventType) => void;
  eventDate: string; setEventDate: (v: string) => void;
  allDay: boolean; setAllDay: (v: boolean) => void;
  startTime: string; setStartTime: (v: string) => void;
  endTime: string; setEndTime: (v: string) => void;
  recurrence: Recurrence; setRecurrence: (v: Recurrence) => void;
  recurrenceEnd: string; setRecurrenceEnd: (v: string) => void;
  saving: boolean; onSubmit: () => void; submitLabel: string;
}) {
  return (
    <div className="space-y-3">
      <input autoFocus type="text" placeholder="Event title" value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        className="w-full px-3 py-2 rounded-xl text-[14px] outline-none"
        style={{ background: N.hover, border: `1px solid ${N.border}`, color: N.text }} />

      {/* Date */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: N.muted }}>Date</p>
        <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)}
          className="w-full px-3 py-1.5 rounded-xl text-[13px] outline-none"
          style={{ background: N.hover, border: `1px solid ${N.border}`, color: N.text }} />
      </div>

      {/* All-day toggle */}
      <button onClick={() => setAllDay(!allDay)}
        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl transition-colors text-[13px]"
        style={{ background: allDay ? N.selected : N.hover, color: N.text }}>
        <div className="w-8 h-5 rounded-full relative transition-colors flex-shrink-0"
          style={{ background: allDay ? N.accent : N.border }}>
          <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
            style={{ left: allDay ? "calc(100% - 18px)" : 2 }} />
        </div>
        All day
      </button>

      {/* Type */}
      <div className="flex flex-wrap gap-1.5">
        {CAL_TYPES.map((k) => (
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

      {/* Times — hidden when all day */}
      {!allDay && (
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
      )}

      {/* Recurrence */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: N.muted }}>Repeat</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {RECURRENCE_OPTIONS.map((r) => (
            <button key={r.value} onClick={() => setRecurrence(r.value)}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
              style={{
                background: recurrence === r.value ? N.selected : N.hover,
                color: recurrence === r.value ? N.accent : N.muted,
                border: recurrence === r.value ? `1.5px solid ${N.accent}` : "1.5px solid transparent",
              }}>
              {r.label}
            </button>
          ))}
        </div>
        {recurrence !== "none" && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: N.muted }}>Repeat until</p>
            <input type="date" value={recurrenceEnd} onChange={(e) => setRecurrenceEnd(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl text-[13px] outline-none"
              style={{ background: N.hover, border: `1px solid ${N.border}`, color: N.text }} />
          </div>
        )}
      </div>

      <button
        onClick={onSubmit}
        disabled={saving || !title.trim()}
        className="w-full py-2.5 rounded-xl text-[13px] font-semibold transition-colors disabled:opacity-40"
        style={{ background: N.text, color: "white" }}>
        {saving ? "Saving…" : submitLabel}
      </button>
    </div>
  );
}

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
  const [allDay, setAllDay] = useState(false);
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [recurrenceEnd, setRecurrenceEnd] = useState("");
  const [saving, setSaving] = useState(false);

  const [y, m, d] = date.split("-").map(Number);
  const label = new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onAdd({
      date: eventDate,
      title: title.trim(),
      start_time: allDay ? "00:00" : startTime,
      end_time: allDay ? "23:59" : endTime,
      all_day: allDay,
      type,
      recurrence: recurrence === "none" ? null : recurrence,
      recurrence_end: recurrence !== "none" && recurrenceEnd ? recurrenceEnd : null,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center lg:justify-center">
      <div className="overlay-enter absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="modal-enter relative w-full lg:max-w-md rounded-t-2xl lg:rounded-2xl overflow-y-auto"
        style={{ background: N.bg, border: `1px solid ${N.border}`, boxShadow: "0 8px 40px rgba(0,0,0,0.14)", maxHeight: "92vh" }}>
        <div className="w-8 h-1 rounded-full mx-auto mt-3 lg:hidden" style={{ background: N.border }} />
        <div className="px-5 py-5 pb-10 lg:pb-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: N.muted }}>{label}</p>
          <h3 className="text-[17px] font-bold mb-4" style={{ color: N.text }}>New Event</h3>
          <EventForm
            title={title} setTitle={setTitle}
            type={type} setType={setType}
            eventDate={eventDate} setEventDate={setEventDate}
            allDay={allDay} setAllDay={setAllDay}
            startTime={startTime} setStartTime={setStartTime}
            endTime={endTime} setEndTime={setEndTime}
            recurrence={recurrence} setRecurrence={setRecurrence}
            recurrenceEnd={recurrenceEnd} setRecurrenceEnd={setRecurrenceEnd}
            saving={saving} onSubmit={handleSubmit} submitLabel="Add Event"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Edit Event Modal ──────────────────────────────────────────────────────────

function EditEventModal({ event, onClose, onSave }: {
  event: CalendarEvent;
  onClose: () => void;
  onSave: (id: string, updates: Omit<CalendarEvent, "id" | "created_at">) => Promise<void>;
}) {
  const [title, setTitle] = useState(event.title);
  const [type, setType] = useState<EventType>(event.type);
  const [eventDate, setEventDate] = useState(event.date);
  const [allDay, setAllDay] = useState(event.all_day ?? false);
  const [startTime, setStartTime] = useState(event.start_time || "09:00");
  const [endTime, setEndTime] = useState(event.end_time || "10:00");
  const [recurrence, setRecurrence] = useState<Recurrence>(event.recurrence ?? "none");
  const [recurrenceEnd, setRecurrenceEnd] = useState(event.recurrence_end ?? "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onSave(event.id, {
      date: eventDate,
      title: title.trim(),
      start_time: allDay ? "00:00" : startTime,
      end_time: allDay ? "23:59" : endTime,
      all_day: allDay,
      type,
      recurrence: recurrence === "none" ? null : recurrence,
      recurrence_end: recurrence !== "none" && recurrenceEnd ? recurrenceEnd : null,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center lg:justify-center">
      <div className="overlay-enter absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="modal-enter relative w-full lg:max-w-md rounded-t-2xl lg:rounded-2xl overflow-y-auto"
        style={{ background: N.bg, border: `1px solid ${N.border}`, boxShadow: "0 8px 40px rgba(0,0,0,0.14)", maxHeight: "92vh" }}>
        <div className="w-8 h-1 rounded-full mx-auto mt-3 lg:hidden" style={{ background: N.border }} />
        <div className="px-5 py-5 pb-10 lg:pb-5">
          <h3 className="text-[17px] font-bold mb-4" style={{ color: N.text }}>Edit Event</h3>
          <EventForm
            title={title} setTitle={setTitle}
            type={type} setType={setType}
            eventDate={eventDate} setEventDate={setEventDate}
            allDay={allDay} setAllDay={setAllDay}
            startTime={startTime} setStartTime={setStartTime}
            endTime={endTime} setEndTime={setEndTime}
            recurrence={recurrence} setRecurrence={setRecurrence}
            recurrenceEnd={recurrenceEnd} setRecurrenceEnd={setRecurrenceEnd}
            saving={saving} onSubmit={handleSubmit} submitLabel="Save Changes"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Expand recurring events for a given month ───────────────────────────────

function expandRecurring(events: CalendarEvent[], year: number, month: number): CalendarEvent[] {
  const result: CalendarEvent[] = [];
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);

  for (const ev of events) {
    if (!ev.recurrence || ev.recurrence === "none") {
      result.push(ev);
      continue;
    }

    const origin = new Date(ev.date + "T12:00:00");
    const endDate = ev.recurrence_end ? new Date(ev.recurrence_end + "T23:59:59") : new Date(year + 2, 0, 1);

    // Walk from origin, stepping by recurrence interval, collecting dates in this month
    const cur = new Date(origin);
    let iterations = 0;

    while (cur <= lastOfMonth && cur <= endDate && iterations < 3650) {
      iterations++;
      if (cur >= firstOfMonth) {
        const ds = toDateStr(cur);
        if (ds !== ev.date) { // don't double-add the original
          result.push({ ...ev, id: `${ev.id}__${ds}`, date: ds });
        } else {
          result.push(ev);
        }
      }

      if (ev.recurrence === "daily")        cur.setDate(cur.getDate() + 1);
      else if (ev.recurrence === "weekly")  cur.setDate(cur.getDate() + 7);
      else if (ev.recurrence === "monthly") cur.setMonth(cur.getMonth() + 1);
      else break;
    }
  }

  return result;
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
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    supabase.from("calendar_entries").select("*").order("start_time")
      .then(({ data }) => { if (data) setEvents(data as CalendarEvent[]); });
  }, []);

  const addEvent = async (event: Omit<CalendarEvent, "id" | "created_at">) => {
    const { data } = await supabase.from("calendar_entries").insert(event).select().single();
    if (data) setEvents((p) => [...p, data as CalendarEvent].sort((a, b) => a.start_time.localeCompare(b.start_time)));
    setModal(false);
  };

  const updateEvent = async (id: string, updates: Omit<CalendarEvent, "id" | "created_at">) => {
    // Handle synthetic recurring IDs (e.g. "realId__2025-03-14") — edit the real record
    const realId = id.includes("__") ? id.split("__")[0] : id;
    const { data } = await supabase.from("calendar_entries").update(updates).eq("id", realId).select().single();
    if (data) setEvents((p) => p.map((e) => e.id === realId ? data as CalendarEvent : e));
    setEditingEvent(null);
  };

  const deleteEvent = async (id: string) => {
    const realId = id.includes("__") ? id.split("__")[0] : id;
    setEvents((p) => p.filter((e) => e.id !== realId));
    await supabase.from("calendar_entries").delete().eq("id", realId);
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

  // Expand recurring events for the visible month
  const expandedEvents = useMemo(
    () => expandRecurring(events, viewYear, viewMonth),
    [events, viewYear, viewMonth]
  );

  const eventsByDate = useMemo(() => {
    const m: Record<string, CalendarEvent[]> = {};
    expandedEvents.forEach((e) => { if (!m[e.date]) m[e.date] = []; m[e.date].push(e); });
    return m;
  }, [expandedEvents]);

  const selectedEvents = useMemo(
    () => expandedEvents.filter((e) => e.date === selectedDate).sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [expandedEvents, selectedDate]
  );

  const [selY, selM, selD] = selectedDate.split("-").map(Number);
  const selObj = new Date(selY, selM - 1, selD);

  // Find the real event object for editing (not synthetic recurring copy)
  const findRealEvent = (id: string) => {
    const realId = id.includes("__") ? id.split("__")[0] : id;
    return events.find((e) => e.id === realId) ?? null;
  };

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
                          className="truncate text-[10px] px-1.5 py-0.5 rounded-md font-medium flex items-center gap-0.5"
                          style={{ background: t.bg, color: t.text }}>
                          {ev.recurrence && ev.recurrence !== "none" && (
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                              <path d="M1 4V10H7M20.49 9C19.24 5.46 15.87 3 12 3C7.21 3 3.47 6.81 3.05 11.5M3.51 15C4.76 18.54 8.13 21 12 21C16.79 21 20.53 17.19 20.95 12.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                          <span className="truncate">{ev.title}</span>
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
                    <p className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: N.muted }}>
                      {ev.all_day ? "All day" : `${formatTime(ev.start_time)}${ev.end_time ? ` – ${formatTime(ev.end_time)}` : ""}`}
                      {ev.recurrence && ev.recurrence !== "none" && (
                        <span className="flex items-center gap-0.5">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                            <path d="M1 4V10H7M20.49 9C19.24 5.46 15.87 3 12 3C7.21 3 3.47 6.81 3.05 11.5M3.51 15C4.76 18.54 8.13 21 12 21C16.79 21 20.53 17.19 20.95 12.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {ev.recurrence}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-lg font-semibold flex-shrink-0"
                    style={{ background: "white", color: t.text }}>
                    {t.label}
                  </span>
                  {/* Edit button */}
                  <button
                    onClick={() => { const real = findRealEvent(ev.id); if (real) setEditingEvent(real); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    style={{ color: N.muted }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = N.accent)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = N.muted)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {/* Delete button */}
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

      {/* ── Modals ── */}
      {modal && <AddEventModal date={selectedDate} onClose={() => setModal(false)} onAdd={addEvent} />}
      {editingEvent && <EditEventModal event={editingEvent} onClose={() => setEditingEvent(null)} onSave={updateEvent} />}
    </div>
  );
}
