# PDF-tjeneste (`pdf/`)

En frittstående tjeneste som rendrer de eksisterende aktivitet-komponentene (Aksel +
CSS) til PDF. Java-backend POST-er `behandling` + `aktiviteter` + `toppbarInfo` som JSON, tjenesten
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

| Fil                               | Ansvar                                                  |
| --------------------------------- | ------------------------------------------------------- |
| `server.ts`                       | Express, `POST /pdf`, runtime Vite SSR                  |
| `entry.server.tsx`                | `renderAttestering(input, css)` — låst visning → HTML   |
| `render-pdf.ts`                   | Playwright singleton, `htmlToPdf(html, opts)`           |
| `pdfa.ts`                         | Ghostscript-konvertering til PDF/A-2b                   |
| `PDFA_def.ps`                     | Ghostscript-prolog (sRGB OutputIntent)                  |
| `collect-css.ts`                  | Samler `app/**/*.css`                                   |
| `vite-stub-server.ts`             | Vite-plugin som stubber `env.server` + `unleash.server` |
| `stubs/env.server.ts`             | Ufarlig erstatning for `env.server`                     |
| `stubs/unleash.server.ts`         | Ufarlig erstatning for `unleash.server`                 |
| `sample-payload.json`             | Eksempel-input (2 aktiviteter)                          |
| `sample-payload-broken.json`      | Eksempel med ukjent `handlerName` (gir HTTP 422)        |
| `Dockerfile`                      | Container-image (bygg fra repo-rot)                     |
| `fonts.ts`                        | Lokale kopier av Aksel-fontene (`fonts/`)               |
| `fonts.test.ts`                   | Enhetstest: fontene i `ds-css` finnes lokalt            |
| `pdf-service.integration.test.ts` | Integrasjonstest mot Docker-imaget                      |
| `integration/`                    | Oppsett for integrasjonstesten (Docker, verktøy-image)  |

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
  "behandling": {
    /* BehandlingDTO — sendes til hver Component som props.behandling */
  },
  "toppbarInfo": {
    /* ToppbarInfo — fnr, navn, fødselsdato, sakId og sakType til PDF-headeren */
  },
  "aktiviteter": [
    {
      "handlerName": "vurder-samboer", // → getServerComponent(handlerName)
      "aktivitet": {
        /* AktivitetDTO */
      },
      "grunnlag": {
        /* objekt, ferdig parset */
      },
      "vurdering": {
        /* objekt */
      },
      "vurdertAvBrukerNavn": "Kari Nordmann",
      "vurdertAvBrukerId": "Z999999",
      "vurdertTidspunkt": "2025-01-14T10:22:00Z"
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

Imaget bygger på Chainguards Wolfi-baserte Node-image (`nav.no/node:26-dev`) fra Navs
pull-through-register i Artifact Registry. Chromium, Ghostscript og Liberation-fonter (fallback)
installeres med `apk`. `-dev`-varianten brukes fordi den har `apk` og shell, som Chromium-pakken
trenger.

### Autentisering mot Chainguard-registeret

Basebildene hentes fra Navs pull-through-register
`europe-north1-docker.pkg.dev/cgr-nav/pull-through/`. Docker må være logget inn med
Nav-kontoen din via `gcloud` før du kan bygge imaget (eller kjøre integrasjonstesten).

1. Installer Google Cloud CLI (én gang):

   ```sh
   brew install --cask google-cloud-sdk
   ```

2. Logg inn med `@nav.no`-kontoen:

   ```sh
   gcloud auth login
   ```

3. Koble Docker til registeret (én gang). Dette legger inn `gcloud` som credential helper
   for `europe-north1-docker.pkg.dev` i `~/.docker/config.json`:

   ```sh
   gcloud auth configure-docker europe-north1-docker.pkg.dev
   ```

4. Sjekk at det virker:

   ```sh
   docker pull europe-north1-docker.pkg.dev/cgr-nav/pull-through/nav.no/node:26
   ```

Får du `401 Unauthorized`, `403 Forbidden` eller `denied` senere, har innloggingen som regel
utløpt. Kjør `gcloud auth login` på nytt. I CI håndteres innloggingen av
`nais/docker-build-push`.

### Bygge og kjøre

Bygg **fra repo-roten** (konteksten må inneholde `app/` og `package.json`):

```sh
docker build --pull -f pdf/Dockerfile -t alde-pdf .
docker run --rm -p 8090:8090 alde-pdf
```

`--pull` henter siste versjon av basebildet, slik at lokale bygg får samme
sikkerhetsoppdateringer som CI.

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

## Tester

### Enhetstester

`pdf/**/*.test.ts` kjøres sammen med resten av appens tester:

```sh
pnpm test:ci
```

### Integrasjonstest

`pdf-service.integration.test.ts` bygger Docker-imaget, starter det på en ledig port og tester
tjenesten over HTTP. Den kjøres ikke av `pnpm test:ci`.

Forutsetninger:

- Docker kjører (OrbStack, Colima, Docker Desktop e.l.). Testen starter ikke Docker selv, men
  feiler med `Docker kjører ikke` hvis den ikke svarer.
- Innlogget mot Chainguard-registeret (se
  [Autentisering mot Chainguard-registeret](#autentisering-mot-chainguard-registeret)).

```sh
pnpm test:pdf-integration
```

Testen sjekker:

- helsesjekker (`/internal/live`, `/internal/ready`, `/ping`) og `/metrics`
- `format=pdfa`, `format=pdf`, default-format og varianter (`pdf-a`, `PDFA`)
- at PDF/A-en er gyldig PDF/A-2b (veraPDF)
- at Aksel-fonten Source Sans 3 er brukt og ingen fallback-fonter (`pdffonts`)
- feilsvar: ukjent format (`400`), ukjent `handlerName` (`422`), ugyldig JSON (`400`)
- parallelle forespørsler
- at tjenesten rendrer PDF/A i en container uten nettverk (`--network none`)

veraPDF og `pdffonts` kjøres i Docker (`verapdf/cli` og et lite verktøy-image fra
`integration/tools.Dockerfile`), så ingenting trenger å installeres på maskinen. PDF-ene kopieres
inn i verktøy-containerne med `docker cp`, så testen er ikke avhengig av hvilke mapper Docker-miljøet
deler med maskinen (Colima deler for eksempel som standard bare hjemmemappen). `verapdf/cli` finnes bare for
`linux/amd64` og kjøres emulert på Apple Silicon.

PDF-ene lagres i `$TMPDIR/alde-pdf-integration/` og stien skrives ut til slutt. macOS rydder
mappen automatisk.

Miljøvariabler:

| Variabel               | Effekt                                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PDF_BASE_URL`         | Test mot en tjeneste som allerede kjører, f.eks. `http://localhost:8090`. Bygger og starter ingen container, og hopper over testen uten nettverk. |
| `PDF_SKIP_BUILD=1`     | Gjenbruk eksisterende image i stedet for å bygge                                                                                                  |
| `PDF_PULL=1`           | Bygg med `--pull` (siste basebilder)                                                                                                              |
| `PDF_IMAGE`            | Navn på tjeneste-imaget (default `alde-pdf:integration-test`)                                                                                     |
| `PDF_TOOLS_IMAGE`      | Navn på verktøy-imaget med `pdffonts`                                                                                                             |
| `PDF_VERAPDF_IMAGE`    | veraPDF-image (default `verapdf/cli:latest`)                                                                                                      |
| `PDF_VERAPDF_PLATFORM` | Plattform for veraPDF-imaget (default `linux/amd64`)                                                                                              |
| `PDF_OUT_DIR`          | Hvor PDF-ene lagres. Relative stier gjøres absolutte fra mappen testen kjøres fra.                                                                |

Eksempel mot en container du allerede har startet:

```sh
docker run --rm -p 8090:8090 alde-pdf
PDF_BASE_URL=http://localhost:8090 pnpm test:pdf-integration
```

Hvis oppsettet feiler, skriver Vitest også `No test files found`. Den egentlige årsaken står i
feilmeldingen som starter med `PDF-integrasjonstesten kunne ikke starte:`.

## PDF/A

Chromium lager vanlig PDF, ikke PDF/A. Med `?format=pdfa` (default) konverteres
bufferen til **PDF/A-2b** med **Ghostscript** (`pdfa.ts` + `PDFA_def.ps`): fonter
embeddes og en sRGB OutputIntent legges til. Ghostscript ligger i Docker-imaget.

Dokumentet får også arkivmetadata (fra `behandling` og `toppbarInfo`, UTF-16 så æøå bevares):
**Title** = `{friendlyName} - Sak: {sakId}` (bare `{friendlyName}` uten sakId), **Subject** = `{friendlyName}`,
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

- Basebildet (`nav.no/node:26-dev`) og apk-pakkene er ikke låst til en versjon; hvert
  bygg får siste patchede versjon fra Chainguard.
- Playwright bruker systemets Chromium fra Wolfi (`PLAYWRIGHT_EXECUTABLE_PATH=/usr/bin/chromium`),
  ikke nettleseren Playwright selv laster ned. Chromium-versjonen følger derfor Wolfi og
  ikke `playwright`-versjonen i `package.json`. Hvis rendering feiler etter et nytt bygg,
  sjekk om ny Chromium er inkompatibel med Playwright-versjonen.
- Wolfi legger ICC-profilen i `/usr/share/ghostscript/iccprofiles/srgb.icc` (uten
  versjonsmappe); `pdfa.ts` sjekker både denne og Debian-stiene.
- Tjenesten skal aldri gjøre utgående kall: den mottar data, rendrer og returnerer PDF.
- Appfilene i imaget eies av root og er skrivebeskyttet for `node`-brukeren. Vite-cachen
  ligger i `os.tmpdir()`.
- Aksel-fonten (Source Sans 3) ligger i `pdf/fonts/` som kopier av filene på
  `cdn.nav.no/aksel/fonts/`. `render-pdf.ts` fanger opp Chromiums forespørsler mot CDN-en med
  `page.route` og svarer med de lokale filene (`fonts.ts`), så `@navikt/ds-css` brukes uendret og
  tjenesten trenger ingen utgående nettverkstilgang. Mangler en fil, feiler rendringen.
  `fonts.test.ts` feiler hvis `@navikt/ds-css` refererer fonter som ikke finnes lokalt. Hent dem da med:

  ```sh
  for u in $(grep -o 'https://cdn\.nav\.no/aksel/fonts/[^")]*' node_modules/@navikt/ds-css/dist/index.css | sort -u); do
    curl -sSf -o "pdf/fonts/$(basename "$u")" "$u"
  done
  ```
- pnpm installeres med `npm install -g` i versjonen fra `packageManager` i `package.json`
  (ingen corepack).
- `--ignore-scripts` under install hopper over repoets `prepare` (lefthook, krever git);
  plattform-binærene (esbuild/rollup/lightningcss) kommer fra optional deps.
- Stubben setter `isMockEnv = true`. Riktig for en ren render-runtime, men en komponent
  som viser noe ulikt basert på `isMockEnv` vil følge mock-grenen.
- All `app/**/*.css` injiseres (inkl. `.module.css` rått/uskopet — stort sett ufarlig).
  Den «rene» varianten er et eget Vite-SSR-bygg som emitter nøyaktig scoped CSS; denne
  samle-alt-varianten er den pragmatiske MVP-broen.
