# Help Home 🏠

Plataforma para pedir pequenos serviços e manutenções em casa: encanador, eletricista, marceneiro, pintor e muito mais.
O cliente descreve o problema, recebe orçamentos de profissionais da região, escolhe o melhor, conversa pelo chat e avalia o serviço no final.

## Como o projeto está organizado

```
help-home/
├── apps/
│   └── web/              Site (Next.js + Tailwind)
├── packages/
│   └── shared/           Código compartilhado entre site e app: tipos, validações e acesso ao banco
└── supabase/
    ├── config.toml       Configuração para rodar o Supabase localmente
    └── migrations/       Estrutura do banco, regras de segurança e categorias iniciais
```

O backend é o [Supabase](https://supabase.com) (banco Postgres, login, armazenamento de fotos e chat em tempo real).
Toda a regra de quem pode ver ou alterar cada informação fica no próprio banco (Row Level Security), então o site e o futuro app para iOS/Android usam as mesmas regras e o mesmo pacote `@helphome/shared`.

## Funcionalidades do MVP

**Cliente**
- Cadastro e login
- Criar pedido com categoria, descrição, endereço, data preferida e fotos
- Ver e comparar orçamentos (com a nota média de cada profissional)
- Aceitar um orçamento, cancelar o pedido
- Chat com o profissional escolhido e atalho para o WhatsApp
- Marcar como concluído e avaliar com estrelas

**Prestador**
- Cadastro e perfil com as categorias que atende, cidade e descrição
- Ver pedidos abertos nas suas categorias (filtrando pela cidade)
- Enviar ou retirar orçamento
- Iniciar e concluir o serviço, conversar com o cliente
- Acompanhar orçamentos, serviços e avaliações

**Privacidade:** o endereço completo e o telefone só aparecem para o cliente e o profissional escolhido. O chat é só entre os dois.

## Rodando no seu computador

Pré-requisitos: [Node.js 20+](https://nodejs.org), [pnpm](https://pnpm.io) (`npm i -g pnpm`) e, para o banco local, [Docker](https://www.docker.com).

```bash
pnpm install
```

### Opção A: usar um projeto do Supabase na nuvem (mais simples)

1. Crie um projeto grátis em [supabase.com](https://supabase.com).
2. No painel, abra **SQL Editor**, cole o conteúdo de `supabase/migrations/20260929000000_init.sql` e rode.
3. Em **Authentication > URL Configuration**, coloque `http://localhost:3000` em *Site URL* e adicione `http://localhost:3000/auth/callback` em *Redirect URLs*.
4. Copie `apps/web/.env.example` para `apps/web/.env.local` e preencha com a URL e a *publishable key* (em **Project Settings > API Keys**).
5. Rode `pnpm dev` e abra http://localhost:3000.

> Dica: para testar sem precisar confirmar e-mail, desative **Authentication > Sign In / Providers > Email > Confirm email**.

### Opção B: Supabase local com Docker

```bash
npx supabase start          # sobe o banco e aplica as migrações
npx supabase status         # mostra a URL e a publishable key para o .env.local
pnpm dev
```

## Comandos

| Comando          | O que faz                           |
| ---------------- | ----------------------------------- |
| `pnpm dev`       | Roda o site em modo desenvolvimento |
| `pnpm build`     | Gera a versão de produção do site   |
| `pnpm lint`      | Verifica o código                   |
| `pnpm typecheck` | Verifica os tipos TypeScript        |

## Publicando o site

A forma mais simples é a [Vercel](https://vercel.com): importe o repositório, escolha `apps/web` como *Root Directory* e cadastre as duas variáveis do `.env.example`. Depois, adicione a URL do site em **Authentication > URL Configuration** no Supabase.

## Próximos passos

- App para iOS e Android com Expo (React Native) em `apps/mobile`, reaproveitando o `@helphome/shared`
- Notificações (e-mail e push) quando chega orçamento ou mensagem
- Pagamento pelo app (Pix e cartão)
- Verificação de documentos dos prestadores e painel administrativo
