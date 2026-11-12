# Estoque da Casa

Controle o estoque de casa e saiba quando cada item vai acabar. Um único código gera:

- **Web app / PWA** — roda no navegador e pode ser "instalado" na tela inicial (funciona offline).
- **APK Android** — o mesmo app empacotado com Capacitor.

Stack: Next.js 15 (export estático) · Tailwind 4 · [motion](https://motion.dev) · Capacitor 7. Os dados ficam no `localStorage` do aparelho.

## Rodar localmente (web app)

```bash
npm install
npm run dev        # desenvolvimento com hot reload → http://localhost:3000
npm run web        # versão de produção (build + servidor estático) → http://localhost:3000
```

Para testar no celular na mesma rede Wi-Fi: `npm run dev -- -H 0.0.0.0` e abra `http://<IP-do-PC>:3000`.

## Assistente com IA (aba "Pergunte")

Converse com o estoque em linguagem natural ("o que acaba essa semana?", "monte minha lista de compras").
Usa um modelo **local** via [Ollama](https://ollama.com) — nada sai da sua rede. O app envia um retrato
atualizado do estoque a cada pergunta e a resposta chega em streaming.

```bash
ollama pull qwen3.5:9b   # ou qualquer modelo de chat; o app lista os instalados
ollama serve             # escuta em http://localhost:11434
```

- **Web local** (`npm run dev`): funciona direto.
- **Celular/APK na mesma rede**: rode o Ollama aceitando conexões externas e aponte o app para o IP do PC
  (ícone de ajustes na aba Pergunte → `http://192.168.x.x:11434`):
  ```bash
  OLLAMA_HOST=0.0.0.0 ollama serve
  ```
- **Versão na Vercel**: o navegador só consegue falar com o Ollama do próprio computador, e ele precisa
  liberar a origem: `OLLAMA_ORIGINS="https://*.vercel.app" ollama serve`.

## Gerar o APK

```bash
npm run android:apk                       # build + cap sync + gradlew assembleDebug
cp android/app/build/outputs/apk/debug/app-debug.apk EstoqueDaCasa.apk
npm run apk:share                         # página de download na rede local (porta 8080)
```

Requer o Android SDK (`ANDROID_HOME=~/Android/Sdk`).

## Publicar no GitHub

1. Crie um repositório vazio em <https://github.com/new> (ex.: `estoque-casa`), **sem** README/.gitignore.
2. No terminal, dentro do projeto:

   ```bash
   git add -A
   git commit -m "Redesign Radar da Despensa + web app PWA"
   git remote add origin https://github.com/<seu-usuario>/estoque-casa.git
   git push -u origin main
   ```

   Se o GitHub pedir senha, use um **Personal Access Token** (Settings → Developer settings → Tokens) ou configure SSH.

## Publicar na Vercel

**Opção A — pelo site (recomendado, deploy automático a cada push):**

1. Entre em <https://vercel.com> com sua conta do GitHub.
2. **Add New → Project** → importe o repositório `estoque-casa`.
3. A Vercel detecta Next.js sozinha. Não mude nada: Build Command `next build`, Output automático.
4. **Deploy**. Em ~1 min você recebe uma URL pública (`https://estoque-casa-xxxx.vercel.app`).
5. A partir daí, todo `git push` na `main` publica uma nova versão; branches/PRs geram previews.

**Opção B — pela linha de comando:**

```bash
npx vercel login       # uma vez
npx vercel             # preview
npx vercel --prod      # produção
```

Abra a URL no celular e use **"Adicionar à tela inicial"** para instalar como app.
