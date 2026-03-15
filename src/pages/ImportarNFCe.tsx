import { useState, useRef } from "react";
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

function parseNFCeText(text: string): NFCeData {
  const result: NFCeData = {
    fornecedor: "", cnpj: "", emissao: "", chave: "",
    itens: [], total: 0, desconto: 0, valor_pagar: 0,
  };

  const lines = text.split("\n");

  // Fornecedor e CNPJ
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("CNPJ:")) {
      const m = lines[i].match(/CNPJ:\s*([\d./-]+)/);
      if (m) result.cnpj = m[1];
      // fornecedor é a linha anterior que não seja cabeçalho
      for (let j = i - 1; j >= 0; j--) {
        const l = lines[j].trim();
        if (l && !l.includes("Consulta DF") && !l.includes("http")) {
          result.fornecedor = l;
          break;
        }
      }
      break;
    }
  }

  // Chave de acesso
  const chaveMatch = text.match(/Chave de acesso:\s*([\d\s]{40,60})/);
  if (chaveMatch) result.chave = chaveMatch[1].replace(/\s/g, "").trim();

  // Emissão
  const emissaoMatch = text.match(/Emissão:\s*([\d/]+)/);
  if (emissaoMatch) result.emissao = emissaoMatch[1];

  // Itens — ex: "NOME PRODUTO (Código: XXXX ) Vl. Total\nQtde.:9 UN: PCE Vl. Unit.: 1,99 17,91"
  const itemRegex = /^(.+?)\s*\(Código:.*?\)\s*Vl\.\s*Total\s*\nQtde\.:(\d+)\s+UN:\s*(\w+)\s+Vl\.\s*Unit\.:\s*([\d,]+)\s+([\d,]+)/gm;
  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(text)) !== null) {
    let nome = m[1].trim();
    // remover lixo de cabeçalho que pode vir junto
    nome = nome.split("\n").pop()?.trim() ?? nome;
    nome = nome.replace(/^.*Consulta DF-e\s*/i, "").trim();
    result.itens.push({
      nome,
      quantidade: parseInt(m[2]),
      unidade: m[3],
      vl_unit: parseFloat(m[4].replace(",", ".")),
      vl_total: parseFloat(m[5].replace(",", ".")),
    });
  }

  // Totais
  const totalM = text.match(/Valor total R\$:\s*([\d,]+)/);
  if (totalM) result.total = parseFloat(totalM[1].replace(",", "."));
  const descM = text.match(/Descontos R\$:\s*([\d,]+)/);
  if (descM) result.desconto = parseFloat(descM[1].replace(",", "."));
  const pagarM = text.match(/Valor a pagar R\$:\s*([\d,]+)/);
  if (pagarM) result.valor_pagar = parseFloat(pagarM[1].replace(",", "."));

  return result;
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Step = "upload" | "preview" | "success";

