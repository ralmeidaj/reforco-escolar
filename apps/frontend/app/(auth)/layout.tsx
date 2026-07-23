export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Painel ilustrativo — oculto no mobile */}
      <div className="relative hidden flex-1 flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-sky-400 lg:flex">

        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -right-16 h-[500px] w-[500px] rounded-full bg-white/5" />
        <div className="absolute right-24 top-24 h-48 w-48 rounded-full bg-white/10" />

        {/* Ilustração educação */}
        <svg viewBox="0 0 420 400" className="relative z-10 w-80 drop-shadow-2xl" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="210" cy="200" r="170" fill="white" fillOpacity="0.06" />
          <circle cx="210" cy="200" r="130" fill="white" fillOpacity="0.04" />

          {/* Livro grande */}
          <rect x="120" y="160" width="180" height="130" rx="10" fill="white" fillOpacity="0.20" />
          <rect x="120" y="160" width="180" height="18" rx="10" fill="white" fillOpacity="0.30" />
          <line x1="210" y1="178" x2="210" y2="290" stroke="white" strokeOpacity="0.25" strokeWidth="2" />
          <rect x="138" y="195" width="55" height="6" rx="3" fill="white" fillOpacity="0.35" />
          <rect x="138" y="208" width="45" height="6" rx="3" fill="white" fillOpacity="0.25" />
          <rect x="138" y="221" width="50" height="6" rx="3" fill="white" fillOpacity="0.25" />
          <rect x="225" y="195" width="55" height="6" rx="3" fill="white" fillOpacity="0.35" />
          <rect x="225" y="208" width="40" height="6" rx="3" fill="white" fillOpacity="0.25" />
          <rect x="225" y="221" width="48" height="6" rx="3" fill="white" fillOpacity="0.25" />

          {/* Lápis */}
          <rect x="310" y="120" width="14" height="80" rx="4" transform="rotate(30 310 120)" fill="white" fillOpacity="0.45" />
          <polygon points="310,120 324,120 317,106" fill="white" fillOpacity="0.60" transform="rotate(30 310 120)" />

          {/* Chapéu de formatura */}
          <polygon points="210,95 250,115 210,135 170,115" fill="white" fillOpacity="0.40" />
          <rect x="207" y="95" width="6" height="20" fill="white" fillOpacity="0.30" />
          <circle cx="210" cy="115" r="5" fill="white" fillOpacity="0.55" />

          {/* Estrelas */}
          <path d="M320 130 L323 140 L333 140 L325 146 L328 157 L320 151 L312 157 L315 146 L307 140 L317 140Z" fill="white" fillOpacity="0.55" />
          <path d="M100 155 L102 162 L109 162 L103 166 L105 174 L100 170 L95 174 L97 166 L91 162 L98 162Z" fill="white" fillOpacity="0.45" />
          <circle cx="340" cy="270" r="4" fill="white" fillOpacity="0.35" />
          <circle cx="130" cy="290" r="3" fill="white" fillOpacity="0.35" />
          <circle cx="160" cy="130" r="5" fill="white" fillOpacity="0.30" />
        </svg>

        <div className="relative z-10 mt-8 px-12 text-center">
          <h1 className="text-2xl font-bold text-white">Reforços Escolares</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/75">
            Professores, alunos e responsáveis<br />em um só lugar.
          </p>

          <div className="mt-8 rounded-2xl bg-white/10 px-6 py-4 backdrop-blur-sm">
            <p className="text-sm italic text-white/90">
              "Nunca foi tão fácil acompanhar o progresso dos alunos e manter os responsáveis informados."
            </p>
            <p className="mt-2 text-xs font-medium text-white/60">— Professora de Matemática</p>
          </div>
        </div>
      </div>

      {/* Painel do formulário */}
      <div className="flex w-full flex-col items-center justify-center bg-gray-50 px-6 py-12 lg:w-[440px] lg:flex-none lg:px-12">
        <div className="mb-8 text-center lg:hidden">
          <h1 className="text-2xl font-bold text-brand-600">Reforços Escolares</h1>
          <p className="mt-1 text-sm text-gray-500">Gestão de aulas de reforço</p>
        </div>

        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
