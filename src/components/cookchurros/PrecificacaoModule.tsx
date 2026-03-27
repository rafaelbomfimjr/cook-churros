import { useState, useMemo } from "react";
import { calcularCustoProduto, converterParaBase, formatBRL, Insumo, PorcaoItem } from "@/lib/cookchurros";
import { useInsumos, useProdutos, useOperacional } from "@/hooks/useCloudData";
import { Info, Plus, Trash2, ChevronDown, ChevronUp, Package } from "lucide-react";

function custoUnitarioInsumo(nome: string, insumos: Insumo[]): number {
  const ins = insumos.find(i => i.nome === nome);
  if (!ins) return 0;
  const cb = converterParaBase(ins.qtdeCompra, ins.medidaCompra);
  const ub = converterParaBase(ins.qtdeUtil, ins.medidaUtil);
  if (cb <= 0 || ub <= 0) return 0;
  return (ins.precoCompra / (ub / cb)) / ub;
}

function custoPorcaoEmbalagens(porcao: PorcaoItem, insumos: Insumo[]): number {
  return (porcao.embalagens ?? []).reduce((acc, emb) =>
    acc + custoUnitarioInsumo(emb.insumoNome, insumos) * emb.quantidade, 0);
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

  // Valor de venda por produto (localStorage keyed por nome)
  const [valoresVenda, setValoresVenda] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem("precif_valores_venda") ?? "{}"); } catch { return {}; }
  });
  const setValorVenda = (nome: string, valor: number) => {
    const novos = { ...valoresVenda, [nome]: valor };
    setValoresVenda(novos);
    localStorage.setItem("precif_valores_venda", JSON.stringify(novos));
  };

  const [expandidos, setExpandidos] = useState<Set<number>>(new Set());
  const toggleExpandido = (i: number) => setExpandidos(prev => {
    const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s;
  });

  const loading = loadingInsumos || loadingProdutos || loadingOp;

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

  // Método 3 — Preço por Camadas
  const calcPreco = (custo: number) => {
    if (custo <= 0 || taxasSemLucro >= 100) return 0;
    return (custo / (1 - taxasSemLucro / 100)) * (1 + pctLucro / 100);
  };
  const calcLucro = (preco: number, custo: number) =>
    preco - custo - preco * (taxasSemLucro / 100);

  // Helpers de porção
  const togglePorcao = (pi: number, ativo: boolean) =>
    save(produtos.map((p, i) => i === pi ? {
      ...p, vendidoPorPorcao: ativo,
      porcoes: ativo ? (p.porcoes?.length ? p.porcoes : [{ quantidade: 4, embalagens: [] }]) : []
    } : p));

  const addPorcao = (pi: number) =>
    save(produtos.map((p, i) => i === pi
      ? { ...p, porcoes: [...(p.porcoes ?? []), { quantidade: 1, embalagens: [] }] } : p));

  const removePorcao = (pi: number, ri: number) =>
    save(produtos.map((p, i) => i === pi
      ? { ...p, porcoes: (p.porcoes ?? []).filter((_, j) => j !== ri) } : p));

  const editQtdePorcao = (pi: number, ri: number, val: string) =>
    save(produtos.map((p, i) => i === pi ? {
      ...p, porcoes: (p.porcoes ?? []).map((po, j) =>
        j === ri ? { ...po, quantidade: parseInt(val) || 1 } : po)
    } : p));

  const addEmbalagem = (pi: number, ri: number) =>
    save(produtos.map((p, i) => i === pi ? {
      ...p, porcoes: (p.porcoes ?? []).map((po, j) =>
        j === ri ? { ...po, embalagens: [...(po.embalagens ?? []), { insumoNome: "", quantidade: 1 }] } : po)
    } : p));

  const removeEmbalagem = (pi: number, ri: number, ei: number) =>
    save(produtos.map((p, i) => i === pi ? {
      ...p, porcoes: (p.porcoes ?? []).map((po, j) =>
        j === ri ? { ...po, embalagens: (po.embalagens ?? []).filter((_, k) => k !== ei) } : po)
    } : p));

  const editEmbalagem = (pi: number, ri: number, ei: number, campo: "insumoNome" | "quantidade", val: string) =>
    save(produtos.map((p, i) => i === pi ? {
      ...p, porcoes: (p.porcoes ?? []).map((po, j) =>
        j === ri ? {
          ...po, embalagens: (po.embalagens ?? []).map((emb, k) =>
            k === ei ? { ...emb, [campo]: campo === "quantidade" ? parseInt(val) || 1 : val } : emb)
        } : po)
    } : p));

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

      {/* Taxas */}
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
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table min-w-[700px]">
            <thead>
              <tr>
                <th>Produto</th>
                <th className="text-center">Porção</th>
                <th>Custo Total</th>
                <th>Custo/Un.</th>
                <th>Preço Sugerido</th>
                <th>Valor de Venda</th>
                <th>Lucro/Un.</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {produtosOrdenados.map(({ p: produto, originalIndex: pi }) => {
                const { custoTotal, custoUnitario } = calcularCustoProduto(produto, insumos);
                const isPorcao   = produto.vendidoPorPorcao ?? false;
                const isExpanded = expandidos.has(pi);
                const precoSug   = calcPreco(custoUnitario);
                const valorVenda = valoresVenda[produto.nome] ?? 0;
                // Lucro baseado no valor de venda se definido, senão no sugerido
                const precoRef   = valorVenda > 0 ? valorVenda : precoSug;
                const lucroUn    = calcLucro(precoRef, custoUnitario);

                return (
                  <>
                    <tr key={`r-${pi}`} style={{ background: isExpanded ? "rgba(1,117,122,0.03)" : undefined }}>
                      <td className="font-bold">{produto.nome}</td>

                      {/* Toggle porção */}
                      <td className="text-center">
                        <button
                          onClick={() => { togglePorcao(pi, !isPorcao); if (!isPorcao) setExpandidos(prev => { const s = new Set(prev); s.add(pi); return s; }); }}
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

                      {!isPorcao ? (
                        <>
                          {/* Preço sugerido */}
                          <td className="font-extrabold" style={{ color: "#01757A" }}>
                            {formatBRL(precoSug)}
                          </td>

                          {/* Valor de venda editável */}
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              value={valorVenda || ""}
                              placeholder={formatBRL(precoSug).replace("R$\u00a0", "")}
                              onChange={e => setValorVenda(produto.nome, parseFloat(e.target.value) || 0)}
                              className="inline-input w-full text-sm font-bold"
                              style={{ color: valorVenda > 0 ? "#8A381C" : undefined }}
                            />
                          </td>

                          {/* Lucro */}
                          <td>
                            <span className={`badge-green ${lucroUn < 0 ? "text-destructive" : ""}`}>
                              {formatBRL(lucroUn)}
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="text-xs text-muted-foreground">{(produto.porcoes ?? []).length} porção(ões)</td>
                          <td></td>
                          <td></td>
                        </>
                      )}

                      <td>
                        {isPorcao && (
                          <button onClick={() => toggleExpandido(pi)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
                            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Porções expandidas */}
                    {isPorcao && isExpanded && (
                      <tr key={`porcoes-${pi}`}>
                        <td colSpan={8} style={{ padding: 0, background: "rgba(1,117,122,0.02)" }}>
                          <div className="px-4 py-3 flex flex-col gap-4">
                            {(produto.porcoes ?? []).map((po, ri) => {
                              const custoEmb    = custoPorcaoEmbalagens(po, insumos);
                              const custoPorcao = custoUnitario * po.quantidade + custoEmb;
                              const precoPorc   = calcPreco(custoPorcao);
                              const vendaPorc   = valoresVenda[`${produto.nome}__porcao_${ri}`] ?? 0;
                              const precoRefP   = vendaPorc > 0 ? vendaPorc : precoPorc;
                              const lucroPorc   = calcLucro(precoRefP, custoPorcao);

                              return (
                                <div key={ri} className="rounded-xl border p-3 flex flex-col gap-3"
                                  style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }}>

                                  <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-muted-foreground shrink-0">Porção de</span>
                                      <input type="number" min={1} value={po.quantidade}
                                        onChange={e => editQtdePorcao(pi, ri, e.target.value)}
                                        className="inline-input w-16 text-sm font-bold text-center" />
                                      <span className="text-xs text-muted-foreground shrink-0">unidades</span>
                                    </div>

                                    <div className="flex items-center gap-3 flex-wrap">
                                      <div className="text-right">
                                        <p className="text-xs text-muted-foreground">Custo</p>
                                        <p className="font-bold text-sm">{formatBRL(custoPorcao)}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-xs text-muted-foreground">Sugerido</p>
                                        <p className="font-extrabold text-sm" style={{ color: "#01757A" }}>{formatBRL(precoPorc)}</p>
                                      </div>
                                      {/* Valor de venda da porção */}
                                      <div className="flex flex-col gap-0.5">
                                        <p className="text-xs text-muted-foreground">Valor de venda</p>
                                        <input
                                          type="number" step="0.01"
                                          value={vendaPorc || ""}
                                          placeholder={formatBRL(precoPorc).replace("R$\u00a0", "")}
                                          onChange={e => setValorVenda(`${produto.nome}__porcao_${ri}`, parseFloat(e.target.value) || 0)}
                                          className="inline-input text-sm font-bold text-right"
                                          style={{ width: "90px", color: vendaPorc > 0 ? "#8A381C" : undefined }}
                                        />
                                      </div>
                                      <div className="text-right">
                                        <p className="text-xs text-muted-foreground">Lucro</p>
                                        <span className="badge-green text-xs">{formatBRL(lucroPorc)}</span>
                                      </div>
                                      <button onClick={() => removePorcao(pi, ri)} className="btn-danger p-1.5 shrink-0">
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Embalagens */}
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <Package size={12} style={{ color: "#8A381C" }} />
                                      <span className="text-xs font-bold" style={{ color: "#8A381C" }}>Embalagens</span>
                                    </div>
                                    {(po.embalagens ?? []).map((emb, ei) => {
                                      const custoEmb1 = custoUnitarioInsumo(emb.insumoNome, insumos) * emb.quantidade;
                                      return (
                                        <div key={ei} className="flex items-center gap-2">
                                          <input type="number" min={1} value={emb.quantidade}
                                            onChange={e => editEmbalagem(pi, ri, ei, "quantidade", e.target.value)}
                                            className="inline-input text-sm text-center font-bold shrink-0"
                                            style={{ width: "52px" }} />
                                          <span className="text-xs text-muted-foreground shrink-0">×</span>
                                          <select value={emb.insumoNome}
                                            onChange={e => editEmbalagem(pi, ri, ei, "insumoNome", e.target.value)}
                                            className="inline-input text-sm min-w-0" style={{ flex: "1 1 0" }}>
                                            <option value="">— Selecione um insumo —</option>
                                            {insumosFiltrados.map(ins => (
                                              <option key={ins.nome} value={ins.nome}>
                                                {ins.nome} ({formatBRL(custoUnitarioInsumo(ins.nome, insumos))}/un)
                                              </option>
                                            ))}
                                          </select>
                                          <span className="text-xs font-bold shrink-0 px-2 py-1 rounded-lg"
                                            style={{ background: "rgba(138,56,28,0.08)", color: "#8A381C", width: "64px", textAlign: "right" }}>
                                            {emb.insumoNome ? formatBRL(custoEmb1) : "—"}
                                          </span>
                                          <button onClick={() => removeEmbalagem(pi, ri, ei)} className="btn-danger p-1 shrink-0">
                                            <Trash2 size={11} />
                                          </button>
                                        </div>
                                      );
                                    })}
                                    <button onClick={() => addEmbalagem(pi, ri)}
                                      className="flex items-center gap-1 text-xs font-semibold mt-0.5 self-start px-2 py-1 rounded-lg"
                                      style={{ color: "#8A381C", border: "1px dashed rgba(138,56,28,0.3)" }}>
                                      <Plus size={11} /> Adicionar embalagem
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                            <button onClick={() => addPorcao(pi)}
                              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg self-start"
                              style={{ color: "#01757A", border: "1px dashed rgba(1,117,122,0.4)" }}>
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
