# ALDE

## Kom i gang

### Installasjon

```bash
npm install
```

### Miljøvariabler

Kjør `fetch-secrets.sh` for å generere en `.env`-fil med miljøoppsett og hemmeligheter:

```bash
./fetch-secrets.sh
```

[!NOTE]
> .env-filen inneholder hemmeligheter og skal ikke deles. Hemmelighetene har
> begrenset levetid, så du må kjøre skriptet jevnlig (typisk 1–2 ganger per uke).

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

## Testdata

### Lag behandling for Førstegangssøknad og VurdereSamboer aktivitet

1. Opprett en person i [Dolly](https://dolly.ekstern.dev.nav.no/)
   - Alder 62+
2. Norsk bank
   - Tilfeldig kontonr
3. Bostedsadresse
   - Tilfeldig adresse, eventuelt flere adresser for mer visning i Alde
4. Familierelasjoner - Sivilstand (har partner)
   - Samboer fra gitt dato. Eventuelt flere relasjoner
5. Pensjon
   - Har inntekt (POPP) - Gi nok inntekt (1980-2023, 700 000)
   - Har alderspensjon (Alderspensjon)
   - SØKNAD , (EPS inntekt 700 000)





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
- [docs/UNLEASH.md](./docs/UNLEASH.md) - Feature flags med Unleash
