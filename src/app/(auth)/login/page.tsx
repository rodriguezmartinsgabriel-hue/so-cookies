export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="font-brand text-6xl text-ink mb-2">só</h1>
          <p className="text-muted text-sm">cookies & café</p>
        </div>

        {/* Form */}
        <form className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="seu@email.com"
              className="w-full px-3 py-2.5 border border-line rounded-md text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5"
            >
              Senha
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              className="w-full px-3 py-2.5 border border-line rounded-md text-sm text-ink placeholder:text-kraft focus:outline-none focus:border-ink transition-colors"
            />
          </div>

          <button
            type="submit"
            className="w-full h-12 bg-ink text-paper font-medium rounded-lg hover:bg-ink/90 transition-colors active:scale-[0.98]"
          >
            Entrar
          </button>
        </form>

        <p className="text-xs text-muted text-center">
          Acesso interno — fale com o administrador
        </p>
      </div>
    </div>
  );
}
