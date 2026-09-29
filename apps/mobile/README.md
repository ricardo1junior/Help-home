# Help Home — app para iOS e Android

App do Help Home feito com [Expo](https://expo.dev) (React Native). Usa o mesmo banco (Supabase), as mesmas regras e o mesmo pacote `@helphome/shared` do site.

## O que tem no app

**Cliente**
- Criar conta e entrar
- Pedir serviço com categoria, descrição, fotos (câmera ou galeria), endereço e **local no mapa** (localização atual ou busca do endereço)
- Comparar orçamentos (preço, tempo estimado, garantia, nota e CNPJ do profissional) e aceitar
- **Pagar pelo app** (Mercado Pago). O valor fica retido até você confirmar o serviço
- Acompanhar o prazo e as fotos de antes e depois, confirmar a conclusão, avaliar de 0 a 5 e acionar a garantia
- Cancelar (com estorno se já tinha pago) e conversar com o profissional no chat

**Prestador**
- Cadastro com **CNPJ obrigatório** (conferido na Receita pelo site)
- Pedidos disponíveis em **lista (do mais perto para o mais longe) ou no mapa**, pela base ou pela localização atual, filtrando pela distância
- Enviar orçamento com valor, tempo estimado e garantia (mínimo de 90 dias)
- Tirar foto de antes para iniciar e de depois para finalizar, com o prazo contando
- Perfil com categorias, base e raio de atendimento no mapa, e a nota recebida
- Botão "Como chegar" para o endereço do cliente

Pagamento, estorno e verificação do CNPJ passam pelo site (rotas em `apps/web/src/app/api/app`), porque usam chaves secretas que não podem ficar no celular. Então o app precisa do endereço do site.

## Rodando no seu celular

1. Instale o app **Expo Go** no celular (App Store ou Google Play).
2. Copie `.env.example` para `.env` e preencha:
   - `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: os mesmos do site.
   - `EXPO_PUBLIC_API_URL`: o endereço do site (por exemplo `https://helphome.vercel.app`). Se o site estiver rodando no seu computador, use o IP do computador na rede (por exemplo `http://192.168.0.10:3000`), não `localhost`.
3. Na raiz do projeto:

   ```bash
   pnpm install
   pnpm app        # o mesmo que: cd apps/mobile && npx expo start
   ```

4. Leia o QR code com a câmera (iPhone) ou com o Expo Go (Android).

## Publicando nas lojas

O build é feito na nuvem com o [EAS](https://docs.expo.dev/eas/), sem precisar de Mac nem Android Studio:

```bash
cd apps/mobile
npx eas-cli@latest build --platform android   # gera o .aab para a Google Play
npx eas-cli@latest build --platform ios       # gera o .ipa para a App Store
```

Antes, é preciso:
- Conta de desenvolvedor na Apple (US$ 99/ano) e no Google Play (US$ 25 uma vez).
- Uma chave do Google Maps para Android (`GOOGLE_MAPS_ANDROID_KEY`, cadastrada nas variáveis do EAS). No iOS o mapa usa o Apple Maps e não precisa de chave.
- Trocar o ícone e a tela de abertura em `assets/images`.
- Conferir o identificador `br.com.helphome.app` em `app.json` (precisa ser único nas lojas).

## Comandos

| Comando          | O que faz                    |
| ---------------- | ---------------------------- |
| `npx expo start` | Abre o app para testar       |
| `pnpm lint`      | Verifica o código            |
| `pnpm typecheck` | Verifica os tipos TypeScript |
