import { useState } from "react";
import { Insumo, Produto, calcularCustoProduto, formatBRL } from "@/lib/cookchurros";

export default function PrecificacaoModule() {
  const [produtos] = useState<Produto[]>(() => {
    const s = localStorage.getItem("produtos");
    return s ? JSON.parse(s) : [];
  });
  const [insumos] = useState<Insumo[]>(() => {
    const s = localStorage.getItem("insumos");
    return s ? JSON.parse(s) : [];
  });
  const [margemPadrao, setMargemPadrao] = useState(60);

  return (
    <div>
      <div className="section-header">
        <h1 className="page-title mb-0">Precificação</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-muted-foreground">Margem padrão:</span>
          <input
            type="number"
            value={margemPadrao}
            onChange={e => setMargemPadrao(parseFloat(e.target.value) || 0)}
            className="inline-input w-24 text-sm"
          />
          <span className="text-sm font-semibold">%</span>
        </div>
      </div>

      {produtos.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="font-semibold">Nenhum produto no cardápio</p>
          <p className="text-sm mt-1">Adicione produtos no módulo Cardápio primeiro</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table min-w-[600px]">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Rendimento</th>
                <th>Custo Total</th>
                <th>Custo/Un.</th>
                <th>Margem (%)</th>
                <th>Preço Sugerido</th>
                <th>Lucro/Un.</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p, i) => {
                const { custoTotal, custoUnitario } = calcularCustoProduto(p, insumos);
                const precoSugerido = custoUnitario > 0 ? custoUnitario / (1 - margemPadrao / 100) : 0;
                const lucroUn = precoSugerido - custoUnitario;
                return (
                  <tr key={i}>
                    <td className="font-bold">{p.nome}</td>
                    <td>{p.rendimento} un</td>
                    <td>{formatBRL(custoTotal)}</td>
                    <td className="font-bold">{formatBRL(custoUnitario)}</td>
                    <td>
                      <span className="badge-orange">{margemPadrao}%</span>
                    </td>
                    <td className="font-extrabold" style={{ color: "hsl(var(--primary))" }}>
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
