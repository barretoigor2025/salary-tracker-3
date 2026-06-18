import { useState } from "react";
import { BottomSheet } from "./ui.jsx";
import { exportBackup, parseBackup } from "../utils/backup.js";

export function BackupModal({ entries, settings, gastos, carro, auditHistory, extras, onRestore, onClose }) {
  const [tab, setTab] = useState("export");
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [backupJson, setBackupJson] = useState(null);
  const [confirm, setConfirm] = useState(false);

  const lastBackupKey = "jst3_last_backup";
  const lastBackup = localStorage.getItem(lastBackupKey);
  const daysSince = lastBackup ? Math.floor((Date.now() - new Date(lastBackup)) / 86400000) : null;
  const cardCount = extras?.cartao?.lancamentos?.length || 0;
  const taxCount = extras?.taxPayments?.reduce((s, p) => s + (p.parcelas?.length || 0), 0) || 0;

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try { setPreview(parseBackup(e.target.result)); setError(null); }
      catch { setError("Arquivo inválido. Use um backup gerado por este app."); setPreview(null); }
    };
    reader.readAsText(file);
  }

  function doExport() {
    const json = exportBackup(entries, settings, gastos, carro, auditHistory, extras);
    localStorage.setItem(lastBackupKey, new Date().toISOString());
    setBackupJson(json);
  }

  function doRestore() {
    onRestore(preview);
    onClose();
  }

  return (
    <BottomSheet onClose={onClose} title="💾 Backup & Restauração">
      <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
        {[{ id: "export", label: "⬇ Exportar" }, { id: "import", label: "⬆ Importar" }].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-2.5 text-sm font-medium transition-colors"
            style={tab === t.id
              ? { color: "var(--text)", borderBottom: "2px solid var(--text)" }
              : { color: "var(--text-muted)" }
            }
          >{t.label}</button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {tab === "export" && (
          <>
            <div className="rounded-xl p-3 space-y-2" style={{ background: "var(--bg-elevated)" }}>
              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--text-sub)" }}>Lançamentos de turno</span>
                <span className="font-mono font-bold" style={{ color: "var(--text)" }}>{entries.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--text-sub)" }}>Cartão</span>
                <span className="font-mono font-bold" style={{ color: "var(--cc)" }}>{cardCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--text-sub)" }}>Impostos/parcelas</span>
                <span className="font-mono font-bold" style={{ color: "var(--warning)" }}>{taxCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--text-sub)" }}>Último backup</span>
                <span className="font-mono text-xs" style={{ color: daysSince === null ? "var(--negative)" : daysSince > 7 ? "var(--warning)" : "var(--positive)" }}>
                  {daysSince === null ? "nunca ⚠️" : daysSince === 0 ? "hoje ✓" : `há ${daysSince} dias`}
                </span>
              </div>
            </div>

            {daysSince === null && (
              <div className="rounded-xl p-3 text-xs" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "var(--negative)" }}>
                ⚠️ Nenhum backup feito ainda. Se o browser limpar os dados, você perde tudo.
              </div>
            )}

            <div className="rounded-xl p-3 text-xs space-y-1" style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
              <div>• Backup V5 salva turnos, gastos, cartão, veículos, impostos e Gensen</div>
              <div>• Compatível com backups antigos: V2/V3/V4 continuam abrindo</div>
              <div>• Salve no celular ou mande no WhatsApp pra você mesmo</div>
            </div>

            <button onClick={doExport} className="w-full py-2.5 rounded-xl font-bold text-sm" style={{ background: "var(--text)", color: "var(--bg)" }}>
              ⬇ Baixar Backup Completo
            </button>

            {backupJson && (
              <div className="space-y-2">
                <div className="text-xs" style={{ color: "var(--positive)" }}>✓ Backup V5 gerado! Se o download não abriu, copie abaixo:</div>
                <div className="relative">
                  <textarea
                    readOnly value={backupJson} rows={4}
                    className="w-full rounded-lg p-2 text-xs font-mono resize-none focus:outline-none"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-mid)", color: "var(--text-sub)" }}
                    onClick={e => { e.target.select(); }}
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(backupJson)}
                    className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border-mid)", color: "var(--text-sub)" }}
                  >Copiar</button>
                </div>
              </div>
            )}
          </>
        )}

        {tab === "import" && (
          <>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
              onClick={() => document.getElementById("backup-file-input-v3").click()}
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
              style={{ borderColor: dragOver ? "var(--text)" : "var(--border-mid)" }}
            >
              <div className="text-2xl mb-2">📂</div>
              <div className="text-sm" style={{ color: "var(--text-sub)" }}>Arraste o arquivo ou clique para escolher</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>jst-backup-XXXX-XX-XX.json</div>
              <input id="backup-file-input-v3" type="file" accept=".json" className="hidden" onChange={e => handleFile(e.target.files[0])} />
            </div>

            {error && <div className="rounded-xl p-3 text-xs" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "var(--negative)" }}>{error}</div>}

            {preview && (
              <div className="rounded-xl p-3 space-y-1.5" style={{ background: "var(--bg-elevated)" }}>
                <div className="text-xs font-semibold" style={{ color: "var(--positive)" }}>✓ Arquivo válido</div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--text-sub)" }}>Versão</span>
                  <span className="font-mono font-bold" style={{ color: "var(--text)" }}>V{preview.version || "?"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--text-sub)" }}>Turnos</span>
                  <span className="font-mono font-bold" style={{ color: "var(--text)" }}>{preview.entries.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--text-sub)" }}>Cartão</span>
                  <span className="font-mono font-bold" style={{ color: "var(--cc)" }}>{preview.cartao?.lancamentos?.length || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--text-sub)" }}>Veículos / impostos</span>
                  <span className="font-mono font-bold" style={{ color: "var(--warning)" }}>{preview.taxVehicles?.length || 0} / {preview.taxPayments?.length || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--text-sub)" }}>Data do backup</span>
                  <span className="text-xs font-mono" style={{ color: "var(--text-sub)" }}>{new Date(preview.exportedAt).toLocaleString("pt-BR")}</span>
                </div>
                {preview.settings?.name && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: "var(--text-sub)" }}>Trabalhador</span>
                    <span style={{ color: "var(--text)" }}>{preview.settings.name}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--text-sub)" }}>Dados atuais</span>
                  <span className="font-mono text-xs" style={{ color: "var(--negative)" }}>{entries.length} → {preview.entries.length}</span>
                </div>
              </div>
            )}

            {!confirm ? (
              <button
                onClick={() => preview && setConfirm(true)}
                disabled={!preview}
                className="w-full py-2.5 rounded-xl font-bold text-sm disabled:opacity-40"
                style={{ background: "var(--info)", color: "#fff" }}
              >⬆ Restaurar este Backup</button>
            ) : (
              <div className="rounded-xl p-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
                <p className="text-sm text-center mb-2" style={{ color: "var(--negative)" }}>Isso substitui todos os dados atuais ({entries.length} turnos). Tem certeza?</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirm(false)} className="flex-1 py-2 rounded-lg text-xs" style={{ border: "1px solid var(--border-mid)", color: "var(--text-sub)" }}>Cancelar</button>
                  <button onClick={doRestore} className="flex-1 py-2 rounded-lg font-bold text-xs" style={{ background: "var(--negative)", color: "#fff" }}>Sim, restaurar</button>
                </div>
              </div>
            )}

            <div className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
              ⚠️ A restauração substitui tudo. Faça um export antes se quiser preservar os dados atuais.
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
