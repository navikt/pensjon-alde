import { expect, type Locator, type Page, type Request, test } from '@playwright/test'

const SKJEMA = '/behandling/1000199/aktivitet/7021999/oppdater-opptjening-forstegangstjeneste/oppdater-forstegangstjeneste'
const SKJEMA_UTEN_TJENESTE =
  '/behandling/1000197/aktivitet/7021996/oppdater-opptjening-forstegangstjeneste/oppdater-forstegangstjeneste'
const ATTESTERING = '/behandling/1000198/attestering'

// React attaches __reactProps$ to DOM nodes on hydration. Interagerer vi før det,
// endres DOM uten at React-state oppdateres.
async function goto(page: Page, url: string) {
  await page.goto(url)
  await page.waitForFunction(() => {
    const root = document.querySelector('main')
    return !!root && Object.keys(root).some(key => key.startsWith('__reactProps$'))
  })
}

const tjenesteTabell = (page: Page) => page.getByRole('table', { name: 'Førstegangstjeneste' })
const periodeTabell = (page: Page) => page.getByRole('table', { name: 'Perioder' })
const periodeFra = (page: Page, dato: string) => periodeTabell(page).getByRole('row').filter({ hasText: dato })
const redigerbarPeriode = (page: Page, fom: string) =>
  periodeTabell(page)
    .getByRole('row')
    .filter({ has: page.getByRole('button', { name: `Slett periode fra ${fom}` }) })
const nyPeriode = (page: Page) =>
  periodeTabell(page)
    .getByRole('row')
    .filter({ has: page.getByText('Ny', { exact: true }) })
const dato = (rad: Locator, felt: string) => rad.getByRole('textbox', { name: felt, exact: true })

function payloadFra(request: Request) {
  return JSON.parse(new URLSearchParams(request.postData() ?? '').get('payload') ?? 'null')
}

