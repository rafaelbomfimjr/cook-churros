import { useState } from "react";
import { LayoutDashboard, ShoppingBasket, BookOpen, TrendingUp, Layers, ChefHat, Menu, X } from "lucide-react";
import OperacionalModule from "@/components/cookchurros/OperacionalModule";
import InsumosModule from "@/components/cookchurros/InsumosModule";
import CardapioModule from "@/components/cookchurros/CardapioModule";
import PrecificacaoModule from "@/components/cookchurros/PrecificacaoModule";
import CombosModule from "@/components/cookchurros/CombosModule";

type Modulo = "operacional" | "insumos" | "cardapio" | "precificacao" | "combos";

const navItems = [
  { id: "operacional" as Modulo, label: "Operacional", icon: LayoutDashboard },
  { id: "insumos" as Modulo, label: "Insumos", icon: ShoppingBasket },
  { id: "cardapio" as Modulo, label: "Cardápio", icon: BookOpen },
  { id: "precificacao" as Modulo, label: "Precificação", icon: TrendingUp },
  { id: "combos" as Modulo, label: "Combos", icon: Layers },
];

const Index = () => {
  const [modulo, setModulo] = useState<Modulo>("operacional");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar-nav fixed lg:relative z-30 flex flex-col h-full w-60 flex-shrink-0 transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-6 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--primary))" }}>
            <ChefHat size={18} color="white" />
          </div>
          <div>
            <div className="text-white font-extrabold text-base leading-tight">Cook Churros</div>
            <div className="text-white/40 text-xs font-medium">Sistema de Gestão</div>
          </div>
          <button className="ml-auto lg:hidden text-white/50 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setModulo(id); setSidebarOpen(false); }}
              className={`sidebar-item w-full text-left ${modulo === id ? "active" : ""}`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-white/10">
          <div className="text-white/25 text-xs text-center font-medium">v2.0 — Cook Churros</div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar (mobile) */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b bg-card">
          <button onClick={() => setSidebarOpen(true)} className="text-foreground/60 hover:text-foreground">
            <Menu size={20} />
          </button>
          <span className="font-bold text-sm">{navItems.find(n => n.id === modulo)?.label}</span>
        </div>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {modulo === "operacional" && <OperacionalModule />}
          {modulo === "insumos" && <InsumosModule />}
          {modulo === "cardapio" && <CardapioModule />}
          {modulo === "precificacao" && <PrecificacaoModule />}
          {modulo === "combos" && <CombosModule />}
        </main>
      </div>
    </div>
  );
};

export default Index;
