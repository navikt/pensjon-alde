# Testable Routes (Mock Mode)

Start the mock server with `pnpm dev:mock`.

## Aktiviteter

| Route | Behandling | Status |
| ------- | ------------ | -------- |
| [/behandling/1000001/aktivitet/6020943/alderspensjon-soknad/vurder-samboer](http://localhost:3001/behandling/1000001/aktivitet/6020943/alderspensjon-soknad/vurder-samboer) | 1000001 | Aktiv aktivitet |
| [/behandling/1000002/aktivitet/7020942/alderspensjon-soknad/kontroller-inntektsopplysninger-for-eps](http://localhost:3001/behandling/1000002/aktivitet/7020942/alderspensjon-soknad/kontroller-inntektsopplysninger-for-eps) | 1000002 | Aktiv aktivitet |
| [/behandling/3000001/aktivitet/8010003/alderspensjon-soknad/send-til-attestering](http://localhost:3001/behandling/3000001/aktivitet/8010003/alderspensjon-soknad/send-til-attestering) | 3000001 | Aktiv aktivitet |
| [/behandling/3000002/aktivitet/8020002/alderspensjon-soknad/livsvarig-afp-offentlig](http://localhost:3001/behandling/3000002/aktivitet/8020002/alderspensjon-soknad/livsvarig-afp-offentlig) | 3000002 | Aktiv aktivitet |
| [/behandling/5000001/aktivitet/5020001/oppdater-opptjeningsgrunnlag/oppdater-grunnlag](http://localhost:3001/behandling/5000001/aktivitet/5020001/oppdater-opptjeningsgrunnlag/oppdater-grunnlag) | 5000001 | Aktiv aktivitet |

## Attestering

| Route | Behandling | `aldeBehandlingStatus` |
| ------- | ------------ | ------------------------ |
| [/behandling/6359437](http://localhost:3001/behandling/6359437) | 6359437 | VENTER_ATTESTERING |
| [/behandling/5000002/attestering](http://localhost:3001/behandling/5000002/attestering) | 5000002 | VENTER_ATTESTERING |

## Statussider

| Route | Behandling | `aldeBehandlingStatus` |
| ------- | ------------ | ------------------------ |
| [/behandling/2000001/venter-attestering](http://localhost:3001/behandling/2000001/venter-attestering) | 2000001 | VENTER_ATTESTERING |
| [/behandling/2000001/attestering-returnert-til-saksbehandler](http://localhost:3001/behandling/2000001/attestering-returnert-til-saksbehandler) | 2000001 | VENTER_ATTESTERING |
| [/behandling/2000002/avbrutt-automatisk](http://localhost:3001/behandling/2000002/avbrutt-automatisk) | 2000002 | AUTOMATISK_TIL_MANUELL |
| [/behandling/2000003/avbrutt-manuelt](http://localhost:3001/behandling/2000003/avbrutt-manuelt) | 2000003 | AVBRUTT_AV_BRUKER |
| [/behandling/2000004/attestert-og-iverksatt](http://localhost:3001/behandling/2000004/attestert-og-iverksatt) | 2000004 | FULLFORT |
| [/behandling/2000004/oppsummering](http://localhost:3001/behandling/2000004/oppsummering) | 2000004 | FULLFORT |

## Mock Data Files

| Fil | Behandling | `aldeBehandlingStatus` |
| ----- | ------------ | ------------------------ |
| `behandling-1000001.json` | 1000001 | UNDER_BEHANDLING |
| `behandling-1000002.json` | 1000002 | UNDER_BEHANDLING |
| `behandling-2000001.json` | 2000001 | VENTER_ATTESTERING |
| `behandling-2000002.json` | 2000002 | AUTOMATISK_TIL_MANUELL |
| `behandling-2000003.json` | 2000003 | AVBRUTT_AV_BRUKER |
| `behandling-2000004.json` | 2000004 | FULLFORT |
| `behandling-3000001.json` | 3000001 | UNDER_BEHANDLING |
| `behandling-3000002.json` | 3000002 | UNDER_BEHANDLING |
| `behandling-5000001.json` | 5000001 | VENTER_SAKSBEHANDLER |
| `behandling-5000002.json` | 5000002 | VENTER_ATTESTERING |
| `behandling-6359437.json` | 6359437 | VENTER_ATTESTERING |

## Attesteringsdata

`GET .../attesteringsdata` leser `attesteringsdata-{behandlingId}.json` hvis fila finnes.
I fila skrives `grunnlag` og `vurdering` som vanlige objekter — handleren `JSON.stringify`-er
dem slik det ekte API-et gjør. Uten fil bygges responsen dynamisk fra aktivitetene i behandlingen.
