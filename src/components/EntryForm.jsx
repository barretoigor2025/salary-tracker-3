import { useState, useMemo } from "react";
import { Input, BottomSheet, Pills } from "./ui.jsx";
import { calcDay, DAY_TYPES, checkConflict } from "../utils/calc.js";
import { YEN, formatMinutes } from "../utils/fmt.js";

export function EntryForm({ initial, settings, onSave, onClose, entries = [] }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState(initial || {
    date: today, start: "09:00", end: "18:00", breakMinutes: settings.defaultBreak || 60,
    dayType: "normal", note: "",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const calc = useMemo(() => {
    try { return calcDay(form, settings); } catch { return null; }
  }, [form, settings]);

  const conflict = form.dayType !== "yukyu" ? checkConflict(form, entries, initial?.id) : null;

  const breakOptions = [
    { value: 0, label: "Sem" },
    { value: 30, label: "30m" },
    { value: 45, label: "45m" },
    { value: 60, label: "1h" },
  ];

  function handleSave() {
    onSave({ ...form, breakMinutes: Number(form.breakMinutes), id: initial?.id || Date.now().toString() });
  }

  return (
    <BottomSheet onClose={onClose} title={initial ? "Editar Lançamento" : "Novo Lançamento"}>
      <div className="p-4 space-y-4">
        <Input label="Data" type="date" value={form.date} onChange={e => set("date", e.target.value)} />

        {/* Day type */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Tipo de Dia</label>
          <div className="flex gap-2">
            <select
              value={form.dayType}
              onChange={e => set("dayType", e.target.value)}
              className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-mid)", color: "var(--text)" }}
            >
              {DAY_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
            <button
              onClick={() => setForm(f => ({ ...f, dayType: "normal", start: "05:45", end: "17:00", breakMinutes: 60 }))}
              className="px-2.5 py-2 rounded-lg text-xs font-bold border-2 transition-all whitespace-nowrap"
              style={{
                borderColor: "var(--warning)",
                background: form.start === "05:45" && form.end === "17:00" ? "var(--warning)" : "transparent",
                color: form.start === "05:45" && form.end === "17:00" ? "var(--bg)" : "var(--warning)",
              }}
            >☀️ 昼勤</button>
            <button
              onClick={() => setForm(f => ({ ...f, dayType: "normal", start: "17:00", end: "03:45", breakMinutes: 60 }))}
              className="px-2.5 py-2 rounded-lg text-xs font-bold border-2 transition-all whitespace-nowrap"
              style={{
                borderColor: "var(--night)",
                background: form.start === "17:00" && form.end === "03:45" ? "var(--night)" : "transparent",
                color: form.start === "17:00" && form.end === "03:45" ? "#fff" : "var(--night)",
              }}
            >🌙 夜勤</button>
          </div>
        </div>

        {form.dayType !== "yukyu" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Entrada" type="time" value={form.start} onChange={e => set("start", e.target.value)} />
              <Input label="Saída" type="time" value={form.end} onChange={e => set("end", e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Intervalo</label>
              <div className="flex gap-2 items-center">
                <Pills
                  options={breakOptions}
                  value={breakOptions.find(b => b.value === Number(form.breakMinutes))?.value ?? -1}
                  onChange={v => set("breakMinutes", v)}
                />
                <input
                  type="number" min="0" max="480"
                  value={form.breakMinutes}
                  onChange={e => set("breakMinutes", e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-16 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-mid)", color: "var(--text)" }}
                />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>min</span>
              </div>
            </div>
          </>
        )}

        <Input label="Observação" value={form.note} onChange={e => set("note", e.target.value)} placeholder="opcional" />

        {/* Conflict warning */}
        {conflict && (
          <div className="rounded-xl p-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <div className="text-xs font-semibold" style={{ color: "var(--negative)" }}>⚠️ Conflito de horário</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--negative)" }}>{conflict.message}</div>
          </div>
        )}

        {/* Yukyu preview */}
        {form.dayType === "yukyu" && (
          <div className="rounded-xl p-3 text-center" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <div className="text-sm font-semibold" style={{ color: "var(--positive)" }}>有給休暇 — 8h remuneradas</div>
            <div className="text-lg font-mono font-bold mt-1" style={{ color: "var(--positive)" }}>{YEN(8 * settings.hourlyRate)}</div>
          </div>
        )}

        {/* Quick preview */}
        {form.dayType !== "yukyu" && calc && calc.totalHours > 0 && (
          <div className="rounded-xl p-3" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Total</div>
                <div className="text-sm font-mono font-bold" style={{ color: "var(--text)" }}>{formatMinutes(calc.totalMin)}</div>
              </div>
              <div>
                <div className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>HE</div>
                <div className="text-sm font-mono font-bold" style={{ color: "var(--warning)" }}>{formatMinutes(calc.overtimeDailyMin)}</div>
              </div>
              <div>
                <div className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Bruto</div>
                <div className="text-sm font-mono font-bold" style={{ color: "var(--positive)" }}>{YEN(calc.grossPay)}</div>
              </div>
            </div>
            {calc.nightHours > 0 && (
              <div className="mt-2 text-xs text-center" style={{ color: "var(--night)" }}>🌙 {formatMinutes(calc.nightMin)} noturno</div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2 px-4 pb-4">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm" style={{ border: "1px solid var(--border-mid)", color: "var(--text-sub)" }}>Cancelar</button>
        <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl font-semibold text-sm" style={{ background: "var(--text)", color: "var(--bg)" }}>Salvar</button>
      </div>
    </BottomSheet>
  );
}
