import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="text-5xl">🔧</p>
      <h1 className="mt-4 text-xl font-bold">Página não encontrada</h1>
      <p className="mt-2 text-sm text-slate-600">O endereço pode estar errado ou você não tem acesso a este pedido.</p>
      <Link href="/" className="btn-primary mt-6">Voltar ao início</Link>
    </div>
  );
}
