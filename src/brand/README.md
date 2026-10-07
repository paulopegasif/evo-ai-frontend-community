# Brand layer (white-label)

Tudo que identifica o produto vem desta pasta. A branch `white-label` mantém
os valores padrão do upstream; cada cliente vive numa branch `client/<nome>`
derivada dela e troca **apenas** os arquivos abaixo.

| Arquivo | O que define |
|---|---|
| `brand.json` | Nome do produto, titular do copyright, cor do `theme-color`, links (docs, suporte, tutoriais) e GA4 |
| `assets/logo-dark.svg` | Logo exibida no tema escuro |
| `assets/logo-light.svg` | Logo exibida no tema claro |
| `theme.css` | Sobrescrita das variáveis de cor (`--primary`, `--sidebar`, ...) para `:root` (claro) e `.dark` (escuro) |
| `../../public/favicon.svg` | Favicon |
| `../../public/logo.svg` | Logo pública (e-mails, widget) |

## Como funciona

- `AppLogo` usa `BRAND_LOGOS`; o `alt` padrão é `BRAND.name`.
- Traduções usam `{{brand}}` e `{{copyrightHolder}}`, preenchidos por
  `interpolation.defaultVariables` em `src/i18n/config.ts`.
- `index.html` usa `%BRAND_NAME%` e `%BRAND_THEME_COLOR%`, preenchidos pelo
  plugin `brand-html` em `vite.config.ts`.
- Links vazios ou ausentes em `brand.json` escondem o item (docs/suporte).
- GA4 só inicializa se `analytics.ga4MeasurementId` estiver definido — use
  `null` para não enviar dados ao GA do upstream.
- `theme.css` é importado depois de `globals.css` em `src/main.tsx`.

## Novo cliente

```bash
git checkout white-label && git pull
git checkout -b client/<nome>
# substitua os arquivos da tabela acima
```

Correções genéricas vão para `white-label` e são mescladas nas branches de
cliente (`git merge white-label`). Módulos específicos do cliente devem usar o
Plugin Host (`EXTENSION_POINTS.md`) para não conflitar com o upstream.

> Ao distribuir uma UI modificada, o `TRADEMARKS.md` exige remover **toda**
> a marca Evolution (nome, logo, copyright e paleta). Os padrões desta pasta
> são do upstream e devem ser substituídos em toda branch de cliente.
