import { useState } from "react";
import { Card, SectionLabel, Badge, BottomSheet, Input } from "../components/ui.jsx";
import { YEN, fmtDate } from "../utils/fmt.js";

function nanoid() { return Math.random().toString(36).slice(2, 10); }

// ── Juumin Zei estimate from annual income ────────────────────────────────────
// Japan standard salary income deduction (給与所得控除)
function salaryIncomeDeduction(salary) {
  if (salary <= 1625000) return 550000;
  if (salary <= 1800000) return Math.round(salary * 0.40 - 100000);
  if (salary <= 3600000) return Math.round(salary * 0.30 + 80000);
  if (salary <= 6600000) return Math.round(salary * 0.20 + 440000);
  if (salary <= 8500000) return Math.round(salary * 0.10 + 1100000);
  return 1950000;
}

function calcJuuminZei(gross, shakaiHoken) {
  if (!gross) return null;
  const salaryIncome = Math.max(0, gross - salaryIncomeDeduction(gross));
  const socialDed = shakaiHoken || 0;
  const basicDed = 480000; // 基礎控除
  const taxable = Math.max(0, salaryIncome - socialDed - basicDed);
  const annual = Math.round(taxable * 0.10) + 5500; // 10% + 均等割
  return { annual, monthly: Math.round(annual / 12), taxable, salaryIncome };
}

