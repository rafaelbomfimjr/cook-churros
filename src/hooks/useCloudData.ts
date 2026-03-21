import { useState, useEffect, useCallback } from "react";
import {
  Insumo,
  Produto,
  Combo,
  DadosOperacional,
  getDefaultDadosMes,
  mesAtualKey,
} from "@/lib/cookchurros";

const DEFAULT_INSUMOS: Insumo[] = [
  { nome: "Farinha de Trigo", qtdeCompra: 1, medidaCompra: "kg", precoCompra: 3.45, qtdeUtil: 1000, medidaUtil: "g" },
  { nome: "Manteiga", qtdeCompra: 1, medidaCompra: "kg", precoCompra: 17.31, qtdeUtil: 1000, medidaUtil: "g" },
  { nome: "Sal", qtdeCompra: 1, medidaCompra: "kg", precoCompra: 1.75, qtdeUtil: 1000, medidaUtil: "g" },
  { nome: "Açúcar", qtdeCompra: 1, medidaCompra: "kg", precoCompra: 4.19, qtdeUtil: 1000, medidaUtil: "g" },
  { nome: "Canela", qtdeCompra: 30, medidaCompra: "g", precoCompra: 5.99, qtdeUtil: 30, medidaUtil: "g" },
  { nome: "Leite Condensado", qtdeCompra: 395, medidaCompra: "g", precoCompra: 5.49, qtdeUtil: 395, medidaUtil: "g" },
  { nome: "Creme de Leite", qtdeCompra: 200, medidaCompra: "g", precoCompra: 2.79, qtdeUtil: 200, medidaUtil: "g" },
  { nome: "Nescau", qtdeCompra: 730, medidaCompra: "g", precoCompra: 23.50, qtdeUtil: 730, medidaUtil: "g" },
  { nome: "Leite em Pó", qtdeCompra: 380, medidaCompra: "g", precoCompra: 19.41, qtdeUtil: 380, medidaUtil: "g" },
  { nome: "Confete M&Ms", qtdeCompra: 1, medidaCompra: "kg", precoCompra: 29.30, qtdeUtil: 1000, medidaUtil: "g" },
  { nome: "Paçoca", qtdeCompra: 560, medidaCompra: "g", precoCompra: 22.57, qtdeUtil: 560, medidaUtil: "g" },
  { nome: "Amendoim", qtdeCompra: 1, medidaCompra: "kg", precoCompra: 20.00, qtdeUtil: 1000, medidaUtil: "g" },
  { nome: "Granulado", qtdeCompra: 500, medidaCompra: "g", precoCompra: 18.32, qtdeUtil: 500, medidaUtil: "g" },
  { nome: "Leite Integral", qtdeCompra: 1, medidaCompra: "L", precoCompra: 5.24, qtdeUtil: 1000, medidaUtil: "ml" },
  { nome: "Baunilha", qtdeCompra: 30, medidaCompra: "ml", precoCompra: 8.39, qtdeUtil: 30, medidaUtil: "ml" },
  { nome: "Embalagem Tradicional Interna", qtdeCompra: 100, medidaCompra: "un", precoCompra: 28.45, qtdeUtil: 100, medidaUtil: "un" },
  { nome: "Embalagem Tradicional Externa", qtdeCompra: 100, medidaCompra: "un", precoCompra: 28.45, qtdeUtil: 100, medidaUtil: "un" },
  { nome: "Embalagem Espanhol", qtdeCompra: 100, medidaCompra: "un", precoCompra: 85.62, qtdeUtil: 100, medidaUtil: "un" },
  { nome: "Saco Kraft", qtdeCompra: 100, medidaCompra: "un", precoCompra: 47.46, qtdeUtil: 100, medidaUtil: "un" },
  { nome: "Papel Manteiga", qtdeCompra: 3000, medidaCompra: "un", precoCompra: 79.00, qtdeUtil: 3000, medidaUtil: "un" },
  { nome: "Lacre de Segurança", qtdeCompra: 500, medidaCompra: "un", precoCompra: 11.97, qtdeUtil: 500, medidaUtil: "un" },
  { nome: "Recheio Doce de Leite", qtdeCompra: 1.1, medidaCompra: "kg", precoCompra: 16.98, qtdeUtil: 1100, medidaUtil: "g" },
  { nome: "Recheio Chocolate", qtdeCompra: 550, medidaCompra: "g", precoCompra: 11.07, qtdeUtil: 550, medidaUtil: "g" },
  { nome: "Recheio Creme de Ninho", qtdeCompra: 550, medidaCompra: "g", precoCompra: 12.32, qtdeUtil: 550, medidaUtil: "g" },
  { nome: "Potinho de Recheio", qtdeCompra: 700, medidaCompra: "un", precoCompra: 119.30, qtdeUtil: 700, medidaUtil: "un" },
  { nome: "Cenoura", qtdeCompra: 550, medidaCompra: "g", precoCompra: 1.81, qtdeUtil: 468, medidaUtil: "g" },
  { nome: "Ovo", qtdeCompra: 6, medidaCompra: "un", precoCompra: 4.99, qtdeUtil: 6, medidaUtil: "un" },
  { nome: "Óleo", qtdeCompra: 900, medidaCompra: "ml", precoCompra: 6.97, qtdeUtil: 900, medidaUtil: "ml" },
  { nome: "Fermento em Pó", qtdeCompra: 100, medidaCompra: "g", precoCompra: 3.55, qtdeUtil: 100, medidaUtil: "g" },
  { nome: "Embalagem de Bolo", qtdeCompra: 25, medidaCompra: "un", precoCompra: 18.30, qtdeUtil: 25, medidaUtil: "un" },
  { nome: "Granulado Colorido", qtdeCompra: 150, medidaCompra: "g", precoCompra: 4.69, qtdeUtil: 150, medidaUtil: "g" },
  { nome: "Nutella", qtdeCompra: 650, medidaCompra: "g", precoCompra: 39.99, qtdeUtil: 650, medidaUtil: "g" },
  { nome: "Liga Neutra", qtdeCompra: 100, medidaCompra: "g", precoCompra: 5.99, qtdeUtil: 100, medidaUtil: "g" },
  { nome: "Embalagem Saco de Sacolé", qtdeCompra: 500, medidaCompra: "un", precoCompra: 19.70, qtdeUtil: 500, medidaUtil: "un" },
  { nome: "Embalagem Isopor Lancheira", qtdeCompra: 100, medidaCompra: "un", precoCompra: 59.90, qtdeUtil: 100, medidaUtil: "un" },
  { nome: "Embalagem Isopor Hotdog", qtdeCompra: 100, medidaCompra: "un", precoCompra: 37.89, qtdeUtil: 100, medidaUtil: "un" },
  { nome: "Coco Ralado", qtdeCompra: 1, medidaCompra: "kg", precoCompra: 79.00, qtdeUtil: 1000, medidaUtil: "g" },
  { nome: "Cereal Ball", qtdeCompra: 500, medidaCompra: "g", precoCompra: 24.90, qtdeUtil: 500, medidaUtil: "g" },
  { nome: "Base do Sacolé (Ninho)", qtdeCompra: 1, medidaCompra: "un", precoCompra: 1.58, qtdeUtil: 1, medidaUtil: "un" },
  { nome: "Morango", qtdeCompra: 250, medidaCompra: "g", precoCompra: 4.99, qtdeUtil: 250, medidaUtil: "g" },
  { nome: "Limão", qtdeCompra: 1, medidaCompra: "kg", precoCompra: 7.99, qtdeUtil: 1000, medidaUtil: "g" },
  { nome: "Oreo", qtdeCompra: 90, medidaCompra: "g", precoCompra: 3.49, qtdeUtil: 90, medidaUtil: "g" },
  { nome: "Base do Sacolé (Ninho + Oreo)", qtdeCompra: 1, medidaCompra: "un", precoCompra: 1.96, qtdeUtil: 1, medidaUtil: "un" },
  { nome: "Tang Morango", qtdeCompra: 15, medidaCompra: "g", precoCompra: 2.19, qtdeUtil: 15, medidaUtil: "g" },
  { nome: "Tang Maracujá", qtdeCompra: 15, medidaCompra: "g", precoCompra: 2.19, qtdeUtil: 15, medidaUtil: "g" },
  { nome: "Maracujá", qtdeCompra: 1, medidaCompra: "kg", precoCompra: 12.99, qtdeUtil: 330, medidaUtil: "g" },
];

