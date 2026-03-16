import { useState, useMemo } from "react";
import { calcularCustoProduto, formatBRL } from "@/lib/cookchurros";
import { useInsumos, useProdutos, useOperacional } from "@/hooks/useCloudData";
import { Info } from "lucide-react";

export default function PrecificacaoModule() {
  const { insumos, loading: loadingInsumos } = useInsumos();
  const { produtos, loading: loadingProdutos } = useProdutos();
  const { dados, loading: loadingOp } = useOperacional();

  // Taxas editáveis — persistidas no localStorage
  const [pctLucro,  setPctLucroRaw]  = useState(() => parseFloat(localStorage.getItem("pct_lucro")   ?? "60"));
  const [pctCartao, setPctCartaoRaw] = useState(() => parseFloat(localStorage.getItem("pct_cartao")  ?? "3.2"));
  const [pctApp,    setPctAppRaw]    = useState(() => parseFloat(localStorage.getItem("pct_app")     ?? "24"));
  const [pctOpEdit, setPctOpEditRaw] = useState<number | null>(() => {
    const v = localStorage.getItem("pct_op_edit");
    return v !== null ? parseFloat(v) : null;
  });

  const setPctLucro  = (v: number) => { setPctLucroRaw(v);  localStorage.setItem("pct_lucro",   String(v)); };
  const setPctCartao = (v: number) => { setPctCartaoRaw(v); localStorage.setItem("pct_cartao",  String(v)); };
  const setPctApp    = (v: number) => { setPctAppRaw(v);    localStorage.setItem("pct_app",     String(v)); };
  const setPctOpEdit = (v: number | null) => {
    setPctOpEditRaw(v);
    if (v === null) localStorage.removeItem("pct_op_edit");
    else localStorage.setItem("pct_op_edit", String(v));
  };

  const loading = loadingInsumos || loadingProdutos || loadingOp;

  // Calcular média do custo operacional dos últimos 3 meses com dados
  const mediaCustoOp = useMemo(() => {
    if (!dados) return 0;
    const hoje = new Date();
    const mesesComDados: number[] = [];

    for (let i = 1; i <= 6; i++) { // olhar até 6 meses para trás para achar 3 com dados
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const mes = dados[key];
      if (!mes) continue;

      const fatL = mes.faturamentoLoja ?? 0;
      const fatI = mes.faturamentoIfood ?? 0;
      const fat9 = mes.faturamento99 ?? 0;
      const faturamento = (fatL + fatI + fat9) > 0 ? fatL + fatI + fat9 : (mes.faturamento ?? 0);
      if (faturamento <= 0) continue;

      const gastos = mes.gastos.reduce((acc, g) => acc + g.valor, 0);
      mesesComDados.push((gastos / faturamento) * 100);
      if (mesesComDados.length === 3) break;
    }

    if (mesesComDados.length === 0) return 0;
    return mesesComDados.reduce((a, b) => a + b, 0) / mesesComDados.length;
  }, [dados]);

  const pctOp = pctOpEdit !== null ? pctOpEdit : mediaCustoOp;
  const totalTaxa = pctLucro + pctCartao + pctApp + pctOp;

  // Método 3 — Preço por Camadas:
  // Passo 1: Ponto de equilíbrio (cobre custo + todas as taxas exceto lucro)
  // Passo 2: Aplica o lucro sobre o ponto de equilíbrio
  const taxasSemLucro = pctCartao + pctApp + pctOp;
  const calcPreco = (custoUnitario: number) => {
    if (custoUnitario <= 0) return 0;
    if (taxasSemLucro >= 100) return 0;
    const precoMinimo = custoUnitario / (1 - taxasSemLucro / 100); // ponto de equilíbrio
    return precoMinimo * (1 + pctLucro / 100);                     // + lucro
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <span className="animate-pulse font-semibold">Carregando precificação...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <h1 className="page-title mb-0">Precificação</h1>
      </div>

      {/* Cards de taxas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">

        <div className="stat-card">
          <span className="stat-label">% Lucro</span>
          <div className="flex items-center gap-1 mt-1">
            <input
              type="number"
              value={pctLucro}
              onChange={e => setPctLucro(parseFloat(e.target.value) || 0)}
              className="inline-input w-full text-lg font-extrabold"
            />
            <span className="font-bold text-muted-foreground shrink-0">%</span>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-label">% Cartão</span>
          <div className="flex items-center gap-1 mt-1">
            <input
              type="number"
              step="0.1"
              value={pctCartao}
              onChange={e => setPctCartao(parseFloat(e.target.value) || 0)}
              className="inline-input w-full text-lg font-extrabold"
            />
            <span className="font-bold text-muted-foreground shrink-0">%</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">99 e iFood</p>
        </div>

        <div className="stat-card">
          <span className="stat-label">% Taxa App</span>
          <div className="flex items-center gap-1 mt-1">
            <input
              type="number"
              step="0.1"
              value={pctApp}
              onChange={e => setPctApp(parseFloat(e.target.value) || 0)}
              className="inline-input w-full text-lg font-extrabold"
            />
            <span className="font-bold text-muted-foreground shrink-0">%</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Maior taxa dos apps</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-1">
            <span className="stat-label">% Custo Operacional</span>
            {mediaCustoOp > 0 && pctOpEdit === null && (
              <span title="Calculado automaticamente — média dos últimos 3 meses">
                <Info size={12} className="text-muted-foreground" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <input
              type="number"
              step="0.1"
              value={pctOpEdit !== null ? pctOpEdit : parseFloat(mediaCustoOp.toFixed(1))}
              onChange={e => setPctOpEdit(parseFloat(e.target.value) || 0)}
              className="inline-input w-full text-lg font-extrabold"
            />
            <span className="font-bold text-muted-foreground shrink-0">%</span>
          </div>
          {mediaCustoOp > 0 && pctOpEdit !== null ? (
            <button
              onClick={() => setPctOpEdit(null)}
              className="text-xs mt-1 font-semibold"
              style={{ color: "#01757A" }}
            >
              ↺ Usar média ({mediaCustoOp.toFixed(1)}%)
            </button>
          ) : mediaCustoOp > 0 ? (
            <p className="text-xs text-muted-foreground mt-1">
              Média 3 meses: {mediaCustoOp.toFixed(1)}%
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              Sem dados operacionais
            </p>
          )}
        </div>

        <div className="stat-card" style={{ background: "rgba(1,117,122,0.06)", border: "1px solid rgba(1,117,122,0.2)" }}>
          <span className="stat-label">Total de Taxas</span>
          <p className="text-2xl font-extrabold mt-1" style={{ color: "#01757A" }}>
            {totalTaxa.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Sobra {(100 - totalTaxa).toFixed(1)}% do preço
          </p>
        </div>

      </div>

      {/* Tabela */}
      {produtos.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="font-semibold">Nenhum produto no cardápio</p>
          <p className="text-sm mt-1">Adicione produtos no módulo Cardápio primeiro</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table min-w-[560px]">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Rendimento</th>
                <th>Custo Total</th>
                <th>Custo/Un.</th>
                <th>Preço Sugerido</th>
                <th>Lucro/Un.</th>
              </tr>
            </thead>
            <tbody>
              {[...produtos]
                .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                .map((p, i) => {
                  const { custoTotal, custoUnitario } = calcularCustoProduto(p, insumos);
                  const precoSugerido = calcPreco(custoUnitario);
                  // Lucro real = preço - custo - todas as taxas descontadas do preço
                  const taxasDescontadas = precoSugerido * (taxasSemLucro / 100);
                  const lucroUn = precoSugerido - custoUnitario - taxasDescontadas;
                  return (
                    <tr key={i}>
                      <td className="font-bold">{p.nome}</td>
                      <td>{p.rendimento} un</td>
                      <td>{formatBRL(custoTotal)}</td>
                      <td className="font-bold">{formatBRL(custoUnitario)}</td>
                      <td className="font-extrabold" style={{ color: "#01757A" }}>
                        {formatBRL(precoSugerido)}
                      </td>
                      <td>
                        <span className="badge-green">{formatBRL(lucroUn)}</span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
