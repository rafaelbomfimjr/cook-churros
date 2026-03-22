import { useState } from "react";
import { Plus, Trash2, FileText, Pencil, X, Check, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Package, Search, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { Insumo, Medida, calcularCustoInsumo, calcularCustoProduto, formatBRL } from "@/lib/cookchurros";
import { useInsumos, useProdutos, useCategoriasInsumo } from "@/hooks/useCloudData";

const medidas: Medida[] = ["g", "kg", "ml", "L", "un"];

// ── Histórico de preços ───────────────────────────────────────
interface HistoricoPreco { preco: number; data: string; }

function HistoricoChart({ historico }: { historico: HistoricoPreco[] }) {
  if (!historico || historico.length < 2) return null;
  const max = Math.max(...historico.map(h => h.preco));
  const min = Math.min(...historico.map(h => h.preco));
  const range = max - min || 1;
  const ultimo = historico[historico.length - 1].preco;
  const penultimo = historico[historico.length - 2].preco;
  const tendencia = ultimo > penultimo ? "up" : ultimo < penultimo ? "down" : "flat";
  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex items-end gap-0.5 h-6">
        {historico.map((h, i) => {
          const height = Math.max(4, Math.round(((h.preco - min) / range) * 20) + 4);
          const isLast = i === historico.length - 1;
          return (
            <div key={i} title={`${formatBRL(h.preco)} — ${new Date(h.data).toLocaleDateString("pt-BR")}`}
              className="w-2 rounded-sm"
              style={{ height: `${height}px`, background: isLast ? (tendencia === "up" ? "#8A381C" : tendencia === "down" ? "#01757A" : "hsl(var(--muted-foreground))") : "hsl(var(--border))" }}
            />
          );
        })}
      </div>
      {tendencia === "up" && <TrendingUp size={13} style={{ color: "#8A381C" }} />}
      {tendencia === "down" && <TrendingDown size={13} style={{ color: "#01757A" }} />}
      {tendencia === "flat" && <Minus size={13} className="text-muted-foreground" />}
      <span className="text-xs font-semibold" style={{ color: tendencia === "up" ? "#8A381C" : tendencia === "down" ? "#01757A" : "hsl(var(--muted-foreground))" }}>
        {tendencia === "up" ? "subindo" : tendencia === "down" ? "baixando" : "estável"}
      </span>
    </div>
  );
}

