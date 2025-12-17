#!/usr/bin/env bash

env="q2"

bold=$(tput bold)
normal=$(tput sgr0)
white="[97;1m"
red="[31;1m"
endcolor="[0m"

envfile=".env"

command -v base64 >/dev/null 2>&1 || { echo -e >&2 "${red}Du må installere installere base64 (brew install base64 on macOS)${endcolor}"; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo -e >&2 "${red}Du må installere kubectl (https://docs.nais.io/operate/how-to/command-line-access/)${endcolor}"; exit 1; }
command -v gcloud >/dev/null 2>&1 || { echo -e >&2 "${red}Du må installere gcloud (https://docs.nais.io/operate/how-to/command-line-access/)${endcolor}"; exit 1; }

if command -v nais >& /dev/null; then
  DISCONNECT_STATUS=$(nais device status | grep -c Disconnected)

  if [ $DISCONNECT_STATUS -eq 1 ]; then
    read -p "Du er ikke koblet til med naisdevice. Vil du koble til? (J/n) " -n 1 -r -s
    echo
    if [[ $REPLY = "" || $REPLY =~ ^[YyjJ]$ ]]; then
      nais device connect
    else
      echo -e "${red}Du må være koblet til med naisdevice, avslutter${endcolor}"
      exit 1
    fi
  fi
fi

gcloud auth print-access-token >& /dev/null || (
  read -p "Inlogging i GCP er utløpt. Vil du autentisere på nytt? (J/n) " -n 1 -r -s
  echo
  if [[ $REPLY == "" || $REPLY =~ ^[YyjJ]$ ]]; then
    gcloud auth login
  else
    echo -e "${red}Du må ha en gyldig innlogging i GCP. Du kan logge inn med 'gcloud auth login', avslutter${endcolor}"
    exit 1
  fi
) || exit 1

function fetch_kubernetes_secrets {
    local type=$1
    local context=$2
    local namespace=$3
    local secret=$4
    local mode=$5
    local A=("$@")

    echo -n -e "\t- $type "

    local context_namespace_secrets_value=$(kubectl --context="$context" -n "$namespace" get secrets)
    local secret_name=$(echo "$context_namespace_secrets_value" | grep "$secret" | awk '{print $1}')

    if [[ "$mode" == "strict" ]]; then
        local secret_name=$(echo "$context_namespace_secrets_value" | grep "$secret" | awk '{print $1}')
    else
        local secret_name=$(echo "$context_namespace_secrets_value" | grep "$secret" | awk '{print $1}' | sort | tail -1)
    fi

    if [[ $secret_name == *$'\n'* ]]; then
       echo
       echo "Fant følgende hemmeligheter som samsvarte med søkestrengen \"$secret\". Støtter kun en hemmelighet"
       echo $secret_name
       exit 1
    fi

    local secret_response=$(kubectl --context="$context" -n "$namespace" get secret "$secret_name" -o json)

    for name in "${A[@]:5}"
    do
        {
          echo -n "$name='"
          echo "$secret_response" | jq -j ".data[\"$name\"]" | base64 --decode |  tr -d '\n'
          echo "'"
        } >> ${envfile}
    done

    echo -e "${bold}${white}✔${endcolor}${normal}"
}

rm -f ${envfile}
touch ${envfile}

echo

echo -e "${bold}Henter secrets fra Kubernetes${normal}"

fetch_kubernetes_secrets "AzureAD" "dev-gcp" "pensjon-saksbehandling" "azure-pensjon-alde-$env" "nonstrict" \
  "AZURE_APP_CLIENT_ID" \
  "AZURE_APP_CLIENT_SECRET" \
  "AZURE_APP_TENANT_ID" \
  "AZURE_OPENID_CONFIG_ISSUER" \
  "AZURE_OPENID_CONFIG_TOKEN_ENDPOINT" \
  "UNLEASH_SERVER_API_TOKEN" \
  "UNLEASH_SERVER_API_URL"

{
  echo AZURE_CALLBACK_URL="'http://localhost:3001/auth/callback'"
  echo IS_LOCAL_ENV="'true'"
  echo PEN_SCOPE="'api://dev-fss.pensjon-q2.pensjon-pen-q2/.default'"
  echo PEN_URL="'http://localhost:8089'"
  echo PSAK_SAK_URL_TEMPLATE='http://localhost:9080/psak/sak/sakId={sakId}'
  echo PSAK_OPPGAVEOVERSIKT='http://localhost:9080/psak/springapi/redirect/oppgave/oppgaveliste'
  echo MODIA_PERSONOVERSIKT='https://modiapersonoversikt.ansatt.dev.nav.no/person/{fnr}'
  echo VERDANDE_BEHANDLING_URL="'http://localhost:3000/behandling/{behandlingId}'"
  echo VERDANDE_AKTIVITET_URL="'http://localhost:3000/behandling/{behandlingId}/aktivitet/{aktivitetId}'"
  echo VERDANDE_LINKS_ENABLED="'true'"
  echo TELEMETRY_URL="https://telemetry.ekstern.dev.nav.no/collect"
  echo TELEMETRY_ENVIRONMENT="local"
} >> ${envfile}

echo

echo "${bold}Hentet hemmeligheter og oppdatert .env fil ${normal}"
