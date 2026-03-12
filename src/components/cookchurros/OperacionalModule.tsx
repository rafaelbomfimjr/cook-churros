import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, TrendingUp, DollarSign, Percent } from "lucide-react";
import { formatBRL } from "@/lib/cookchurros";
import { useOperacional } from "@/hooks/useCloudData";

export default function OperacionalModule() {
  const { dados, dadosMes, mesAtual, loading, updateMes, trocarMes } = useOperacional();

  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<any>(null);

  const totalGastos = dadosMes.gastos.reduce((acc, g) => acc + g.valor, 0);
  const custoOperacional = dadosMes.faturamento > 0 ? (totalGastos / dadosMes.faturamento) * 100 : 0;

  const adicionarGasto = () => {
    updateMes({ gastos: [...dadosMes.gastos, { nome: "Novo Gasto", valor: 0 }] });
  };

  const removerGasto = (i: number) => {
    updateMes({ gastos: dadosMes.gastos.filter((_, idx) => idx !== i) });
  };

  const editarGasto = (i: number, campo: "nome" | "valor", val: string) => {
    const novos = dadosMes.gastos.map((g, idx) =>
      idx === i ? { ...g, [campo]: campo === "valor" ? parseFloat(val) || 0 : val } : g
    );
    updateMes({ gastos: novos });
  };

  useEffect(() => {
    if (!chartRef.current) return;
    if ((window as any).Chart) {
      renderChart();
    } else {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/chart.js";
      script.onload = () => renderChart();
      document.head.appendChild(script);
    }
  }, [dados]);

  const renderChart = () => {
    if (!chartRef.current || !(window as any).Chart) return;
    if (chartInstance.current) chartInstance.current.destroy();
    const anoAtual = new Date().getFullYear();
    const meses: string[] = [];
    const faturamentos: number[] = [];
    const custosPercentuais: number[] = [];
    for (let i = 1; i <= 12; i++) {
      const mesFormatado = `${anoAtual}-${String(i).padStart(2, "0")}`;
      meses.push(String(i).padStart(2, "0"));
      const d = dados[mesFormatado];
      if (d) {
        faturamentos.push(d.faturamento || 0);
        const tg = d.gastos.reduce((a, g) => a + g.valor, 0);
        custosPercentuais.push(d.faturamento > 0 ? parseFloat(((tg / d.faturamento) * 100).toFixed(2)) : 0);
      } else {
        faturamentos.push(0);
        custosPercentuais.push(0);
      }
    }
    chartInstance.current = new (window as any).Chart(chartRef.current, {
      type: "line",
      data: {
        labels: meses,
        datasets: [
          { label: "Faturamento (R$)", data: faturamentos, yAxisID: "y", tension: 0.4, borderColor: "hsl(32,95%,50%)", backgroundColor: "hsla(32,95%,50%,0.08)", fill: true, pointBackgroundColor: "hsl(32,95%,50%)" },
          { label: "Custo Operacional (%)", data: custosPercentuais, yAxisID: "y1", tension: 0.4, borderColor: "hsl(220,30%,50%)", backgroundColor: "hsla(220,30%,50%,0.08)", fill: true, pointBackgroundColor: "hsl(220,30%,50%)" },
        ],
      },
      options: {
        responsive: true,
        interaction: { mode: "index", intersect: false },
        plugins: { legend: { labels: { font: { family: "Nunito", weight: "600" } } } },
        scales: {
          y: { type: "linear", position: "left", title: { display: true, text: "Faturamento (R$)", font: { family: "Nunito" } } },
          y1: { type: "linear", position: "right", title: { display: true, text: "Custo (%)", font: { family: "Nunito" } }, grid: { drawOnChartArea: false } },
        },
      },
    });
  };

  const custoColor = custoOperacional > 40 ? "text-destructive" : custoOperacional > 25 ? "text-yellow-500" : "text-green-600";

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
        <input
          type="month"
          value={mesAtual}
          onChange={e => trocarMes(e.target.value)}
          className="inline-input text-sm"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--primary)/0.12)" }}>
              <DollarSign size={16} style={{ color: "hsl(var(--primary))" }} />
            </div>
            <span className="stat-label">Faturamento</span>
          </div>
          <input
            type="number"
            value={dadosMes.faturamento || ""}
            placeholder="0,00"
            onChange={e => updateMes({ faturamento: parseFloat(e.target.value) || 0 })}
            className="inline-input text-xl font-extrabold w-full mt-1"
          />
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
          <p className={`stat-value mt-1 ${custoColor}`}>{custoOperacional.toFixed(2)}%</p>
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
            <tr>
              <th>Gasto</th>
              <th>Valor (R$)</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {dadosMes.gastos.map((g, i) => (
              <tr key={i}>
                <td>
                  <input value={g.nome} onChange={e => editarGasto(i, "nome", e.target.value)} />
                </td>
                <td>
                  <input
                    type="number"
                    value={g.valor || ""}
                    placeholder="0,00"
                    onChange={e => editarGasto(i, "valor", e.target.value)}
                  />
                </td>
                <td>
                  <button className="btn-danger" onClick={() => removerGasto(i)}>
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Chart */}
      <div className="rounded-2xl p-5 bg-card" style={{ boxShadow: "0 2px 12px hsl(220 15% 10% / 0.06)" }}>
        <h2 className="font-bold text-base mb-4">Resumo Anual</h2>
        <canvas ref={chartRef} />
      </div>
    </div>
  );
}
