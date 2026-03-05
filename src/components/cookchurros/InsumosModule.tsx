import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Insumo, Medida, calcularCustoInsumo, formatBRL } from "@/lib/cookchurros";

const medidas: Medida[] = ["g", "kg", "ml", "L", "un"];

export default function InsumosModule() {
  const [insumos, setInsumos] = useState<Insumo[]>(() => {
    const saved = localStorage.getItem("insumos");
    return saved ? JSON.parse(saved) : [
      { nome: "Maracujá", qtdeCompra: 1, medidaCompra: "kg", precoCompra: 12.99, qtdeUtil: 330, medidaUtil: "g" },
      { nome: "Cenoura", qtdeCompra: 550, medidaCompra: "g", precoCompra: 1.81, qtdeUtil: 468, medidaUtil: "g" },
    ];
  });

  const save = (novo: Insumo[]) => {
    setInsumos(novo);
    localStorage.setItem("insumos", JSON.stringify(novo));
  };

  const adicionar = () => save([...insumos, { nome: "Novo", qtdeCompra: 0, medidaCompra: "g", precoCompra: 0, qtdeUtil: 0, medidaUtil: "g" }]);
  const remover = (i: number) => save(insumos.filter((_, idx) => idx !== i));
  const editar = (i: number, campo: keyof Insumo, val: string) => {
    const novo = insumos.map((ins, idx) =>
      idx === i
        ? { ...ins, [campo]: ["qtdeCompra", "precoCompra", "qtdeUtil"].includes(campo) ? parseFloat(val) || 0 : val }
        : ins
    );
    save(novo);
  };

  return (
    <div>
      <div className="section-header">
        <h1 className="page-title mb-0">Insumos</h1>
        <button className="btn-primary" onClick={adicionar}>
          <Plus size={14} /> Adicionar Insumo
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table min-w-[800px]">
          <thead>
            <tr>
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
