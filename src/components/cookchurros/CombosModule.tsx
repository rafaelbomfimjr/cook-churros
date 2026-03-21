import { useState, useMemo } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Pencil, X, Check, Package, Tag } from "lucide-react";
import {
  Combo, ComboItem, ComboItemTipo,
  calcularCustoProduto, converterParaBase, formatBRL,
  Insumo, Produto
} from "@/lib/cookchurros";
import { useInsumos, useProdutos, useCombos, useOperacional } from "@/hooks/useCloudData";

// ── Helpers de custo ──────────────────────────────────────────
function custoUnitarioInsumo(nome: string, insumos: Insumo[]): number {
  const ins = insumos.find(i => i.nome === nome);
  if (!ins) return 0;
  const cb = converterParaBase(ins.qtdeCompra, ins.medidaCompra);
  const ub = converterParaBase(ins.qtdeUtil, ins.medidaUtil);
  if (cb <= 0 || ub <= 0) return 0;
  return (ins.precoCompra / (ub / cb)) / ub;
}

function custoDaPorcao(produto: Produto, porcaoIdx: number, insumos: Insumo[]): number {
  const po = produto.porcoes?.[porcaoIdx];
  if (!po) return 0;
  const { custoUnitario } = calcularCustoProduto(produto, insumos);
  const custoEmb = (po.embalagens ?? []).reduce((acc, emb) =>
    acc + custoUnitarioInsumo(emb.insumoNome, insumos) * emb.quantidade, 0);
  return custoUnitario * po.quantidade + custoEmb;
}

function custoDoItem(item: ComboItem, produtos: Produto[], insumos: Insumo[]): number {
  const produto = produtos.find(p => p.nome === item.produtoNome);
  if (!produto) return 0;
  if (item.tipo === "unidade") {
    const { custoUnitario } = calcularCustoProduto(produto, insumos);
    return custoUnitario * item.quantidade;
  }
  // porção
  return custoDaPorcao(produto, item.porcaoIndex ?? 0, insumos) * item.quantidade;
}

function custoTotalCombo(combo: Combo, produtos: Produto[], insumos: Insumo[]): number {
  return combo.itens.reduce((acc, item) => acc + custoDoItem(item, produtos, insumos), 0);
}

function descricaoItem(item: ComboItem, produtos: Produto[]): string {
  if (item.tipo === "unidade") {
    return `${item.quantidade}× ${item.produtoNome}`;
  }
  const produto = produtos.find(p => p.nome === item.produtoNome);
  const po = produto?.porcoes?.[item.porcaoIndex ?? 0];
  return `${item.quantidade}× Porção de ${po?.quantidade ?? "?"} ${item.produtoNome}`;
}

// ── Componente de linha de item do combo ──────────────────────
function ComboItemRow({ item, index, produtos, insumos, onChange, onRemove }: {
  item: ComboItem;
  index: number;
  produtos: Produto[];
  insumos: Insumo[];
  onChange: (novo: ComboItem) => void;
  onRemove: () => void;
}) {
  const produto = produtos.find(p => p.nome === item.produtoNome);
  const temPorcoes = (produto?.porcoes?.length ?? 0) > 0;
  const custo = custoDoItem(item, produtos, insumos);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Produto */}
      <select
        value={item.produtoNome}
        onChange={e => {
          const novo = produtos.find(p => p.nome === e.target.value);
          const temP = (novo?.porcoes?.length ?? 0) > 0;
          onChange({ ...item, produtoNome: e.target.value, tipo: temP ? "porcao" : "unidade", porcaoIndex: 0 });
        }}
        className="inline-input text-sm min-w-0"
        style={{ flex: "1 1 160px" }}
      >
        <option value="">— Selecione um produto —</option>
        {[...produtos].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map(p => (
          <option key={p.nome} value={p.nome}>{p.nome}</option>
        ))}
      </select>

      {/* Tipo: unidade / porção */}
      {produto && temPorcoes && (
        <select
          value={item.tipo}
          onChange={e => onChange({ ...item, tipo: e.target.value as ComboItemTipo, porcaoIndex: 0 })}
          className="inline-input text-sm shrink-0"
          style={{ width: "110px" }}
        >
          <option value="unidade">Unidade</option>
          <option value="porcao">Porção</option>
        </select>
      )}

      {/* Qual porção */}
      {item.tipo === "porcao" && produto && (produto.porcoes ?? []).length > 0 && (
        <select
          value={item.porcaoIndex ?? 0}
          onChange={e => onChange({ ...item, porcaoIndex: parseInt(e.target.value) })}
          className="inline-input text-sm shrink-0"
          style={{ width: "110px" }}
        >
          {(produto.porcoes ?? []).map((po, i) => (
            <option key={i} value={i}>Porção de {po.quantidade}</option>
          ))}
        </select>
      )}

      {/* Quantidade */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs text-muted-foreground">×</span>
        <input
          type="number" min={1}
          value={item.quantidade}
          onChange={e => onChange({ ...item, quantidade: parseInt(e.target.value) || 1 })}
          className="inline-input text-sm text-center font-bold"
          style={{ width: "52px" }}
        />
      </div>

      {/* Custo */}
      <span className="text-xs font-bold shrink-0 px-2 py-1 rounded-lg"
        style={{ background: "rgba(1,117,122,0.08)", color: "#01757A", minWidth: "64px", textAlign: "right" }}>
        {custo > 0 ? formatBRL(custo) : "—"}
      </span>

      <button onClick={onRemove} className="btn-danger p-1 shrink-0">
        <Trash2 size={11} />
      </button>
    </div>
  );
}

