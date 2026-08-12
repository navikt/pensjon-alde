# PDF-tjeneste (`pdf/`)

En frittstående tjeneste som rendrer de eksisterende aktivitet-komponentene (Aksel +
CSS) til PDF. Java-backend POST-er `behandling` + `aktiviteter` som JSON, tjenesten
rendrer den låste attesterings-visningen og returnerer en PDF.

Kjøres som **egen deployment/container** — helt adskilt fra saksbehandler-appen, men
deler komponentkoden i `app/` (det er nettopp komponentene som skal rendres).

## Arkitektur

- **Runtime module resolution (Vite `ssrLoadModule`)** — gir `import.meta.glob`
  komponent-discovery, `~`-alias og CSS-håndtering uten et eget bygg. Komponentene
  rendres nøyaktig slik de er skrevet.
- **`renderToStaticMarkup`** rendrer komponenttreet til en HTML-streng.
- **Ship-all-CSS** — `collect-css.ts` samler all `app/**/*.css` og injiserer den sammen
  med `@navikt/ds-css`. På en dedikert render-runtime er dette billig og selv-
  vedlikeholdende (ny aktivitet = CSS-en er allerede med).
- **Playwright (headless Chromium)** — `setContent` + `page.pdf()`. Én kontinuerlig
  side (måler `scrollHeight`), `--no-sandbox` for container.
- **Minimal memory-router** — aktivitet-komponentene bruker RR-hooks
  (`useNavigation`, `<Form>`), så renderingen pakkes i en throwaway
  `createMemoryRouter`. Data kommer fra props, ingen loaders kjøres.
- **`env.server`/`unleash.server`-stub** — komponentenes rute-moduler drar inn
  server/auth/env-kode med import-side­effekter (`env.server` → `process.exit(1)`,
  `unleash.server` → nettverkskall). En `resolveId`-plugin (`vite-stub-server.ts`)
  omdirigerer alle importer av disse til ufarlige stubs, så tjenesten trenger **ingen**
  Azure/PEN/PSAK/Unleash-env.

## Filer

| Fil | Ansvar |
|-----|--------|
| `server.ts` | Express, `POST /pdf`, runtime Vite SSR |
| `entry.server.tsx` | `renderAttestering(input, css)` — låst visning → HTML |
| `render-pdf.ts` | Playwright singleton, `htmlToPdf(html, opts)` |
| `pdfa.ts` | Ghostscript-konvertering til PDF/A-2b |
| `PDFA_def.ps` | Ghostscript-prolog (sRGB OutputIntent) |
| `collect-css.ts` | Samler `app/**/*.css` |
| `vite-stub-server.ts` | Vite-plugin som stubber `env.server` + `unleash.server` |
| `stubs/env.server.ts` | Ufarlig erstatning for `env.server` |
| `stubs/unleash.server.ts` | Ufarlig erstatning for `unleash.server` |
| `sample-payload.json` | Eksempel-input (2 aktiviteter) |
| `sample-payload-broken.json` | Eksempel med ukjent `handlerName` (gir HTTP 422) |
| `Dockerfile` | Container-image (bygg fra repo-rot) |

## API

```
POST /pdf?format=pdfa
Content-Type: application/json
```

**Query-param `format`** (default `pdfa`):
- `format=pdfa` — PDF/A-2b (arkivsamsvar, Ghostscript-konvertering).
- `format=pdf` — vanlig PDF (rå Chromium-output, ingen konvertering).
- Ugyldig verdi → `400`.

```jsonc
{
  "behandling": { /* BehandlingDTO — sendes til hver Component som props.behandling */ },
  "aktiviteter": [
    {
      "handlerName": "vurder-samboer",   // → getServerComponent(handlerName)
      "aktivitet":   { /* AktivitetDTO */ },
      "grunnlag":    { /* objekt, ferdig parset */ },
      "vurdering":   { /* objekt */ },
      "vurdertAvBrukerNavn": "Kari Nordmann",
      "vurdertAvBrukerId":   "Z999999",
      "vurdertTidspunkt":    "2025-01-14T10:22:00Z"
    }
  ]
}
```

Rekkefølgen i `aktiviteter` er rekkefølgen i PDF-en. Svar: `200` med
`Content-Type: application/pdf`.

Hvis en `handlerName` er ukjent (ingen matchende komponent), lages det **ingen**
PDF — tjenesten validerer alle aktiviteter først og svarer `422` med
`{ "error": "Ingen komponent funnet for handlerName: …" }`. Ingen delvis PDF.

