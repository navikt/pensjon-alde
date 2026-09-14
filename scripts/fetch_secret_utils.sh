#!/usr/bin/env bash

FORMAT_BOLD=$'\033[1m'
FORMAT_RESET=$'\033[0m'
COLOR_RED=$'\033[31m'
COLOR_RESET=$'\033[0m'

function start_step {
    echo -n "   $1"
    start_spinner
}

function complete_step {
    stop_spinner
    echo -e "✅"
}

function die {
    stop_spinner
    echo >&2
    echo -e "${FORMAT_BOLD}${COLOR_RED}$*${COLOR_RESET}${FORMAT_RESET}" >&2
    echo >&2
    exit 1
}

# Oppretter en tom fil som kun eier kan lese, klar til å skrives hemmeligheter til.
function create_secret_file {
    local file=$1
    mkdir -p "$(dirname "$file")" || die "Klarte ikke opprette katalogen for $file"
    rm -f "$file" || die "Klarte ikke fjerne eksisterende $file"
    touch "$file" || die "Klarte ikke opprette $file"
    chmod 600 "$file" || die "Klarte ikke sette rettigheter på $file"
}

# Skriver NØKKEL=verdi (Java properties-format) til fil.
function write_property {
    printf '%s=%s\n' "$2" "$3" >> "$1"
}