test.describe('oppdater opptjening – førstegangstjeneste', () => {
  test.describe.configure({ mode: 'serial' })

  test('viser førstegangstjenesten fra POPP med tekstknapper og uten backend-styrte felt', async ({ page }) => {
    await goto(page, SKJEMA)

    await expect(page.getByRole('main').getByRole('heading', { name: 'Oppdater førstegangstjeneste' })).toBeVisible()
    await expect(tjenesteTabell(page).getByRole('row').nth(1)).toContainText('04.01.1982')
    await expect(periodeTabell(page).getByRole('row')).toHaveCount(4)
    for (const tabell of [tjenesteTabell(page), periodeTabell(page)]) {
      await expect(tabell.getByRole('columnheader', { name: 'Kilde' })).toHaveCount(0)
      await expect(tabell.getByRole('columnheader', { name: 'Rapporttype' })).toHaveCount(0)
    }
    await expect(page.getByRole('button', { name: 'Endre førstegangstjeneste' })).toHaveText('Endre')
    await expect(page.getByRole('button', { name: 'Slett periode fra 01.06.1982' })).toHaveText('Slett')
    await expect(page.getByText('Ingen endringer', { exact: true })).toBeVisible()
  })

  test('endrer dimittering, viser tidligere verdi og kan angres', async ({ page }) => {
    await goto(page, SKJEMA)
    const rad = tjenesteTabell(page).getByRole('row').nth(1)

    await page.getByRole('button', { name: 'Endre førstegangstjeneste' }).click()
    await dato(rad, 'Dimittering').fill('20.12.1982')
    await page.getByRole('button', { name: 'Ferdig førstegangstjeneste' }).click()

    await expect(rad.getByText('Endret', { exact: true })).toBeVisible()
    await expect(rad.getByText('Tidligere: 17.12.1982')).toBeVisible()
    await expect(page.getByText('Dimittering: 17.12.1982 → 20.12.1982')).toBeVisible()

    await page.getByRole('button', { name: 'Angre førstegangstjeneste' }).click()
    await expect(page.getByText('Ingen endringer', { exact: true })).toBeVisible()
    await expect(rad).toContainText('17.12.1982')
  })

  test('sletter hele førstegangstjenesten og lar den gjenopprettes med endringene', async ({ page }) => {
    await goto(page, SKJEMA)
    await page.getByRole('button', { name: 'Endre periode fra 15.06.1982' }).click()
    await dato(redigerbarPeriode(page, '15.06.1982'), 'Til og med').fill('20.12.1982')
    await page.getByRole('button', { name: 'Ferdig periode fra 15.06.1982' }).click()
    const endring = page.getByText('Til og med: 17.12.1982 → 20.12.1982')
    await expect(endring).toBeVisible()

    await page.getByRole('button', { name: 'Slett førstegangstjeneste' }).click()
    await expect(page.getByRole('main').getByText('Slettet', { exact: true })).toHaveCount(4)
    await expect(page.getByText('Slettede linjer (4)')).toBeVisible()
    await expect(periodeFra(page, '15.06.1982')).toContainText('17.12.1982')
    await expect(endring).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Legg til periode' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Slett periode/ })).toHaveCount(0)

    await page.getByRole('button', { name: 'Gjenopprett førstegangstjeneste' }).click()
    await expect(endring).toBeVisible()
  })

  test('viser ikke feil før brukeren forlater feltet eller prøver å lagre', async ({ page }) => {
    await goto(page, SKJEMA)

    await page.getByRole('button', { name: 'Legg til periode' }).click()
    const rad = nyPeriode(page)
    await expect(rad).toHaveCount(1)
    await expect(page.getByText('Oppgi en gyldig fra og med-dato.')).toBeHidden()

    await dato(rad, 'Fra og med').focus()
    await dato(rad, 'Fra og med').blur()
    await expect(page.getByText('Oppgi en gyldig fra og med-dato.')).toBeVisible()
    await expect(dato(rad, 'Fra og med')).toHaveAttribute('aria-invalid', 'true')
    await expect(dato(rad, 'Til og med')).not.toHaveAttribute('aria-invalid', 'true')
  })

  test('markerer feltene som er feil når brukeren prøver å lagre', async ({ page }) => {
    await goto(page, SKJEMA)
    const innsendinger: Request[] = []
    page.on('request', request => {
      if (request.method() === 'POST') innsendinger.push(request)
    })

    await page.getByRole('button', { name: 'Legg til periode' }).click()
    const rad = nyPeriode(page)
    await dato(rad, 'Fra og med').fill('20.06.1982')
    await dato(rad, 'Til og med').fill('10.06.1982')
    await page.getByRole('button', { name: 'Lagre og gå videre' }).click()

    await expect(dato(rad, 'Fra og med')).toHaveAttribute('aria-invalid', 'true')
    await expect(dato(rad, 'Til og med')).toHaveAttribute('aria-invalid', 'true')
    await expect(rad.getByRole('combobox', { name: 'Periodetype' })).not.toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('Fra og med-dato kan ikke være etter til og med-dato.')).toBeVisible()
    await expect(page.getByText('Rett feilene i tabellen før du lagrer.')).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`${SKJEMA}$`))
    expect(innsendinger).toHaveLength(0)
  })

  test('krever minst én periode når førstegangstjenesten skal lagres', async ({ page }) => {
    await goto(page, SKJEMA)
    for (const fom of ['04.01.1982', '01.06.1982', '15.06.1982']) {
      await page.getByRole('button', { name: `Slett periode fra ${fom}` }).click()
    }
    await page.getByRole('button', { name: 'Lagre og gå videre' }).click()

    await expect(page.getByText('Legg til minst én periode, eller slett hele førstegangstjenesten.')).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`${SKJEMA}$`))
  })

  test('lagrer hele førstegangstjenesten og sender den til attestering', async ({ page }) => {
    await goto(page, SKJEMA)
    await page.getByRole('button', { name: 'Endre førstegangstjeneste' }).click()
    await dato(tjenesteTabell(page).getByRole('row').nth(1), 'Dimittering').fill('20.12.1982')
    const rad = redigerbarPeriode(page, '15.06.1982')
    await page.getByRole('button', { name: 'Endre periode fra 15.06.1982' }).click()
    await dato(rad, 'Til og med').fill('20.12.1982')
    await page.getByRole('button', { name: 'Slett periode fra 01.06.1982' }).click()

    const innsending = page.waitForRequest(request => request.method() === 'POST')
    await page.getByRole('button', { name: 'Lagre og gå videre' }).click()
    const request = await innsending

    expect(new URLSearchParams(request.postData() ?? '').has('sakId')).toBe(false)
    expect(payloadFra(request)).toEqual({
      forstegangstjenesteTilLagring: {
        tjenestestartDato: '1982-01-04',
        dimitteringDato: '1982-12-20',
        forstegangstjenestePeriodeListe: [
          { periodeType: 'NORMAL', tjenesteType: 'MIL', fomDato: '1982-01-04', tomDato: '1982-05-31' },
          { periodeType: 'NORMAL', tjenesteType: 'MIL', fomDato: '1982-06-15', tomDato: '1982-12-20' },
        ],
      },
    })
    await expect(page).toHaveURL(/\/behandling\/1000199\/attestering$/)
    await expect(page.getByText('Dimittering: 17.12.1982 → 20.12.1982')).toBeVisible()
    await expect(page.getByText('Slettede linjer (1)')).toBeVisible()

    await page.getByRole('radio', { name: 'Godkjenn', exact: true }).check()
    await page.getByRole('button', { name: 'Attester og iverksett' }).click()
    await expect(page).toHaveURL(/attestert-og-iverksatt/)
    await expect(page.getByRole('heading', { name: 'Attestert og iverksatt' })).toBeVisible()
  })

  test('ber om sletting når hele førstegangstjenesten slettes', async ({ page }) => {
    await goto(page, SKJEMA)
    await page.getByRole('button', { name: 'Slett førstegangstjeneste' }).click()

    const innsending = page.waitForRequest(request => request.method() === 'POST')
    await page.getByRole('button', { name: 'Lagre og gå videre' }).click()

    expect(payloadFra(await innsending)).toEqual({ slettForstegangstjeneste: true })
    await expect(page).toHaveURL(/\/behandling\/1000199\/attestering$/)
    await expect(page.getByText('Hele førstegangstjenesten (04.01.1982–17.12.1982) slettes')).toBeVisible()
  })
})

