# Marina & Thiago — Horizonte em movimento

Experiência editorial de casamento, projetada primeiro em **390 × 844**. Convite original, sete capítulos, **36 fotografias na narrativa** e **77 acessíveis em seus momentos**, scroll nativo, três transições principais e mural de lembranças.

## Abrir localmente

Node.js 22 ou superior. Este projeto foi validado com Node 24.

```powershell
npm.cmd install
npm.cmd run dev
```

Abra **http://127.0.0.1:3000**. O servidor fica restrito a este computador.

As variantes já foram geradas em `public/media/`. Em um novo checkout, mantenha a pasta original `Marina e Thiago/` na raiz e execute:

```powershell
npm.cmd run photos:ingest
```

Os originais permanecem fora de `public/` e estão excluídos do rastreamento de arquivos do build. O manifesto fica em `src/content/weddings/marina-thiago/manifest.json`.

## O que está pronto

- Convites desktop/mobile reais, preservados, com AVIF e fallback WebP.
- Preparação editorial, rail, máscara para os olhares, cerimônia com image handoff, expansão do beijo, festa com grupos deslizáveis e epílogo contínuo.
- Carregamento progressivo, variantes responsivas, placeholders e fontes locais.
- Lightbox com toque, setas, Escape, foco contido e restauração de foco.
- Reduced motion, `noindex`, prévia de compartilhamento e tamanhos de toque acessíveis.
- Mural com formulário, persistência, paginação, validação de tamanho, honeypot e proteção de origem.
- Migração Supabase com isolamento por casamento e fotógrafo, RLS, aprovação automática configurável e limite de envios transacional.
- Validação Turnstile no servidor e pipeline de envio ao R2.

**Infraestrutura externa ainda não configurada:** não há `.env.local` com credenciais de Supabase, R2 e Turnstile, nem domínio de publicação informado. Nenhum upload para R2, aplicação de migração em Supabase ou deploy público foi executado. Em desenvolvimento o mural persiste em `.data/guestbook.json` e informa que é uma prévia local. Em produção, sem configuração, o mural fica indisponível; nunca simula envio bem-sucedido.

## Conectar Supabase, R2 e Turnstile

1. Copie `.env.example` para `.env.local` e preencha os valores. Não use `NEXT_PUBLIC_` para nenhuma chave secreta.
2. No projeto Supabase, aplique `supabase/migrations/202609210001_guestbook.sql`. Configure `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` apenas no servidor.
3. Crie dois buckets R2 distintos: um **privado** para originais e outro para variantes públicas. Vincule o segundo a um domínio de mídia e configure `NEXT_PUBLIC_MEDIA_URL` (exemplo: `https://media.seudominio.com`, sem o caminho do casamento).
4. Execute o upload explicitamente:

```powershell
node --env-file=.env.local --import tsx scripts/ingest-wedding.ts --upload
```

5. Crie um widget Turnstile para o hostname final e configure `NEXT_PUBLIC_TURNSTILE_SITE_KEY` e `TURNSTILE_SECRET_KEY`. O servidor valida `success`, hostname, action `guestbook` e cdata do casamento.
6. Defina `NEXT_PUBLIC_SITE_URL` com a origem HTTPS final e `RATE_LIMIT_SECRET` com um segredo aleatório de pelo menos 32 bytes. Em Vercel, o IP usa o header definido pela plataforma. Só habilite `TRUST_CLOUDFLARE_PROXY` se o servidor estiver atrás de Cloudflare e o acesso direto à origem estiver bloqueado. Em outra hospedagem, adapte a origem confiável do IP; sem ela o limite é compartilhado entre os visitantes, de forma conservadora.
7. Configure as mesmas variáveis no serviço de hospedagem Next.js e gere um novo build. As variáveis `NEXT_PUBLIC_*` são incorporadas no build.

```powershell
npm.cmd run build
npm.cmd run start
```

O comando `start` também usa loopback por padrão. Em um servidor próprio, use um proxy reverso HTTPS. Em uma plataforma gerenciada, utilize o adaptador Next.js da plataforma.

Após upload, confira uma URL `${NEXT_PUBLIC_MEDIA_URL}/marina-thiago/<id>-768.avif` e teste o formulário público com Turnstile real. As imagens têm cache imutável; alterações futuras devem usar nomes versionados ou purge do cache correspondente.

## Mural e multi-tenancy

Casamento atual: `d92db886-8fab-4561-90f3-d7e448cc0425`, slug `marina-thiago-040425`.

O cliente não escolhe `wedding_id`: o endpoint resolve o ID pelo manifesto do site. Todas as leituras filtram explicitamente por ele; a gravação exige o mesmo ID. Para adicionar casamentos, resolva o manifesto pelo slug validado no servidor e preserve esse contrato.

A função `submit_guestbook_message` executa limite de 3 mensagens por IP/casamento em 15 minutos e inserção na mesma transação. A tabela de limites armazena HMAC do IP, não o endereço bruto. Mantenha limpeza periódica de registros de limite antigos no ambiente de produção.

Para ativar moderação, defina `weddings.auto_approve=false`; mensagens entram como `pending`. Associe `photographers.owner_id` ao usuário autenticado do fotógrafo. As policies restringem leitura e moderação aos casamentos desse proprietário. A UI pública mostra apenas `approved`. Não há painel administrativo neste escopo.

## Verificação

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run qa
node_modules/.bin/tsx.cmd scripts/qa-guestbook.ts
```

QA usa Microsoft Edge instalado, em modo headless. Os dois últimos comandos precisam do servidor de desenvolvimento na porta 3000. O teste do mural cria mensagens explicitamente identificadas como QA e remove apenas seus próprios IDs ao terminar.

Para medir produção, inicie o build na porta 3001 e execute:

```powershell
npm.cmd run start -- --port 3001
node_modules/.bin/tsx.cmd scripts/qa-production.ts
```

Pranchas e decisões: [direção editorial](docs/EDITORIAL.md). Pesquisa e licenças: [referências](docs/RESEARCH.md). Evidências: [QA](docs/QA.md), `reports/qa/`, `reports/metadata.json`.
