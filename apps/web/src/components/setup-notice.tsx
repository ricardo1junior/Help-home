export function SetupNotice() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <div className="card">
        <h1 className="text-lg font-semibold">Falta conectar o Supabase</h1>
        <p className="mt-2 text-sm text-slate-600">
          Crie um projeto no Supabase, rode a migração em <code>supabase/migrations</code> e preencha
          o arquivo <code>apps/web/.env.local</code> seguindo o <code>.env.example</code>. O passo a
          passo está no README.
        </p>
      </div>
    </div>
  );
}
