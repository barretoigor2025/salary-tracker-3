import { useMemo, useState } from "react";
import { Badge, Card, MonthPicker, SectionLabel, StatRow } from "../components/ui.jsx";
import { YEN, fmtDate, currentMonth } from "../utils/fmt.js";
import { allMonthsFromData, annualTaxSnapshot, buildMonthlyFinance, monthLabel } from "../utils/finance.js";

const CAT_LABELS = {
  konbini: "Konbini",
  mercado_jp: "Mercado JP",
  mercado_br: "Mercado BR",
  restaurante: "Restaurante",
  posto: "Posto",
  online: "Online",
  homecenter: "Home center",
  outro: "Outros",
};

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function MiniCard({ label, value, note, color = "var(--text)" }) {
  return (
    <Card>
      <div className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>{label}</div>
      <div className="text-lg font-mono font-bold leading-tight" style={{ color }}>{value}</div>
      {note && <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{note}</div>}
    </Card>
  );
}

function Row({ label, value, note, color = "var(--text)", negative = false }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
      <div className="min-w-0">
        <div className="text-sm truncate" style={{ color: "var(--text-sub)" }}>{label}</div>
        {note && <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{note}</div>}
      </div>
      <div className="text-sm font-mono font-semibold shrink-0" style={{ color: negative ? "var(--negative)" : color }}>{value}</div>
    </div>
  );
}

function Progress({ value, tone = "good" }) {
  const color = tone === "bad" ? "var(--negative)" : tone === "warn" ? "var(--warning)" : "var(--positive)";
  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
    </div>
  );
}

