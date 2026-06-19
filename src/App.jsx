import { useState, useEffect } from "react";
import { useEntries } from "./hooks/useEntries.js";
import { useSettings } from "./hooks/useSettings.js";
import { useGastos } from "./hooks/useGastos.js";
import { useCarro } from "./hooks/useCarro.js";
import { useAudit } from "./hooks/useAudit.js";
import { useExtras } from "./hooks/useExtras.js";
import { dbSet } from "./db/db.js";
import { Spinner } from "./components/ui.jsx";
import { BackupModal } from "./components/BackupModal.jsx";
import { Dashboard } from "./screens/Dashboard.jsx";
import { Entries } from "./screens/Entries.jsx";
import { Reports } from "./screens/Reports.jsx";
import { Gastos } from "./screens/Gastos.jsx";
import { SuperFinance } from "./screens/SuperFinance.jsx";
import { Settings } from "./screens/Settings.jsx";
import { Cartao } from "./screens/Cartao.jsx";
import { Impostos } from "./screens/Impostos.jsx";
import { normalizeExtras } from "./utils/backup.js";

const TABS = [
  { id: "dashboard", label: "Início",   icon: "🏠" },
  { id: "entries",   label: "Jornada",  icon: "🕐" },
  { id: "finance",   label: "Análise",  icon: "🧠" },
  { id: "reports",   label: "Relat.",   icon: "📊" },
  { id: "cartao",    label: "Cartão",   icon: "💳" },
  { id: "gastos",    label: "Gastos",   icon: "💰" },
  { id: "impostos",  label: "Taxas",    icon: "🏛️" },
  { id: "config",    label: "Config",   icon: "⚙️" },
];

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [theme, setTheme] = useState(() => localStorage.getItem("jst3_theme") || "dark");
  const [showBackup, setShowBackup] = useState(false);

  const { entries, addEntry, deleteEntry, setEntries, loading: le } = useEntries();
  const { settings, setSettings, loading: ls } = useSettings();
  const { gastos, setGastos, loading: lg } = useGastos();
  const { carro, setCarro, loading: lc } = useCarro();
  const { auditHistory, setAuditHistory, loading: la } = useAudit();
  const { extras, setExtras, loading: lx } = useExtras();

  const loading = le || ls || lg || lc || la || lx;

  useEffect(() => {
    localStorage.setItem("jst3_theme", theme);
    document.body.style.background = theme === "dark" ? "#0a0a0a" : "#f5f5f5";
    document.body.style.color = theme === "dark" ? "#f0f0f0" : "#0f0f0f";
  }, [theme]);

  const lastBackup = localStorage.getItem("jst3_last_backup");
  const daysSince = lastBackup ? Math.floor((Date.now() - new Date(lastBackup)) / 86400000) : null;
  const backupAlert = daysSince === null || daysSince > 7;

  async function handleRestore(data) {
    const restoredExtras = normalizeExtras(data);
    if (data.entries) { await dbSet("entries", data.entries); setEntries(data.entries); }
    if (data.settings) { await dbSet("settings", data.settings); setSettings(s => ({ ...s, ...data.settings })); }
    if (data.gastos) { await dbSet("gastos", data.gastos); setGastos(g => ({ ...g, ...data.gastos })); }
    if (data.carro) { await dbSet("carro", data.carro); setCarro(c => ({ ...c, ...data.carro })); }
    if (data.auditHistory) { await dbSet("auditHistory", data.auditHistory); setAuditHistory(data.auditHistory); }
    await dbSet("extras", restoredExtras);
    setExtras(restoredExtras);
  }

  if (loading) {
    return (
      <div className={`theme-${theme} min-h-screen flex items-center justify-center`} style={{ background: "var(--bg)" }}>
        <Spinner />
      </div>
    );
  }

  return (
    <div className={`theme-${theme} min-h-screen flex flex-col`} style={{ background: "var(--bg)" }}>
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b"
        style={{ background: "var(--nav-bg)", borderColor: "var(--nav-border)", backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">⛩️</span>
          <span className="text-sm font-bold" style={{ color: "var(--text)" }}>Japan Salary Tracker</span>
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--border-mid)" }}>v5</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBackup(true)}
            className="relative px-2.5 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "var(--bg-elevated)", border: `1px solid ${backupAlert ? "var(--negative)" : "var(--border-mid)"}`, color: backupAlert ? "var(--negative)" : "var(--text-sub)" }}
          >
            💾
            {backupAlert && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ background: "var(--negative)" }} />}
          </button>
          <button
            onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-sm"
            style={{ background: "var(--bg-elevated)", color: "var(--text-sub)" }}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-4 max-w-lg mx-auto w-full">
        {tab === "dashboard" && <Dashboard entries={entries} settings={settings} onAddEntry={addEntry} />}
        {tab === "entries" && <Entries entries={entries} settings={settings} onAddEntry={addEntry} onDeleteEntry={deleteEntry} />}
        {tab === "finance" && <SuperFinance entries={entries} settings={settings} gastos={gastos} extras={extras} />}
        {tab === "cartao" && <Cartao extras={extras} setExtras={setExtras} />}
        {tab === "gastos" && <Gastos gastos={gastos} setGastos={setGastos} carro={carro} setCarro={setCarro} />}
        {tab === "reports" && <Reports entries={entries} settings={settings} />}
        {tab === "impostos" && <Impostos extras={extras} setExtras={setExtras} />}
        {tab === "config" && <Settings settings={settings} setSettings={setSettings} entries={entries} auditHistory={auditHistory} setAuditHistory={setAuditHistory} />}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t"
        style={{ background: "var(--nav-bg)", borderColor: "var(--nav-border)", backdropFilter: "blur(12px)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex max-w-lg mx-auto overflow-x-auto">
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} className="min-w-0 flex-1 flex flex-col items-center gap-0 py-1.5 transition-colors">
                <span className="text-sm leading-none">{t.icon}</span>
                <span className="font-medium leading-tight" style={{ fontSize: 9, color: active ? "var(--nav-active)" : "var(--nav-inactive)" }}>{t.label}</span>
                {active && <span className="w-4 h-0.5 rounded-full" style={{ background: "var(--nav-active)" }} />}
              </button>
            );
          })}
        </div>
      </nav>

      {showBackup && (
        <BackupModal
          entries={entries}
          settings={settings}
          gastos={gastos}
          carro={carro}
          auditHistory={auditHistory}
          extras={extras}
          onRestore={handleRestore}
          onClose={() => setShowBackup(false)}
        />
      )}
    </div>
  );
}