// ── Card de insumo ────────────────────────────────────────────
function InsumoCard({ ins, index, total, categorias, onSave, onRemover }: {
  ins: Insumo; index: number; total: number; categorias: string[];
  onSave: (novo: Insumo) => void; onRemover: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState<Insumo>(ins);
  const [showHistorico, setShowHistorico] = useState(false);
  const { desperdicio, precoReal } = calcularCustoInsumo(ins);

  const abrirEditor = () => { setDraft({ ...ins }); setEditando(true); setShowHistorico(false); };
  const cancelar = () => { setDraft({ ...ins }); setEditando(false); };
  const salvar = () => {
    const novoInsumo = { ...draft };
    if (draft.precoCompra !== ins.precoCompra && ins.precoCompra > 0) {
      const historico = [...(ins.historicoPrecos ?? []), { preco: ins.precoCompra, data: new Date().toISOString() }].slice(-6);
      novoInsumo.historicoPrecos = historico;
    }
    onSave(novoInsumo);
    setEditando(false);
  };

  const setField = (campo: keyof Insumo, val: string) =>
    setDraft(prev => ({ ...prev, [campo]: ["qtdeCompra", "precoCompra", "qtdeUtil"].includes(campo) ? parseFloat(val) || 0 : val }));

  const tendencia = (() => {
    const h = ins.historicoPrecos;
    if (!h || h.length < 1) return null;
    const ultimo = h[h.length - 1].preco;
    return ins.precoCompra > ultimo ? "up" : ins.precoCompra < ultimo ? "down" : "flat";
  })();

  // Cor da categoria
  const corCategoria = (cat?: string) => {
    const cores: Record<string, string> = {
      "Ingrediente": "#01757A", "Embalagem": "#8A381C",
      "Complemento": "#6366f1", "Recheio": "#f59e0b",
      "Bebida": "#3b82f6", "Outro": "#6b7280",
    };
    return cores[cat ?? ""] ?? "#6b7280";
  };

  return (
    <div className="produto-card transition-all" style={{ padding: editando ? "20px" : "16px 20px" }}>
      {!editando && (
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{ins.nome}</p>
              {ins.categoria && (
                <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-full mt-0.5"
                  style={{ background: `${corCategoria(ins.categoria)}18`, color: corCategoria(ins.categoria) }}>
                  {ins.categoria}
                </span>
              )}
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  Compra: <strong>{formatBRL(ins.precoCompra)}</strong>
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{ background: "rgba(1,117,122,0.1)", color: "#01757A" }}>
                  Pós-desp: {formatBRL(precoReal)}
                </span>
                {desperdicio > 0 && (
                  <span className={`text-xs font-semibold ${desperdicio > 30 ? "text-destructive" : desperdicio > 15 ? "text-yellow-600" : "text-green-600"}`}>
                    {desperdicio.toFixed(1)}% desp.
                  </span>
                )}
              </div>
              {ins.historicoPrecos && ins.historicoPrecos.length > 0 && (
                <div>
                  <button onClick={() => setShowHistorico(!showHistorico)}
                    className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                    {tendencia === "up" && <TrendingUp size={12} style={{ color: "#8A381C" }} />}
                    {tendencia === "down" && <TrendingDown size={12} style={{ color: "#01757A" }} />}
                    {tendencia === "flat" && <Minus size={12} />}
                    Histórico ({ins.historicoPrecos.length})
                    {showHistorico ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  </button>
                  {showHistorico && (
                    <div className="mt-2 flex flex-col gap-1">
                      <HistoricoChart historico={ins.historicoPrecos} />
                      <div className="flex flex-col gap-0.5 mt-1">
                        {[...ins.historicoPrecos].reverse().map((h, i) => (
                          <div key={i} className="flex items-center justify-between text-xs px-2 py-1 rounded-lg"
                            style={{ background: "hsl(var(--muted))" }}>
                            <span className="text-muted-foreground">{new Date(h.data).toLocaleDateString("pt-BR")}</span>
                            <span className="font-bold">{formatBRL(h.preco)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={abrirEditor}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold"
                style={{ background: "rgba(1,117,122,0.1)", color: "#01757A" }}>
                <Pencil size={12} /> Editar
              </button>
              <button onClick={onRemover} className="p-1.5 rounded-xl btn-danger">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {editando && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="font-bold text-sm" style={{ color: "#01757A" }}>Editando insumo</p>
            <button onClick={cancelar} className="p-1 rounded-lg text-muted-foreground"><X size={16} /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="stat-label">Nome</label>
              <input value={draft.nome} onChange={e => setField("nome", e.target.value)} className="inline-input w-full" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="stat-label">Categoria</label>
              <select value={draft.categoria ?? ""} onChange={e => setDraft(prev => ({ ...prev, categoria: e.target.value || undefined }))} className="inline-input w-full">
                <option value="">— Sem categoria —</option>
                {categorias.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <p className="stat-label mb-2">Dados de compra</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Quantidade</label>
                <input type="number" value={draft.qtdeCompra || ""} onChange={e => setField("qtdeCompra", e.target.value)} className="inline-input w-full" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Medida</label>
                <select value={draft.medidaCompra} onChange={e => setField("medidaCompra", e.target.value)} className="inline-input w-full">
                  {medidas.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Preço (R$)</label>
                <input type="number" step="0.01" value={draft.precoCompra || ""} onChange={e => setField("precoCompra", e.target.value)} className="inline-input w-full" />
              </div>
            </div>
          </div>

          <div>
            <p className="stat-label mb-2">Quantidade útil (após desperdício)</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Quantidade</label>
                <input type="number" value={draft.qtdeUtil || ""} onChange={e => setField("qtdeUtil", e.target.value)} className="inline-input w-full" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Medida</label>
                <select value={draft.medidaUtil} onChange={e => setField("medidaUtil", e.target.value)} className="inline-input w-full">
                  {medidas.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>

          {(() => {
            const { desperdicio: d, precoReal: p } = calcularCustoInsumo(draft);
            return (
              <div className="grid grid-cols-2 gap-2">
                <div className="stat-card py-2.5">
                  <span className="stat-label">Desperdício</span>
                  <span className={`font-extrabold text-sm ${d > 30 ? "text-destructive" : d > 15 ? "text-yellow-600" : "text-green-600"}`}>{d.toFixed(1)}%</span>
                </div>
                <div className="stat-card py-2.5">
                  <span className="stat-label">Preço Pós-desp.</span>
                  <span className="font-extrabold text-sm" style={{ color: "#01757A" }}>{formatBRL(p)}</span>
                </div>
              </div>
            );
          })()}

          {draft.precoCompra !== ins.precoCompra && ins.precoCompra > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
              style={{ background: "rgba(1,117,122,0.08)", color: "#01757A" }}>
              {draft.precoCompra > ins.precoCompra ? <TrendingUp size={13} style={{ color: "#8A381C" }} /> : <TrendingDown size={13} style={{ color: "#01757A" }} />}
              Preço anterior ({formatBRL(ins.precoCompra)}) será salvo no histórico
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={salvar} className="btn-primary flex-1 justify-center py-2.5"><Check size={14} /> Salvar</button>
            <button onClick={cancelar} className="px-4 py-2 rounded-xl text-sm font-bold border" style={{ borderColor: "hsl(var(--border))" }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Gerenciador de categorias ─────────────────────────────────
function GerenciarCategorias({ categorias, onSave, onClose }: {
  categorias: string[]; onSave: (novas: string[]) => void; onClose: () => void;
}) {
  const [lista, setLista] = useState<string[]>([...categorias]);
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
    const novaLista = lista.map((c, i) => i === editandoIdx ? nome : c);
    setLista(novaLista);
    setEditandoIdx(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col gap-4 p-6"
        style={{ background: "hsl(var(--card))" }}>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings size={16} style={{ color: "#01757A" }} />
            <h2 className="font-extrabold text-base" style={{ color: "#01757A" }}>Gerenciar Categorias</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Lista de categorias */}
        <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
          {lista.map((cat, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: "hsl(var(--muted))" }}>
              {editandoIdx === i ? (
                <>
                  <input
                    value={editandoVal}
                    onChange={e => setEditandoVal(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && salvarEdicao()}
                    className="inline-input flex-1 text-sm"
                    autoFocus
                  />
                  <button onClick={salvarEdicao} className="p-1 rounded-lg" style={{ color: "#01757A" }}>
                    <Check size={14} />
                  </button>
                  <button onClick={() => setEditandoIdx(null)} className="p-1 rounded-lg text-muted-foreground">
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-semibold">{cat}</span>
                  <button onClick={() => iniciarEdicao(i)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => remover(i)} className="p-1 rounded-lg text-muted-foreground hover:text-destructive">
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Adicionar nova */}
        <div className="flex gap-2">
          <input
            value={nova}
            onChange={e => setNova(e.target.value)}
            onKeyDown={e => e.key === "Enter" && adicionar()}
            placeholder="Nova categoria..."
            className="inline-input flex-1 text-sm"
          />
          <button onClick={adicionar} className="btn-primary px-3 py-2">
            <Plus size={14} />
          </button>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => { onSave(lista); onClose(); }}
            className="btn-primary flex-1 justify-center py-2.5"
          >
            <Check size={14} /> Salvar categorias
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold border"
            style={{ borderColor: "hsl(var(--border))" }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Módulo principal ──────────────────────────────────────────
export default function InsumosModule() {
  const { insumos, loading, save } = useInsumos();
  const { produtos, loading: loadingProdutos } = useProdutos();
  const { categorias, save: saveCategorias } = useCategoriasInsumo();
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("Todos");
  const [gerenciandoCategorias, setGerenciandoCategorias] = useState(false);

  const adicionar = () =>
    save([...insumos, { nome: "Novo Insumo", qtdeCompra: 0, medidaCompra: "g", precoCompra: 0, qtdeUtil: 0, medidaUtil: "g" }]);

  const remover = (i: number) => save(insumos.filter((_, idx) => idx !== i));
  const salvarInsumo = (i: number, novo: Insumo) =>
    save(insumos.map((ins, idx) => idx === i ? novo : ins));

  const insumosDerivados = (produtos ?? [])
    .filter(p => p.virarInsumo)
    .map(p => {
      const { custoUnitario } = calcularCustoProduto(p, insumos);
      return {
        nome: p.nome,
        qtdeCompra: p.rendimento,
        medidaCompra: (p.medidaInsumo ?? "un") as Medida,
        precoCompra: custoUnitario * p.rendimento,
        qtdeUtil: p.rendimento,
        medidaUtil: (p.medidaInsumo ?? "un") as Medida,
        _derivado: true,
      } as Insumo & { _derivado: boolean };
    });

  if (loading || loadingProdutos) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <span className="animate-pulse font-semibold">Carregando insumos...</span>
      </div>
    );
  }

  const insumosFiltrados = [...insumos]
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .filter(ins => !busca || ins.nome.toLowerCase().includes(busca.toLowerCase()))
    .filter(ins => categoriaFiltro === "Todos" || ins.categoria === categoriaFiltro);

  return (
    <div>
      {gerenciandoCategorias && (
        <GerenciarCategorias
          categorias={categorias}
          onSave={saveCategorias}
          onClose={() => setGerenciandoCategorias(false)}
        />
      )}

      <div className="section-header">
        <h1 className="page-title mb-0">Insumos</h1>
        <div className="flex items-center gap-2">
          <Link to="/importar-nfce"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{ color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border))" }}>
            <FileText size={13} /> Importar NFC-e
          </Link>
          <button className="btn-primary" onClick={adicionar}>
            <Plus size={14} /> Adicionar
          </button>
        </div>
      </div>

      {/* Busca + Filtros */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar insumo..." className="inline-input w-full pl-9" />
        </div>
      </div>

      {/* Filtros de categoria */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        {(["Todos", ...categorias]).map(cat => (
          <button key={cat} onClick={() => setCategoriaFiltro(cat)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            style={{
              background: categoriaFiltro === cat ? "#01757A" : "hsl(var(--muted))",
              color: categoriaFiltro === cat ? "#fff" : "hsl(var(--muted-foreground))",
            }}>
            {cat}
            {cat !== "Todos" && (
              <span className="ml-1 opacity-70">({insumos.filter(i => i.categoria === cat).length})</span>
            )}
          </button>
        ))}
        {/* Botão gerenciar */}
        <button
          onClick={() => setGerenciandoCategorias(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold ml-auto transition-all"
          style={{ color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border))" }}
          title="Gerenciar categorias"
        >
          <Settings size={13} /> Categorias
        </button>
      </div>

      {insumos.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="font-semibold">Nenhum insumo cadastrado</p>
          <p className="text-sm mt-1">Clique em "Adicionar" ou importe uma NFC-e</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {insumosFiltrados.map((ins) => {
          const i = insumos.indexOf(ins);
          return (
            <InsumoCard key={i} ins={ins} index={i} total={insumos.length}
              categorias={categorias}
              onSave={(novo) => salvarInsumo(i, novo)}
              onRemover={() => remover(i)} />
          );
        })}
      </div>

      {/* Derivados do Cardápio */}
      {insumosDerivados.length > 0 && categoriaFiltro === "Todos" && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <Package size={16} style={{ color: "#01757A" }} />
            <h2 className="font-bold text-base" style={{ color: "#01757A" }}>Derivados do Cardápio</h2>
            <span className="badge-teal">{insumosDerivados.length}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Produtos marcados como "vira insumo" — custo calculado automaticamente pela receita.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {insumosDerivados
              .filter(ins => !busca || ins.nome.toLowerCase().includes(busca.toLowerCase()))
              .map((ins, i) => (
                <div key={i} className="produto-card py-3 px-4" style={{ borderLeft: "3px solid #01757A" }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Package size={12} style={{ color: "#01757A" }} />
                        <p className="font-bold text-sm truncate">{ins.nome}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          Rende: <strong>{ins.qtdeCompra} {ins.medidaCompra}</strong>
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                          style={{ background: "rgba(1,117,122,0.1)", color: "#01757A" }}>
                          {formatBRL(calcularCustoInsumo(ins).precoReal)}/{ins.medidaUtil}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">Auto</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
