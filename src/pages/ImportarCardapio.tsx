import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, AlertCircle, Upload, ChevronDown, ChevronUp } from "lucide-react";

const PRODUTOS_IMPORTAR = [{"nome":"Churros Tradicional - Doce de Leite","rendimento":25.0,"receita":[{"insumoNome":"Farinha de Trigo","quantidade":800.0,"medida":"g"},{"insumoNome":"Manteiga","quantidade":100.0,"medida":"g"},{"insumoNome":"Sal","quantidade":4.0,"medida":"g"},{"insumoNome":"Açucar","quantidade":58.0,"medida":"g"},{"insumoNome":"leite integral","quantidade":200.0,"medida":"ml"},{"insumoNome":"Baunilha","quantidade":7.0,"medida":"ml"},{"insumoNome":"Embalagem Tradicional Interna","quantidade":25.0,"medida":"un"},{"insumoNome":"Embalagem Tradicional Externa","quantidade":25.0,"medida":"un"},{"insumoNome":"Saco Kraft","quantidade":25.0,"medida":"un"},{"insumoNome":"Recheio Doce de leite","quantidade":24.0,"medida":"g"}]},{"nome":"Churros espanhol","rendimento":53.0,"receita":[{"insumoNome":"Farinha de Trigo","quantidade":800.0,"medida":"g"},{"insumoNome":"Manteiga","quantidade":100.0,"medida":"g"},{"insumoNome":"leite integral","quantidade":200.0,"medida":"ml"},{"insumoNome":"Sal","quantidade":4.0,"medida":"g"},{"insumoNome":"Baunilha","quantidade":7.0,"medida":"ml"},{"insumoNome":"Açucar","quantidade":58.0,"medida":"g"},{"insumoNome":"Embalagem Espanhol","quantidade":8.0,"medida":"un"},{"insumoNome":"Saco Kraft","quantidade":8.0,"medida":"un"},{"insumoNome":"Papel Manteiga","quantidade":8.0,"medida":"un"},{"insumoNome":"Lacre de segurança","quantidade":8.0,"medida":"un"}]},{"nome":"Recheio de Doce de leite","rendimento":1.0,"receita":[{"insumoNome":"Leite Condesado","quantidade":790.0,"medida":"g"},{"insumoNome":"Creme de Leite","quantidade":400.0,"medida":"g"},{"insumoNome":"Açucar","quantidade":114.0,"medida":"g"},{"insumoNome":"Manteiga","quantidade":20.0,"medida":"g"}]},{"nome":"Recheio de Creme de Ninho","rendimento":1.0,"receita":[{"insumoNome":"Leite Condesado","quantidade":395.0,"medida":"g"},{"insumoNome":"Creme de Leite","quantidade":200.0,"medida":"g"},{"insumoNome":"Leite em Pó","quantidade":66.0,"medida":"g"},{"insumoNome":"leite integral","quantidade":100.0,"medida":"ml"},{"insumoNome":"Manteiga","quantidade":20.0,"medida":"g"}]},{"nome":"Recheio de Chocolate","rendimento":1.0,"receita":[{"insumoNome":"Leite Condesado","quantidade":395.0,"medida":"g"},{"insumoNome":"Creme de Leite","quantidade":200.0,"medida":"g"},{"insumoNome":"Nescau","quantidade":66.0,"medida":"g"},{"insumoNome":"leite integral","quantidade":100.0,"medida":"ml"},{"insumoNome":"Manteiga","quantidade":20.0,"medida":"g"}]},{"nome":"Pote de Recheio Doce de leite","rendimento":1.0,"receita":[{"insumoNome":"Potinho de Recheio","quantidade":1.0,"medida":"un"},{"insumoNome":"Recheio Doce de leite","quantidade":53.0,"medida":"g"}]},{"nome":"Pote de Recheio Creme de Ninho","rendimento":1.0,"receita":[{"insumoNome":"Potinho de Recheio","quantidade":1.0,"medida":"un"},{"insumoNome":"Recheio Creme de ninho","quantidade":53.0,"medida":"g"}]},{"nome":"Pote de Recheio Chocolate","rendimento":1.0,"receita":[{"insumoNome":"Potinho de Recheio","quantidade":1.0,"medida":"un"},{"insumoNome":"Recheio Chocolate","quantidade":53.0,"medida":"g"}]},{"nome":"Churros Tradicional - Chocolate","rendimento":25.0,"receita":[{"insumoNome":"Farinha de Trigo","quantidade":800.0,"medida":"g"},{"insumoNome":"Manteiga","quantidade":100.0,"medida":"g"},{"insumoNome":"Sal","quantidade":4.0,"medida":"g"},{"insumoNome":"Açucar","quantidade":58.0,"medida":"g"},{"insumoNome":"leite integral","quantidade":200.0,"medida":"ml"},{"insumoNome":"Baunilha","quantidade":7.0,"medida":"ml"},{"insumoNome":"Embalagem Tradicional Interna","quantidade":25.0,"medida":"un"},{"insumoNome":"Embalagem Tradicional Externa","quantidade":25.0,"medida":"un"},{"insumoNome":"Saco Kraft","quantidade":25.0,"medida":"un"},{"insumoNome":"Recheio Chocolate","quantidade":24.0,"medida":"g"}]},{"nome":"Churros Tradicional - Creme de Ninho","rendimento":25.0,"receita":[{"insumoNome":"Farinha de Trigo","quantidade":800.0,"medida":"g"},{"insumoNome":"Manteiga","quantidade":100.0,"medida":"g"},{"insumoNome":"Sal","quantidade":4.0,"medida":"g"},{"insumoNome":"Açucar","quantidade":58.0,"medida":"g"},{"insumoNome":"leite integral","quantidade":200.0,"medida":"ml"},{"insumoNome":"Baunilha","quantidade":7.0,"medida":"ml"},{"insumoNome":"Embalagem Tradicional Interna","quantidade":25.0,"medida":"un"},{"insumoNome":"Embalagem Tradicional Externa","quantidade":25.0,"medida":"un"},{"insumoNome":"Saco Kraft","quantidade":25.0,"medida":"un"},{"insumoNome":"Recheio Creme de ninho","quantidade":24.0,"medida":"g"}]},{"nome":"Pote de Complemento Amendoim","rendimento":1.0,"receita":[{"insumoNome":"Potinho de Recheio","quantidade":1.0,"medida":"un"},{"insumoNome":"Amendoim","quantidade":22.0,"medida":"g"}]},{"nome":"Pote de Complemento Ninho","rendimento":1.0,"receita":[{"insumoNome":"Potinho de Recheio","quantidade":1.0,"medida":"un"},{"insumoNome":"Leite em Pó","quantidade":18.0,"medida":"g"}]},{"nome":"Pote de Complemento Paçoca","rendimento":1.0,"receita":[{"insumoNome":"Potinho de Recheio","quantidade":1.0,"medida":"un"},{"insumoNome":"Paçoca","quantidade":24.0,"medida":"g"}]},{"nome":"Pote de Complemento M&Ms","rendimento":1.0,"receita":[{"insumoNome":"Potinho de Recheio","quantidade":1.0,"medida":"un"},{"insumoNome":"Confete M&Ms","quantidade":33.0,"medida":"g"}]},{"nome":"Pote de Complemento Granulado","rendimento":1.0,"receita":[{"insumoNome":"Potinho de Recheio","quantidade":1.0,"medida":"un"},{"insumoNome":"Granulado","quantidade":28.0,"medida":"g"}]},{"nome":"Churrinhos - Goumert","rendimento":47.0,"receita":[{"insumoNome":"Farinha de Trigo","quantidade":800.0,"medida":"g"},{"insumoNome":"Manteiga","quantidade":100.0,"medida":"g"},{"insumoNome":"Sal","quantidade":4.0,"medida":"g"},{"insumoNome":"Açucar","quantidade":58.0,"medida":"g"},{"insumoNome":"leite integral","quantidade":200.0,"medida":"ml"},{"insumoNome":"Baunilha","quantidade":7.0,"medida":"ml"},{"insumoNome":"Embalagem Espanhol","quantidade":8.0,"medida":"un"},{"insumoNome":"Papel Manteiga","quantidade":8.0,"medida":"un"},{"insumoNome":"Saco Kraft","quantidade":8.0,"medida":"un"},{"insumoNome":"Granulado","quantidade":120.0,"medida":"g"},{"insumoNome":"Recheio Creme de ninho","quantidade":300.0,"medida":"g"}]},{"nome":"Churrinhos","rendimento":47.0,"receita":[{"insumoNome":"Farinha de Trigo","quantidade":800.0,"medida":"g"},{"insumoNome":"Manteiga","quantidade":100.0,"medida":"g"},{"insumoNome":"Sal","quantidade":4.0,"medida":"g"},{"insumoNome":"Açucar","quantidade":58.0,"medida":"g"},{"insumoNome":"leite integral","quantidade":200.0,"medida":"ml"},{"insumoNome":"Baunilha","quantidade":7.0,"medida":"ml"},{"insumoNome":"Embalagem Espanhol","quantidade":8.0,"medida":"un"},{"insumoNome":"Papel Manteiga","quantidade":8.0,"medida":"un"},{"insumoNome":"Saco Kraft","quantidade":8.0,"medida":"un"},{"insumoNome":"Recheio Creme de ninho","quantidade":300.0,"medida":"g"}]},{"nome":"Churros Gourmet","rendimento":25.0,"receita":[{"insumoNome":"Farinha de Trigo","quantidade":800.0,"medida":"g"},{"insumoNome":"Manteiga","quantidade":100.0,"medida":"g"},{"insumoNome":"Sal","quantidade":4.0,"medida":"g"},{"insumoNome":"Açucar","quantidade":58.0,"medida":"g"},{"insumoNome":"leite integral","quantidade":200.0,"medida":"ml"},{"insumoNome":"Baunilha","quantidade":7.0,"medida":"ml"},{"insumoNome":"Embalagem Tradicional Interna","quantidade":25.0,"medida":"un"},{"insumoNome":"Embalagem Tradicional Externa","quantidade":25.0,"medida":"un"},{"insumoNome":"Saco Kraft","quantidade":25.0,"medida":"un"},{"insumoNome":"Recheio Creme de ninho","quantidade":24.0,"medida":"g"},{"insumoNome":"Recheio Creme de ninho","quantidade":30.0,"medida":"g"},{"insumoNome":"Granulado","quantidade":20.0,"medida":"g"}]},{"nome":"Bolo de cenoura","rendimento":6.0,"receita":[{"insumoNome":"Farinha de Trigo","quantidade":200.0,"medida":"g"},{"insumoNome":"Cenoura","quantidade":200.0,"medida":"g"},{"insumoNome":"Açucar","quantidade":275.0,"medida":"g"},{"insumoNome":"Ovo","quantidade":3.0,"medida":"un"},{"insumoNome":"Oleo","quantidade":150.0,"medida":"ml"},{"insumoNome":"Fermento em pó","quantidade":15.0,"medida":"g"},{"insumoNome":"Saco Kraft","quantidade":6.0,"medida":"un"},{"insumoNome":"Embalagem de bolo","quantidade":6.0,"medida":"un"},{"insumoNome":"Recheio Chocolate","quantidade":53.0,"medida":"g"},{"insumoNome":"Granulado","quantidade":15.0,"medida":"g"}]},{"nome":"Mini-Churros (Festa)","rendimento":94.0,"receita":[{"insumoNome":"Farinha de Trigo","quantidade":800.0,"medida":"g"},{"insumoNome":"Manteiga","quantidade":100.0,"medida":"g"},{"insumoNome":"Sal","quantidade":4.0,"medida":"g"},{"insumoNome":"Açucar","quantidade":58.0,"medida":"g"},{"insumoNome":"leite integral","quantidade":200.0,"medida":"ml"},{"insumoNome":"Baunilha","quantidade":7.0,"medida":"ml"},{"insumoNome":"Recheio Doce de leite","quantidade":24.0,"medida":"g"}]},{"nome":"Pote de Complemento Granulado Colorido","rendimento":1.0,"receita":[{"insumoNome":"Potinho de Recheio","quantidade":1.0,"medida":"un"},{"insumoNome":"Granulado Colorido","quantidade":27.0,"medida":"g"}]},{"nome":"Pote de Complemento Coco ralado","rendimento":1.0,"receita":[{"insumoNome":"Potinho de Recheio","quantidade":1.0,"medida":"un"},{"insumoNome":"Coco ralado","quantidade":14.0,"medida":"g"}]},{"nome":"Pote de Complemento Cereal Ball","rendimento":1.0,"receita":[{"insumoNome":"Potinho de Recheio","quantidade":1.0,"medida":"un"},{"insumoNome":"Cereal Ball","quantidade":19.0,"medida":"g"}]},{"nome":"Base do Sacolé (Ninho)","rendimento":14.0,"receita":[{"insumoNome":"Liga neutra","quantidade":15.0,"medida":"g"},{"insumoNome":"leite integral","quantidade":1000.0,"medida":"ml"},{"insumoNome":"Leite Condesado","quantidade":395.0,"medida":"g"},{"insumoNome":"Creme de Leite","quantidade":200.0,"medida":"g"},{"insumoNome":"Leite em Pó","quantidade":150.0,"medida":"g"}]},{"nome":"Sacolé Ninho com Morango","rendimento":1.0,"receita":[{"insumoNome":"Base do sacolé (ninho)","quantidade":1.0,"medida":"un"},{"insumoNome":"Morango","quantidade":37.0,"medida":"g"},{"insumoNome":"Embalagem do saco de sacolé","quantidade":1.0,"medida":"un"},{"insumoNome":"Embalagem de isopor Lancheira","quantidade":1.0,"medida":"un"},{"insumoNome":"Saco Kraft","quantidade":1.0,"medida":"un"},{"insumoNome":"Açucar","quantidade":90.0,"medida":"g"},{"insumoNome":"Limão","quantidade":39.0,"medida":"g"}]},{"nome":"Sacolé Ninho com Nutella","rendimento":1.0,"receita":[{"insumoNome":"Base do sacolé (ninho)","quantidade":1.0,"medida":"un"},{"insumoNome":"Nutella","quantidade":20.0,"medida":"g"},{"insumoNome":"Embalagem do saco de sacolé","quantidade":1.0,"medida":"un"},{"insumoNome":"Embalagem de isopor Lancheira","quantidade":1.0,"medida":"un"},{"insumoNome":"Saco Kraft","quantidade":1.0,"medida":"un"}]},{"nome":"Sacolé Ninho com Oreo","rendimento":1.0,"receita":[{"insumoNome":"Base do sacolé (Ninho + Oreo)","quantidade":1.0,"medida":"un"},{"insumoNome":"Oreo","quantidade":18.0,"medida":"g"},{"insumoNome":"Embalagem do saco de sacolé","quantidade":1.0,"medida":"un"},{"insumoNome":"Embalagem de isopor Lancheira","quantidade":1.0,"medida":"un"},{"insumoNome":"Saco Kraft","quantidade":1.0,"medida":"un"}]},{"nome":"Base de Ninho com Oreo","rendimento":12.0,"receita":[{"insumoNome":"Liga neutra","quantidade":15.0,"medida":"g"},{"insumoNome":"leite integral","quantidade":1000.0,"medida":"ml"},{"insumoNome":"Leite Condesado","quantidade":395.0,"medida":"g"},{"insumoNome":"Creme de Leite","quantidade":200.0,"medida":"g"},{"insumoNome":"Leite em Pó","quantidade":150.0,"medida":"g"},{"insumoNome":"Oreo","quantidade":36.0,"medida":"g"}]},{"nome":"Sacolá de Morango","rendimento":16.0,"receita":[{"insumoNome":"Morango","quantidade":350.0,"medida":"g"},{"insumoNome":"leite integral","quantidade":1000.0,"medida":"ml"},{"insumoNome":"Leite Condesado","quantidade":395.0,"medida":"g"},{"insumoNome":"Creme de Leite","quantidade":200.0,"medida":"g"},{"insumoNome":"Liga neutra","quantidade":5.0,"medida":"g"},{"insumoNome":"Açucar","quantidade":32.0,"medida":"g"},{"insumoNome":"Leite em Pó","quantidade":60.0,"medida":"g"},{"insumoNome":"Tang morango","quantidade":15.0,"medida":"g"}]},{"nome":"Sacolé de Maracujá","rendimento":15.0,"receita":[{"insumoNome":"Leite Condesado","quantidade":395.0,"medida":"g"},{"insumoNome":"Creme de Leite","quantidade":200.0,"medida":"g"},{"insumoNome":"Leite em Pó","quantidade":60.0,"medida":"g"},{"insumoNome":"leite integral","quantidade":1000.0,"medida":"ml"},{"insumoNome":"Liga neutra","quantidade":5.0,"medida":"g"},{"insumoNome":"Açucar","quantidade":32.0,"medida":"g"},{"insumoNome":"Tang de maracujá","quantidade":15.0,"medida":"g"},{"insumoNome":"Maracuja","quantidade":200.0,"medida":"g"}]}];