# Skriver NØKKEL='verdi' (dotenv-format) til fil.
#
# dotenv gjør ingen escaping inne i fnutter: enkeltfnuttede verdier tas helt
# ordrett, og dobbeltfnuttede verdier får kun \n og \r oversatt. Vi velger derfor
# fnutt etter innholdet, og feiler hvis verdien ikke kan representeres.
function write_env {
    local file=$1 key=$2 value=$3

    if [[ "$value" != *"'"* ]]; then
        printf "%s='%s'\n" "$key" "$value" >> "$file"
    elif [[ "$value" != *'"'* && "$value" != *'\'* ]]; then
        printf '%s="%s"\n' "$key" "$value" >> "$file"
    else
        die "Verdien til \"$key\" inneholder både enkelt- og dobbeltfnutt (eller backslash) og kan ikke skrives trygt til .env"
    fi
}

# Verifiserer at nais CLI og jq er installert.
function check_prerequisites {
    command -v jq >/dev/null 2>&1 || die "Du må installere jq (brew install jq på macOS)"
    command -v nais >/dev/null 2>&1 || die "Du må installere nais CLI (https://doc.nais.io/operate/how-to/command-line-access/)"
}

# Sikrer at brukeren er koblet til med naisdevice.
function ensure_naisdevice_connected {
    local status
    if ! status=$(nais device status 2>&1); then
        die "Fikk ikke kontakt med naisdevice, avslutter:\n$status"
    fi

    if grep -q Disconnected <<< "$status"; then
        read -p "Du er ikke koblet til med naisdevice. Vil du koble til? (J/n) " -n 1 -r -s
        echo
        if [[ $REPLY == "" || $REPLY =~ ^[YyjJ]$ ]]; then
            nais device connect || die "Klarte ikke koble til med naisdevice, avslutter"
        else
            die "Du må være koblet til med naisdevice, avslutter"
        fi
    fi
}

# Sikrer at brukeren er innlogget i nais CLI.
function ensure_nais_logged_in {
    if ! nais auth print-access-token >/dev/null 2>&1; then
        read -p "Du er ikke innlogget i nais CLI. Vil du logge inn? (J/n) " -n 1 -r -s
        echo
        if [[ $REPLY == "" || $REPLY =~ ^[YyjJ]$ ]]; then
            nais auth login || die "Innlogging i nais CLI feilet, avslutter"
        else
            die "Du må være innlogget i nais CLI ('nais auth login'), avslutter"
        fi
    fi
}

# Genererer en tilfeldig streng med små bokstaver og tall.
function random_string {
    local length=${1:-8}
    local charset="abcdefghijklmnopqrstuvwxyz0123456789"
    local result=""
    for _ in $(seq 1 "$length"); do
        result="$result${charset:$RANDOM % ${#charset}:1}"
    done
    echo "$result"
}

# Holder styr på aktiv spinner for opprydding ved avbrudd (Ctrl+C).
spinner_pid=""
cursor_hidden=""

function hide_cursor {
    printf '\033[?25l' >&2
    cursor_hidden=true
}

function show_cursor {
    if [[ -n "$cursor_hidden" ]]; then
        printf '\033[?25h' >&2
        cursor_hidden=""
    fi
}

function start_spinner {
    [[ -z "$spinner_pid" ]] || return 0
    local chars='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    (
        exec 1>&-  # lukk stdout så kommando-substitusjon ikke venter på subshellen
        while true; do
            for (( i=0; i<${#chars}; i++ )); do
                printf '\r%s' "${chars:$i:1}" >&2
                sleep 0.08
            done
        done
    ) &
    spinner_pid=$!
}

function stop_spinner {
    if [[ -n "$spinner_pid" ]]; then
        # kill/wait feiler hvis prosessen allerede er borte, og wait returnerer
        # 143 når den ble drept. Begge er forventet og må ikke utløse set -e.
        kill "$spinner_pid" 2>/dev/null || true
        wait "$spinner_pid" 2>/dev/null || true
        printf '\r \r' >&2
        spinner_pid=""
    fi
}

function _cleanup {
    stop_spinner
    show_cursor
}
trap _cleanup EXIT

# Henter verdier fra en nais-secret (revisjonslogget) og skriver dem via en writer-funksjon.
function fetch_nais_secret {
    local secret_team=$1
    local environment=$2
    local secret_name=$3
    local writer=$4
    local file=$5
    shift 5

    local stderr_file
    stderr_file=$(mktemp)

    local secret_response
    if ! secret_response=$(nais secret get "$secret_name" --environment "$environment" --team "$secret_team" \
            --with-values --reason "Henter secrets for lokal utvikling" --output json 2>"$stderr_file"); then
        local error_output
        error_output=$(cat "$stderr_file")
        rm -f "$stderr_file"
        die "Klarte ikke hente secret \"$secret_name\" i $environment (team $secret_team):\n$error_output"
    fi
    rm -f "$stderr_file"

    if ! jq -e . >/dev/null 2>&1 <<< "$secret_response"; then
        die "Fikk ugyldig JSON tilbake for secret \"$secret_name\" i $environment (team $secret_team)"
    fi

    for pair in "$@"
    do
        local key="${pair%%:*}"
        local out="$key"
        if [[ "$pair" == *:* ]]; then
            out="${pair#*:}"
        fi

        # Skill «nøkkelen finnes ikke» fra «nøkkelen har tom verdi»; sistnevnte er lovlig.
        local found
        found=$(jq --arg k "$key" '[.data[] | select(.key == $k)] | length' <<< "$secret_response")
        if [[ "$found" == "0" ]]; then
            die "Fant ikke nøkkelen \"$key\" i secret \"$secret_name\""
        fi

        # jq -j + sentinel bevarer eventuelle linjeskift på slutten, som ellers
        # spises av kommando-substitusjonen.
        local value
        value=$(jq -j --arg k "$key" \
            '[.data[] | select(.key == $k)][0]
             | if .encoding == "BASE64" then (.value | @base64d) else .value end' \
            <<< "$secret_response"; printf 'X')
        value=${value%X}

        # Fjern linjeskift på slutten av verdien, slik at de ikke bryter opp
        # linjene i .properties/.env-filene.
        while [[ "$value" == *$'\n' || "$value" == *$'\r' ]]; do
            value=${value%?}
        done

        if [[ "$value" == *$'\n'* || "$value" == *$'\r'* ]]; then
            die "Verdien til \"$key\" i secret \"$secret_name\" inneholder linjeskift og kan ikke skrives til $file"
        fi

        "$writer" "$file" "$out" "$value"
    done
}

# Slår opp hvilken secret en gitt env-var i en app hentes fra. Feiler hvis ikke funnet.
# Merk: kjøres i kommando-substitusjon (subshell), så feilmeldinger må gå til stderr
# for at de skal nå brukeren.
function secret_name_from_env {
    local app=$1
    local team=$2
    local environment=$3
    local env_var=$4

    local app_env
    if ! app_env=$(nais app env "$app" --environment "$environment" --team "$team" --output json 2>&1); then
        die "Klarte ikke hente miljøvariabler for $app i $environment (team $team):\n$app_env"
    fi

    local name
    name=$(jq -r --arg v "$env_var" '[.[] | select(.name == $v) | .source.name] | first // empty' <<< "$app_env")

    if [[ -z "$name" ]]; then
        die "Fant ikke secret for $env_var via 'nais app env $app'"
    fi

    echo "$name"
}

# Kjører felles oppstart for secrets-scriptene
function init_fetch_secrets {
    check_prerequisites
    ensure_naisdevice_connected
    ensure_nais_logged_in
    hide_cursor
}
