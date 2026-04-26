# Testable Routes (Mock Mode)

Start the mock server with `npm run dev:mock`.

## Aktiviteter

| Route | Behandling | Status |
|-------|------------|--------|
| [/behandling/1000001/aktivitet/6020943/alderspensjon-soknad/vurder-samboer](http://localhost:3001/behandling/1000001/aktivitet/6020943/alderspensjon-soknad/vurder-samboer) | 1000001 | Aktiv aktivitet |
| [/behandling/1000002/aktivitet/7020942/alderspensjon-soknad/kontroller-inntektsopplysninger-for-eps](http://localhost:3001/behandling/1000002/aktivitet/7020942/alderspensjon-soknad/kontroller-inntektsopplysninger-for-eps) | 1000002 | Aktiv aktivitet |

## Attestering

| Route | Behandling | aldeBehandlingStatus |
|-------|------------|----------------------|
| [/behandling/6359437](http://localhost:3001/behandling/6359437) | 6359437 | VENTER_ATTESTERING |

## Statussider

| Route | Behandling | aldeBehandlingStatus |
|-------|------------|----------------------|
| [/behandling/2000001/venter-attestering](http://localhost:3001/behandling/2000001/venter-attestering) | 2000001 | VENTER_ATTESTERING |
| [/behandling/2000001/attestering-returnert-til-saksbehandler](http://localhost:3001/behandling/2000001/attestering-returnert-til-saksbehandler) | 2000001 | VENTER_ATTESTERING |
| [/behandling/2000002/avbrutt-automatisk](http://localhost:3001/behandling/2000002/avbrutt-automatisk) | 2000002 | AUTOMATISK_TIL_MANUELL |
| [/behandling/2000003/avbrutt-manuelt](http://localhost:3001/behandling/2000003/avbrutt-manuelt) | 2000003 | AVBRUTT_AV_BRUKER |
| [/behandling/2000004/attestert-og-iverksatt](http://localhost:3001/behandling/2000004/attestert-og-iverksatt) | 2000004 | FULLFORT |
| [/behandling/2000004/oppsummering](http://localhost:3001/behandling/2000004/oppsummering) | 2000004 | FULLFORT |

## Mock Data Files

| File | behandlingId | aldeBehandlingStatus |
|------|-------------|----------------------|
| `behandling-1000001.json` | 1000001 | UNDER_BEHANDLING |
| `behandling-1000002.json` | 1000002 | UNDER_BEHANDLING |
| `behandling-2000001.json` | 2000001 | VENTER_ATTESTERING |
| `behandling-2000002.json` | 2000002 | AUTOMATISK_TIL_MANUELL |
| `behandling-2000003.json` | 2000003 | AVBRUTT_AV_BRUKER |
| `behandling-2000004.json` | 2000004 | FULLFORT |
| `behandling-6359437.json` | 6359437 | VENTER_ATTESTERING |