// ── Componente de card de combo ───────────────────────────────
function ComboCard({ combo, produtos, insumos, calcPrecoSugerido, calcLucroReal, taxasSemLucro, onSave, onRemove }: {
  combo: Combo;
  produtos: Produto[];
  insumos: Insumo[];
  calcPrecoSugerido: (custo: number) => number;
  calcLucroReal: (preco: number, custo: number) => number;
  taxasSemLucro: number;
  onSave: (novo: Combo) => void;
  onRemove: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState<Combo>(combo);
  const [expandido, setExpandido] = useState(false);

  const custo = custoTotalCombo(combo, produtos, insumos);
  const precoVenda = combo.precoVenda ?? 0;
  const precoSugerido = calcPrecoSugerido(custo);
  const lucroSugerido = calcLucroReal(precoSugerido, custo);
  const margemSugerida = precoSugerido > 0 ? ((precoSugerido - custo) / precoSugerido) * 100 : 0;
  // Se preço manual definido, calcular margem real após taxas
  const lucroManual = precoVenda > 0 ? calcLucroReal(precoVenda, custo) : 0;
  const margemManual = precoVenda > 0 ? (lucroManual / precoVenda) * 100 : 0;

  const abrirEditor = () => { setDraft({ ...combo, itens: combo.itens.map(i => ({ ...i })) }); setEditando(true); };
  const cancelar    = () => { setDraft({ ...combo }); setEditando(false); };
  const salvar      = () => { onSave(draft); setEditando(false); };

  const addItem = () => setDraft(d => ({
    ...d, itens: [...d.itens, { produtoNome: "", tipo: "unidade", quantidade: 1 }]
  }));

  const editItem = (i: number, novo: ComboItem) =>
    setDraft(d => ({ ...d, itens: d.itens.map((it, idx) => idx === i ? novo : it) }));

  const removeItem = (i: number) =>
    setDraft(d => ({ ...d, itens: d.itens.filter((_, idx) => idx !== i) }));

  if (editando) {
    return (
      <div className="produto-card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="font-bold text-sm" style={{ color: "#01757A" }}>Editando combo</p>
          <button onClick={cancelar} className="p-1 rounded-lg text-muted-foreground"><X size={16} /></button>
        </div>

        {/* Nome e descrição */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <label className="stat-label">Nome do Combo</label>
            <input value={draft.nome} onChange={e => setDraft(d => ({ ...d, nome: e.target.value }))}
              className="inline-input w-full font-bold" placeholder="Ex: Combo Casal" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="stat-label">Descrição (opcional)</label>
            <input value={draft.descricao ?? ""} onChange={e => setDraft(d => ({ ...d, descricao: e.target.value }))}
              className="inline-input w-full text-sm" placeholder="Ex: Perfeito para compartilhar" />
          </div>
        </div>

        {/* Itens */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <label className="stat-label">Itens do Combo</label>
            <button onClick={addItem} className="btn-primary text-xs px-3 py-1.5">
              <Plus size={12} /> Adicionar item
            </button>
          </div>
          {/* Cabeçalho */}
          {draft.itens.length > 0 && (
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
              <span style={{ flex: "1 1 160px" }}>Produto</span>
              <span>Qtde</span>
              <span style={{ minWidth: "64px" }}>Custo</span>
              <span className="w-7"></span>
            </div>
          )}
          {draft.itens.map((item, i) => (
            <ComboItemRow key={i} item={item} index={i} produtos={produtos} insumos={insumos}
              onChange={novo => editItem(i, novo)} onRemove={() => removeItem(i)} />
          ))}
          {draft.itens.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-3">Nenhum item adicionado ainda</p>
          )}
        </div>

        {/* Custo calculado + preço sugerido */}
        {draft.itens.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="stat-card py-2.5">
              <span className="stat-label">Custo estimado</span>
              <p className="font-extrabold text-lg mt-1">{formatBRL(custoTotalCombo(draft, produtos, insumos))}</p>
            </div>
            <div className="stat-card py-2.5" style={{ border: "1px solid rgba(1,117,122,0.2)" }}>
              <span className="stat-label">Preço Sugerido</span>
              <p className="font-extrabold text-lg mt-1" style={{ color: "#01757A" }}>
                {formatBRL(calcPrecoSugerido(custoTotalCombo(draft, produtos, insumos)))}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">com todas as taxas</p>
            </div>
          </div>
        )}

        {/* Preço de venda manual */}
        <div className="flex flex-col gap-1">
          <label className="stat-label">Preço de venda (R$) <span className="font-normal text-muted-foreground normal-case">— opcional, sobrescreve o sugerido</span></label>
          <input
            type="number" step="0.01"
            value={draft.precoVenda ?? ""}
            onChange={e => setDraft(d => ({ ...d, precoVenda: parseFloat(e.target.value) || 0 }))}
            className="inline-input w-full text-lg font-extrabold"
            placeholder="0,00"
          />
        </div>

        <div className="flex gap-2">
          <button onClick={salvar} className="btn-primary flex-1 justify-center py-2.5">
            <Check size={14} /> Salvar
          </button>
          <button onClick={cancelar} className="px-4 py-2 rounded-xl text-sm font-bold border"
            style={{ borderColor: "hsl(var(--border))" }}>Cancelar</button>
        </div>
      </div>
    );
  }

  // Modo visualização
  return (
    <div className="produto-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-base truncate">{combo.nome}</p>
          {combo.descricao && <p className="text-xs text-muted-foreground mt-0.5">{combo.descricao}</p>}

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-xs text-muted-foreground">
              Custo: <strong>{formatBRL(custo)}</strong>
            </span>
            {/* Preço sugerido automático */}
            <span className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={{ background: "rgba(1,117,122,0.08)", color: "#01757A" }}>
              Sugerido: {formatBRL(precoSugerido)}
            </span>
            {/* Preço manual definido */}
            {precoVenda > 0 && (
              <>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{ background: "rgba(138,56,28,0.1)", color: "#8A381C" }}>
                  Definido: {formatBRL(precoVenda)}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full`}
                  style={margemManual >= 40
                    ? { background: "rgba(34,197,94,0.12)", color: "#16a34a" }
                    : margemManual >= 20
                    ? { background: "rgba(234,179,8,0.12)", color: "#ca8a04" }
                    : { background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                  {margemManual.toFixed(1)}% margem real
                </span>
              </>
            )}
            <span className="text-xs text-muted-foreground">
              {combo.itens.length} {combo.itens.length === 1 ? "item" : "itens"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={abrirEditor}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold"
            style={{ background: "rgba(1,117,122,0.1)", color: "#01757A" }}>
            <Pencil size={12} /> Editar
          </button>
          <button onClick={onRemove} className="p-1.5 rounded-xl btn-danger">
            <Trash2 size={13} />
          </button>
          <button onClick={() => setExpandido(!expandido)}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground">
            {expandido ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* Itens expandidos */}
      {expandido && (
        <div className="mt-3 pt-3 border-t flex flex-col gap-2" style={{ borderColor: "hsl(var(--border))" }}>
          {combo.itens.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum item cadastrado</p>
          ) : (
            combo.itens.map((item, i) => {
              const custo_i = custoDoItem(item, produtos, insumos);
              return (
                <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl gap-2"
                  style={{ background: "hsl(var(--muted))" }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <Package size={12} style={{ color: "#8A381C", shrink: 0 }} />
                    <span className="text-sm font-semibold truncate">{descricaoItem(item, produtos)}</span>
                  </div>
                  <span className="text-xs font-bold shrink-0" style={{ color: "#01757A" }}>
                    {custo_i > 0 ? formatBRL(custo_i) : "—"}
                  </span>
                </div>
              );
            })
          )}

          {/* Resumo financeiro */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
            <div className="stat-card py-2">
              <span className="stat-label">Custo</span>
              <p className="font-extrabold text-sm mt-0.5">{formatBRL(custo)}</p>
            </div>
            <div className="stat-card py-2">
              <span className="stat-label">Preço Sugerido</span>
              <p className="font-extrabold text-sm mt-0.5" style={{ color: "#01757A" }}>{formatBRL(precoSugerido)}</p>
              <p className="text-xs text-muted-foreground">Lucro: {formatBRL(lucroSugerido)}</p>
            </div>
            {precoVenda > 0 && (
              <>
                <div className="stat-card py-2">
                  <span className="stat-label">Preço Definido</span>
                  <p className="font-extrabold text-sm mt-0.5" style={{ color: "#8A381C" }}>{formatBRL(precoVenda)}</p>
                </div>
                <div className="stat-card py-2">
                  <span className="stat-label">Lucro Real</span>
                  <p className="font-extrabold text-sm mt-0.5"
                    style={{ color: lucroManual >= 0 ? "#01757A" : "#ef4444" }}>
                    {formatBRL(lucroManual)}
                  </p>
                  <p className="text-xs text-muted-foreground">{margemManual.toFixed(1)}% margem</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Módulo principal ──────────────────────────────────────────
export default function CombosModule() {
  const { insumos, loading: loadingI } = useInsumos();
  const { produtos, loading: loadingP } = useProdutos();
  const { combos, loading: loadingC, save } = useCombos();
  const { dados, loading: loadingOp } = useOperacional();
  const [busca, setBusca] = useState("");

  const loading = loadingI || loadingP || loadingC || loadingOp;

  // Mesmas taxas da precificação — lidas do localStorage
  const pctLucro  = parseFloat(localStorage.getItem("pct_lucro")  ?? "60");
  const pctCartao = parseFloat(localStorage.getItem("pct_cartao") ?? "3.2");
  const pctApp    = parseFloat(localStorage.getItem("pct_app")    ?? "24");

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

  const pctOp = parseFloat(localStorage.getItem("pct_op_edit") ?? String(mediaCustoOp));
  const taxasSemLucro = pctCartao + pctApp + pctOp;

  // Preço mínimo (equilibrio) e preço sugerido com lucro
  const calcPrecoSugerido = (custo: number) => {
    if (custo <= 0 || taxasSemLucro >= 100) return 0;
    const precoMinimo = custo / (1 - taxasSemLucro / 100);
    return precoMinimo * (1 + pctLucro / 100);
  };

  const calcLucroReal = (preco: number, custo: number) =>
    preco - custo - preco * (taxasSemLucro / 100);

  const adicionar = () => {
    const novo: Combo = {
      id: Date.now().toString(),
      nome: "Novo Combo",
      itens: [],
    };
    save([...combos, novo]);
  };

  const salvarCombo = (id: string, novo: Combo) =>
    save(combos.map(c => c.id === id ? novo : c));

  const removerCombo = (id: string) =>
    save(combos.filter(c => c.id !== id));

  // Resumo geral
  const combosComPreco = combos.filter(c => (c.precoVenda ?? 0) > 0);
  const margemMedia = combosComPreco.length > 0
    ? combosComPreco.reduce((acc, c) => {
        const custo = custoTotalCombo(c, produtos, insumos);
        const preco = c.precoVenda!;
        const lucro = calcLucroLiquido(preco, custo);
        return acc + (lucro / preco) * 100;
      }, 0) / combosComPreco.length
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <span className="animate-pulse font-semibold">Carregando combos...</span>
      </div>
    );
  }

  const combosFiltrados = combos
    .filter(c => !busca || c.nome.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div>
      <div className="section-header">
        <h1 className="page-title mb-0">Combos</h1>
        <button className="btn-primary" onClick={adicionar}>
          <Plus size={14} /> Novo Combo
        </button>
      </div>

      {/* Resumo */}
      {combos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <div className="stat-card">
            <div className="flex items-center gap-1.5">
              <Tag size={13} style={{ color: "#01757A" }} />
              <span className="stat-label">Total de Combos</span>
            </div>
            <p className="stat-value mt-1">{combos.length}</p>
          </div>
          <div className="stat-card">
            <span className="stat-label">Com Preço Definido</span>
            <p className="stat-value mt-1">{combosComPreco.length}</p>
          </div>
          {combosComPreco.length > 0 && (
            <div className="stat-card">
              <span className="stat-label">Margem Média</span>
              <p className={`stat-value mt-1 ${margemMedia >= 50 ? "text-green-600" : margemMedia >= 30 ? "text-yellow-600" : "text-destructive"}`}>
                {margemMedia.toFixed(1)}%
              </p>
            </div>
          )}
        </div>
      )}

      {/* Busca */}
      {combos.length > 0 && (
        <div className="relative mb-4">
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar combo..."
            className="inline-input w-full pl-4"
          />
        </div>
      )}

      {/* Lista */}
      {combos.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="font-semibold">Nenhum combo cadastrado</p>
          <p className="text-sm mt-1">Clique em "Novo Combo" para começar</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {combosFiltrados.map(combo => (
            <ComboCard
              key={combo.id}
              combo={combo}
              produtos={produtos}
              insumos={insumos}
              calcPrecoSugerido={calcPrecoSugerido}
              calcLucroReal={calcLucroReal}
              taxasSemLucro={taxasSemLucro}
              onSave={novo => salvarCombo(combo.id, novo)}
              onRemove={() => removerCombo(combo.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
