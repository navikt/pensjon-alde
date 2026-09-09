#!/usr/bin/env bash

set -e
set -o pipefail

team=pensjon-saksbehandling
app=pensjon-alde-q2
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$script_dir"

source "$script_dir/scripts/fetch_secret_utils.sh"

# Kjør init hvis scriptet kjøres som ett standalone script.
if [[ "${FETCH_SECRETS_FROM_ROOT:-}" != "true" ]]; then
    init_fetch_secrets
fi

secrets_file="$repo_root/.env"
create_secret_file "$secrets_file"

echo
echo -e "${FORMAT_BOLD}Henter secrets for Alde${FORMAT_RESET}"

start_step "AzureAD"
azure_secret_name=$(secret_name_from_env "$app" "$team" "dev-gcp" "AZURE_APP_CLIENT_ID") || exit 1
fetch_nais_secret "$team" "dev-gcp" "$azure_secret_name" write_env "$secrets_file" \
  "AZURE_APP_CLIENT_ID" \
  "AZURE_APP_CLIENT_SECRET" \
  "AZURE_APP_TENANT_ID" \
  "AZURE_OPENID_CONFIG_ISSUER" \
  "AZURE_OPENID_CONFIG_JWKS_URI" \
  "AZURE_OPENID_CONFIG_TOKEN_ENDPOINT"
{
  echo AZURE_CALLBACK_URL="'http://localhost:9081/auth/callback'"
} >> "$secrets_file"
complete_step

start_step "Unleash"
fetch_nais_secret "pensjon-saksbehandling" "dev-gcp" "alde-unleash-api-token" write_env "$secrets_file" \
    "UNLEASH_SERVER_API_TOKEN" \
    "UNLEASH_SERVER_API_URL" \
    "UNLEASH_SERVER_API_ENV"
complete_step

start_step "PidEncryptionKey"
fetch_nais_secret "$team" "dev-gcp" "psak-pid-encryption-key" write_env "$secrets_file" \
    "PSAK_PID_ENCRYPTION_KEY"
complete_step

{
  echo AZURE_CALLBACK_URL="'http://localhost:3001/auth/callback'"
  echo IS_LOCAL_ENV="'true'"
  echo PEN_SCOPE="'api://dev-fss.pensjon-q2.pensjon-pen-q2/.default'"
  echo PEN_URL="'http://localhost:8089'"
  echo PSAK_SAK_URL_TEMPLATE='http://localhost:9080/psak/sak/sakId={sakId}'
  echo PSAK_OVERSIKT_URL_TEMPLATE='http://localhost:9080/pensjonsoversikt/person/{pid}'
  echo PSAK_OPPGAVEOVERSIKT='http://localhost:9080/psak/springapi/redirect/oppgave/oppgaveliste'
  echo PENNY_JOURNALPOST_URL_TEMPLATE='https://pensjon-penny-q2.{subdomain}.dev.nav.no/psak/api/bff/dokument/dokumentoversikt/dokument/{journalpostId}.pdf'
  echo MODIA_PERSONOVERSIKT='https://modiapersonoversikt.ansatt.dev.nav.no/person/{fnr}'
  echo VERDANDE_BEHANDLING_URL="'http://localhost:3000/behandling/{behandlingId}'"
  echo VERDANDE_AKTIVITET_URL="'http://localhost:3000/behandling/{behandlingId}/aktivitet/{aktivitetId}'"
  echo VERDANDE_LINKS_ENABLED="'true'"
  echo TELEMETRY_URL="https://telemetry.ekstern.dev.nav.no/collect"
  echo TELEMETRY_ENVIRONMENT="local"
} >> "$secrets_file"

if [[ "${FETCH_SECRETS_FROM_ROOT:-}" != "true" ]]; then
    echo
    echo -e "${FORMAT_BOLD}Hentet hemmeligheter og oppdatert .env fil 🎉${FORMAT_RESET}"
fi
