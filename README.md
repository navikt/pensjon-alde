# ALDE

## Kom i gang

### Installasjon

```bash
npm install
```

### Miljøvariabler

Kopier `.env.example` til `.env`:

```bash
cp .env.example .env
```

Hent access token fra:
```
https://azure-token-generator.intern.dev.nav.no/api/obo?aud=dev-fss:pensjon-q2:pensjon-pen-q2
```

Oppdater `ACCESS_TOKEN` i `.env` med token fra lenken over.

### Utvikling

Start utviklingsserver:

```bash
npm run dev
```

Med mock-data:

```bash
npm run dev:mock
```

Applikasjonen kjører på `http://localhost:5173`

### Testing

```bash
npm test           # Kjør tester
npm run test:watch # Kjør tester i watch-modus
npm run typecheck  # TypeScript typesjekking
```

## Prosjektstruktur

```
app/
├── behandlinger/           # HER JOBBER MAN SOM OFTES! Alle aktivitet-implementasjoner
│   └── alderspensjon-soknad/
│       └── vurder-samboer/
├── routes/                 # React Router routes
├── types/                  # TypeScript types
└── mocks/                  # Mock-data for utvikling
```

## For utviklere

### Legge til ny aktivitet

1. **Sjekk API-responsen** for handler-navn
2. **Opprett mappestruktur** som matcher handler-navn eksakt:
   ```
   app/behandlinger/{behandling-handlerName}/{aktivitet-handlerName}/
   ```
3. **Implementer komponenten** - se eksisterende implementasjoner for eksempler

### Viktige regler

- Mappenavn MÅ matche handler-navn fra API eksakt (case-sensitive)
- Bruk NAV's Aksel-komponenter (`@navikt/ds-react`)
- Eksporter fra `index.tsx`: `export { default, loader, action } from "./DinKomponent"`

## Bygg for produksjon

```bash
npm run build
npm start
```

## Arkitektur

Systemet bruker en "strangler pattern" for å gradvis erstatte noen aktiviteter i PSAK. Nye behandlinger og aktiviteter legges til etter hvert som de migreres.

URL-struktur:
```
/behandling/{behandlingId}/aktivitet/{aktivitetId}/{behandling-mappe}/{aktivitet-mappe}
```

Routing skjer automatisk basert på mappestruktur - ingen konfigurasjon nødvendig!

## Se også

- [AGENTS.md](./AGENTS.md) - Detaljerte instruksjoner for AI-assistenter
