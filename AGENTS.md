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
- Some aktiviteter are backend-only (no `handlerName`)
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

Create folders matching EXACTLY the handler names:

```sh
app/behandlinger/alderspensjon-soknad/vurder-samboer/
```

### Step 3: Create NameOfActivity.tsx

Create capitalized name of activity and containing loader, action and component (as react-router 7). Just empty boilerplate action and loader if nothing else is specified.

### Step 4: Create index.tsx

Export your component, loader, and action from index.tsx, this will be the import path.

### Step 5: Implement Component

Check existing implementations in `app/behandlinger/alderspensjon-soknad/vurder-samboer/` for reference on:

- How to structure a component with loader and action
- How to use React Router 7 patterns
- How to fetch data with the behandlingsId parameter

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
npm test          # Run tests in watch mode
npm run test:ci   # Run tests once (use this after editing tests or tested files)
npm run typecheck # Type checking
npm run dev:mock  # Development with mock API
```

### IMPORTANT: Run Tests After Changes

**ALWAYS run `npm run test:ci` after:**
- Creating or modifying test files
- Editing files that have associated tests
- Making changes to core functionality

This ensures your changes don't break existing tests and that new tests actually run and pass.

### IMPORTANT: Check Diagnostics Before Finishing

**ALWAYS check for TypeScript/linting errors before declaring work complete:**
- Use the diagnostics tool to check files you've edited
- Fix all red lines and type errors
- Even if tests pass, diagnostics might reveal issues
- Don't assume - verify!
- Check BOTH the implementation file AND test file

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

- Run `npm run typecheck` to generate React Router types
- Import types from `./+types`

## API Endpoints

- `GET /api/saksbehandling/alde/behandling/{behandlingId}` - Get behandling with aktiviteter
- `POST /api/saksbehandling/alder/forstegangsbehandling/{behandlingId}/{endpoint}` - Submit aktivitet decisions

## Strangler Pattern Context

This app gradually replaces a legacy system. New aktiviteter are migrated incrementally. When the backend adds new aktivitet types with handler names, you implement the UI in the corresponding folder.

## Remember

1. **Work in `app/behandlinger/`** unless told otherwise
2. **Use Aksel components** - no plain HTML when Aksel has an equivalent
3. **No code comments** unless requested
4. **Folder names ARE handler names** - no configuration needed

The folder structure IS the configuration. Keep it simple, keep it working!
