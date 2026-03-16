import { useState, useEffect, useRef, useMemo } from "react";
import { Plus, Trash2, TrendingUp, DollarSign, Percent, Trophy, Calendar } from "lucide-react";
import { formatBRL } from "@/lib/cookchurros";
import { useOperacional } from "@/hooks/useCloudData";

const MESES_NOME = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export default function OperacionalModule() {
  const { dados, dadosMes, mesAtual, loading, updateMes, trocarMes } = useOperacional();
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<any>(null);

  const totalGastos = dadosMes.gastos.reduce((acc, g) => acc + g.valor, 0);
  const fatLoja   = dadosMes.faturamentoLoja  ?? 0;
  const fatIfood  = dadosMes.faturamentoIfood ?? 0;
  const fat99     = dadosMes.faturamento99    ?? 0;
  const faturamentoTotal = (fatLoja + fatIfood + fat99) > 0
    ? fatLoja + fatIfood + fat99
    : dadosMes.faturamento;
  const custoOperacional = faturamentoTotal > 0 ? (totalGastos / faturamentoTotal) * 100 : 0;
  const custoColor = custoOperacional > 40 ? "text-destructive" : custoOperacional > 25 ? "text-yellow-500" : "text-green-600";

  const adicionarGasto = () => updateMes({ gastos: [...dadosMes.gastos, { nome: "Novo Gasto", valor: 0 }] });
  const removerGasto   = (i: number) => updateMes({ gastos: dadosMes.gastos.filter((_, idx) => idx !== i) });
  const editarGasto    = (i: number, campo: "nome" | "valor", val: string) =>
    updateMes({ gastos: dadosMes.gastos.map((g, idx) =>
      idx === i ? { ...g, [campo]: campo === "valor" ? parseFloat(val) || 0 : val } : g
    )});

  // Calcular dados do ano — apenas meses com dados reais
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

  // Só meses com faturamento > 0 ou que já passaram
  const mesesComDados = dadosAnuais.filter(d => d !== null && (d.faturamento > 0 || d.mes <= mesAtualNum)) as
    { mes: number; label: string; faturamento: number; gastos: number; custo: number }[];

  // Resumo anual
  const totalAnual    = mesesComDados.reduce((a, d) => a + d.faturamento, 0);
  const mediaFat      = mesesComDados.filter(d => d.faturamento > 0).length > 0
    ? totalAnual / mesesComDados.filter(d => d.faturamento > 0).length : 0;
  const melhorMes     = mesesComDados.reduce((best, d) => d.faturamento > (best?.faturamento ?? 0) ? d : best,
    mesesComDados[0] ?? null);

  useEffect(() => {
    if (!chartRef.current || mesesComDados.length === 0) return;
    const carregarChart = () => {
      if (!(window as any).Chart) return;
      if (chartInstance.current) chartInstance.current.destroy();

      const labels  = mesesComDados.map(d => d.label);
      const fatData = mesesComDados.map(d => d.faturamento);
      const cusData = mesesComDados.map(d => parseFloat(d.custo.toFixed(1)));

      // Cores condicionais da linha de custo
      const custoCores = cusData.map(v =>
        v > 40 ? "#ef4444" : v > 25 ? "#eab308" : "#22c55e"
      );

      chartInstance.current = new (window as any).Chart(chartRef.current, {
        data: {
          labels,
          datasets: [
            {
              type: "bar",
              label: "Faturamento (R$)",
              data: fatData,
              yAxisID: "y",
              backgroundColor: mesesComDados.map(d =>
                d.mes === mesAtualNum
                  ? "rgba(1,117,122,0.85)"
                  : "rgba(1,117,122,0.35)"
              ),
              borderColor: mesesComDados.map(d =>
                d.mes === mesAtualNum ? "#01757A" : "rgba(1,117,122,0.6)"
              ),
              borderWidth: 2,
              borderRadius: 6,
            },
            {
              type: "line",
              label: "Custo Operacional (%)",
              data: cusData,
              yAxisID: "y1",
              tension: 0.4,
              borderColor: "#8A381C",
              borderWidth: 2,
              pointBackgroundColor: custoCores,
              pointRadius: 5,
              pointHoverRadius: 7,
              fill: false,
            },
          ],
        },
        options: {
          responsive: true,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: {
              labels: { font: { family: "Nunito", weight: "600" }, usePointStyle: true },
            },
            tooltip: {
              callbacks: {
                label: (ctx: any) => {
                  if (ctx.datasetIndex === 0) {
                    const d = mesesComDados[ctx.dataIndex];
                    return [
                      ` Faturamento: ${formatBRL(d.faturamento)}`,
                      ` Gastos: ${formatBRL(d.gastos)}`,
                      ` Resultado: ${formatBRL(d.faturamento - d.gastos)}`,
                    ];
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
            y: {
              type: "linear",
              position: "left",
              grid: { color: "rgba(0,0,0,0.05)" },
              ticks: {
                font: { family: "Nunito" },
                callback: (v: number) => `R$ ${v.toLocaleString("pt-BR")}`,
              },
            },
            y1: {
              type: "linear",
              position: "right",
              min: 0,
              grid: { drawOnChartArea: false },
              ticks: {
                font: { family: "Nunito" },
                callback: (v: number) => `${v}%`,
              },
            },
          },
        },
      });
    };

    if ((window as any).Chart) {
      carregarChart();
    } else {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/chart.js";
      s.onload = carregarChart;
      document.head.appendChild(s);
    }
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title mb-0">Operacional</h1>
        <input type="month" value={mesAtual} onChange={e => trocarMes(e.target.value)} className="inline-input text-sm" />
      </div>

      {/* Stats do mês */}
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
                onChange={e => updateMes({ faturamentoLoja: parseFloat(e.target.value) || 0 })}
                className="inline-input w-full font-bold" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-semibold">iFood</label>
              <input type="number" value={dadosMes.faturamentoIfood || ""} placeholder="0,00"
                onChange={e => updateMes({ faturamentoIfood: parseFloat(e.target.value) || 0 })}
                className="inline-input w-full font-bold" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-semibold">99Food</label>
              <input type="number" value={dadosMes.faturamento99 || ""} placeholder="0,00"
                onChange={e => updateMes({ faturamento99: parseFloat(e.target.value) || 0 })}
                className="inline-input w-full font-bold" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold" style={{ color: "hsl(var(--primary))" }}>Total</label>
              <p className="text-2xl font-extrabold" style={{ color: "hsl(var(--primary))" }}>{formatBRL(faturamentoTotal)}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50">
              <TrendingUp size={16} className="text-red-500" />
            </div>
            <span className="stat-label">Total Gastos</span>
          </div>
          <p className="stat-value mt-1">{formatBRL(totalGastos)}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50">
              <Percent size={16} className="text-blue-500" />
            </div>
            <span className="stat-label">Custo Operacional</span>
          </div>
          <p className={`stat-value mt-1 ${custoColor}`}>{custoOperacional.toFixed(1)}%</p>
        </div>
      </div>

      {/* Gastos */}
      <div className="mb-6">
        <div className="section-header">
          <h2 className="font-bold text-base">Gastos do Mês</h2>
          <button className="btn-primary" onClick={adicionarGasto}>
            <Plus size={14} /> Adicionar Gasto
          </button>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Gasto</th><th>Valor (R$)</th><th className="w-12"></th></tr>
          </thead>
          <tbody>
            {dadosMes.gastos.map((g, i) => (
              <tr key={i}>
                <td><input value={g.nome} onChange={e => editarGasto(i, "nome", e.target.value)} /></td>
                <td><input type="number" value={g.valor || ""} placeholder="0,00" onChange={e => editarGasto(i, "valor", e.target.value)} /></td>
                <td><button className="btn-danger" onClick={() => removerGasto(i)}><Trash2 size={13} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Gráfico + Resumo Anual */}
      <div className="rounded-2xl p-5 bg-card" style={{ boxShadow: "0 2px 12px hsl(220 15% 10% / 0.06)" }}>
        <h2 className="font-bold text-base mb-4">Resumo Anual {anoAtual}</h2>

        {/* Cards de resumo anual */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="stat-card py-3">
            <span className="stat-label">Total do Ano</span>
            <p className="font-extrabold text-base mt-1" style={{ color: "#01757A" }}>{formatBRL(totalAnual)}</p>
          </div>
          <div className="stat-card py-3">
            <div className="flex items-center gap-1.5">
              <Calendar size={12} className="text-muted-foreground" />
              <span className="stat-label">Média Mensal</span>
            </div>
            <p className="font-extrabold text-base mt-1">{formatBRL(mediaFat)}</p>
          </div>
          <div className="stat-card py-3">
            <div className="flex items-center gap-1.5">
              <Trophy size={12} style={{ color: "#8A381C" }} />
              <span className="stat-label">Melhor Mês</span>
            </div>
            <p className="font-extrabold text-base mt-1" style={{ color: "#8A381C" }}>
              {melhorMes ? `${melhorMes.label} — ${formatBRL(melhorMes.faturamento)}` : "—"}
            </p>
          </div>
        </div>

        {/* Legenda de cores do custo */}
        <div className="flex items-center gap-4 mb-3 text-xs font-semibold">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"/> Custo &lt; 25%</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block"/> 25–40%</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"/> &gt; 40%</span>
        </div>

        {mesesComDados.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <p className="font-semibold">Nenhum dado registrado ainda</p>
            <p className="text-sm mt-1">Preencha o faturamento do mês para começar</p>
          </div>
        ) : (
          <canvas ref={chartRef} />
        )}
      </div>
    </div>
  );
}
