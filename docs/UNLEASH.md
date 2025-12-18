# Unleash Feature Flags

Simple server-side feature flags using Unleash.

## Adding a New Feature Flag

Add your feature to `app/features.ts`:

```typescript
export const Features = {
  AFP_LIVSVARIG_MED_VURDERING: {
    featureFlag: 'pesys.alde.afp.livsvarig.vurdering',
    added: '2025-12-18',
    team: 'starte-pensjon'
  },
  YOUR_NEW_FEATURE: {
    featureFlag: 'pesys.alde.your.feature.flag',
    added: '2025-01-20',
    team: 'your-team'
  }
}
```

## Usage

### In Loaders

```typescript
import { isFeatureEnabled } from '~/utils/unleash.server'
import { Features } from '~/features'

export async function loader({ params }: Route.LoaderArgs) {
  const showNewUI = isFeatureEnabled(Features.YOUR_NEW_FEATURE)
  
  return { showNewUI }
}
```

### In Actions

```typescript
import { isFeatureEnabled } from '~/utils/unleash.server'
import { Features } from '~/features'

export async function action({ request }: Route.ActionArgs) {
  if (isFeatureEnabled(Features.YOUR_NEW_FEATURE)) {
    // Do enhanced validation
  }
  
  // Process form...
}
```

### In Components

```typescript
export default function MyComponent({ loaderData }: Route.ComponentProps) {
  const { showNewUI } = loaderData
  
  return showNewUI ? <NewUI /> : <OldUI />
}
```

## That's It

Feature flags are checked server-side only. Pass the result to your component via loader data.
