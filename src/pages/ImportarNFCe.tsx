import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileText, CheckCircle2, AlertCircle, X, Plus, ChevronRight } from "lucide-react";

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

type Step = "upload" | "preview" | "success";

export default function ImportarNFCe() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("upload");
  const [nfce, setNfce] = useState<NFCeData | null>(null);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setErro("Por favor, envie um arquivo PDF.");
      return;
    }
    setLoading(true);
    setErro("");

    try {
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res((reader.result as string).split(",")[1]);
        reader.onerror = () => rej(new Error("Falha ao ler o arquivo"));
        reader.readAsDataURL(file);
      });

      // Chama a API serverless (sem CORS)
      const response = await fetch("/api/parse-nfce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64 }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? `Erro ${response.status}`);
      }

      const parsed: NFCeData = await response.json();

      if (!parsed.itens || parsed.itens.length === 0) {
        throw new Error("Nenhum item encontrado na nota.");
      }

      setNfce(parsed);
      setStep("preview");
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao processar o PDF.");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
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

      for (const item of nfce.itens) {
        const jaExiste = insumos.some(
          (ins) => ins.nome.toLowerCase().trim() === item.nome.toLowerCase().trim()
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

  const resetar = () => {
    setStep("upload");
    setNfce(null);
    setErro("");
  };

  const stepList: Step[] = ["upload", "preview", "success"];
  const stepLabels = { upload: "Upload", preview: "Conferir", success: "Concluído" };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl" style={{ background: "rgba(1,117,122,0.1)" }}>
          <FileText size={20} style={{ color: "#01757A" }} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: "#01757A" }}>
            Importar NFC-e
          </h1>
          <p className="text-xs text-muted-foreground">
            Faça upload do PDF da nota fiscal para importar insumos automaticamente
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2 mb-7 text-xs font-bold">
        {stepList.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              style={{
                background: step === s ? "#01757A" : i < stepList.indexOf(step) ? "#01757A" : "hsl(var(--muted))",
                color: step === s || i < stepList.indexOf(step) ? "#fff" : "hsl(var(--muted-foreground))",
                opacity: i < stepList.indexOf(step) ? 0.6 : 1,
              }}
            >
              {i + 1}
            </div>
            <span className={step === s ? "font-bold" : "text-muted-foreground"}>
              {stepLabels[s]}
            </span>
            {i < 2 && <ChevronRight size={14} className="text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* ── STEP 1: UPLOAD ── */}
      {step === "upload" && (
        <div>
          <div
            className="border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-4 cursor-pointer transition-all"
            style={{
              borderColor: drag ? "#01757A" : "hsl(var(--border))",
              background: drag ? "rgba(1,117,122,0.05)" : "hsl(var(--card))",
              transform: drag ? "scale(1.01)" : "scale(1)",
            }}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => !loading && inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
            />

            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse"
                  style={{ background: "rgba(1,117,122,0.15)" }}
                >
                  <FileText size={24} style={{ color: "#01757A" }} />
                </div>
                <p className="font-bold text-sm" style={{ color: "#01757A" }}>
                  Lendo nota fiscal...
                </p>
                <p className="text-xs text-muted-foreground">Isso pode levar alguns segundos</p>
              </div>
            ) : (
              <>
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(1,117,122,0.1)" }}
                >
                  <Upload size={26} style={{ color: "#01757A" }} />
                </div>
                <div className="text-center">
                  <p className="font-bold text-sm mb-1">Arraste o PDF aqui ou clique para selecionar</p>
                  <p className="text-xs text-muted-foreground">
                    PDF da Consulta DF-e (fazenda.rj.gov.br/nfce/consulta)
                  </p>
                </div>
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "rgba(138,56,28,0.08)", color: "#8A381C" }}
                >
                  💡 Salve como PDF no navegador ao consultar a nota pelo site
                </div>
              </>
            )}
          </div>

          {erro && (
            <div
              className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(138,56,28,0.08)", color: "#8A381C" }}
            >
              <AlertCircle size={16} /> {erro}
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: PREVIEW ── */}
      {step === "preview" && nfce && (
        <div className="flex flex-col gap-4">
          <div className="produto-card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-extrabold text-base" style={{ color: "#01757A" }}>
                  {nfce.fornecedor}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">CNPJ: {nfce.cnpj}</p>
                <p className="text-xs text-muted-foreground">Emissão: {nfce.emissao}</p>
                {nfce.chave && (
                  <p className="font-mono mt-1 break-all" style={{ color: "#8A381C", fontSize: "10px" }}>
                    {nfce.chave}
                  </p>
                )}
              </div>
              <button onClick={resetar} className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="stat-card py-2.5">
                <span className="stat-label">Total</span>
                <span className="font-extrabold text-sm">{formatBRL(nfce.total)}</span>
              </div>
              <div className="stat-card py-2.5">
                <span className="stat-label">Desconto</span>
                <span className="font-extrabold text-sm" style={{ color: "#8A381C" }}>
                  -{formatBRL(nfce.desconto)}
                </span>
              </div>
              <div className="stat-card py-2.5">
                <span className="stat-label">Pago</span>
                <span className="font-extrabold text-sm" style={{ color: "#01757A" }}>
                  {formatBRL(nfce.valor_pagar)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <p className="font-bold text-sm mb-2" style={{ color: "#01757A" }}>
              {nfce.itens.length} {nfce.itens.length === 1 ? "item encontrado" : "itens encontrados"}
            </p>
            <div className="flex flex-col gap-2">
              {nfce.itens.map((item, i) => (
                <div key={i} className="produto-card py-3 px-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{item.nome}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.quantidade} {item.unidade} × {formatBRL(item.vl_unit)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="badge-teal">{formatBRL(item.vl_total)}</span>
                    <Plus size={14} style={{ color: "#01757A" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center px-4">
            Itens novos serão adicionados aos insumos. Os já cadastrados serão ignorados.
          </p>

          {erro && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(138,56,28,0.08)", color: "#8A381C" }}
            >
              <AlertCircle size={16} /> {erro}
            </div>
          )}

          <div className="flex gap-3">
            <button className="btn-primary flex-1" onClick={salvarInsumos} disabled={salvando}>
              {salvando ? "Salvando..." : "Confirmar e Importar"}
            </button>
            <button
              onClick={resetar}
              className="px-4 py-2 rounded-xl text-sm font-bold border transition-all"
              style={{ borderColor: "hsl(var(--border))" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: SUCESSO ── */}
      {step === "success" && nfce && (
        <div className="produto-card flex flex-col items-center gap-4 py-10 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "rgba(1,117,122,0.12)" }}
          >
            <CheckCircle2 size={32} style={{ color: "#01757A" }} />
          </div>
          <div>
            <p className="font-extrabold text-lg" style={{ color: "#01757A" }}>
              Nota importada com sucesso!
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Os novos itens de <strong>{nfce.fornecedor}</strong> foram adicionados aos insumos.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="btn-primary" onClick={() => navigate("/")}>
              Ver Insumos
            </button>
            <button
              onClick={resetar}
              className="px-4 py-2 rounded-xl text-sm font-bold border transition-all"
              style={{ borderColor: "hsl(var(--border))" }}
            >
              Importar outra nota
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
