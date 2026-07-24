import { LOGO_DATA_URI } from '@/app/lib/logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Painel ilustrativo — oculto no mobile */}
      <div className="relative hidden flex-1 flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-sky-400 lg:flex">

        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -right-16 h-[500px] w-[500px] rounded-full bg-white/5" />
        <div className="absolute right-24 top-24 h-48 w-48 rounded-full bg-white/10" />

        {/* Ilustração educação */}
        <div className="relative z-10 flex flex-col items-center px-12 text-center">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_DATA_URI} alt="ReforçoPro" className="h-auto w-56 object-contain mix-blend-multiply" />
          </div>

          <p className="mt-8 text-sm leading-relaxed text-white/75">
            Professores, alunos e responsáveis<br />em um só lugar.
          </p>

          <div className="mt-6 rounded-2xl bg-white/10 px-6 py-4 backdrop-blur-sm">
            <p className="text-sm italic text-white/90">
              "Nunca foi tão fácil acompanhar o progresso dos alunos e manter os responsáveis informados."
            </p>
            <p className="mt-2 text-xs font-medium text-white/60">— Professora de Matemática</p>
          </div>
        </div>
      </div>

      {/* Painel do formulário */}
      <div className="flex w-full flex-col items-center justify-center bg-gray-50 px-6 py-12 lg:w-[440px] lg:flex-none lg:px-12">
        <div className="mb-8 flex justify-center lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_DATA_URI} alt="ReforçoPro" className="h-auto w-40 object-contain" />
        </div>

        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