## Lokalt

```sh
# Kjør endepunktet lokalt (POST /pdf på :8090)
pnpm dev:pdf
```

Deretter kan du verifisere med curl (se «Verifisere med curl» under Docker).

## Docker

Bygg **fra repo-roten** (konteksten må inneholde `app/` og `package.json`):

```sh
docker build -f pdf/Dockerfile -t alde-pdf .
docker run --rm -p 8090:8090 alde-pdf
```

### Verifisere med curl

**1) Gyldig payload → PDF/A (HTTP 200, default `format=pdfa`):**

```sh
curl -s -X POST 'http://localhost:8090/pdf?format=pdfa' \
  -H 'Content-Type: application/json' \
  --data @pdf/sample-payload.json \
  -o pdf-preview.pdf
verapdf --flavour 2b pdf-preview.pdf   # isCompliant="true"
```

**Vanlig PDF (uten PDF/A-konvertering):**

```sh
curl -s -o pdf-preview.pdf -w 'HTTP %{http_code}  %{content_type}  %{size_download} bytes\n' \
  -X POST 'http://localhost:8090/pdf?format=pdf' \
  -H 'Content-Type: application/json' \
  --data @pdf/sample-payload.json
file pdf-preview.pdf   # -> PDF document
```

**2) Ukjent/feil `handlerName` → ingen PDF (HTTP 422):**

`pdf/sample-payload-broken.json` har en aktivitet med `handlerName`
`"ikke-en-ekte-handler"`. Tjenesten skal **ikke** lage en delvis PDF — den feiler før
rendering:

```sh
curl -s -w '\nHTTP %{http_code}\n' \
  -X POST http://localhost:8090/pdf \
  -H 'Content-Type: application/json' \
  --data @pdf/sample-payload-broken.json
# -> {"error":"Ingen komponent funnet for handlerName: ikke-en-ekte-handler"}
# -> HTTP 422
```

**Health:** `GET /internal/live` og `/internal/ready` → `200`.

```sh
curl -s -o /dev/null -w 'live: HTTP %{http_code}\n' http://localhost:8090/internal/live
```

## PDF/A

Chromium lager vanlig PDF, ikke PDF/A. Med `?format=pdfa` (default) konverteres
bufferen til **PDF/A-2b** med **Ghostscript** (`pdfa.ts` + `PDFA_def.ps`): fonter
embeddes og en sRGB OutputIntent legges til. Ghostscript ligger i Docker-imaget.

Dokumentet får også arkivmetadata (fra `behandling`, UTF-16 så æøå bevares):
**Title** = `{friendlyName} - {navn}, sak {sakId}`, **Subject** = `{friendlyName}`,
**Author** = `Nav - Pensjon Alde`, og **språk** `/Lang nb-NO`.
(Merk: `/Creator` og `/Producer` settes/overstyres av Ghostscript, så vi bruker `/Author`.)

- Uten konvertering (f.eks. lokal dev uten Ghostscript): bruk `?format=pdf`.
- Egen gs-binary: `GHOSTSCRIPT_BIN=/path/til/gs`.
- Egen ICC-profil: `PDFA_ICC_PROFILE=/path/til/sRGB.icc` (ellers finner tjenesten
  Ghostscripts medfølgende `srgb.icc`).
- Verifiser samsvar med veraPDF: `verapdf --flavour 2b out.pdf`.

> PDF/A-2b = visuelt arkivsamsvar. PDF/A-2a (tagget/universelt utformet) krever en
> tagget strukturtre og er en større jobb fra Chromium-HTML.

## Notater / begrensninger

- Basebildet `mcr.microsoft.com/playwright:v1.61.1-noble` må matche `playwright`-
  versjonen i `package.json` (Chromium ligger ferdig i bildet).
- `--ignore-scripts` under install hopper over repoets `prepare` (lefthook, krever git);
  plattform-binærene (esbuild/rollup/lightningcss) kommer fra optional deps.
- Stubben setter `isMockEnv = true`. Riktig for en ren render-runtime, men en komponent
  som viser noe ulikt basert på `isMockEnv` vil følge mock-grenen.
- All `app/**/*.css` injiseres (inkl. `.module.css` rått/uskopet — stort sett ufarlig).
  Den «rene» varianten er et eget Vite-SSR-bygg som emitter nøyaktig scoped CSS; denne
  samle-alt-varianten er den pragmatiske MVP-broen.
