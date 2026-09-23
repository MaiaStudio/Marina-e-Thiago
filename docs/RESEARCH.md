# Pesquisa de componentes e licenças

Fontes primárias consultadas em 21/09/2026. Nenhum código de demo ou imagem de marketplace foi copiado.

| Necessidade | Candidato / fonte | Avaliação | Decisão |
|---|---|---|---|
| Progressão de cartões | [React Bits Scroll Stack](https://reactbits.dev/components/scroll-stack), [repositório](https://github.com/DavidHDev/react-bits) | Comportamento de referência útil. A experiência precisa de rolagem nativa, poucos elementos ativos e cenas curtas. O pacote não é necessário para a coreografia específica. [Licença atual](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md): MIT + Commons Clause. | REJECT como dependência; coreografia própria. |
| Masonry / galeria interativa | [React Bits](https://reactbits.dev/) | Masonry uniforme não expressa a liberação e desmontagem pedidas. Não usar física/inércia adicional para pequenos grupos. | REJECT; CSS irregular, Motion e overflow nativo. |
| Reveal / gallery primitives | [21st.dev](https://21st.dev/), [termos](https://21st.dev/terms) | Catálogo de componentes com condições específicas por autor; mídia de demo e preview têm direitos separados. Nenhum componente selecionado ofereceu vantagem clara sobre as primitives adotadas. | REJECT para este projeto; sem cópia de código ou mídia. |
| Dialog/sheet | [Origin UI, hoje coss](https://github.com/origin-space/originui) | Referência de composição acessível, mas o visual de sistema de produto exigiria substituição completa. O repositório atualmente redireciona para coss. | ADAPT apenas a abordagem de primitive sem aparência predefinida. |
| Dialog/sheet acessível | [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog), [licença MIT](https://github.com/radix-ui/primitives/blob/main/LICENSE) | Focus trap, Escape, restauração de foco, sem aparência obrigatória; funciona em touch. | USE primitive instalada; lightbox e sheet próprios. |
| Scroll/portal/expansão | [Motion for React](https://motion.dev/docs/react-scroll-animations) | useScroll/useTransform + sticky curto permitem ida e volta sem interceptar wheel ou touchmove. LazyMotion limita o bundle. | USE primitives + coreografia própria. |

## Fontes

- [Newsreader, Production Type](https://github.com/productiontype/Newsreader): SIL OFL 1.1.
- [Manrope no Google Fonts](https://github.com/google/fonts/blob/main/ofl/manrope/OFL.txt): SIL OFL 1.1.
- Arquivos distribuídos pelos pacotes Fontsource, com licenças preservadas em `docs/licenses`.

## Integrações

- [Validação de Turnstile no servidor](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/): token verificado no backend, com hostname, action e cdata.
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security): policies por fotógrafo, nenhuma escrita anônima direta, API com wedding_id obrigatório.
- Next.js: documentação da versão instalada consultada em `node_modules/next/dist/docs/01-app/01-getting-started/` (Route Handlers, Server and Client Components e Font Optimization).