test.describe('oppdater opptjening – ny førstegangstjeneste', () => {
  test('registrerer førstegangstjeneste for en person som ikke har det', async ({ page }) => {
    await goto(page, SKJEMA_UTEN_TJENESTE)
    await expect(page.getByText('Ingen førstegangstjeneste registrert.')).toBeVisible()

    await page.getByRole('button', { name: 'Registrer førstegangstjeneste' }).click()
    const tjeneste = tjenesteTabell(page).getByRole('row').nth(1)
    await dato(tjeneste, 'Tjenestestart').fill('04.01.1982')
    await dato(tjeneste, 'Dimittering').fill('17.12.1982')
    const rad = nyPeriode(page)
    await rad.getByRole('combobox', { name: 'Tjenestetype' }).selectOption('SIVIL')
    await dato(rad, 'Fra og med').fill('04.01.1982')
    await dato(rad, 'Til og med').fill('17.12.1982')

    const innsending = page.waitForRequest(request => request.method() === 'POST')
    await page.getByRole('button', { name: 'Lagre og gå videre' }).click()

    expect(payloadFra(await innsending).forstegangstjenesteTilLagring).toEqual({
      tjenestestartDato: '1982-01-04',
      dimitteringDato: '1982-12-17',
      forstegangstjenestePeriodeListe: [
        { periodeType: 'NORMAL', tjenesteType: 'SIVIL', fomDato: '1982-01-04', tomDato: '1982-12-17' },
      ],
    })
    await expect(page).toHaveURL(/\/behandling\/1000197\/attestering$/)
  })

  test('viser ikke gamle feil når en avbrutt registrering startes på nytt', async ({ page }) => {
    await goto(page, SKJEMA_UTEN_TJENESTE)
    await page.getByRole('button', { name: 'Registrer førstegangstjeneste' }).click()
    const tjenestestart = dato(tjenesteTabell(page).getByRole('row').nth(1), 'Tjenestestart')
    await tjenestestart.focus()
    await tjenestestart.blur()
    await expect(tjenestestart).toHaveAttribute('aria-invalid', 'true')

    await page.getByRole('button', { name: 'Slett førstegangstjeneste' }).click()
    await expect(page.getByText('Ingen førstegangstjeneste registrert.')).toBeVisible()
    await page.getByRole('button', { name: 'Registrer førstegangstjeneste' }).click()
    await expect(dato(tjenesteTabell(page).getByRole('row').nth(1), 'Tjenestestart')).not.toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })
})

test.describe('oppdater opptjening – førstegangstjeneste attestering', () => {
  test('viser endringene saksbehandler har gjort', async ({ page }) => {
    await goto(page, ATTESTERING)
    const main = page.getByRole('main')

    await expect(main.getByRole('heading', { name: 'Oppgaven er til attestering' })).toBeVisible()
    await expect(main.getByRole('heading', { name: 'Oppdater førstegangstjeneste' })).toBeVisible()
    await expect(tjenesteTabell(page).getByText('Tidligere: 17.12.1982')).toBeVisible()
    await expect(periodeFra(page, '01.06.1982').getByText('Slettet', { exact: true })).toBeVisible()
    await expect(periodeFra(page, '15.06.1982').getByText('Endret', { exact: true })).toBeVisible()
    await expect(periodeFra(page, '03.06.1982').getByText('Ny', { exact: true })).toBeVisible()
    await expect(periodeFra(page, '04.01.1982').getByText(/Endret|Ny|Slettet/)).toHaveCount(0)
    await expect(main.getByRole('textbox', { name: 'Begrunnelse' })).toHaveValue(
      'Dimitteringsdatoen er rettet etter dokumentasjon fra Forsvaret, og permisjonen startet 3. juni.',
    )
    await expect(main.getByRole('button', { name: /^(Endre|Slett)/ })).toHaveCount(0)
  })
})