export default function ImportarNFCe() {
  const [step, setStep] = useState<Step>("upload");
  const [nfce, setNfce] = useState<NFCeData | null>(null);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file.name.endsWith(".pdf")) {
      setErro("Por favor, envie um arquivo PDF.");
      return;
    }
    setLoading(true);
    setErro("");

    try {
      // Ler PDF como base64
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res((reader.result as string).split(",")[1]);
        reader.onerror = () => rej(new Error("Falha ao ler o arquivo"));
        reader.readAsDataURL(file);
      });

      // Enviar para Claude API para extrair o texto estruturado
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: [
              {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: base64 }
              },
              {
                type: "text",
                text: `Extraia os dados desta NFC-e e retorne APENAS um JSON válido (sem markdown, sem texto extra) com este formato exato:
{
  "fornecedor": "nome da loja",
  "cnpj": "XX.XXX.XXX/XXXX-XX",
  "emissao": "DD/MM/AAAA",
  "chave": "44 dígitos sem espaço",
  "itens": [
    {
      "nome": "NOME DO PRODUTO",
      "quantidade": 9,
      "unidade": "PCE",
      "vl_unit": 1.99,
      "vl_total": 17.91
    }
  ],
  "total": 55.87,
  "desconto": 12.89,
  "valor_pagar": 42.98
}`
              }
            ]
          }]
        })
      });

      const data = await response.json();
      const raw = data.content?.[0]?.text ?? "";
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed: NFCeData = JSON.parse(clean);

      // fallback: se Claude não retornar itens, tenta parser local via texto
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

    try {
      // Buscar insumos atuais
      const res = await fetch("/api/insumos");
      const insumos: Array<{
        nome: string; qtdeCompra: number; medidaCompra: string;
        precoCompra: number; qtdeUtil: number; medidaUtil: string;
      }> = (await res.json()) ?? [];

      // Mapear unidade da nota para medida do sistema
      const mapMedida = (un: string): string => {
        const u = un.toUpperCase();
        if (u === "KG") return "kg";
        if (u === "G" || u === "GR") return "g";
        if (u === "L" || u === "LT") return "L";
        if (u === "ML") return "ml";
        return "un";
      };

      // Adicionar itens novos (que não existem ainda)
      let adicionados = 0;
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
          adicionados++;
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
        {(["upload", "preview", "success"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
              step === s
                ? "text-white"
                : i < ["upload","preview","success"].indexOf(step) ? "text-white opacity-60" : "text-muted-foreground"
            }`} style={{
              background: step === s ? "#01757A" : i < ["upload","preview","success"].indexOf(step) ? "#01757A" : "hsl(var(--muted))"
            }}>
              {i + 1}
            </div>
            <span className={step === s ? "font-bold" : "text-muted-foreground"}>
              {s === "upload" ? "Upload" : s === "preview" ? "Conferir" : "Concluído"}
            </span>
            {i < 2 && <ChevronRight size={14} className="text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* ── STEP 1: UPLOAD ── */}
      {step === "upload" && (
        <div>
          <div
            className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-4 cursor-pointer transition-all ${drag ? "scale-[1.01]" : ""}`}
            style={{
              borderColor: drag ? "#01757A" : "hsl(var(--border))",
              background: drag ? "rgba(1,117,122,0.05)" : "hsl(var(--card))",
            }}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
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
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse"
                  style={{ background: "rgba(1,117,122,0.15)" }}>
                  <FileText size={24} style={{ color: "#01757A" }} />
                </div>
                <p className="font-bold text-sm" style={{ color: "#01757A" }}>Lendo nota fiscal...</p>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(1,117,122,0.1)" }}>
                  <Upload size={26} style={{ color: "#01757A" }} />
                </div>
                <div className="text-center">
                  <p className="font-bold text-sm mb-1">Arraste o PDF aqui ou clique para selecionar</p>
                  <p className="text-xs text-muted-foreground">
                    PDF da Consulta DF-e (fazenda.rj.gov.br/nfce/consulta)
                  </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "rgba(138,56,28,0.08)", color: "#8A381C" }}>
                  💡 Salve como PDF no navegador ao consultar a nota pelo site
                </div>
              </>
            )}
          </div>

          {erro && (
            <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(138,56,28,0.08)", color: "#8A381C" }}>
              <AlertCircle size={16} /> {erro}
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: PREVIEW ── */}
      {step === "preview" && nfce && (
        <div className="flex flex-col gap-4">
          {/* Info da nota */}
          <div className="produto-card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-extrabold text-base" style={{ color: "#01757A" }}>
                  {nfce.fornecedor}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">CNPJ: {nfce.cnpj}</p>
                <p className="text-xs text-muted-foreground">Emissão: {nfce.emissao}</p>
                {nfce.chave && (
                  <p className="text-xs font-mono mt-1 break-all" style={{ color: "#8A381C", fontSize: "10px" }}>
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
                <span className="font-extrabold text-sm" style={{ color: "#8A381C" }}>-{formatBRL(nfce.desconto)}</span>
              </div>
              <div className="stat-card py-2.5">
                <span className="stat-label">Pago</span>
                <span className="font-extrabold text-sm" style={{ color: "#01757A" }}>{formatBRL(nfce.valor_pagar)}</span>
              </div>
            </div>
          </div>

          {/* Itens */}
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
            Itens que ainda não existem nos insumos serão adicionados automaticamente.
            Os já cadastrados serão ignorados.
          </p>

          {erro && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(138,56,28,0.08)", color: "#8A381C" }}>
              <AlertCircle size={16} /> {erro}
            </div>
          )}

          <div className="flex gap-3">
            <button className="btn-primary flex-1" onClick={salvarInsumos} disabled={salvando}>
              {salvando ? "Salvando..." : "Confirmar e Importar"}
            </button>
            <button onClick={resetar}
              className="px-4 py-2 rounded-xl text-sm font-bold border transition-all"
              style={{ borderColor: "hsl(var(--border))" }}>
              Cancelar
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
            <p className="font-extrabold text-lg" style={{ color: "#01757A" }}>
              Nota importada com sucesso!
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Os novos itens de <strong>{nfce.fornecedor}</strong> foram adicionados aos insumos.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="btn-primary" onClick={() => window.location.href = "/"}>
              Ver Insumos
            </button>
            <button onClick={resetar}
              className="px-4 py-2 rounded-xl text-sm font-bold border transition-all"
              style={{ borderColor: "hsl(var(--border))" }}>
              Importar outra nota
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
