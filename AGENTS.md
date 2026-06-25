# AI Agent Instructions - ALDE Test Project

Welcome, AI colleague! This document contains essential information about the ALDE project architecture and conventions. Please read this before making any changes.

## Project Overview

This is a React Router 7 application implementing a "strangler pattern" to gradually replace a legacy system for handling Norwegian pension applications (alderspensjon). The application processes "behandlinger" (treatments/cases) which contain "aktiviteter" (activities/tasks).

## Core Concepts

### Behandling (Treatment/Case)

A `behandling` is a case or application being processed, e.g., an application for old-age pension (alderspensjon). Each behandling has:

- `behandlingId`: Unique identifier
- `handlerName`: Maps to folder name (e.g., "alderspensjon-soknad")
- `aktiviteter`: List of activities/tasks to complete
- Status, dates, and other metadata

### Aktivitet (Activity/Task)

An `aktivitet` is a specific task within a behandling. Each aktivitet has:

- `aktivitetId`: Unique identifier
- `handlerName`: Maps to folder name (e.g., "vurder-samboer")
- Some aktiviteter are backend-only (no `handlerName`) — do not create a folder for these; inform the user that this aktivitet is backend-only and requires no UI implementation
- Some need UI implementation for manual processing

## YOUR PRIMARY WORK AREA: app/behandlinger/

**IMPORTANT: Unless otherwise instructed, you should focus your work in the `app/behandlinger/` directory.** This is where all aktivitet implementations live.

## Adding New Implementations

### Step 1: Check API Response

Look for handler names in the API response:

```json
{
  "behandlingId": 6359437,
  "handlerName": "alderspensjon-soknad",  // behandling handler
  "aktiviteter": [{
    "aktivitetId": 6020942,
    "handlerName": "vurder-samboer"       // aktivitet handler
  }]
}
```

### Step 2: Create Folder Structure

If the behandling-level `handlerName` is absent from the API response, do not create any folders. Inform the user that a behandling `handlerName` is required to determine the correct folder path.

Create folders matching EXACTLY the handler names:

```sh
app/behandlinger/alderspensjon-soknad/vurder-samboer/
```

If a folder matching the handler name already exists, inspect its contents before creating any files. If an implementation already exists, report this to the user and ask whether to overwrite, extend, or skip.

### Step 3: Create PascalCase component file

Create a PascalCase filename from the handler name (e.g., handler name `vurder-samboer` becomes `VurderSamboer.tsx`). The file should contain a loader, action, and default-exported component following React Router 7 patterns. Unless otherwise specified, implement empty boilerplate for the loader and action.

### Step 4: Create index.tsx

Export your component, loader, and action from index.tsx, this will be the import path.

### Step 5: Implement Component

For structural reference (import patterns and component layout), check `app/behandlinger/alderspensjon-soknad/vurder-samboer/`. Do not infer a full data-fetching implementation from that reference unless the user has asked for it — keep the loader and action as boilerplate unless otherwise specified. If the reference path does not exist in the workspace, fall back to the boilerplate described in Step 3 and notify the user that the reference could not be found.

## Critical Rules

### ALWAYS DO

- ✅ **Use Aksel components** (`@navikt/ds-react`) - This is IMPORTANT
- ✅ Use exact handler names from API as folder names
- ✅ Export from index.tsx
- ✅ Use React Router 7 patterns (loader, action, default export)
- ✅ Keep behandling context when fetching data

### NEVER DO