// ── Main screen ───────────────────────────────────────────────────────────────
export function Impostos({ extras, setExtras }) {
  const gensen = extras.gensen || [];
  const taxVehicles = extras.taxVehicles || [];
  const taxPayments = extras.taxPayments || [];

  const sortedGensen = [...gensen].sort((a, b) => (b.nenBun || 0) - (a.nenBun || 0));

  // UI state
  const [showGensenForm, setShowGensenForm] = useState(false);
  const [editGensenKey, setEditGensenKey] = useState(null);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentVehicleId, setPaymentVehicleId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // { type, key }

  const [gensenForm, setGensenForm] = useState({ nenBun: new Date().getFullYear() - 1, empresa: "", shiharaiGaku: "", gensenZei: "", shakaiHoken: "" });
  const [vehicleName, setVehicleName] = useState("");
  const [paymentForm, setPaymentForm] = useState({ year: new Date().getFullYear(), total: "", installments: "1", firstDue: `${new Date().getFullYear()}-05-31` });

  function update(fn) {
    setExtras(prev => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }

  // ── Gensen CRUD ──────────────────────────────────────────────────────────────
  function gensenKey(g) { return g.id || String(g.nenBun); }

  function openAddGensen() {
    setEditGensenKey(null);
    setGensenForm({ nenBun: new Date().getFullYear() - 1, empresa: "", shiharaiGaku: "", gensenZei: "", shakaiHoken: "" });
    setShowGensenForm(true);
  }

  function openEditGensen(g) {
    setEditGensenKey(gensenKey(g));
    setGensenForm({ nenBun: g.nenBun || "", empresa: g.empresa || "", shiharaiGaku: g.shiharaiGaku || "", gensenZei: g.gensenZei || "", shakaiHoken: g.shakaiHoken || "" });
    setShowGensenForm(true);
  }

  function saveGensen() {
    const rec = {
      id: (editGensenKey && !editGensenKey.startsWith("undefined")) ? editGensenKey : nanoid(),
      nenBun: parseInt(gensenForm.nenBun) || new Date().getFullYear() - 1,
      empresa: gensenForm.empresa,
      shiharaiGaku: parseFloat(String(gensenForm.shiharaiGaku).replace(/[^0-9.]/g, "")) || 0,
      gensenZei: parseFloat(String(gensenForm.gensenZei).replace(/[^0-9.]/g, "")) || 0,
      shakaiHoken: parseFloat(String(gensenForm.shakaiHoken).replace(/[^0-9.]/g, "")) || 0,
    };
    update(next => {
      const idx = editGensenKey ? next.gensen.findIndex(g => gensenKey(g) === editGensenKey) : -1;
      if (idx !== -1) next.gensen[idx] = rec;
      else next.gensen.push(rec);
    });
    setShowGensenForm(false);
  }

  function deleteGensen(g) {
    const key = gensenKey(g);
    update(next => { next.gensen = next.gensen.filter(x => gensenKey(x) !== key); });
  }

  // ── Vehicle CRUD ─────────────────────────────────────────────────────────────
  function addVehicle() {
    if (!vehicleName.trim()) return;
    const v = { id: nanoid(), name: vehicleName.trim() };
    update(next => { next.taxVehicles.push(v); });
    setVehicleName("");
    setShowVehicleForm(false);
  }

  function deleteVehicle(id) {
    update(next => {
      next.taxVehicles = next.taxVehicles.filter(v => v.id !== id);
      next.taxPayments = next.taxPayments.filter(p => p.vehicleId !== id);
    });
  }

  // ── Tax payment CRUD ─────────────────────────────────────────────────────────
  function openAddPayment(vehicleId) {
    setPaymentVehicleId(vehicleId);
    setPaymentForm({ year: new Date().getFullYear(), total: "", installments: "1", firstDue: `${new Date().getFullYear()}-05-31` });
    setShowPaymentForm(true);
  }

  function savePayment() {
    const total = parseFloat(String(paymentForm.total).replace(/[^0-9.]/g, "")) || 0;
    if (!total || !paymentVehicleId) return;
    const n = Math.max(1, Math.min(12, parseInt(paymentForm.installments) || 1));
    const perInstall = Math.round(total / n);
    const firstDate = new Date((paymentForm.firstDue || `${paymentForm.year}-05-31`) + "T12:00:00");
    const parcelas = Array.from({ length: n }, (_, i) => {
      const d = new Date(firstDate);
      d.setMonth(d.getMonth() + i);
      return {
        num: i + 1,
        value: i < n - 1 ? perInstall : total - perInstall * (n - 1),
        dueDate: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        paid: false,
        paidDate: null,
      };
    });
    update(next => {
      const yr = parseInt(paymentForm.year);
      const existing = next.taxPayments.find(p => p.vehicleId === paymentVehicleId && p.year === yr);
      if (existing) {
        existing.parcelas = parcelas;
      } else {
        next.taxPayments.push({ id: nanoid(), vehicleId: paymentVehicleId, year: yr, parcelas });
      }
    });
    setShowPaymentForm(false);
  }

  function toggleParcela(vehicleId, year, parcelNum) {
    update(next => {
      const payment = next.taxPayments.find(p => p.vehicleId === vehicleId && p.year === year);
      if (!payment) return;
      const parcela = payment.parcelas.find(p => p.num === parcelNum);
      if (parcela) {
        parcela.paid = !parcela.paid;
        parcela.paidDate = parcela.paid ? new Date().toISOString().slice(0, 10) : null;
      }
    });
  }

  function deletePayment(vehicleId, year) {
    update(next => { next.taxPayments = next.taxPayments.filter(p => !(p.vehicleId === vehicleId && p.year === year)); });
  }

  // ── Preview juumin zei while typing ─────────────────────────────────────────
  const previewJZ = calcJuuminZei(
    parseFloat(String(gensenForm.shiharaiGaku).replace(/[^0-9.]/g, "")) || 0,
    parseFloat(String(gensenForm.shakaiHoken).replace(/[^0-9.]/g, "")) || 0,
  );

  return (
    <div className="space-y-3 pb-24">
      {/* Header */}
      <div>
        <div className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Controle</div>
        <h1 className="text-lg font-bold" style={{ color: "var(--text)" }}>Impostos</h1>
      </div>

      {/* ── Gensen / Holerites ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <SectionLabel>🧾 Holerites / 源泉徴収票</SectionLabel>
        <button
          onClick={openAddGensen}
          className="text-xs px-2.5 py-1 rounded-lg"
          style={{ background: "var(--bg-elevated)", color: "var(--text-sub)", border: "1px solid var(--border-mid)" }}
        >
          + Adicionar
        </button>
      </div>

      {sortedGensen.length === 0 && (
        <Card>
          <p className="text-xs py-3 text-center" style={{ color: "var(--text-muted)" }}>
            Nenhum holerite cadastrado. Adicione os dados do seu 源泉徴収票 para calcular 住民税.
          </p>
        </Card>
      )}

      {sortedGensen.map(g => {
        const jz = calcJuuminZei(g.shiharaiGaku, g.shakaiHoken);
        return (
          <Card key={gensenKey(g)}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                {g.nenBun} {g.empresa ? `· ${g.empresa}` : ""}
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => openEditGensen(g)} className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--bg-elevated)", color: "var(--text-sub)" }}>Editar</button>
                <button onClick={() => deleteGensen(g)} className="text-xs px-2 py-0.5 rounded" style={{ color: "var(--negative)" }}>×</button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              <div className="rounded-lg p-1.5" style={{ background: "var(--bg-elevated)" }}>
                <div className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Bruto anual</div>
                <div className="text-xs font-mono font-bold" style={{ color: "var(--positive)" }}>{YEN(g.shiharaiGaku)}</div>
              </div>
              <div className="rounded-lg p-1.5" style={{ background: "var(--bg-elevated)" }}>
                <div className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Gensen ret.</div>
                <div className="text-xs font-mono font-bold" style={{ color: "var(--negative)" }}>{YEN(g.gensenZei)}</div>
              </div>
              <div className="rounded-lg p-1.5" style={{ background: "var(--bg-elevated)" }}>
                <div className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Shakai Hoken</div>
                <div className="text-xs font-mono font-bold" style={{ color: "var(--warning)" }}>{YEN(g.shakaiHoken)}</div>
              </div>
            </div>
            {jz && (
              <div className="rounded-lg px-2.5 py-1.5" style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "var(--night)" }}>住民税 estimado {(g.nenBun || 0) + 1}</span>
                  <div>
                    <span className="text-xs font-mono font-bold" style={{ color: "var(--night)" }}>{YEN(jz.annual)}/ano</span>
                    <span className="text-xs font-mono ml-1.5" style={{ color: "var(--text-muted)" }}>({YEN(jz.monthly)}/mês)</span>
                  </div>
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Válido jun/{(g.nenBun || 0) + 1} – mai/{(g.nenBun || 0) + 2} · base tributável: {YEN(jz.taxable)}
                </div>
              </div>
            )}
          </Card>
        );
      })}

      {/* ── Vehicle taxes ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <SectionLabel>🚗 自動車税 — Imposto dos Veículos</SectionLabel>
        <button
          onClick={() => setShowVehicleForm(true)}
          className="text-xs px-2.5 py-1 rounded-lg"
          style={{ background: "var(--bg-elevated)", color: "var(--text-sub)", border: "1px solid var(--border-mid)" }}
        >
          + Veículo
        </button>
      </div>

      {taxVehicles.length === 0 && (
        <Card>
          <p className="text-xs py-3 text-center" style={{ color: "var(--text-muted)" }}>Nenhum veículo cadastrado.</p>
        </Card>
      )}

      {taxVehicles.map(vehicle => {
        const payments = taxPayments.filter(p => p.vehicleId === vehicle.id).sort((a, b) => b.year - a.year);
        const openTotal = payments.flatMap(p => p.parcelas || []).filter(p => !p.paid).reduce((s, p) => s + (p.value || 0), 0);
        const paidTotal = payments.flatMap(p => p.parcelas || []).filter(p => p.paid).reduce((s, p) => s + (p.value || 0), 0);

        return (
          <Card key={vehicle.id}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>🚗 {vehicle.name}</div>
                <div className="text-xs mt-0.5" style={{ color: openTotal > 0 ? "var(--warning)" : "var(--positive)" }}>
                  {openTotal > 0 ? `Em aberto: ${YEN(openTotal)}` : "Tudo pago ✓"}
                  {paidTotal > 0 && <span style={{ color: "var(--text-muted)" }}> · pago: {YEN(paidTotal)}</span>}
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => openAddPayment(vehicle.id)}
                  className="text-xs px-2 py-0.5 rounded"
                  style={{ background: "var(--bg-elevated)", color: "var(--text-sub)", border: "1px solid var(--border-mid)" }}
                >
                  + Pagamento
                </button>
                <button onClick={() => deleteVehicle(vehicle.id)} className="text-xs px-2 py-0.5 rounded" style={{ color: "var(--negative)" }}>×</button>
              </div>
            </div>

            {payments.map(payment => {
              const totalAmt = (payment.parcelas || []).reduce((s, p) => s + (p.value || 0), 0);
              const paidCount = (payment.parcelas || []).filter(p => p.paid).length;
              const total = (payment.parcelas || []).length;
              return (
                <div key={`${payment.vehicleId}-${payment.year}`} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium" style={{ color: "var(--text-sub)" }}>
                      Ano {payment.year} · {YEN(totalAmt)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Badge color={paidCount === total ? "green" : paidCount > 0 ? "yellow" : "red"}>
                        {paidCount}/{total} pagas
                      </Badge>
                      <button onClick={() => deletePayment(vehicle.id, payment.year)} className="text-xs" style={{ color: "var(--negative)" }}>×</button>
                    </div>
                  </div>
                  {(payment.parcelas || []).map(parcela => (
                    <button
                      key={parcela.num}
                      onClick={() => toggleParcela(vehicle.id, payment.year, parcela.num)}
                      className="w-full flex items-center justify-between py-1 border-b last:border-0 text-left"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div className="flex items-center gap-2">
                        <span style={{ color: parcela.paid ? "var(--positive)" : "var(--text-muted)", fontSize: 13 }}>
                          {parcela.paid ? "✓" : "○"}
                        </span>
                        <div>
                          <span className="text-xs" style={{ color: "var(--text-sub)" }}>Parcela {parcela.num}</span>
                          <span className="text-xs ml-1.5" style={{ color: "var(--text-muted)" }}>
                            {parcela.paid ? `pago ${fmtDate(parcela.paidDate)}` : `vence ${fmtDate(parcela.dueDate)}`}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-semibold" style={{ color: parcela.paid ? "var(--positive)" : "var(--warning)" }}>
                        {YEN(parcela.value)}
                      </span>
                    </button>
                  ))}
                </div>
              );
            })}

            {payments.length === 0 && (
              <p className="text-xs py-1 text-center" style={{ color: "var(--text-muted)" }}>Sem pagamentos registrados.</p>
            )}
          </Card>
        );
      })}

      {/* ── Gensen form modal ────────────────────────────────────────────────────── */}
      {showGensenForm && (
        <BottomSheet title={editGensenKey ? "Editar holerite" : "Adicionar holerite"} onClose={() => setShowGensenForm(false)}>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Ano (nenBun)"
                type="number"
                value={gensenForm.nenBun}
                onChange={e => setGensenForm(f => ({ ...f, nenBun: e.target.value }))}
              />
              <Input
                label="Empresa"
                value={gensenForm.empresa}
                onChange={e => setGensenForm(f => ({ ...f, empresa: e.target.value }))}
                placeholder="Nome da empresa"
              />
            </div>
            <Input
              label="Salário bruto anual — 支払金額 (¥)"
              type="number"
              value={gensenForm.shiharaiGaku}
              onChange={e => setGensenForm(f => ({ ...f, shiharaiGaku: e.target.value }))}
              placeholder="Ex: 3500000"
            />
            <Input
              label="Gensen retido — 源泉徴収税額 (¥)"
              type="number"
              value={gensenForm.gensenZei}
              onChange={e => setGensenForm(f => ({ ...f, gensenZei: e.target.value }))}
              placeholder="Ex: 45000"
            />
            <Input
              label="Shakai Hoken retido — 社会保険料等 (¥)"
              type="number"
              value={gensenForm.shakaiHoken}
              onChange={e => setGensenForm(f => ({ ...f, shakaiHoken: e.target.value }))}
              placeholder="Ex: 360000"
            />
            {previewJZ && previewJZ.annual > 0 && (
              <div className="rounded-lg p-2.5 text-xs" style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)", color: "var(--night)" }}>
                <div className="font-semibold mb-0.5">住民税 estimado ({parseInt(gensenForm.nenBun) + 1})</div>
                <div>{YEN(previewJZ.annual)}/ano · <strong>{YEN(previewJZ.monthly)}/mês</strong></div>
                <div style={{ color: "var(--text-muted)" }} className="mt-0.5">Base tributável: {YEN(previewJZ.taxable)}</div>
              </div>
            )}
            <button
              onClick={saveGensen}
              className="w-full py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: "var(--text)", color: "var(--bg)" }}
            >
              Salvar
            </button>
          </div>
        </BottomSheet>
      )}

      {/* ── Vehicle form modal ───────────────────────────────────────────────────── */}
      {showVehicleForm && (
        <BottomSheet title="Adicionar veículo" onClose={() => setShowVehicleForm(false)}>
          <div className="p-4 space-y-3">
            <Input
              label="Nome do veículo"
              value={vehicleName}
              onChange={e => setVehicleName(e.target.value)}
              placeholder="Ex: Truck Honda, Carro Família..."
            />
            <button onClick={addVehicle} className="w-full py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--text)", color: "var(--bg)" }}>
              Adicionar
            </button>
          </div>
        </BottomSheet>
      )}

      {/* ── Payment form modal ───────────────────────────────────────────────────── */}
      {showPaymentForm && (
        <BottomSheet title="Registrar pagamento de imposto" onClose={() => setShowPaymentForm(false)}>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Ano"
                type="number"
                value={paymentForm.year}
                onChange={e => setPaymentForm(f => ({ ...f, year: e.target.value }))}
              />
              <Input
                label="Nº de parcelas"
                type="number"
                min="1"
                max="12"
                value={paymentForm.installments}
                onChange={e => setPaymentForm(f => ({ ...f, installments: e.target.value }))}
              />
            </div>
            <Input
              label="Valor total (¥)"
              type="number"
              value={paymentForm.total}
              onChange={e => setPaymentForm(f => ({ ...f, total: e.target.value }))}
              placeholder="Ex: 45000"
            />
            <Input
              label="Data do 1º vencimento"
              type="date"
              value={paymentForm.firstDue}
              onChange={e => setPaymentForm(f => ({ ...f, firstDue: e.target.value }))}
            />
            {paymentForm.total && parseInt(paymentForm.installments) > 1 && (
              <div className="rounded-lg p-2 text-xs" style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
                {paymentForm.installments}× de {YEN(Math.round((parseFloat(paymentForm.total) || 0) / parseInt(paymentForm.installments)))} mensais a partir de {paymentForm.firstDue}
              </div>
            )}
            <button onClick={savePayment} className="w-full py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--text)", color: "var(--bg)" }}>
              Salvar
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
