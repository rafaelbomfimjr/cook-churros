import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Package, Search } from "lucide-react";
import { Produto, Insumo, Medida, calcularCustoProduto, converterParaBase, formatBRL } from "@/lib/cookchurros";
import { useInsumos, useProdutos } from "@/hooks/useCloudData";

const medidas: Medida[] = ["g", "kg", "ml", "L", "un"];

export default function CardapioModule() {
  const { insumos, loading: loadingInsumos } = useInsumos();
  const { produtos, loading: loadingProdutos, save } = useProdutos();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [busca, setBusca] = useState("");

  const loading = loadingInsumos || loadingProdutos;

  // Mesclar insumos manuais + derivados do cardápio, em ordem alfabética
  const todosInsumos: Insumo[] = [
    ...insumos,
    ...(produtos ?? [])
      .filter(p => p.virarInsumo)
      .map(p => ({
        nome: p.nome,
        qtdeCompra: p.rendimento,
        medidaCompra: (p.medidaInsumo ?? "un") as Medida,
        precoCompra: calcularCustoProduto(p, insumos).custoUnitario * p.rendimento,
        qtdeUtil: p.rendimento,
        medidaUtil: (p.medidaInsumo ?? "un") as Medida,
      })),
  ].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const adicionar = () => {
    const novo = [...produtos, { nome: "Novo Produto", rendimento: 1, receita: [] }];
    save(novo);
    setExpanded(novo.length - 1);
  };

  const remover = (i: number) => save(produtos.filter((_, idx) => idx !== i));

  const editar = (i: number, campo: keyof Produto, val: string) => {
    save(produtos.map((p, idx) =>
      idx === i ? { ...p, [campo]: campo === "rendimento" ? parseFloat(val) || 0 : val } : p
    ));
  };

  const adicionarItem = (pi: number) => {
    if (todosInsumos.length === 0) { alert("Cadastre insumos primeiro."); return; }
    save(produtos.map((p, idx) =>
      idx === pi
        ? { ...p, receita: [...p.receita, { insumoNome: todosInsumos[0].nome, quantidade: 0, medida: todosInsumos[0].medidaUtil as Medida }] }
        : p
    ));
  };

  const removerItem = (pi: number, ri: number) => {
    save(produtos.map((p, idx) =>
      idx === pi ? { ...p, receita: p.receita.filter((_, i) => i !== ri) } : p
    ));
  };

  const editarItem = (pi: number, ri: number, campo: string, val: string) => {
    save(produtos.map((p, idx) =>
      idx === pi ? {
        ...p, receita: p.receita.map((r, i) =>
          i === ri ? { ...r, [campo]: campo === "quantidade" ? parseFloat(val) || 0 : val } : r
        )
      } : p
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <span className="animate-pulse font-semibold">Carregando cardápio...</span>
      </div>
    );
  }

  // Produtos filtrados e ordenados
  const produtosFiltrados = [...produtos]
    .map((p, originalIndex) => ({ p, originalIndex }))
    .sort((a, b) => a.p.nome.localeCompare(b.p.nome, "pt-BR"))
    .filter(({ p }) => !busca || p.nome.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div>
      <div className="section-header">
        <h1 className="page-title mb-0">Cardápio</h1>
        <button className="btn-primary" onClick={adicionar}>
          <Plus size={14} /> Novo Produto
        </button>
      </div>

      {/* Busca */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar produto..."
          className="inline-input w-full pl-9"
        />
      </div>

      <div className="flex flex-col gap-4">
        {produtos.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="font-semibold">Nenhum produto cadastrado</p>
            <p className="text-sm mt-1">Clique em "Novo Produto" para começar</p>
          </div>
        )}

        {produtosFiltrados.map(({ p: produto, originalIndex: pi }) => {
          const { custoTotal, custoUnitario } = calcularCustoProduto(produto, todosInsumos);
          const isOpen = expanded === pi;
          return (
            <div key={pi} className="produto-card">
              <div className="flex items-center gap-3">
                <input
                  value={produto.nome}
                  onChange={e => editar(pi, "nome", e.target.value)}
                  className="inline-input text-base font-bold flex-1"
                />
                <div className="flex items-center gap-2 shrink-0">
                  {produto.virarInsumo && (
                    <span title="Vira insumo">
                      <Package size={14} style={{ color: "#01757A" }} />
                    </span>
                  )}
                  <span className="badge-orange">{formatBRL(custoUnitario)}/un</span>
                  <button className="btn-danger" onClick={() => remover(pi)}>
                    <Trash2 size={13} />
                  </button>
                  <button
                    onClick={() => setExpanded(isOpen ? null : pi)}
                    className="inline-input px-2 py-1.5 text-muted-foreground hover:text-foreground"
                  >
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="stat-card py-3">
                      <span className="stat-label">Rendimento</span>
                      <input
                        type="number"
                        value={produto.rendimento || ""}
                        onChange={e => editar(pi, "rendimento", e.target.value)}
                        className="inline-input w-full mt-1 text-base font-bold"
                      />
                    </div>
                    <div className="stat-card py-3">
                      <span className="stat-label">Custo Total</span>
                      <p className="font-extrabold text-base mt-1">{formatBRL(custoTotal)}</p>
                    </div>
                    <div className="stat-card py-3">
                      <span className="stat-label">Custo/Unidade</span>
                      <p className="font-extrabold text-base mt-1" style={{ color: "hsl(var(--primary))" }}>
                        {formatBRL(custoUnitario)}
                      </p>
                    </div>
                    <div className="stat-card py-3">
                      <span className="stat-label">Insumos</span>
                      <p className="font-extrabold text-base mt-1">{produto.receita.length}</p>
                    </div>
                  </div>

                  {/* Toggle: vira insumo */}
                  <div
                    className="flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all"
                    style={{
                      background: produto.virarInsumo ? "rgba(1,117,122,0.08)" : "hsl(var(--muted))",
                      border: produto.virarInsumo ? "1px solid rgba(1,117,122,0.25)" : "1px solid transparent",
                    }}
                    onClick={() => save(produtos.map((p, idx) => idx === pi ? { ...p, virarInsumo: !p.virarInsumo } : p))}
                  >
                    <div className="flex items-center gap-2">
                      <Package size={15} style={{ color: produto.virarInsumo ? "#01757A" : "hsl(var(--muted-foreground))" }} />
                      <div>
                        <p className="text-sm font-bold" style={{ color: produto.virarInsumo ? "#01757A" : "hsl(var(--foreground))" }}>
                          Este produto vira insumo
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {produto.virarInsumo
                            ? `Disponível como "${produto.nome}" a ${formatBRL(custoUnitario)}/${produto.medidaInsumo ?? "un"}`
                            : "Marque se este produto é usado como insumo em outras receitas"}
                        </p>
                      </div>
                    </div>
                    <div
                      className="w-10 h-6 rounded-full transition-all relative shrink-0"
                      style={{ background: produto.virarInsumo ? "#01757A" : "hsl(var(--border))" }}
                    >
                      <div
                        className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                        style={{ left: produto.virarInsumo ? "22px" : "4px" }}
                      />
                    </div>
                  </div>

                  {produto.virarInsumo && (
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-xs text-muted-foreground shrink-0">Medida da unidade produzida:</span>
                      <select
                        value={produto.medidaInsumo ?? "un"}
                        onChange={e => save(produtos.map((p, idx) => idx === pi ? { ...p, medidaInsumo: e.target.value as Medida } : p))}
                        className="inline-input text-xs"
                        onClick={e => e.stopPropagation()}
                      >
                        {medidas.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  )}

                  {/* Receita */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold">Receita</span>
                      <button className="btn-primary text-xs px-3 py-1.5" onClick={() => adicionarItem(pi)}>
                        <Plus size={12} /> Insumo
                      </button>
                    </div>
                    <div className="space-y-2">
                      {produto.receita.map((item, ri) => {
                        // Calcular custo da quantidade utilizada neste item
                        const insumo = todosInsumos.find(i => i.nome === item.insumoNome);
                        let custoItem = 0;
                        if (insumo) {
                          const compraBase = converterParaBase(insumo.qtdeCompra, insumo.medidaCompra);
                          const utilBase   = converterParaBase(insumo.qtdeUtil, insumo.medidaUtil);
                          if (compraBase > 0 && utilBase > 0) {
                            const aproveitamento = utilBase / compraBase;
                            const custoReal      = insumo.precoCompra / aproveitamento;
                            const custoPorBase   = custoReal / utilBase;
                            custoItem = custoPorBase * converterParaBase(item.quantidade, item.medida);
                          }
                        }
                        return (
                          <div key={ri} className="recipe-line">
                            <select
                              value={item.insumoNome}
                              onChange={e => editarItem(pi, ri, "insumoNome", e.target.value)}
                              className="inline-input flex-1 min-w-0"
                            >
                              {todosInsumos.map(ins => (
                                <option key={ins.nome} value={ins.nome}>{ins.nome}</option>
                              ))}
                            </select>
                            <input
                              type="number"
                              value={item.quantidade || ""}
                              onChange={e => editarItem(pi, ri, "quantidade", e.target.value)}
                              className="inline-input w-20"
                              placeholder="Qtde"
                            />
                            <select
                              value={item.medida}
                              onChange={e => editarItem(pi, ri, "medida", e.target.value)}
                              className="inline-input w-20"
                            >
                              {medidas.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <span
                              className="text-xs font-bold shrink-0 px-2 py-1 rounded-lg"
                              style={{ background: "rgba(1,117,122,0.08)", color: "#01757A", minWidth: "64px", textAlign: "right" }}
                              title="Custo da quantidade utilizada"
                            >
                              {custoItem > 0 ? formatBRL(custoItem) : "—"}
                            </span>
                            <button className="btn-danger shrink-0" onClick={() => removerItem(pi, ri)}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
