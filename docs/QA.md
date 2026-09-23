# Verificação da experiência

Executada em 21/09/2026, em Microsoft Edge headless. As capturas e os resultados brutos ficam em `reports/qa/`.

## Aplicação

- Build de produção e TypeScript: passaram, sem avisos.
- Testes automatizados: 5 passaram (integridade das 77 fotos/36 narrativas, validação, isolamento de casamento, concorrência no limite de envio e ausência de fallback local em produção).
- 390 × 844 com touch: navegação completa por gestos nativos, chegando ao final da página; sem bloqueio de avanço.
- 320, 375, 390, 430, 768, 1024 e 1440 px: largura do documento igual à viewport, sem overflow lateral.
- Hero Expansion: fotografia passa de **312 px para 390 px**, mantendo a mesma URL; scroll reverso retorna a 312 px.
- Lightbox: avanço, Escape e retorno do foco ao controle de origem verificados.
- Movimento reduzido: foto do clímax com 390 px e `transform: none`; rail permanece navegável nativamente.
- Axe WCAG 2 A/AA e 2.1 AA: **zero violações detectadas** na página e no formulário após os ajustes de contraste.
- Zero erros JavaScript nas verificações.

## Mural

O teste em navegador preencheu e enviou o formulário, verificou HTTP 201 e reencontrou a mensagem após recarregar a página. Também verificou:

| Caso | Resultado |
|---|---|
| Mais de 1.200 caracteres | 400 |
| Honeypot preenchido | 400 |
| Quarto envio na janela de limite | 429 |
| Origin diferente | 403 |
| Produção sem Supabase | Mural indisponível, sem falsa confirmação |

A persistência local e a implementação de proteção foram testadas. A migração e a RPC do Supabase não foram executadas em um projeto remoto, e o Turnstile real não foi validado com credenciais de produção.

## Performance de laboratório

Build de produção, cache frio, viewport 390 × 844, DPR 2, download de **1,6 Mbps**, latência de **150 ms**, CPU com desaceleração **4×**:

| Métrica | Resultado final |
|---|---:|
| LCP | **1,36 s** |
| FCP | 1,264 s |
| CLS | **0** |
| Maior duração dos eventos observados ao abrir o convite | **96 ms** |
| Recursos transferidos antes da interação (inclui fontes e JS) | ~410 KB |
| Fotografias carregadas na abertura | Apenas o convite |

O evento de 96 ms é uma observação sintética, **não uma medição de INP de campo**. Os resultados locais não garantem os mesmos números na hospedagem final; repetir em aparelho real e no domínio com R2 após deploy. A primeira medição de LCP foi 3,75 s: o convite foi convertido para AVIF de ~36,7 KB, as fontes editoriais saíram do preload e o carregamento da preparação foi adiado até o início da navegação.

## Publicação e limites

- `X-Robots-Tag: noindex, nofollow, noarchive` confirmado.
- Imagem Open Graph responde 200.
- Caminho do original responde 404; originais não aparecem no tracing do servidor.
- Supabase, R2, domínio público e Turnstile de produção aguardam configuração. Não há deploy público.
- Safari/iOS real, WhatsApp in-app browser, R2 e teste de carga remoto ainda precisam de validação no ambiente final.
