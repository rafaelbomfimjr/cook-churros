import { useState } from "react";
import { calcularCustoProduto, formatBRL } from "@/lib/cookchurros";
import { useInsumos, useProdutos } from "@/hooks/useCloudData";

export default function PrecificacaoModule() {
  const { insumos, loading: loadingInsumos } = useInsumos();
  const { produtos, loading: loadingProdutos } = useProdutos();

  // Taxas editáveis
  const [pctLucro,      setPctLucro]      = useState(60);   // % lucro desejado
  const [pctCartao,     setPctCartao]     = useState(3.2);  // % taxa cartão (99 e iFood)
  const [pctApp,        setPctApp]        = useState(24);   // % taxa do app (maior entre os dois)

  const loading = loadingInsumos || loadingProdutos;

  // Preço sugerido levando em conta todas as taxas
  // Fórmula: precoSugerido = custoUnitario / (1 - (lucro + cartao + app) / 100)
  const totalTaxa = pctLucro + pctCartao + pctApp;

  const calcPreco = (custoUnitario: number) =>
    totalTaxa < 100 && custoUnitario > 0
      ? custoUnitario / (1 - totalTaxa / 100)
      : 0;

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

      {/* Taxas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="stat-card">
          <span className="stat-label">% Lucro</span>
          <div className="flex items-center gap-1 mt-1">
            <input
              type="number"
              value={pctLucro}
              onChange={e => setPctLucro(parseFloat(e.target.value) || 0)}
              className="inline-input w-full text-lg font-extrabold"
            />
            <span className="font-bold text-muted-foreground">%</span>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-label">% Pagamento Cartão</span>
          <div className="flex items-center gap-1 mt-1">
            <input
              type="number"
              step="0.1"
              value={pctCartao}
              onChange={e => setPctCartao(parseFloat(e.target.value) || 0)}
              className="inline-input w-full text-lg font-extrabold"
            />
            <span className="font-bold text-muted-foreground">%</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">99 e iFood</p>
        </div>

        <div className="stat-card">
          <span className="stat-label">% Taxa do App</span>
          <div className="flex items-center gap-1 mt-1">
            <input
              type="number"
              step="0.1"
              value={pctApp}
              onChange={e => setPctApp(parseFloat(e.target.value) || 0)}
              className="inline-input w-full text-lg font-extrabold"
            />
            <span className="font-bold text-muted-foreground">%</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Maior taxa entre os apps</p>
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
                  const lucroUn = precoSugerido - custoUnitario;
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
