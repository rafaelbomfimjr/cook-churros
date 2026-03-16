import { useState } from "react";
import { Plus, Trash2, FileText, Pencil, X, Check, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { Insumo, Medida, calcularCustoInsumo, calcularCustoProduto, formatBRL } from "@/lib/cookchurros";
import { useInsumos, useProdutos } from "@/hooks/useCloudData";
import { Package } from "lucide-react";

const medidas: Medida[] = ["g", "kg", "ml", "L", "un"];

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
      {/* Mini sparkline */}
      <div className="flex items-end gap-0.5 h-6">
        {historico.map((h, i) => {
          const height = Math.max(4, Math.round(((h.preco - min) / range) * 20) + 4);
          const isLast = i === historico.length - 1;
          return (
            <div
              key={i}
              title={`${formatBRL(h.preco)} — ${new Date(h.data).toLocaleDateString("pt-BR")}`}
              className="w-2 rounded-sm transition-all"
              style={{
                height: `${height}px`,
                background: isLast
                  ? tendencia === "up" ? "#8A381C" : tendencia === "down" ? "#01757A" : "hsl(var(--muted-foreground))"
                  : "hsl(var(--border))",
              }}
            />
          );
        })}
      </div>
      {/* Tendência */}
      {tendencia === "up" && <TrendingUp size={13} style={{ color: "#8A381C" }} />}
      {tendencia === "down" && <TrendingDown size={13} style={{ color: "#01757A" }} />}
      {tendencia === "flat" && <Minus size={13} className="text-muted-foreground" />}
      <span className="text-xs font-semibold" style={{
        color: tendencia === "up" ? "#8A381C" : tendencia === "down" ? "#01757A" : "hsl(var(--muted-foreground))"
      }}>
        {tendencia === "up" ? "subindo" : tendencia === "down" ? "baixando" : "estável"}
      </span>
    </div>
  );
}