- ❌ **Add code comments** unless explicitly requested
- ❌ **Install dependencies** - instruct the user to do it if needed
- ❌ Create routes manually (they're auto-discovered)
- ❌ Change folder names without checking API handler names
- ❌ Use underscores in folder names (use hyphens)
- ❌ Use plain HTML elements when Aksel components exist
- ❌ **Declare work complete without checking diagnostics** - always verify!

## Styling

Place CSS files in the aktivitet folder for component-specific styling:

```sh
app/behandlinger/alderspensjon-soknad/vurder-samboer/
├── index.tsx
└── vurder-samboer.css  # Local styles for this aktivitet
```

## Common Patterns

See `app/behandlinger/alderspensjon-soknad/vurder-samboer/index.tsx` for examples of:

- API calls using `useFetch`
- Form handling with React Router's `Form` component
- Import patterns for Aksel components, types, and utilities
- How to structure loader and action functions
- How to access `behandlingsId` from params

## Aksel Components (IMPORTANT!)

You MUST use NAV's design system components from `@navikt/ds-react`:

- `Button`, `LinkButton` - for actions
- `TextField`, `Textarea`, `Select`, `Checkbox`, `Radio` - for inputs
- `Alert`, `ErrorMessage`, `ErrorSummary` - for feedback
- `Heading`, `BodyLong`, `BodyShort`, `Detail`, `Label` - for typography
- `Box`, `HStack`, `VStack`, `Spacer` - for layout
- `Table` - for data display
- `Loader` - for loading states
- `Modal`, `Drawer` - for overlays

See full documentation at: <https://aksel.nav.no/komponenter>

## How Routing Works

URLs look like this:

```sh
/behandling/{behandlingId}/aktivitet/{aktivitetId}/{behandling-folder}/{aktivitet-folder}
```

Example:

```sh
/behandling/6359437/aktivitet/6020942/alderspensjon-soknad/vurder-samboer
```

The system automatically:

1. Fetches behandling data using the ID
2. Finds the matching aktivitet
3. Routes to the correct implementation based on folder names

## Testing Your Implementation

```sh
pnpm test          # Run tests in watch mode
pnpm test:ci       # Run tests once (use this after editing tests or tested files)
pnpm typecheck     # Type checking
pnpm dev:mock      # Development with mock API
```

### TypeScript Best Practices

- Types are in `~/types/` - check existing types before creating new ones
- React Router generates types in `./+types/[filename]` for route-specific types
- Add explicit types to callback parameters to avoid implicit `any` errors
- When writing tests, check the actual interfaces for required vs optional fields
- Extract business logic into pure functions for easier testing

## Mock Data

Mock API responses are located in `app/mocks/data/`. Check existing files like `behandling-6359437.json` for response structure.

## Common Issues

### "Implementation not found"

- Folder names must match handler names EXACTLY (case-sensitive)
- Use hyphens, not underscores

### TypeScript errors

- Run `pnpm typecheck` to generate React Router types
- Import types from `./+types`

## API Endpoints

- `GET /api/saksbehandling/alde/behandling/{behandlingId}` - Get behandling with aktiviteter
- `POST /api/saksbehandling/alde/behandling/{behandlingId}/aktivitet/{aktivitetId}/vurdering` - Submit aktivitet decisions

Note: Both GET and POST base paths use `/alde/` — this is intentional.

## Strangler Pattern Context

This app gradually replaces a legacy system. New aktiviteter are migrated incrementally. When the backend adds new aktivitet types with handler names, you implement the UI in the corresponding folder.

## Remember

1. **Work in `app/behandlinger/`** unless told otherwise
2. **Use Aksel components** - no plain HTML when Aksel has an equivalent
3. **No code comments** unless requested
4. **Folder names ARE handler names** - no configuration needed

The folder structure IS the configuration. Keep it simple, keep it working!

## Definition of Done

Before declaring work complete, follow this checklist in order:

1. Run `pnpm test:ci` after creating or modifying test files, editing files with associated tests, or making changes to core functionality. If `pnpm test:ci` fails to run (e.g., missing dependencies, script not found), do not attempt to fix the toolchain — report the exact error output to the user and ask them to resolve the environment issue before proceeding.
2. Run `pnpm typecheck` to check for TypeScript errors. If it fails to run, report the exact error output to the user.
3. Check diagnostics for all files you have edited — both implementation files and test files. Fix all type errors and linting issues.
4. Verify that no plain HTML elements replace available Aksel components.
5. Confirm all new files are exported from `index.tsx`.

## Automatiske skjermbilder for dokumentasjon

Prosjektet har støtte for automatisk generering av skjermbilder som brukes i dokumentasjonen (pensjon-dokumentasjon).

### Hvordan det fungerer

Skjermbildene tas med Playwright mot mock-serveren (`pnpm dev:mock`). Scriptet navigerer til behandlingsruter, setter alde-settings-cookie for å vise stepper og metadata, og tar fullside-skjermbilder.

### Kommandoer

```sh
pnpm dev:mock                    # Start mock-serveren (må kjøre først)
pnpm capture-screenshots         # Ta alle skjermbilder (lagres i screenshots/)
pnpm capture-docs-screenshots    # Ta kun docs-skjermbilder og kopier til pensjon-dokumentasjon
```

### Legge til nye skjermbilder

1. **Opprett mock-data** i `app/mocks/data/`:
   - `behandling-{id}.json` — BehandlingDTO med aktiviteter
   - `aktivitet/{aktivitetId}-grunnlagsdata.json` — Grunnlagsdata for aktiviteten
   - Legg til MSW-handler i `app/mocks/server.ts` om nødvendig

2. **Legg til side i `scripts/capture-screenshots.ts`** i `pages`-arrayet med mock-behandlingens ID

3. **For docs-skjermbilder**, oppdater `scripts/screenshot-mapping.json` med mapping fra side til filnavn i pensjon-dokumentasjon

### Mock-data-struktur

```sh
app/mocks/data/
├── behandling-6359437.json          # Attestering-tilstand
├── behandling-1000001.json          # Vurder samboer (aktiv)
├── behandling-1000002.json          # Kontroller inntekt (aktiv)
└── aktivitet/
    ├── 6020943-grunnlagsdata.json   # Samboer-grunnlag
    └── 7020942-grunnlagsdata.json   # Inntekt-grunnlag
```

### Mock-modus autentisering

I mock-modus (`NODE_ENV=mock`) bypasses autentisering i `user-middleware.ts` og `api-client.ts`. MSW fanger opp API-kall og returnerer mock-data.
