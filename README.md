# Help Home 🏠

Plataforma para pedir pequenos serviços e manutenções em casa: encanador, eletricista, marceneiro, pintor e muito mais.
O cliente descreve o problema, recebe orçamentos de profissionais da região, escolhe o melhor, conversa pelo chat e avalia o serviço no final.

## Como o projeto está organizado

```
help-home/
├── apps/
│   ├── web/              Site (Next.js + Tailwind)
│   └── mobile/           App para iOS e Android (Expo)
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
- Criar pedido com categoria, descrição, endereço, local no mapa, data preferida e fotos
- Comparar orçamentos: preço, tempo estimado, garantia e nota de cada profissional
- Aceitar e **pagar pelo app** (Pix, cartão ou boleto pelo Mercado Pago). O valor fica retido até o serviço ser confirmado
- Acompanhar fotos de antes e depois e o prazo do serviço
- Confirmar a conclusão (libera o pagamento), avaliar o prestador de 0 a 5 e acionar a garantia
- Comprovante do serviço (com CNPJ do prestador, pagamento e garantia) para imprimir ou salvar em PDF

**Prestador**
- Cadastro com **CNPJ obrigatório** (MEI serve), conferido na Receita Federal pela BrasilAPI
- Perfil com as categorias que atende, descrição e **base e raio de atendimento no mapa**
- Achar pedidos em **lista (do mais perto para o mais longe) ou no mapa**, filtrando pela distância ou usando a localização atual
- Ver pedidos abertos nas suas categorias e enviar orçamento com valor, **tempo estimado** e **garantia** (mínimo de 90 dias, pelo Código de Defesa do Consumidor)
- Enviar foto de antes para iniciar e foto de depois para finalizar
- Avaliar o cliente de 0 a 5 e resolver acionamentos de garantia

**Regras de nota**
- Clientes e prestadores recebem notas de 0 a 5.
- A nota do prestador é a média das avaliações menos a penalidade por atraso: a cada 50% (ou fração) acima do tempo estimado, o serviço tira 0,5 ponto, até 2 pontos por serviço. Serviços em andamento que já passaram do prazo também contam.

**Pagamento**
- Ciclo do pedido: orçamentos → pagamento → agendado → em andamento → confirmação do cliente → concluído.
- O cliente pode cancelar até o prestador iniciar; se já tinha pago, o valor é estornado.
- A taxa da plataforma é de 10% (função `platform_fee_percent` no banco).
- O repasse ao prestador ainda é manual: o dinheiro cai na conta do Help Home e aparece como "liberado ao prestador" quando o cliente confirma.
- Sem o `MERCADOPAGO_ACCESS_TOKEN`, em desenvolvimento o site usa um **modo de teste** que simula o Pix sem cobrar nada. Em produção o modo de teste fica desligado (a não ser que `PAGAMENTO_MODO_TESTE=true`).

**Privacidade:** o endereço completo, o ponto exato no mapa e o telefone só aparecem para o cliente e o profissional escolhido. Os outros prestadores veem só a região aproximada (cerca de 1 km). O chat é só entre os dois.

**Mapas:** usam o OpenStreetMap (Leaflet) e a busca de endereço do Nominatim, os dois gratuitos e sem chave. Com mais tráfego, vale trocar os blocos do mapa por um provedor pago (MapTiler, Mapbox) para respeitar a política de uso do OpenStreetMap.

## Rodando no seu computador

Pré-requisitos: [Node.js 20+](https://nodejs.org), [pnpm](https://pnpm.io) (`npm i -g pnpm`) e, para o banco local, [Docker](https://www.docker.com).

```bash
pnpm install
```

### Opção A: usar um projeto do Supabase na nuvem (mais simples)

1. Crie um projeto grátis em [supabase.com](https://supabase.com).
2. No painel, abra **SQL Editor**, rode, um de cada vez e na ordem do nome, o conteúdo de cada arquivo de `supabase/migrations`.
3. Em **Authentication > URL Configuration**, coloque `http://localhost:3000` em *Site URL* e adicione `http://localhost:3000/auth/callback` em *Redirect URLs*.
4. Copie `apps/web/.env.example` para `apps/web/.env.local` e preencha com a URL, a *publishable key* e a *secret key* (em **Project Settings > API Keys**).
5. Rode `pnpm dev` e abra http://localhost:3000.

> Dica: para testar sem precisar confirmar e-mail, desative **Authentication > Sign In / Providers > Email > Confirm email**.

### Opção B: Supabase local com Docker

```bash
npx supabase start          # sobe o banco e aplica as migrações
npx supabase status         # mostra a URL e as chaves para o .env.local
pnpm dev
```

## App para iOS e Android

O app fica em `apps/mobile` e tem as mesmas funções do site. Veja como testar no celular e publicar nas lojas em [`apps/mobile/README.md`](apps/mobile/README.md).

## Comandos

| Comando          | O que faz                           |
| ---------------- | ----------------------------------- |
| `pnpm dev`       | Roda o site em modo desenvolvimento |
| `pnpm build`     | Gera a versão de produção do site   |
| `pnpm lint`      | Verifica o código                   |
| `pnpm typecheck` | Verifica os tipos TypeScript        |

## Ligando o Mercado Pago

1. Crie uma conta em [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers) e uma aplicação do tipo *Checkout Pro*.
2. Copie o **Access Token** (use o de teste primeiro) para `MERCADOPAGO_ACCESS_TOKEN`.
3. Em **Webhooks**, cadastre `https://SEU-SITE/api/pagamentos/mercadopago` com o evento *Pagamentos* e copie a assinatura secreta para `MERCADOPAGO_WEBHOOK_SECRET`.

## Publicando o site

A forma mais simples é a [Vercel](https://vercel.com): importe o repositório, escolha `apps/web` como *Root Directory* e cadastre as variáveis do `.env.example`. Depois, adicione a URL do site em **Authentication > URL Configuration** no Supabase.

## Próximos passos

- Publicar o app nas lojas (veja `apps/mobile/README.md`)
- Notificações (e-mail e push) quando chega orçamento ou mensagem
- Repasse automático ao prestador (split do Mercado Pago) e liberação automática se o cliente não confirmar em alguns dias
- Painel administrativo (disputas, garantias, repasses)
