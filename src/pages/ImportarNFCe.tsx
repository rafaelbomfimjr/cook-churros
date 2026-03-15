import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FileText, CheckCircle2, AlertCircle, Trash2, ChevronRight, ClipboardPaste } from "lucide-react";

interface ItemNFCe {
  nome: string;
  quantidade: number;
  unidade: string;
  vl_unit: number;
  vl_total: number;
}

interface NFCeData {
  fornecedor: string;
  cnpj: string;
  emissao: string;
  chave: string;
  itens: ItemNFCe[];
  total: number;
  desconto: number;
  valor_pagar: number;
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseNFCeText(text: string): NFCeData {
  const result: NFCeData = {
    fornecedor: "", cnpj: "", emissao: "", chave: "",
    itens: [], total: 0, desconto: 0, valor_pagar: 0,
  };

  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("CNPJ:")) {
      const m = lines[i].match(/CNPJ:\s*([\d.\/-]+)/);
      if (m) result.cnpj = m[1];
      if (i > 0) result.fornecedor = lines[i - 1];
      break;
    }
  }

  const chaveM = text.match(/Chave de acesso:\s*([\d\s]{40,60})/);
  if (chaveM) result.chave = chaveM[1].replace(/\s/g, "").trim();
  const emissaoM = text.match(/miss[aã]o[:\s]+([\d\/]+)/i);
  if (emissaoM) result.emissao = emissaoM[1];

  // Normalizar quebras de linha
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/Vl\.\s*Total\s*\n\s*([\d,]+)/g, "Vl. Total $1")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ");

  // Localizar cada "(Código: NUMERO )" e extrair nome + dados do bloco seguinte
  const codigoRe = /\(C[oó]digo:\s*(\d+)\s*\)/g;
  const posicoes: { idx: number; end: number }[] = [];
  let cm: RegExpExecArray | null;
  while ((cm = codigoRe.exec(normalized)) !== null) {
    posicoes.push({ idx: cm.index, end: cm.index + cm[0].length });
  }

  for (let i = 0; i < posicoes.length; i++) {
    const pos = posicoes[i];
    const prevEnd = i === 0 ? 0 : posicoes[i - 1].end;
    let antes = normalized.slice(prevEnd, pos.idx);

    // Remover "Vl. Total X,XX" do item anterior
    antes = antes.replace(/.*Vl\.\s*Total\s*[\d,]+\s*/i, "");
    // Remover cabeçalho (endereço termina com ", UF")
    antes = antes.replace(/^.*,\s*[A-Z]{2}\s+/i, "");
    // Remover números/símbolos soltos no início
    antes = antes.replace(/^[\s\d,.\/*\-]+/, "").trim();

    if (!antes || antes.length < 3) continue;

    const bloco = normalized.slice(pos.end, posicoes[i + 1]?.idx ?? normalized.length);
    const qtdeM = bloco.match(/Qtde\.:\s*([\d,]+)/);
    const unM   = bloco.match(/UN:\s*([A-Z]{1,3})\s*(?:Vl\.|$)/);
    const unitM = bloco.match(/Vl\.\s*Unit\.:\s*([\d,\s]+?)Vl\./);
    const totalM = bloco.match(/Vl\.\s*Total\s*([\d,]+)/);

    if (!qtdeM || !totalM) continue;

    result.itens.push({
      nome: antes.trim(),
      quantidade: parseFloat(qtdeM[1].replace(",", ".")),
      unidade: unM?.[1] ?? "UN",
      vl_unit: parseFloat((unitM?.[1] ?? "0").replace(/\s/g, "").replace(",", ".")) || 0,
      vl_total: parseFloat(totalM[1].replace(",", ".")) || 0,
    });
  }

  const totalM = text.match(/Valor total R\$[:\s]*([\d,]+)/);
  if (totalM) result.total = parseFloat(totalM[1].replace(",", "."));
  const descM = text.match(/Descontos R\$[:\s]*([\d,]+)/);
  if (descM) result.desconto = parseFloat(descM[1].replace(",", "."));
  const pagarM = text.match(/Valor a pagar R\$[:\s]*([\d,]+)/);
  if (pagarM) result.valor_pagar = parseFloat(pagarM[1].replace(",", "."));

  return result;
}


type Step = "colar" | "preview" | "success";

export default function ImportarNFCe() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<Step>("colar");
  const [texto, setTexto] = useState("");
  const [nfce, setNfce] = useState<NFCeData | null>(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [itensFiltrados, setItensFiltrados] = useState<ItemNFCe[]>([]);

  useEffect(() => {
    const data = searchParams.get("data");
    if (!data) return;
    try {
      const parsed: NFCeData = JSON.parse(decodeURIComponent(data));
      if (parsed.itens?.length > 0) { setNfce(parsed); setStep("preview"); }
    } catch {}
  }, []);

  const processar = () => {
    setErro("");
    if (!texto.trim()) { setErro("Cole o texto da nota antes de continuar."); return; }
    const parsed = parseNFCeText(texto);
    if (parsed.itens.length === 0) {
      setErro("Nenhum item encontrado. Copie o texto completo da página da nota.");
      return;
    }
    setNfce(parsed);
    setItensFiltrados(parsed.itens);
    setStep("preview");
  };

  const colarClipboard = async () => {
    try {
      const t = await navigator.clipboard.readText();
      setTexto(t);
      setErro("");
    } catch {
      setErro("Não foi possível acessar o clipboard. Cole manualmente.");
    }
  };

  const salvarInsumos = async () => {
    if (!nfce) return;
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch("/api/insumos");
      const insumos: Array<{
        nome: string; qtdeCompra: number; medidaCompra: string;
        precoCompra: number; qtdeUtil: number; medidaUtil: string;
      }> = (await res.json()) ?? [];

      const mapMedida = (un: string): string => {
        const u = un.toUpperCase();
        if (u === "KG") return "kg";
        if (u === "G" || u === "GR") return "g";
        if (u === "L" || u === "LT") return "L";
        if (u === "ML") return "ml";
        return "un";
      };

      for (const item of itensFiltrados) {
        const jaExiste = insumos.some(
          ins => ins.nome.toLowerCase().trim() === item.nome.toLowerCase().trim()
        );
        if (!jaExiste) {
          const medida = mapMedida(item.unidade);
          insumos.push({
            nome: item.nome,
            qtdeCompra: item.quantidade,
            medidaCompra: medida,
            precoCompra: item.vl_total,
            qtdeUtil: item.quantidade,
            medidaUtil: medida,
          });
        }
      }

      await fetch("/api/insumos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(insumos),
      });
      setStep("success");
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const removerItem = (i: number) => setItensFiltrados(prev => prev.filter((_, idx) => idx !== i));

  const resetar = () => { setStep("colar"); setNfce(null); setErro(""); setTexto(""); setItensFiltrados([]); };

  const stepList: Step[] = ["colar", "preview", "success"];
  const stepLabels: Record<Step, string> = { colar: "Colar texto", preview: "Conferir", success: "Concluído" };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl" style={{ background: "rgba(1,117,122,0.1)" }}>
          <FileText size={20} style={{ color: "#01757A" }} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: "#01757A" }}>Importar NFC-e</h1>
          <p className="text-xs text-muted-foreground">Cole o texto da nota fiscal para importar insumos</p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2 mb-7 text-xs font-bold">
        {stepList.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              style={{
                background: step === s ? "#01757A" : i < stepList.indexOf(step) ? "#01757A" : "hsl(var(--muted))",
                color: step === s || i < stepList.indexOf(step) ? "#fff" : "hsl(var(--muted-foreground))",
                opacity: i < stepList.indexOf(step) ? 0.6 : 1,
              }}>
              {i + 1}
            </div>
            <span className={step === s ? "font-bold" : "text-muted-foreground"}>{stepLabels[s]}</span>
            {i < 2 && <ChevronRight size={14} className="text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* ── STEP 1: COLAR ── */}
      {step === "colar" && (
        <div className="flex flex-col gap-4">
          <div className="produto-card flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg shrink-0" style={{ background: "rgba(1,117,122,0.1)" }}>
                <ClipboardPaste size={16} style={{ color: "#01757A" }} />
              </div>
              <div>
                <p className="font-bold text-sm mb-1">Como fazer:</p>
                <ol className="text-xs text-muted-foreground flex flex-col gap-1 list-decimal list-inside">
                  <li>Abra a nota em <strong>fazenda.rj.gov.br/nfce/consulta</strong></li>
                  <li>Selecione todo o texto da página <strong>(Ctrl+A)</strong></li>
                  <li>Copie <strong>(Ctrl+C)</strong></li>
                  <li>Cole aqui embaixo <strong>(Ctrl+V)</strong> ou clique no botão</li>
                </ol>
              </div>
            </div>

            <button onClick={colarClipboard}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border transition-all"
              style={{ borderColor: "#01757A", color: "#01757A" }}>
              <ClipboardPaste size={15} /> Colar do clipboard
            </button>

            <textarea
              value={texto}
              onChange={e => setTexto(e.target.value)}
              placeholder="Cole o texto da nota aqui..."
              className="inline-input w-full text-xs font-mono resize-none"
              style={{ minHeight: "150px" }}
            />
            {texto && <p className="text-xs text-muted-foreground -mt-1">{texto.length} caracteres</p>}
          </div>

          {erro && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(138,56,28,0.08)", color: "#8A381C" }}>
              <AlertCircle size={16} /> {erro}
            </div>
          )}

          <button className="btn-primary w-full justify-center py-3" onClick={processar}>
            Processar nota →
          </button>
        </div>
      )}

      {/* ── STEP 2: PREVIEW ── */}
      {step === "preview" && nfce && (
        <div className="flex flex-col gap-4">
          <div className="produto-card">
            <p className="font-extrabold text-base" style={{ color: "#01757A" }}>
              {nfce.fornecedor || "Fornecedor não identificado"}
            </p>
            {nfce.cnpj && <p className="text-xs text-muted-foreground mt-0.5">CNPJ: {nfce.cnpj}</p>}
            {nfce.emissao && <p className="text-xs text-muted-foreground">Emissão: {nfce.emissao}</p>}
            {nfce.chave && (
              <p className="font-mono mt-1 break-all" style={{ color: "#8A381C", fontSize: "10px" }}>
                {nfce.chave}
              </p>
            )}
            {(nfce.total > 0 || nfce.valor_pagar > 0) && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="stat-card py-2.5">
                  <span className="stat-label">Total</span>
                  <span className="font-extrabold text-sm">{formatBRL(nfce.total)}</span>
                </div>
                <div className="stat-card py-2.5">
                  <span className="stat-label">Desconto</span>
                  <span className="font-extrabold text-sm" style={{ color: "#8A381C" }}>-{formatBRL(nfce.desconto)}</span>
                </div>
                <div className="stat-card py-2.5">
                  <span className="stat-label">Pago</span>
                  <span className="font-extrabold text-sm" style={{ color: "#01757A" }}>{formatBRL(nfce.valor_pagar)}</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <p className="font-bold text-sm mb-2" style={{ color: "#01757A" }}>
              {itensFiltrados.length} {itensFiltrados.length === 1 ? "item encontrado" : "itens encontrados"}
            </p>
            {itensFiltrados.length === 0 && (
              <div className="px-4 py-3 rounded-xl text-sm font-semibold text-center" style={{ background: "rgba(138,56,28,0.08)", color: "#8A381C" }}>
                Todos os itens foram removidos.
              </div>
            )}
          <div className="flex flex-col gap-2">
              {itensFiltrados.map((item, i) => (
                <div key={i} className="produto-card py-3 px-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{item.nome}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.quantidade} {item.unidade} × {formatBRL(item.vl_unit)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="badge-teal">{formatBRL(item.vl_total)}</span>
                    <button onClick={() => removerItem(i)} className="p-1 rounded-lg transition-all hover:opacity-80 shrink-0" style={{ color: "#8A381C" }} title="Remover item">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Itens novos serão adicionados. Os já cadastrados serão ignorados.
          </p>

          {erro && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(138,56,28,0.08)", color: "#8A381C" }}>
              <AlertCircle size={16} /> {erro}
            </div>
          )}

          <div className="flex gap-3">
            <button className="btn-primary flex-1 justify-center py-3" onClick={salvarInsumos} disabled={salvando}>
              {salvando ? "Salvando..." : "Confirmar e Importar"}
            </button>
            <button onClick={resetar}
              className="px-4 py-2 rounded-xl text-sm font-bold border"
              style={{ borderColor: "hsl(var(--border))" }}>
              Voltar
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: SUCESSO ── */}
      {step === "success" && nfce && (
        <div className="produto-card flex flex-col items-center gap-4 py-10 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "rgba(1,117,122,0.12)" }}>
            <CheckCircle2 size={32} style={{ color: "#01757A" }} />
          </div>
          <div>
            <p className="font-extrabold text-lg" style={{ color: "#01757A" }}>Nota importada!</p>
            <p className="text-sm text-muted-foreground mt-1">Os novos itens foram adicionados aos insumos.</p>
          </div>
          <div className="flex gap-3">
            <button className="btn-primary" onClick={() => navigate("/")}>Ver Insumos</button>
            <button onClick={resetar}
              className="px-4 py-2 rounded-xl text-sm font-bold border"
              style={{ borderColor: "hsl(var(--border))" }}>
              Importar outra
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
