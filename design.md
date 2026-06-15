# design.md

## 🎨 Paleta de Cores: Modo Claro
*(Fundo suave, sem branco puro para garantir o conforto visual em longas jornadas de leitura)*

*   **Fundo Principal:** `#F0F4F8` (Cinza-azulado bem suave, totalmente opaco e relaxante para os olhos)
*   **Fundo de Elementos (Painéis/Cards):** `rgba(226, 232, 240, 0.6)` (Ideal para aplicar *backdrop-filter: blur* e criar o efeito *glassmorphism*)
*   **Texto Principal:** `#1E293B` (Azul-marinho quase preto, garante contraste e sobriedade)
*   **Texto Secundário:** `#475569` (Cinza chumbo para metadados e informações de apoio)
*   **Acento Principal (Neon):** `#00E5FF` (Ciano elétrico vibrante para botões primários e links)
*   **Status Positivo (Sucesso):** `#10B981` (Verde esmeralda para aprovações e processos ganhos)
*   **Status Crítico (Alerta/Prazos):** `#F43F5E` (Rosa-avermelhado neon para prazos vencendo ou audiências próximas)

---

## 🌙 Paleta de Cores: Modo Escuro

*   **Fundo Principal:** `#0F172A` (Azul-escuro profundo e sofisticado)
*   **Fundo de Elementos (Painéis/Cards):** `rgba(30, 41, 59, 0.6)` (Translucidez escura para manter a consistência do *glassmorphism*)
*   **Texto Principal:** `#F8FAFC` (Branco gelo, não ofuscante)
*   **Texto Secundário:** `#94A3B8` (Cinza claro azulado)
*   **Acento Principal (Neon):** `#00F0FF` (Ciano neon, com excelente legibilidade e destaque no escuro)
*   **Status Positivo (Sucesso):** `#34D399` (Verde neon suave)
*   **Status Crítico (Alerta/Prazos):** `#FB7185` (Rosa neon suave)

---

## 🔤 Tipografia

*   **Fonte Principal (Interface e Dados Clínicos):** `Inter` ou `Plus Jakarta Sans`. 
    *   *Por que:* Fontes sem serifa, extremamente limpas e de alta legibilidade. Perfeitas para telas densas com muitos dados de processos e clientes.
*   **Fonte Secundária (Apenas Títulos de Destaque - Opcional):** `Playfair Display`.
    *   *Por que:* Traz um toque sutil de formalidade e tradição jurídica apenas para cabeçalhos maiores, contrastando bem com a interface moderna do resto do sistema.

---

## 🖼️ Ícones

*   **Estilo Visual:** Ícones de linha geométrica (Outline) com espessura fina (Light ou Regular).
*   **Bibliotecas Recomendadas:** `Phosphor Icons` ou `Lucide Icons`.
*   *Por que:* O estilo de linha fina e vazada complementa perfeitamente a estética limpa e translúcida do sistema, sem pesar visualmente nos painéis de acompanhamento.

---

## Implementação no código

| Token CSS | Uso |
|-----------|-----|
| `--color-surface` | Fundo da página |
| `--color-surface-glass` | Painéis (`industrial-panel`) |
| `--color-foreground` / `--color-muted` | Textos |
| `--color-primary` | Botões e links ativos |
| `--color-success` / `--color-danger` | Alertas e status |
| `font-sans` (Inter) | Corpo da UI |
| `font-display` (Playfair) | Títulos `h1` principais |

Referência viva: `src/app/globals.css`.