async function apiGet<T>(endpoint: string): Promise<T | null> {
  try {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`GET ${endpoint} falhou: ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

async function apiPost(endpoint: string, body: unknown): Promise<boolean> {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export function useInsumos() {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Insumo[]>("/api/insumos").then((data) => {
      setInsumos(data ?? DEFAULT_INSUMOS);
      if (!data) apiPost("/api/insumos", DEFAULT_INSUMOS);
      setLoading(false);
    });
  }, []);

  const save = useCallback(async (nova: Insumo[]) => {
    setInsumos(nova);
    await apiPost("/api/insumos", nova);
  }, []);

  return { insumos, loading, save };
}

export function useProdutos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Produto[]>("/api/produtos").then((data) => {
      setProdutos(data ?? []);
      setLoading(false);
    });
  }, []);

  const save = useCallback(async (novos: Produto[]) => {
    setProdutos(novos);
    await apiPost("/api/produtos", novos);
  }, []);

  return { produtos, loading, save };
}

export function useOperacional() {
  const [dados, setDados] = useState<DadosOperacional>({});
  const [loading, setLoading] = useState(true);
  const [mesAtual, setMesAtual] = useState(mesAtualKey());

  useEffect(() => {
    apiGet<DadosOperacional>("/api/operacional").then((data) => {
      setDados(data ?? {});
      setLoading(false);
    });
  }, []);

  const save = useCallback(async (novos: DadosOperacional) => {
    setDados(novos);
    await apiPost("/api/operacional", novos);
  }, []);

  const dadosMes = dados[mesAtual] ?? getDefaultDadosMes();

  const updateMes = useCallback(
    async (parcial: Partial<typeof dadosMes>) => {
      const novos = { ...dados, [mesAtual]: { ...dadosMes, ...parcial } };
      await save(novos);
    },
    [dados, mesAtual, dadosMes, save]
  );

  const trocarMes = useCallback(
    async (novoMes: string) => {
      const novos = { ...dados };
      if (!novos[novoMes]) novos[novoMes] = getDefaultDadosMes();
      await save(novos);
      setMesAtual(novoMes);
    },
    [dados, save]
  );

  return { dados, dadosMes, mesAtual, loading, save, updateMes, trocarMes };
}

export function useCombos() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Combo[]>("/api/combos").then((data) => {
      setCombos(data ?? []);
      setLoading(false);
    });
  }, []);

  const save = useCallback(async (novos: Combo[]) => {
    setCombos(novos);
    await apiPost("/api/combos", novos);
  }, []);

  return { combos, loading, save };
}
