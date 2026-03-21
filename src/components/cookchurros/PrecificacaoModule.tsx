import { useState, useMemo } from "react";
import { calcularCustoProduto, converterParaBase, formatBRL, Insumo, PorcaoItem } from "@/lib/cookchurros";
import { useInsumos, useProdutos, useOperacional } from "@/hooks/useCloudData";
import { Info, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

// Calcula custo de uma embalagem específica
function custoDaEmbalagem(nome: string, insumos: Insumo[]): number {
  const ins = insumos.find(i => i.nome === nome);
  if (!ins) return 0;
  const compraBase = converterParaBase(ins.qtdeCompra, ins.medidaCompra);
  const utilBase   = converterParaBase(ins.qtdeUtil, ins.medidaUtil);
  if (compraBase <= 0 || utilBase <= 0) return 0;
  const aproveitamento = utilBase / compraBase;
  return ins.precoCompra / aproveitamento / utilBase; // custo por unidade útil
}

export default function PrecificacaoModule() {
  const { insumos, loading: loadingInsumos } = useInsumos();
  const { produtos, loading: loadingProdutos, save } = useProdutos();
  const { dados, loading: loadingOp } = useOperacional();

  // Taxas persistidas
  const [pctLucro,  setPctLucroRaw]  = useState(() => parseFloat(localStorage.getItem("pct_lucro")  ?? "60"));
  const [pctCartao, setPctCartaoRaw] = useState(() => parseFloat(localStorage.getItem("pct_cartao") ?? "3.2"));
  const [pctApp,    setPctAppRaw]    = useState(() => parseFloat(localStorage.getItem("pct_app")    ?? "24"));
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

  const [expandidos, setExpandidos] = useState<Set<number>>(new Set());
  const toggleExpandido = (i: number) => setExpandidos(prev => {
    const s = new Set(prev);
    s.has(i) ? s.delete(i) : s.add(i);
    return s;
  });

  const loading = loadingInsumos || loadingProdutos || loadingOp;

  // Média custo operacional últimos 3 meses
  const mediaCustoOp = useMemo(() => {
    if (!dados) return 0;
    const hoje = new Date();
    const vals: number[] = [];
    for (let i = 1; i <= 6; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const mes = dados[key];
      if (!mes) continue;
      const fatL = mes.faturamentoLoja ?? 0;
      const fatI = mes.faturamentoIfood ?? 0;
      const fat9 = mes.faturamento99 ?? 0;
      const fat = (fatL + fatI + fat9) > 0 ? fatL + fatI + fat9 : (mes.faturamento ?? 0);
      if (fat <= 0) continue;
      vals.push((mes.gastos.reduce((a, g) => a + g.valor, 0) / fat) * 100);
      if (vals.length === 3) break;
    }
    return vals.length === 0 ? 0 : vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [dados]);

  const pctOp = pctOpEdit !== null ? pctOpEdit : mediaCustoOp;
  const taxasSemLucro = pctCartao + pctApp + pctOp;
  const totalTaxa = pctLucro + taxasSemLucro;

  const calcPreco = (custoUnitario: number) => {
    if (custoUnitario <= 0 || taxasSemLucro >= 100) return 0;
    const precoMinimo = custoUnitario / (1 - taxasSemLucro / 100);
    return precoMinimo * (1 + pctLucro / 100);
  };

  const calcLucro = (preco: number, custo: number) => {
    const taxasDesc = preco * (taxasSemLucro / 100);
    return preco - custo - taxasDesc;
  };

  // Salvar configuração de porção de um produto
  const togglePorcao = (pi: number, ativo: boolean) => {
    save(produtos.map((p, i) => i === pi
      ? { ...p, vendidoPorPorcao: ativo, porcoes: ativo ? (p.porcoes ?? [{ quantidade: 4, embalagemNome: "" }]) : [] }
      : p
    ));
  };

  const addPorcao = (pi: number) => {
    save(produtos.map((p, i) => i === pi
      ? { ...p, porcoes: [...(p.porcoes ?? []), { quantidade: 1, embalagemNome: "" }] }
      : p
    ));
  };

  const removePorcao = (pi: number, ri: number) => {
    save(produtos.map((p, i) => i === pi
      ? { ...p, porcoes: (p.porcoes ?? []).filter((_, j) => j !== ri) }
      : p
    ));
  };

  const editPorcao = (pi: number, ri: number, campo: keyof PorcaoItem, val: string) => {
    save(produtos.map((p, i) => i === pi
      ? {
          ...p,
          porcoes: (p.porcoes ?? []).map((po, j) =>
            j === ri ? { ...po, [campo]: campo === "quantidade" ? parseInt(val) || 1 : val } : po
          )
        }
      : p
    ));
  };

  // Insumos que parecem embalagem (filtro assistido)
  const insumosFiltrados = [...insumos].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <span className="animate-pulse font-semibold">Carregando precificação...</span>
      </div>
    );
  }

  const produtosOrdenados = [...produtos]
    .map((p, originalIndex) => ({ p, originalIndex }))
    .sort((a, b) => a.p.nome.localeCompare(b.p.nome, "pt-BR"));

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
            <input type="number" value={pctLucro} onChange={e => setPctLucro(parseFloat(e.target.value) || 0)} className="inline-input w-full text-lg font-extrabold" />
            <span className="font-bold text-muted-foreground shrink-0">%</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-label">% Cartão</span>
          <div className="flex items-center gap-1 mt-1">
            <input type="number" step="0.1" value={pctCartao} onChange={e => setPctCartao(parseFloat(e.target.value) || 0)} className="inline-input w-full text-lg font-extrabold" />
            <span className="font-bold text-muted-foreground shrink-0">%</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">99 e iFood</p>
        </div>
        <div className="stat-card">
          <span className="stat-label">% Taxa App</span>
          <div className="flex items-center gap-1 mt-1">
            <input type="number" step="0.1" value={pctApp} onChange={e => setPctApp(parseFloat(e.target.value) || 0)} className="inline-input w-full text-lg font-extrabold" />
            <span className="font-bold text-muted-foreground shrink-0">%</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Maior taxa dos apps</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-1">
            <span className="stat-label">% Custo Operacional</span>
            {mediaCustoOp > 0 && pctOpEdit === null && (
              <span title="Média automática dos últimos 3 meses"><Info size={12} className="text-muted-foreground" /></span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <input type="number" step="0.1" value={pctOpEdit !== null ? pctOpEdit : parseFloat(mediaCustoOp.toFixed(1))} onChange={e => setPctOpEdit(parseFloat(e.target.value) || 0)} className="inline-input w-full text-lg font-extrabold" />
            <span className="font-bold text-muted-foreground shrink-0">%</span>
          </div>
          {mediaCustoOp > 0 && pctOpEdit !== null ? (
            <button onClick={() => setPctOpEdit(null)} className="text-xs mt-1 font-semibold" style={{ color: "#01757A" }}>↺ Usar média ({mediaCustoOp.toFixed(1)}%)</button>
          ) : mediaCustoOp > 0 ? (
            <p className="text-xs text-muted-foreground mt-1">Média 3 meses: {mediaCustoOp.toFixed(1)}%</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">Sem dados operacionais</p>
          )}
        </div>
        <div className="stat-card" style={{ background: "rgba(1,117,122,0.06)", border: "1px solid rgba(1,117,122,0.2)" }}>
          <span className="stat-label">Total de Taxas</span>
          <p className="text-2xl font-extrabold mt-1" style={{ color: "#01757A" }}>{totalTaxa.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground mt-1">Sobra {(100 - totalTaxa).toFixed(1)}% do preço</p>
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
          <table className="data-table min-w-[600px]">
            <thead>
              <tr>
                <th>Produto</th>
                <th className="text-center">Porção</th>
                <th>Custo Total</th>
                <th>Custo/Un.</th>
                <th>Preço Sugerido</th>
                <th>Lucro/Un.</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {produtosOrdenados.map(({ p: produto, originalIndex: pi }) => {
                const { custoTotal, custoUnitario } = calcularCustoProduto(produto, insumos);
                const isPorcao = produto.vendidoPorPorcao ?? false;
                const isExpanded = expandidos.has(pi);
                const precoUn = calcPreco(custoUnitario);
                const lucroUn = calcLucro(precoUn, custoUnitario);

                return (
                  <>
                    {/* Linha principal */}
                    <tr key={`row-${pi}`} style={{ background: isExpanded ? "rgba(1,117,122,0.03)" : undefined }}>
                      <td className="font-bold">{produto.nome}</td>

                      {/* Toggle porção */}
                      <td className="text-center">
                        <button
                          onClick={() => togglePorcao(pi, !isPorcao)}
                          className="flex items-center gap-1.5 mx-auto px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
                          style={{
                            background: isPorcao ? "rgba(1,117,122,0.1)" : "hsl(var(--muted))",
                            color: isPorcao ? "#01757A" : "hsl(var(--muted-foreground))",
                            border: isPorcao ? "1px solid rgba(1,117,122,0.3)" : "1px solid transparent",
                          }}
                        >
                          <span className="w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0"
                            style={{ borderColor: isPorcao ? "#01757A" : "hsl(var(--border))", background: isPorcao ? "#01757A" : "transparent" }}>
                            {isPorcao && <span className="text-white text-[9px] font-black">✓</span>}
                          </span>
                          Porção
                        </button>
                      </td>

                      <td>{formatBRL(custoTotal)}</td>
                      <td className="font-bold">{formatBRL(custoUnitario)}</td>

                      {/* Preço e lucro: só mostra se não for porção */}
                      {!isPorcao ? (
                        <>
                          <td className="font-extrabold" style={{ color: "#01757A" }}>{formatBRL(precoUn)}</td>
                          <td><span className="badge-green">{formatBRL(lucroUn)}</span></td>
                        </>
                      ) : (
                        <>
                          <td className="text-muted-foreground text-xs">ver porções</td>
                          <td></td>
                        </>
                      )}

                      <td>
                        {isPorcao && (
                          <button
                            onClick={() => toggleExpandido(pi)}
                            className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-all"
                          >
                            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Linhas de porções expandidas */}
                    {isPorcao && isExpanded && (
                      <tr key={`porcoes-${pi}`}>
                        <td colSpan={7} style={{ padding: "0 0 8px 0", background: "rgba(1,117,122,0.03)" }}>
                          <div className="px-4 pb-3 pt-1 flex flex-col gap-2">

                            {/* Cabeçalho das porções */}
                            <div className="grid gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider px-1"
                              style={{ gridTemplateColumns: "80px 1fr 120px 120px 100px" }}>
                              <span>Qtde/Porção</span>
                              <span>Embalagem</span>
                              <span>Custo Porção</span>
                              <span>Preço Sugerido</span>
                              <span>Lucro</span>
                            </div>

                            {(produto.porcoes ?? []).map((po, ri) => {
                              const custoEmb = custoDaEmbalagem(po.embalagemNome, insumos);
                              const custoPorcao = custoUnitario * po.quantidade + custoEmb;
                              const precoPorcao = calcPreco(custoPorcao);
                              const lucroPorcao = calcLucro(precoPorcao, custoPorcao);

                              return (
                                <div key={ri} className="grid gap-2 items-center"
                                  style={{ gridTemplateColumns: "80px 1fr 120px 120px 100px auto" }}>

                                  {/* Quantidade da porção */}
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min={1}
                                      value={po.quantidade}
                                      onChange={e => editPorcao(pi, ri, "quantidade", e.target.value)}
                                      className="inline-input w-full text-sm font-bold text-center"
                                    />
                                  </div>

                                  {/* Embalagem */}
                                  <select
                                    value={po.embalagemNome}
                                    onChange={e => editPorcao(pi, ri, "embalagemNome", e.target.value)}
                                    className="inline-input w-full text-sm"
                                  >
                                    <option value="">— Nenhuma embalagem —</option>
                                    {insumosFiltrados.map(ins => (
                                      <option key={ins.nome} value={ins.nome}>
                                        {ins.nome} ({formatBRL(custoDaEmbalagem(ins.nome, insumos))}/un)
                                      </option>
                                    ))}
                                  </select>

                                  {/* Custo da porção */}
                                  <span className="text-sm font-bold">{formatBRL(custoPorcao)}</span>

                                  {/* Preço sugerido */}
                                  <span className="text-sm font-extrabold" style={{ color: "#01757A" }}>
                                    {formatBRL(precoPorcao)}
                                  </span>

                                  {/* Lucro */}
                                  <span className="badge-green text-xs">{formatBRL(lucroPorcao)}</span>

                                  {/* Remover porção */}
                                  <button onClick={() => removePorcao(pi, ri)} className="btn-danger p-1.5">
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              );
                            })}

                            {/* Adicionar porção */}
                            <button
                              onClick={() => addPorcao(pi)}
                              className="flex items-center gap-1.5 text-xs font-bold mt-1 px-3 py-1.5 rounded-lg transition-all self-start"
                              style={{ color: "#01757A", border: "1px dashed rgba(1,117,122,0.4)" }}
                            >
                              <Plus size={12} /> Adicionar porção
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
