# Testable Routes (Mock Mode)

Start the mock server with `pnpm dev:mock`.

## Aktiviteter

| Route | Behandling | Status |
| ------- | ------------ | -------- |
| [/behandling/1000001/aktivitet/6020943/alderspensjon-soknad/vurder-samboer](http://localhost:3001/behandling/1000001/aktivitet/6020943/alderspensjon-soknad/vurder-samboer) | 1000001 | Aktiv aktivitet |
| [/behandling/1000002/aktivitet/7020942/alderspensjon-soknad/kontroller-inntektsopplysninger-for-eps](http://localhost:3001/behandling/1000002/aktivitet/7020942/alderspensjon-soknad/kontroller-inntektsopplysninger-for-eps) | 1000002 | Aktiv aktivitet |
| [/behandling/3000001/aktivitet/8010003/alderspensjon-soknad/send-til-attestering](http://localhost:3001/behandling/3000001/aktivitet/8010003/alderspensjon-soknad/send-til-attestering) | 3000001 | Aktiv aktivitet |
| [/behandling/3000002/aktivitet/8020002/alderspensjon-soknad/livsvarig-afp-offentlig](http://localhost:3001/behandling/3000002/aktivitet/8020002/alderspensjon-soknad/livsvarig-afp-offentlig) | 3000002 | Aktiv aktivitet |
| [/behandling/7000101/aktivitet/7010101/oppdater-opptjening-inntekt/oppdater-grunnlag](http://localhost:3001/behandling/7000101/aktivitet/7010101/oppdater-opptjening-inntekt/oppdater-grunnlag) | 7000101 | Aktiv aktivitet |
| [/behandling/7000201/aktivitet/7010201/oppdater-opptjening-omsorg/oppdater-grunnlag](http://localhost:3001/behandling/7000201/aktivitet/7010201/oppdater-opptjening-omsorg/oppdater-grunnlag) | 7000201 | Aktiv aktivitet |
| [/behandling/7000301/aktivitet/7010301/oppdater-opptjening-dagpenger/oppdater-grunnlag](http://localhost:3001/behandling/7000301/aktivitet/7010301/oppdater-opptjening-dagpenger/oppdater-grunnlag) | 7000301 | Aktiv aktivitet |
| [/behandling/7000401/aktivitet/7010401/oppdater-opptjening-forstegangstjeneste/oppdater-grunnlag](http://localhost:3001/behandling/7000401/aktivitet/7010401/oppdater-opptjening-forstegangstjeneste/oppdater-grunnlag) | 7000401 | Aktiv aktivitet |

## Attestering

| Route | Behandling | `aldeBehandlingStatus` |
| ------- | ------------ | ------------------------ |
| [/behandling/6359437](http://localhost:3001/behandling/6359437) | 6359437 | VENTER_ATTESTERING |
| [/behandling/7000102/attestering](http://localhost:3001/behandling/7000102/attestering) | 7000102 | VENTER_ATTESTERING |
| [/behandling/7000202/attestering](http://localhost:3001/behandling/7000202/attestering) | 7000202 | VENTER_ATTESTERING |
| [/behandling/7000302/attestering](http://localhost:3001/behandling/7000302/attestering) | 7000302 | VENTER_ATTESTERING |
| [/behandling/7000402/attestering](http://localhost:3001/behandling/7000402/attestering) | 7000402 | VENTER_ATTESTERING |

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
| `behandling-5000001.json` | 5000001 | VENTER_MASKINELL |
| `behandling-6359437.json` | 6359437 | VENTER_ATTESTERING |
| `behandling-7000101.json` | 7000101 | VENTER_SAKSBEHANDLER (inntekt) |
| `behandling-7000102.json` | 7000102 | VENTER_ATTESTERING (inntekt) |
| `behandling-7000201.json` | 7000201 | VENTER_SAKSBEHANDLER (omsorg) |
| `behandling-7000202.json` | 7000202 | VENTER_ATTESTERING (omsorg) |
| `behandling-7000301.json` | 7000301 | VENTER_SAKSBEHANDLER (dagpenger) |
| `behandling-7000302.json` | 7000302 | VENTER_ATTESTERING (dagpenger) |
| `behandling-7000401.json` | 7000401 | VENTER_SAKSBEHANDLER (førstegangstjeneste) |
| `behandling-7000402.json` | 7000402 | VENTER_ATTESTERING (førstegangstjeneste) |

## Attesteringsdata

`GET .../attesteringsdata` leser `attesteringsdata-{behandlingId}.json` hvis fila finnes.
I fila skrives `grunnlag` og `vurdering` som vanlige objekter — handleren `JSON.stringify`-er
dem slik det ekte API-et gjør. Uten fil bygges responsen dynamisk fra aktivitetene i behandlingen.
