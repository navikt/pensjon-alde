# Behandlinger & Aktiviteter

This directory contains all the UI implementations for behandlinger (treatments) and their aktiviteter (activities).

## Directory Structure

```
behandlinger/
├── {behandling-handler-name}/
│   └── {aktivitet-handler-name}/
│       ├── index.tsx           # Main export file (REQUIRED)
│       ├── {Component}.tsx     # Main component implementation
│       └── types.ts            # Type definitions
```

## Important: Folder Names ARE Handler Names

The folder structure directly maps to the handler names from the API:
- **Behandling folder name** = `behandling.handlerName` from API
- **Aktivitet folder name** = `aktivitet.handlerName` from API

No configuration needed - the system automatically discovers implementations based on folder names!

## Adding a New Behandling

To add a new behandling, create a folder with the exact handler name from your API:

```
behandlinger/
└── uforepensjon-soknad/       # Must match API's behandling.handlerName
```

## Adding a New Aktivitet

1. **Create the folder structure** under the appropriate behandling using the exact handler names:

```
behandlinger/
└── alderspensjon-soknad/       # Matches behandling.handlerName
    └── vurder-uforegrad/       # Must match aktivitet.handlerName
        ├── index.tsx
        ├── VurderUforegrad.tsx
        └── types.ts
```

2. **Export from index.tsx** (no configuration needed):

```tsx
// index.tsx
export { default, action, loader } from "./VurderUforegrad";
```

3. **Implement the component** with React Router 7 patterns:

```tsx
// VurderUforegrad.tsx
import type { Route } from "./+types";

export async function loader({ params }: Route.LoaderArgs) {
  const { behandlingsId } = params;
  // Fetch data using behandlingsId
  return { /* data */ };
}

export async function action({ params, request }: Route.ActionArgs) {
  // Handle form submissions
  return { success: true };
}

export default function VurderUforegrad({ loaderData }: Route.ComponentProps) {
  // Component implementation
  return <div>...</div>;
}
```

## How It Works

### Handler Names as Composite Keys

Handler names are **only unique when combined**:
- `behandlingHandler` + `aktivitetHandler` = unique identifier
- The same aktivitet handler can exist in different behandlinger

### URL Structure

URLs maintain IDs for API access while folder names determine the implementation:
```
/behandling/{behandlingsId}/aktivitet/{aktivitetId}/{behandling-folder}/{aktivitet-folder}
```

Example:
```
/behandling/6359437/aktivitet/6020942/alderspensjon-soknad/vurder-samboer
```

### Routing Flow

1. User navigates to `/behandling/{behandlingsId}/aktivitet/{aktivitetId}`
2. System fetches behandling data from API using `behandlingsId`
3. System finds the aktivitet by `aktivitetId` in the response
4. If both `behandling.handlerName` and `aktivitet.handlerName` exist:
   - System looks for folder: `behandlinger/{handlerName}/{handlerName}/index.tsx`
   - Redirects to the specific implementation if found
5. If no implementation exists, shows "not implemented" message

### Backend-Only Aktiviteter

Some aktiviteter don't have UI implementations (handlerName is null). These run only in the backend and will show an informational message.

## Testing Your Implementation

1. Ensure your folder names **exactly match** the handler names from the API
2. Verify the component loads when navigating to an aktivitet with matching handler names
3. Test both loader (data fetching) and action (form submission) if applicable

## Dynamic Discovery

Routes are discovered automatically at build time based on folder structure. No manual route registration or configuration needed!

## Common Issues

### Implementation Not Found
- Check that folder names exactly match the `handlerName` values from API
- Handler names are case-sensitive
- Use hyphens, not underscores (e.g., `vurder-samboer` not `vurder_samboer`)

### TypeScript Errors
- Run `npm run typecheck` to generate React Router types
- Ensure you're using the correct `Route` type from `./+types`

## Strangler Pattern

This application uses the strangler pattern to gradually replace legacy systems. New behandlinger and aktiviteter can be added incrementally as they're migrated from the old system. Simply create the folder structure matching the API handler names, and the routing will work automatically!