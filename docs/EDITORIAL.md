# Direção editorial — Horizonte em movimento

Inspeção visual concluída antes da composição: **77 fotografias + 2 artes de convite**. As pranchas por pasta estão em `reports/contact-*.jpg`. `reports/metadata.json` registra dimensões, orientação, proporção e EXIF das 77 fotografias; `reports/dimensions.json` inclui também os convites. As decisões individuais, os textos alternativos e os pontos focais estão em `scripts/editorial.ts` e no manifesto gerado.

## Leitura do acervo

- 53 fotografias verticais e 24 horizontais. Predomina a proporção 2:3/3:2, com pequenos recortes em alguns arquivos.
- Os 77 arquivos contêm DateTimeOriginal. Há duas câmeras (Canon EOS R8 e Sony ILCE-6300). Os relógios não foram considerados sincronizados; horários não aparecem como fatos na interface.
- Preparação: luz natural difusa, vegetação verde escura, madeira, roupas claras. Marina e Thiago já aparecem juntos no jardim: não há fundamento para anunciar um first look encenado na cerimônia.
- Chegada: carro, caminho na areia, convidados e altar. A fotografia IMG_9932, de costas no corredor, entrega a cena à espera de Thiago. É uma montagem editorial de ação e reação, não uma afirmação de simultaneidade entre câmeras.
- Cerimônia: o céu passa de claro a azul profundo; fios de luzes e madeira aquecem a composição. A sequência alterna espaço, proximidade, taças, mãos e alianças.
- Beijos: IMG_0590 é o clímax por gesto, proximidade e desenho diagonal. IMG_0636 conserva a energia em um segundo beijo entre convidados. Não foram inventados votos ou citações.
- Festa: pétalas, brinde coletivo, abraços e convidados erguendo Thiago. Grupos de retratos são momentos de descoberta e interação, sem repetir 18 fotografias no mesmo padrão.
- Retratos na praia: o casal sorrindo em 164 é o epílogo. Os retratos podem ter ocorrido antes da festa: o final é uma coda de memória, sem afirmar que se trata de despedida ou último acontecimento.
- EXIF informa flash não disparado (incluindo uma variante de modo obrigatório). A luz pontual e o contraste noturno são visíveis, mas não se atribui equipamento de iluminação adicional sem evidência.

## Paleta e tipografia

A areia cinza-bege e o branco quente das roupas orientam `#F3F0E8`. Madeira/fibras e vegetação orientam o verde mineral `#697057` e o carvão esverdeado `#171C19`. O azul do entardecer fica nas fotografias. Não há ilustrações tropicais adicionadas. As palmeiras e os elementos existentes no convite original são preservados como parte do acervo.

Newsreader variável (normal e itálico) + Manrope variável. A serif tem movimento humano e contraste sem usar letra de casamento; a sans recua em legendas e controles. Arquivos WOFF2 latinos servidos localmente via next/font. Ambas sob SIL OFL 1.1; licenças completas em `docs/licenses/`.

## Distribuição final

| Capítulo | Narrativa | Acervo contextual | Comportamento |
|---|---:|---:|---|
| Preparação | 4 | 6 | Editorial com sobreposição e deslocamentos curtos |
| Chegada | 5 | 18 | Ambiente, rail horizontal dirigido pelo scroll nativo, corredor |
| Olhares | 3 | 5 | Máscara retangular, seguida por pausas de uma imagem |
| Cerimônia | 8 | 8 | Plano amplo, ação/reação, image handoff, detalhes e camadas |
| Sim | 2 | 2 | Uma foto cresce de 80vw até a tela; a mesma foto permanece |
| Celebração | 13 | 31 | Pétalas, densidade crescente, grupos arrastáveis, brinde |
| Memória | 1 | 7 | As fotos periféricas saem e um retrato permanece |
| **Total** | **36** | **77** | **41 fotos adicionais disponíveis nos capítulos** |

O acervo contextual inclui também as fotos da narrativa, para permitir revê-las. Os 21 detalhes de decoração foram distribuídos entre chegada e festa, em vez de se inventar um oitavo capítulo.

## Três transições principais

1. **Corredor → olhares:** IMG_9932 permanece atrás de IMG_9821, revelada por máscara retangular inicialmente com cerca de 26% da largura. O recorte do rosto foi conferido em 390px.
2. **Cerimônia → sim:** IMG_0590 entra com escala 0,8, chega a 1 e permanece. Sem troca de arquivo no momento fullscreen. A tipografia só surge perto do término da expansão.
3. **Festa → memória:** um último abraço sai para cima e desaparece; o retrato 164 ocupa progressivamente o quadro. A mesma fotografia permanece no epílogo.

O image handoff das taças é uma continuidade secundária, sem competir com os três momentos principais. As funções ligadas ao scroll usam transforms de função para evitar divergências de offsets nas otimizações nativas da versão instalada do Motion, detectadas no QA.

## Performance e acesso

452 variantes AVIF/WebP (~27,5 MB somadas), não uma transferência inicial de 27,5 MB. Fotos narrativas recebem 480/768/1080/1440; discovery recebe 480/1080. Não se geram 1920 indiscriminadamente. Placeholders de 16px são incluídos no manifesto, sem EXIF nas variantes. O browser escolhe a variante; crops fullscreen incluem a altura necessária em `sizes` para não ampliar uma miniatura.

Os capítulos distantes não recebem URLs reais de imagem até chegarem a 900px da viewport. O lightbox carrega sob intenção. O mural só busca mensagens próximo ao final da página. Não há rastreamento, música automática, exigência de login ou trava de scroll.

Reduced motion: rail com scroll horizontal nativo, portal por crossfade, clímax estático, festa sem deslocamentos e epílogo sem remanescentes em movimento. O usuário pode sempre continuar verticalmente.
