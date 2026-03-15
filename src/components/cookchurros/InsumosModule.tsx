import { Plus, Trash2, ArrowUp, ArrowDown, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { Insumo, Medida, calcularCustoInsumo, formatBRL } from "@/lib/cookchurros";
import { useInsumos } from "@/hooks/useCloudData";

const medidas: Medida[] = ["g", "kg", "ml", "L", "un"];

export default function InsumosModule() {
  const { insumos, loading, save } = useInsumos();

  const adicionar = () =>
    save([...insumos, { nome: "Novo", qtdeCompra: 0, medidaCompra: "g", precoCompra: 0, qtdeUtil: 0, medidaUtil: "g" }]);

  const remover = (i: number) => save(insumos.filter((_, idx) => idx !== i));

  const editar = (i: number, campo: keyof Insumo, val: string) => {
    const novo = insumos.map((ins, idx) =>
      idx === i
        ? { ...ins, [campo]: ["qtdeCompra", "precoCompra", "qtdeUtil"].includes(campo) ? parseFloat(val) || 0 : val }
        : ins
    );
    save(novo);
  };

  const moverCima = (i: number) => {
    if (i === 0) return;
    const novo = [...insumos];
    [novo[i - 1], novo[i]] = [novo[i], novo[i - 1]];
    save(novo);
  };

  const moverBaixo = (i: number) => {
    if (i === insumos.length - 1) return;
    const novo = [...insumos];
    [novo[i + 1], novo[i]] = [novo[i], novo[i + 1]];
    save(novo);
  };

  if (loading) {
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
            <Plus size={14} /> Adicionar Insumo
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table min-w-[800px]">
          <thead>
            <tr>
              <th className="w-16">Ordem</th>
              <th>Nome</th>
              <th>Qtde Compra</th>
              <th>Medida</th>
              <th>Preço Compra</th>
              <th>Qtde Útil</th>
              <th>Medida Útil</th>
              <th>Desperdício</th>
              <th>Preço Pós-Desp.</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {insumos.map((ins, i) => {
              const { desperdicio, precoReal } = calcularCustoInsumo(ins);
              return (
                <tr key={i}>
                  <td>
                    <div className="flex gap-1 justify-center">
                      <button className="btn-ghost p-0.5" onClick={() => moverCima(i)} disabled={i === 0} title="Mover para cima">
                        <ArrowUp size={13} />
                      </button>
                      <button className="btn-ghost p-0.5" onClick={() => moverBaixo(i)} disabled={i === insumos.length - 1} title="Mover para baixo">
                        <ArrowDown size={13} />
                      </button>
                    </div>
                  </td>
                  <td><input value={ins.nome} onChange={e => editar(i, "nome", e.target.value)} /></td>
                  <td><input type="number" value={ins.qtdeCompra || ""} onChange={e => editar(i, "qtdeCompra", e.target.value)} /></td>
                  <td>
                    <select value={ins.medidaCompra} onChange={e => editar(i, "medidaCompra", e.target.value)}>
                      {medidas.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </td>
                  <td><input type="number" step="0.01" value={ins.precoCompra || ""} onChange={e => editar(i, "precoCompra", e.target.value)} /></td>
                  <td><input type="number" value={ins.qtdeUtil || ""} onChange={e => editar(i, "qtdeUtil", e.target.value)} /></td>
                  <td>
                    <select value={ins.medidaUtil} onChange={e => editar(i, "medidaUtil", e.target.value)}>
                      {medidas.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </td>
                  <td>
                    <span className={`font-bold ${desperdicio > 30 ? "text-destructive" : desperdicio > 15 ? "text-yellow-500" : "text-green-600"}`}>
                      {desperdicio.toFixed(1)}%
                    </span>
                  </td>
                  <td><span className="font-bold">{formatBRL(precoReal)}</span></td>
                  <td>
                    <button className="btn-danger" onClick={() => remover(i)}>
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