type Status = "idle" | "loading" | "success" | "error";

export default function ImportarCardapio() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("idle");
  const [erro, setErro] = useState("");
  const [expandido, setExpandido] = useState<number | null>(null);

  const importar = async () => {
    setStatus("loading");
    setErro("");
    try {
      const res = await fetch("/api/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(PRODUTOS_IMPORTAR),
      });
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      setStatus("success");
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido");
      setStatus("error");
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="page-title">Importar Cardápio da Planilha</h1>

      {/* Card principal */}
      <div className="produto-card mb-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl shrink-0" style={{ background: "rgba(1,117,122,0.1)" }}>
            <Upload size={22} style={{ color: "#01757A" }} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-base mb-1" style={{ color: "#01757A" }}>
              Cardápio_1 — Planilha de Precificação
            </p>
            <p className="text-sm text-muted-foreground mb-1">
              <strong>{PRODUTOS_IMPORTAR.length} produtos</strong> prontos para importar com insumos e rendimentos já configurados.
            </p>
            <p className="text-xs" style={{ color: "#8A381C" }}>
              ⚠️ Isso irá <strong>substituir</strong> o cardápio atual. Faça isso só se o cardápio estiver vazio.
            </p>
          </div>
        </div>

        <div className="mt-5 flex gap-3 flex-wrap">
          {status === "idle" && (
            <button className="btn-primary" onClick={importar}>
              <Upload size={14} /> Importar agora
            </button>
          )}
          {status === "loading" && (
            <button className="btn-primary opacity-60 cursor-not-allowed" disabled>
              <span className="animate-pulse">Importando...</span>
            </button>
          )}
          {status === "success" && (
            <>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm"
                style={{ background: "rgba(1,117,122,0.1)", color: "#01757A" }}>
                <CheckCircle2 size={16} /> Importado com sucesso!
              </div>
              <button className="btn-primary" onClick={() => navigate("/")}>
                Ir para o Cardápio →
              </button>
            </>
          )}
          {status === "error" && (
            <>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm"
                style={{ background: "rgba(138,56,28,0.1)", color: "#8A381C" }}>
                <AlertCircle size={16} /> Erro: {erro}
              </div>
              <button className="btn-primary" onClick={importar}>Tentar novamente</button>
            </>
          )}
        </div>
      </div>

      {/* Prévia dos produtos */}
      <h2 className="font-bold text-base mb-3" style={{ color: "#01757A" }}>
        Prévia dos produtos
      </h2>
      <div className="flex flex-col gap-2">
        {PRODUTOS_IMPORTAR.map((p, i) => (
          <div key={i} className="produto-card py-3 px-4">
            <button
              className="flex items-center justify-between w-full text-left"
              onClick={() => setExpandido(expandido === i ? null : i)}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold w-6 text-center rounded-full py-0.5"
                  style={{ background: "rgba(1,117,122,0.1)", color: "#01757A" }}>
                  {i + 1}
                </span>
                <span className="font-semibold text-sm">{p.nome}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="badge-teal">rende {p.rendimento}x</span>
                <span className="text-xs text-muted-foreground">{p.receita.length} insumos</span>
                {expandido === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </button>

            {expandido === i && (
              <div className="mt-3 pt-3 border-t flex flex-col gap-1" style={{ borderColor: "hsl(var(--border))" }}>
                {p.receita.map((r, ri) => (
                  <div key={ri} className="flex items-center justify-between text-xs px-2 py-1 rounded-lg"
                    style={{ background: "hsl(var(--muted))" }}>
                    <span className="text-muted-foreground">{r.insumoNome}</span>
                    <span className="font-bold">{r.quantidade} {r.medida}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
