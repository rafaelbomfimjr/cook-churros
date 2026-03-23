import { useState, useEffect, useRef, useMemo } from "react";
import { Plus, Trash2, TrendingUp, DollarSign, Percent, Trophy, Calendar, Settings, Pencil, X, Check } from "lucide-react";
import { formatBRL } from "@/lib/cookchurros";
import { useOperacional, useCategoriasGasto } from "@/hooks/useCloudData";

const MESES_NOME = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// ── Gerenciador de categorias de gasto ───────────────────────
function GerenciarCategorias({ categorias, onSave, onClose }: {
  categorias: string[]; onSave: (novas: string[]) => void; onClose: () => void;
}) {
  const [lista, setLista] = useState([...categorias]);
  const [nova, setNova] = useState("");
  const [editandoIdx, setEditandoIdx] = useState<number | null>(null);
  const [editandoVal, setEditandoVal] = useState("");

  const adicionar = () => {
    const nome = nova.trim();
    if (!nome || lista.includes(nome)) return;
    setLista([...lista, nome]);
    setNova("");
  };

  const remover = (i: number) => setLista(lista.filter((_, idx) => idx !== i));
  const iniciarEdicao = (i: number) => { setEditandoIdx(i); setEditandoVal(lista[i]); };
  const salvarEdicao = () => {
    if (editandoIdx === null) return;
    const nome = editandoVal.trim();
    if (!nome) return;
    setLista(lista.map((c, i) => i === editandoIdx ? nome : c));
    setEditandoIdx(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="rounded-2xl shadow-xl w-full max-w-md flex flex-col gap-4 p-6" style={{ background: "hsl(var(--card))" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings size={16} style={{ color: "#01757A" }} />
            <h2 className="font-extrabold text-base" style={{ color: "#01757A" }}>Categorias de Gasto</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground"><X size={18} /></button>
        </div>

        <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
          {lista.map((cat, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "hsl(var(--muted))" }}>
              {editandoIdx === i ? (
                <>
                  <input value={editandoVal} onChange={e => setEditandoVal(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && salvarEdicao()}
                    className="inline-input flex-1 text-sm" autoFocus />
                  <button onClick={salvarEdicao} className="p-1 rounded-lg" style={{ color: "#01757A" }}><Check size={14} /></button>
                  <button onClick={() => setEditandoIdx(null)} className="p-1 rounded-lg text-muted-foreground"><X size={14} /></button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-semibold">{cat}</span>
                  <button onClick={() => iniciarEdicao(i)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground"><Pencil size={13} /></button>
                  <button onClick={() => remover(i)} className="p-1 rounded-lg text-muted-foreground hover:text-destructive"><Trash2 size={13} /></button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input value={nova} onChange={e => setNova(e.target.value)}
            onKeyDown={e => e.key === "Enter" && adicionar()}
            placeholder="Nova categoria..." className="inline-input flex-1 text-sm" />
          <button onClick={adicionar} className="btn-primary px-3 py-2"><Plus size={14} /></button>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={() => { onSave(lista); onClose(); }} className="btn-primary flex-1 justify-center py-2.5">
            <Check size={14} /> Salvar
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold border" style={{ borderColor: "hsl(var(--border))" }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ── Módulo principal ──────────────────────────────────────────
export default function OperacionalModule() {
  const { dados, dadosMes, mesAtual, loading, updateMes, trocarMes } = useOperacional();
  const { categorias, save: saveCategorias } = useCategoriasGasto();
  const [gerenciandoCategorias, setGerenciandoCategorias] = useState(false);

  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<any>(null);

  const totalGastos = dadosMes.gastos.reduce((acc, g) => acc + g.valor, 0);
  const fatLoja   = dadosMes.faturamentoLoja  ?? 0;
  const fatIfood  = dadosMes.faturamentoIfood ?? 0;
  const fat99     = dadosMes.faturamento99    ?? 0;
  const faturamentoTotal = (fatLoja + fatIfood + fat99) > 0 ? fatLoja + fatIfood + fat99 : dadosMes.faturamento;
  const custoOperacional = faturamentoTotal > 0 ? (totalGastos / faturamentoTotal) * 100 : 0;
  const custoColor = custoOperacional > 40 ? "text-destructive" : custoOperacional > 25 ? "text-yellow-500" : "text-green-600";

  const adicionarGasto = () => updateMes({ gastos: [...dadosMes.gastos, { nome: "Novo Gasto", valor: 0, categoria: "" }] });
  const removerGasto = (i: number) => updateMes({ gastos: dadosMes.gastos.filter((_, idx) => idx !== i) });
  const editarGasto = (i: number, campo: "nome" | "valor" | "categoria", val: string) =>
    updateMes({ gastos: dadosMes.gastos.map((g, idx) =>
      idx === i ? { ...g, [campo]: campo === "valor" ? parseFloat(val) || 0 : val } : g
    )});

  // Relatório por categoria
  const relatorioCategorias = useMemo(() => {
    const mapa: Record<string, number> = {};
    for (const g of dadosMes.gastos) {
      const cat = g.categoria?.trim() || "Sem categoria";
      mapa[cat] = (mapa[cat] ?? 0) + g.valor;
    }
    return Object.entries(mapa)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [dadosMes.gastos]);

  // Dados anuais
  const anoAtual = new Date().getFullYear();
  const mesAtualNum = new Date().getMonth() + 1;

  const dadosAnuais = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const num = i + 1;
      const key = `${anoAtual}-${String(num).padStart(2, "0")}`;
      const d = dados[key];
      if (!d) return null;
      const fatL = d.faturamentoLoja ?? 0;
      const fatI = d.faturamentoIfood ?? 0;
      const fat9 = d.faturamento99 ?? 0;
      const fat = (fatL + fatI + fat9) > 0 ? fatL + fatI + fat9 : (d.faturamento || 0);
      const gastos = d.gastos.reduce((a, g) => a + g.valor, 0);
      const custo = fat > 0 ? (gastos / fat) * 100 : 0;
      return { mes: num, label: MESES_NOME[i], faturamento: fat, gastos, custo };
    });
  }, [dados, anoAtual]);

  const mesesComDados = dadosAnuais.filter(d => d !== null && (d!.faturamento > 0 || d!.mes <= mesAtualNum)) as
    { mes: number; label: string; faturamento: number; gastos: number; custo: number }[];

  const totalAnual  = mesesComDados.reduce((a, d) => a + d.faturamento, 0);
  const mediaFat    = mesesComDados.filter(d => d.faturamento > 0).length > 0
    ? totalAnual / mesesComDados.filter(d => d.faturamento > 0).length : 0;
  const melhorMes   = mesesComDados.reduce((best, d) => d.faturamento > (best?.faturamento ?? 0) ? d : best, mesesComDados[0] ?? null);

  useEffect(() => {
    if (!chartRef.current || mesesComDados.length === 0) return;
    const carregarChart = () => {
      if (!(window as any).Chart) return;
      if (chartInstance.current) chartInstance.current.destroy();
      const labels  = mesesComDados.map(d => d.label);
      const fatData = mesesComDados.map(d => d.faturamento);
      const cusData = mesesComDados.map(d => parseFloat(d.custo.toFixed(1)));
      const custoCores = cusData.map(v => v > 40 ? "#ef4444" : v > 25 ? "#eab308" : "#22c55e");
      chartInstance.current = new (window as any).Chart(chartRef.current, {
        data: {
          labels,
          datasets: [
            { type: "bar", label: "Faturamento (R$)", data: fatData, yAxisID: "y",
              backgroundColor: mesesComDados.map(d => d.mes === mesAtualNum ? "rgba(1,117,122,0.85)" : "rgba(1,117,122,0.35)"),
              borderColor: mesesComDados.map(d => d.mes === mesAtualNum ? "#01757A" : "rgba(1,117,122,0.6)"),
              borderWidth: 2, borderRadius: 6 },
            { type: "line", label: "Custo Operacional (%)", data: cusData, yAxisID: "y1",
              tension: 0.4, borderColor: "#8A381C", borderWidth: 2,
              pointBackgroundColor: custoCores, pointRadius: 5, pointHoverRadius: 7, fill: false },
          ],
        },
        options: {
          responsive: true,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: { labels: { font: { family: "Nunito", weight: "600" }, usePointStyle: true } },
            tooltip: {
              callbacks: {
                label: (ctx: any) => {
                  if (ctx.datasetIndex === 0) {
                    const d = mesesComDados[ctx.dataIndex];
                    return [` Faturamento: ${formatBRL(d.faturamento)}`, ` Gastos: ${formatBRL(d.gastos)}`, ` Resultado: ${formatBRL(d.faturamento - d.gastos)}`];
                  }
                  return ` Custo Op.: ${ctx.raw}%`;
                },
                title: (items: any[]) => {
                  const d = mesesComDados[items[0].dataIndex];
                  return `${d.label} ${anoAtual}${d.mes === mesAtualNum ? " (mês atual)" : ""}`;
                },
              },
            },
          },
          scales: {
            y: { type: "linear", position: "left", grid: { color: "rgba(0,0,0,0.05)" },
              ticks: { font: { family: "Nunito" }, callback: (v: number) => `R$ ${v.toLocaleString("pt-BR")}` } },
            y1: { type: "linear", position: "right", min: 0, grid: { drawOnChartArea: false },
              ticks: { font: { family: "Nunito" }, callback: (v: number) => `${v}%` } },
          },
        },
      });
    };
    if ((window as any).Chart) carregarChart();
    else { const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/chart.js"; s.onload = carregarChart; document.head.appendChild(s); }
  }, [dados, mesesComDados]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <span className="animate-pulse font-semibold">Carregando operacional...</span>
      </div>
    );
  }

  return (
    <div>
      {gerenciandoCategorias && (
        <GerenciarCategorias categorias={categorias} onSave={saveCategorias} onClose={() => setGerenciandoCategorias(false)} />
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title mb-0">Operacional</h1>
        <input type="month" value={mesAtual} onChange={e => trocarMes(e.target.value)} className="inline-input text-sm" />
      </div>

      {/* Faturamento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="stat-card col-span-1 md:col-span-3">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--primary)/0.12)" }}>
              <DollarSign size={16} style={{ color: "hsl(var(--primary))" }} />
            </div>
            <span className="stat-label">Faturamento do Mês</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-semibold">Loja / Balcão</label>
              <input type="number" value={dadosMes.faturamentoLoja || ""} placeholder="0,00"
                onChange={e => updateMes({ faturamentoLoja: parseFloat(e.target.value) || 0 })} className="inline-input w-full font-bold" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-semibold">iFood</label>
              <input type="number" value={dadosMes.faturamentoIfood || ""} placeholder="0,00"
                onChange={e => updateMes({ faturamentoIfood: parseFloat(e.target.value) || 0 })} className="inline-input w-full font-bold" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-semibold">99Food</label>
              <input type="number" value={dadosMes.faturamento99 || ""} placeholder="0,00"
                onChange={e => updateMes({ faturamento99: parseFloat(e.target.value) || 0 })} className="inline-input w-full font-bold" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold" style={{ color: "hsl(var(--primary))" }}>Total</label>
              <p className="text-2xl font-extrabold" style={{ color: "hsl(var(--primary))" }}>{formatBRL(faturamentoTotal)}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50"><TrendingUp size={16} className="text-red-500" /></div>
            <span className="stat-label">Total Gastos</span>
          </div>
          <p className="stat-value mt-1">{formatBRL(totalGastos)}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50"><Percent size={16} className="text-blue-500" /></div>
            <span className="stat-label">Custo Operacional</span>
          </div>
          <p className={`stat-value mt-1 ${custoColor}`}>{custoOperacional.toFixed(1)}%</p>
        </div>
      </div>

      {/* Gastos */}
      <div className="mb-6">
        <div className="section-header">
          <h2 className="font-bold text-base">Gastos do Mês</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGerenciandoCategorias(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{ color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border))" }}>
              <Settings size={13} /> Categorias
            </button>
            <button className="btn-primary" onClick={adicionarGasto}><Plus size={14} /> Adicionar Gasto</button>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Nome / Gasto</th>
              <th style={{ width: "160px" }}>Categoria</th>
              <th style={{ width: "140px" }}>Valor (R$)</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {dadosMes.gastos.length === 0 && (
              <tr><td colSpan={4} className="text-center py-6 text-muted-foreground text-sm">Nenhum gasto registrado</td></tr>
            )}
            {dadosMes.gastos.map((g, i) => (
              <tr key={i}>
                <td><input value={g.nome} onChange={e => editarGasto(i, "nome", e.target.value)} /></td>
                <td>
                  <select value={g.categoria ?? ""} onChange={e => editarGasto(i, "categoria", e.target.value)} className="inline-input w-full text-sm">
                    <option value="">— Sem categoria —</option>
                    {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td>
                  <input type="number" value={g.valor || ""} placeholder="0,00"
                    onChange={e => editarGasto(i, "valor", e.target.value)} />
                </td>
                <td><button className="btn-danger" onClick={() => removerGasto(i)}><Trash2 size={13} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Relatório por categoria */}
      {relatorioCategorias.length > 0 && (
        <div className="mb-6">
          <h2 className="font-bold text-base mb-3">Gastos por Categoria</h2>
          <div className="rounded-2xl overflow-hidden" style={{ boxShadow: "0 2px 12px hsl(220 15% 10% / 0.06)" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th>Total</th>
                  <th>% dos Gastos</th>
                  <th>% do Faturamento</th>
                </tr>
              </thead>
              <tbody>
                {relatorioCategorias.map(([cat, valor]) => {
                  const pctGastos = totalGastos > 0 ? (valor / totalGastos) * 100 : 0;
                  const pctFat    = faturamentoTotal > 0 ? (valor / faturamentoTotal) * 100 : 0;
                  return (
                    <tr key={cat}>
                      <td>
                        <span className="font-semibold">{cat}</span>
                      </td>
                      <td className="font-extrabold" style={{ color: "#8A381C" }}>{formatBRL(valor)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))", maxWidth: "80px" }}>
                            <div className="h-full rounded-full" style={{ width: `${pctGastos}%`, background: "#8A381C" }} />
                          </div>
                          <span className="text-sm font-bold">{pctGastos.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={`text-sm font-bold ${pctFat > 20 ? "text-destructive" : pctFat > 10 ? "text-yellow-600" : "text-green-600"}`}>
                          {pctFat.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {/* Linha de total */}
                <tr style={{ background: "hsl(var(--muted)/0.5)" }}>
                  <td className="font-extrabold">Total</td>
                  <td className="font-extrabold" style={{ color: "#01757A" }}>{formatBRL(totalGastos)}</td>
                  <td className="font-bold">100%</td>
                  <td className={`font-extrabold ${custoOperacional > 40 ? "text-destructive" : custoOperacional > 25 ? "text-yellow-600" : "text-green-600"}`}>
                    {custoOperacional.toFixed(1)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Gráfico anual */}
      <div className="rounded-2xl p-5 bg-card" style={{ boxShadow: "0 2px 12px hsl(220 15% 10% / 0.06)" }}>
        <h2 className="font-bold text-base mb-4">Resumo Anual {anoAtual}</h2>
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="stat-card py-3">
            <span className="stat-label">Total do Ano</span>
            <p className="font-extrabold text-base mt-1" style={{ color: "#01757A" }}>{formatBRL(totalAnual)}</p>
          </div>
          <div className="stat-card py-3">
            <div className="flex items-center gap-1.5"><Calendar size={12} className="text-muted-foreground" /><span className="stat-label">Média Mensal</span></div>
            <p className="font-extrabold text-base mt-1">{formatBRL(mediaFat)}</p>
          </div>
          <div className="stat-card py-3">
            <div className="flex items-center gap-1.5"><Trophy size={12} style={{ color: "#8A381C" }} /><span className="stat-label">Melhor Mês</span></div>
            <p className="font-extrabold text-base mt-1" style={{ color: "#8A381C" }}>
              {melhorMes ? `${melhorMes.label} — ${formatBRL(melhorMes.faturamento)}` : "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 mb-3 text-xs font-semibold">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Custo &lt; 25%</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" /> 25–40%</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> &gt; 40%</span>
        </div>
        {mesesComDados.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <p className="font-semibold">Nenhum dado registrado ainda</p>
          </div>
        ) : <canvas ref={chartRef} />}
      </div>
    </div>
  );
}
