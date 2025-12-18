# Unleash Feature Flags

Simple server-side feature flags using Unleash.


## Usage

### In Loaders

```typescript
import { isFeatureEnabled } from '~/utils/unleash.server'

export async function loader({ params }: Route.LoaderArgs) {
  const showNewUI = isFeatureEnabled('show-new-ui')
  
  return { showNewUI }
}
```

### In Actions

```typescript
import { isFeatureEnabled } from '~/utils/unleash.server'

export async function action({ request }: Route.ActionArgs) {
  if (isFeatureEnabled('enhanced-validation')) {
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
