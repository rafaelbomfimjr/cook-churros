// Shared data layer for Cook Churros

export type Medida = "g" | "kg" | "ml" | "L" | "un";

export interface Gasto {
  nome: string;
  valor: number;
}

export interface DadosMes {
  faturamento: number;
  gastos: Gasto[];
}

export interface DadosOperacional {
  [mes: string]: DadosMes;
}

export interface ItemReceita {
  insumoNome: string;
  quantidade: number;
  medida: Medida;
}

export interface Produto {
  nome: string;
  rendimento: number;
  receita: ItemReceita[];
}

export interface Insumo {
  nome: string;
  qtdeCompra: number;
  medidaCompra: Medida;
  precoCompra: number;
  qtdeUtil: number;
  medidaUtil: Medida;
}

export const mesAtualKey = () => new Date().toISOString().slice(0, 7);

export function converterParaBase(qtde: number, medida: Medida): number {
  switch (medida) {
    case "kg": return qtde * 1000;
    case "g": return qtde;
    case "L": return qtde * 1000;
    case "ml": return qtde;
    case "un": return qtde;
    default: return qtde;
  }
}

export function calcularCustoInsumo(insumo: Insumo): { desperdicio: number; precoReal: number } {
  const base = converterParaBase(insumo.qtdeCompra, insumo.medidaCompra);
  const util = converterParaBase(insumo.qtdeUtil, insumo.medidaUtil);
  if (base <= 0 || util <= 0) return { desperdicio: 0, precoReal: 0 };
  const aproveitamento = util / base;
  return {
    desperdicio: (1 - aproveitamento) * 100,
    precoReal: insumo.precoCompra / aproveitamento,
  };
}

export function calcularCustoProduto(produto: Produto, insumos: Insumo[]): { custoTotal: number; custoUnitario: number } {
  let custoTotal = 0;
  produto.receita.forEach(item => {
    const insumo = insumos.find(i => i.nome === item.insumoNome);
    if (!insumo) return;
    const qtdeCompraBase = converterParaBase(insumo.qtdeCompra, insumo.medidaCompra);
    const qtdeUtilBase = converterParaBase(insumo.qtdeUtil, insumo.medidaUtil);
    if (qtdeCompraBase <= 0 || qtdeUtilBase <= 0) return;
    const aproveitamento = qtdeUtilBase / qtdeCompraBase;
    const custoReal = insumo.precoCompra / aproveitamento;
    const custoPorBase = custoReal / qtdeUtilBase;
    const qtdeUsadaBase = converterParaBase(item.quantidade, item.medida);
    custoTotal += custoPorBase * qtdeUsadaBase;
  });
  return {
    custoTotal,
    custoUnitario: produto.rendimento > 0 ? custoTotal / produto.rendimento : 0,
  };
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function getDefaultDadosMes(): DadosMes {
  return {
    faturamento: 0,
    gastos: [
      { nome: "Mensalidade iFood", valor: 0 },
      { nome: "Marketing", valor: 0 },
      { nome: "MEI", valor: 0 },
    ],
  };
}
