import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChefHat, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      newErrors.email = "Por favor, insira um e-mail válido.";
    }
    if (password.length < 6) {
      newErrors.password = "A senha deve ter pelo menos 6 caracteres.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    // TODO: substitua pela sua lógica de autenticação real
    await new Promise((res) => setTimeout(res, 1000));
    localStorage.setItem("cook_churros_auth", "true");
    setLoading(false);
    setSuccess(true);
    setTimeout(() => navigate("/"), 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-4xl rounded-2xl overflow-hidden flex shadow-md border border-border">

        {/* ── Painel esquerdo — identidade da marca ── */}
        <div
          className="hidden md:flex flex-col justify-between p-10 w-5/12 relative overflow-hidden"
          style={{ background: "hsl(220 30% 14%)" }}
        >
          {/* Círculos decorativos */}
          <div
            className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-20"
            style={{ background: "hsl(var(--primary))" }}
          />
          <div
            className="absolute -bottom-12 -left-12 w-44 h-44 rounded-full opacity-10"
            style={{ background: "hsl(var(--primary))" }}
          />

          {/* Logo + copy */}
          <div className="relative z-10">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center mb-6"
              style={{ background: "hsl(var(--primary))" }}
            >
              <ChefHat size={20} color="white" />
            </div>
            <h1 className="text-3xl font-extrabold leading-tight mb-3" style={{ color: "hsl(220 15% 85%)" }}>
              Cook<br />Churros
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: "hsl(220 10% 50%)" }}>
              Gerencie receitas, insumos e<br />precificação do seu negócio.
            </p>
          </div>

          {/* Rodapé do painel */}
          <div className="relative z-10 border-t pt-6" style={{ borderColor: "hsl(220 25% 20%)" }}>
            <p className="text-sm italic leading-relaxed mb-3" style={{ color: "hsl(220 10% 45%)" }}>
              "Organização é o ingrediente secreto de todo negócio de sucesso."
            </p>
            <span className="text-xs font-semibold" style={{ color: "hsl(220 10% 35%)" }}>
              — Sistema de Gestão v2.0
            </span>
          </div>
        </div>

        {/* ── Painel direito — formulário ── */}
        <div className="flex-1 flex flex-col justify-center px-8 py-10 md:px-12 bg-card">
          <div className="max-w-sm w-full mx-auto">

            {/* Logo mobile */}
            <div className="flex items-center gap-3 mb-8 md:hidden">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "hsl(220 30% 14%)" }}
              >
                <ChefHat size={18} color="white" />
              </div>
              <span className="text-xl font-extrabold" style={{ color: "hsl(var(--foreground))" }}>
                Cook Churros
              </span>
            </div>

            <h2 className="text-2xl font-extrabold mb-1" style={{ color: "hsl(var(--foreground))" }}>
              Bem-vindo de volta
            </h2>
            <p className="text-sm mb-7" style={{ color: "hsl(var(--muted-foreground))" }}>
              Entre com sua conta para continuar
            </p>

            {/* Banner de sucesso */}
            {success && (
              <div className="badge-green flex items-center gap-2 px-4 py-3 rounded-xl mb-6 text-sm font-semibold">
                Login realizado! Redirecionando...
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

              {/* Campo e-mail */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider stat-label">
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="inline-input w-full h-11 text-sm"
                  autoComplete="email"
                />
                {errors.email && (
                  <span className="text-xs font-semibold" style={{ color: "hsl(var(--destructive))" }}>
                    {errors.email}
                  </span>
                )}
              </div>

              {/* Campo senha */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider stat-label">
                    Senha
                  </label>
                  <button
                    type="button"
                    className="text-xs font-semibold"
                    style={{ color: "hsl(var(--primary))" }}
                    onClick={() => {/* TODO: implementar recuperação de senha */}}
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="inline-input w-full h-11 text-sm pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: "hsl(var(--muted-foreground))" }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <span className="text-xs font-semibold" style={{ color: "hsl(var(--destructive))" }}>
                    {errors.password}
                  </span>
                )}
              </div>

              {/* Botão entrar */}
              <button
                type="submit"
                disabled={loading || success}
                className="btn-primary w-full h-11 justify-center mt-1 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>

          </div>
        </div>

      </div>
    </div>
  );
}