function InsumoCard({ ins, index, total, onSave, onRemover }: {
  ins: Insumo;
  index: number;
  total: number;
  onSave: (novo: Insumo) => void;
  onRemover: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState<Insumo>(ins);
  const [showHistorico, setShowHistorico] = useState(false);
  const { desperdicio, precoReal } = calcularCustoInsumo(ins);

  const abrirEditor = () => {
    setDraft({ ...ins });
    setEditando(true);
    setShowHistorico(false);
  };

  const cancelar = () => {
    setDraft({ ...ins });
    setEditando(false);
  };

  const salvar = () => {
    // Ao salvar, se o preço mudou, adicionar ao histórico
    const novoInsumo = { ...draft };
    if (draft.precoCompra !== ins.precoCompra && ins.precoCompra > 0) {
      const historico = [...(ins.historicoPrecos ?? []), {
        preco: ins.precoCompra,
        data: new Date().toISOString(),
      }].slice(-6); // máximo 6
      novoInsumo.historicoPrecos = historico;
    }
    onSave(novoInsumo);
    setEditando(false);
  };

  const setField = (campo: keyof Insumo, val: string) => {
    setDraft(prev => ({
      ...prev,
      [campo]: ["qtdeCompra", "precoCompra", "qtdeUtil"].includes(campo) ? parseFloat(val) || 0 : val,
    }));
  };

  const tendencia = (() => {
    const h = ins.historicoPrecos;
    if (!h || h.length < 1) return null;
    const ultimo = h[h.length - 1].preco;
    if (ins.precoCompra > ultimo) return "up";
    if (ins.precoCompra < ultimo) return "down";
    return "flat";
  })();

  return (
    <div className="produto-card transition-all" style={{ padding: editando ? "20px" : "16px 20px" }}>

      {/* ── FRENTE DO CARD ── */}
      {!editando && (
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{ins.nome}</p>
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

              {/* Histórico sparkline */}
              {ins.historicoPrecos && ins.historicoPrecos.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowHistorico(!showHistorico)}
                    className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground"
                  >
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
                            <span className="text-muted-foreground">
                              {new Date(h.data).toLocaleDateString("pt-BR")}
                            </span>
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
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all"
                style={{ background: "rgba(1,117,122,0.1)", color: "#01757A" }}>
                <Pencil size={12} /> Editar
              </button>
              <button onClick={onRemover} className="p-1.5 rounded-xl transition-all btn-danger">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDITOR ── */}
      {editando && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="font-bold text-sm" style={{ color: "#01757A" }}>Editando insumo</p>
            <button onClick={cancelar} className="p-1 rounded-lg text-muted-foreground">
              <X size={16} />
            </button>
          </div>

          {/* Nome */}
          <div className="flex flex-col gap-1">
            <label className="stat-label">Nome</label>
            <input
              value={draft.nome}
              onChange={e => setField("nome", e.target.value)}
              className="inline-input w-full"
            />
          </div>

          {/* Compra */}
          <div>
            <p className="stat-label mb-2">Dados de compra</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Quantidade</label>
                <input type="number" value={draft.qtdeCompra || ""}
                  onChange={e => setField("qtdeCompra", e.target.value)}
                  className="inline-input w-full" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Medida</label>
                <select value={draft.medidaCompra}
                  onChange={e => setField("medidaCompra", e.target.value)}
                  className="inline-input w-full">
                  {medidas.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Preço (R$)</label>
                <input type="number" step="0.01" value={draft.precoCompra || ""}
                  onChange={e => setField("precoCompra", e.target.value)}
                  className="inline-input w-full" />
              </div>
            </div>
          </div>

          {/* Útil */}
          <div>
            <p className="stat-label mb-2">Quantidade útil (após desperdício)</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Quantidade</label>
                <input type="number" value={draft.qtdeUtil || ""}
                  onChange={e => setField("qtdeUtil", e.target.value)}
                  className="inline-input w-full" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Medida</label>
                <select value={draft.medidaUtil}
                  onChange={e => setField("medidaUtil", e.target.value)}
                  className="inline-input w-full">
                  {medidas.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Resumo calculado */}
          {(() => {
            const { desperdicio: d, precoReal: p } = calcularCustoInsumo(draft);
            return (
              <div className="grid grid-cols-2 gap-2">
                <div className="stat-card py-2.5">
                  <span className="stat-label">Desperdício</span>
                  <span className={`font-extrabold text-sm ${d > 30 ? "text-destructive" : d > 15 ? "text-yellow-600" : "text-green-600"}`}>
                    {d.toFixed(1)}%
                  </span>
                </div>
                <div className="stat-card py-2.5">
                  <span className="stat-label">Preço Pós-desp.</span>
                  <span className="font-extrabold text-sm" style={{ color: "#01757A" }}>{formatBRL(p)}</span>
                </div>
              </div>
            );
          })()}

          {/* Aviso de mudança de preço */}
          {draft.precoCompra !== ins.precoCompra && ins.precoCompra > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
              style={{ background: "rgba(1,117,122,0.08)", color: "#01757A" }}>
              {draft.precoCompra > ins.precoCompra
                ? <TrendingUp size={13} style={{ color: "#8A381C" }} />
                : <TrendingDown size={13} style={{ color: "#01757A" }} />}
              Preço anterior ({formatBRL(ins.precoCompra)}) será salvo no histórico
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={salvar}
              className="btn-primary flex-1 justify-center py-2.5">
              <Check size={14} /> Salvar
            </button>
            <button onClick={cancelar}
              className="px-4 py-2 rounded-xl text-sm font-bold border"
              style={{ borderColor: "hsl(var(--border))" }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InsumosModule() {
  const { insumos, loading, save } = useInsumos();
  const { produtos, loading: loadingProdutos } = useProdutos();

  const adicionar = () =>
    save([...insumos, { nome: "Novo Insumo", qtdeCompra: 0, medidaCompra: "g", precoCompra: 0, qtdeUtil: 0, medidaUtil: "g" }]);

  const remover = (i: number) => save(insumos.filter((_, idx) => idx !== i));

  const salvarInsumo = (i: number, novo: Insumo) =>
    save(insumos.map((ins, idx) => idx === i ? novo : ins));

  // Produtos marcados como "vira insumo" — calculados dinamicamente
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

  return (
    <div>
      <div className="section-header">
        <h1 className="page-title mb-0">Insumos</h1>
        <div className="flex items-center gap-2">
          <Link
            to="/importar-nfce"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{ color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border))" }}
          >
            <FileText size={13} /> Importar NFC-e
          </Link>
          <button className="btn-primary" onClick={adicionar}>
            <Plus size={14} /> Adicionar
          </button>
        </div>
      </div>

      {insumos.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="font-semibold">Nenhum insumo cadastrado</p>
          <p className="text-sm mt-1">Clique em "Adicionar" ou importe uma NFC-e</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {insumos.map((ins, i) => (
          <InsumoCard
            key={i}
            ins={ins}
            index={i}
            total={insumos.length}
            onSave={(novo) => salvarInsumo(i, novo)}
            onRemover={() => remover(i)}
          />
        ))}
      </div>

      {/* Insumos derivados de produtos do cardápio */}
      {insumosDerivados.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <Package size={16} style={{ color: "#01757A" }} />
            <h2 className="font-bold text-base" style={{ color: "#01757A" }}>
              Derivados do Cardápio
            </h2>
            <span className="badge-teal">{insumosDerivados.length}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Produtos marcados como "vira insumo" — custo calculado automaticamente pela receita.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {insumosDerivados.map((ins, i) => (
              <div key={i} className="produto-card py-3 px-4"
                style={{ borderLeft: "3px solid #01757A" }}>
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