export function SuperFinance({ entries, settings, gastos, extras }) {
  const months = useMemo(() => allMonthsFromData(entries, gastos, extras), [entries, gastos, extras]);
  const initialMonth = months.includes(currentMonth()) ? currentMonth() : (months[months.length - 1] || currentMonth());
  const [month, setMonth] = useState(initialMonth);
  const data = useMemo(() => buildMonthlyFinance(entries, settings, gastos, extras, month), [entries, settings, gastos, extras, month]);
  const annual = annualTaxSnapshot(extras);
  const cardLimit = extras?.cartao?.setup?.limit || 0;
  const cardUsePct = pct(data.card.total, cardLimit);
  const expensePct = pct(data.totalOut, data.incomeReal);
  const salaryAccuracy = (gastos?.overrides?.[month]?.r1 || 0) > 0 ? "renda real do holerite" : "estimativa pelo app";

  const insight = (() => {
    if (data.incomeReal <= 0) return "Sem renda lançada neste mês ainda. Use o holerite real em Gastos quando cair.";
    if (data.saldo < 0) return `Mês negativo em ${YEN(Math.abs(data.saldo))}. O vilão está entre cartão, hagaki e gastos fixos.`;
    if (expensePct > 85) return `Sobrou pouco: despesas comem ${expensePct}% da renda. Mês apertado, sem muita margem pra surpresa.`;
    if (data.card.total > data.budget.fixedExpenses) return "O cartão passou os gastos fixos. Vale olhar as categorias antes da fatura fechar.";
    return `Mês saudável até aqui. Sobra estimada: ${YEN(data.saldo)}.`;
  })();

  return (
    <div className="space-y-3 pb-24">
      <div>
        <div className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Central financeira</div>
        <h1 className="text-lg font-bold" style={{ color: "var(--text)" }}>Salário, gastos, cartão e impostos</h1>
      </div>

      <MonthPicker value={month} onChange={setMonth} />

      <Card style={{ background: data.saldo >= 0 ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", borderColor: data.saldo >= 0 ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)" }}>
        <div className="flex items-start gap-2">
          <span className="text-xl">🧠</span>
          <div>
            <div className="text-sm font-semibold mb-1" style={{ color: data.saldo >= 0 ? "var(--positive)" : "var(--negative)" }}>Leitura do mês</div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-sub)" }}>{insight}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <MiniCard label="Renda usada" value={YEN(data.incomeReal)} note={salaryAccuracy} color="var(--positive)" />
        <MiniCard label="Saída total" value={YEN(data.totalOut)} note={`${expensePct}% da renda`} color="var(--negative)" />
        <MiniCard label="Saldo final" value={data.saldo >= 0 ? YEN(data.saldo) : `-${YEN(Math.abs(data.saldo))}`} note={monthLabel(month)} color={data.saldo >= 0 ? "var(--positive)" : "var(--negative)"} />
        <MiniCard label="Sacar em mãos" value={YEN(data.cashNeeded)} note="hagaki + impostos abertos" color="var(--warning)" />
      </div>

      <Card>
        <div className="flex items-center justify-between mb-2">
          <SectionLabel>📌 Comprometimento</SectionLabel>
          <Badge color={expensePct > 85 ? "red" : expensePct > 65 ? "yellow" : "green"}>{expensePct}%</Badge>
        </div>
        <Progress value={expensePct} tone={expensePct > 85 ? "bad" : expensePct > 65 ? "warn" : "good"} />
        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          <div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>Débito</div>
            <div className="text-sm font-mono font-bold" style={{ color: "var(--negative)" }}>{YEN(data.budget.debit)}</div>
          </div>
          <div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>Hagaki</div>
            <div className="text-sm font-mono font-bold" style={{ color: "var(--warning)" }}>{YEN(data.budget.hagaki)}</div>
          </div>
          <div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>Cartão</div>
            <div className="text-sm font-mono font-bold" style={{ color: "var(--cc)" }}>{YEN(data.card.total)}</div>
          </div>
        </div>
      </Card>

      <Card>
        <SectionLabel>🚚 Salário calculado</SectionLabel>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="rounded-lg p-2" style={{ background: "var(--bg-elevated)" }}>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>Bruto estimado</div>
            <div className="text-sm font-mono font-bold" style={{ color: "var(--positive)" }}>{YEN(data.salary.grossWithTeate)}</div>
          </div>
          <div className="rounded-lg p-2" style={{ background: "var(--bg-elevated)" }}>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>Líquido estimado</div>
            <div className="text-sm font-mono font-bold" style={{ color: "var(--warning)" }}>{YEN(data.salary.estimatedNet)}</div>
          </div>
        </div>
        <StatRow label="Dias trabalhados" value={`${data.salary.workedDays} dias`} />
        <StatRow label="Horas totais" value={`${data.salary.totalHours.toFixed(1)}h`} />
        <StatRow label="Hora extra" value={`${data.salary.overtimeHours.toFixed(1)}h`} valueColor={data.salary.overtimeHours > 60 ? "var(--negative)" : "var(--warning)"} />
        <StatRow label="Adicional noturno" value={`${data.salary.nightHours.toFixed(1)}h`} valueColor="var(--night)" />
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-2">
          <SectionLabel>💳 Cartão</SectionLabel>
          <Badge color={cardUsePct > 70 ? "red" : cardUsePct > 45 ? "yellow" : "blue"}>{extras?.cartao?.setup?.name || "Cartão"}</Badge>
        </div>
        <div className="flex justify-between items-end mb-2">
          <div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>Lançamentos do mês</div>
            <div className="text-xl font-mono font-bold" style={{ color: "var(--cc)" }}>{YEN(data.card.total)}</div>
          </div>
          {cardLimit > 0 && <div className="text-xs text-right" style={{ color: "var(--text-muted)" }}>{cardUsePct}% do limite<br />{YEN(cardLimit)}</div>}
        </div>
        {cardLimit > 0 && <Progress value={cardUsePct} tone={cardUsePct > 70 ? "bad" : cardUsePct > 45 ? "warn" : "good"} />}
        <div className="mt-3 space-y-1">
          {data.card.categories.slice(0, 6).map(c => <Row key={c.cat} label={CAT_LABELS[c.cat] || c.cat} value={YEN(c.amount)} note={`${pct(c.amount, data.card.total)}% do cartão`} color="var(--cc)" />)}
          {data.card.categories.length === 0 && <p className="text-xs py-2 text-center" style={{ color: "var(--text-muted)" }}>Nenhum lançamento de cartão neste mês.</p>}
        </div>
      </Card>

      <Card>
        <SectionLabel>📮 Contas e boletos do mês</SectionLabel>
        {data.budget.debitItems.slice(0, 5).map(i => <Row key={`d-${i.id}`} label={i.name} value={YEN(i.amount)} note="débito automático" negative />)}
        {data.budget.hagakiItems.slice(0, 8).map(i => <Row key={`h-${i.id}`} label={i.name} value={YEN(i.amount)} note="hagaki / boleto" color="var(--warning)" />)}
        {data.budget.fixedExpenses === 0 && <p className="text-xs py-2 text-center" style={{ color: "var(--text-muted)" }}>Sem contas fixas lançadas.</p>}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-2">
          <SectionLabel>🚗 Impostos dos carros</SectionLabel>
          <Badge color={data.vehicleTax.openTotal > 0 ? "yellow" : "green"}>{YEN(data.vehicleTax.openTotal)} aberto</Badge>
        </div>
        {data.vehicleTax.monthRows.length > 0 ? data.vehicleTax.monthRows.map(r => (
          <Row
            key={`${r.vehicle}-${r.year}-${r.parcel}`}
            label={`${r.vehicle} · parcela ${r.parcel}`}
            note={r.paid ? `pago em ${fmtDate(r.paidDate)}` : `vence em ${fmtDate(r.dueDate)}`}
            value={YEN(r.amount)}
            color={r.paid ? "var(--positive)" : "var(--warning)"}
          />
        )) : <p className="text-xs py-2 text-center" style={{ color: "var(--text-muted)" }}>Nenhum imposto de veículo neste mês.</p>}
        {data.vehicleTax.nextOpen && (
          <div className="mt-2 rounded-lg p-2 text-xs" style={{ background: "rgba(245,158,11,0.08)", color: "var(--warning)", border: "1px solid rgba(245,158,11,0.25)" }}>
            Próximo aberto: {data.vehicleTax.nextOpen.vehicle} · {YEN(data.vehicleTax.nextOpen.amount)} · {fmtDate(data.vehicleTax.nextOpen.dueDate)}
          </div>
        )}
      </Card>

      {annual && (
        <Card>
          <SectionLabel>🧾 Imposto anual / Gensen</SectionLabel>
          <Row label={`Ano ${annual.year}`} note={annual.company} value={YEN(annual.paid)} color="var(--positive)" />
          <Row label="Shakai Hoken no ano" value={YEN(annual.socialInsurance)} negative />
          <Row label="Gensen retido" value={YEN(annual.withheldTax)} negative />
          <Row label="Dedução de renda" value={YEN(annual.incomeDeductions)} color="var(--info)" />
        </Card>
      )}
    </div>
  );
}
