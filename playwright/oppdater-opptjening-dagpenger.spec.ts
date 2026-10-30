import { expect, type Locator, type Page, type Request, test } from '@playwright/test'

const SKJEMA = '/behandling/1000099/aktivitet/7020999/oppdater-opptjening-dagpenger/oppdater-dagpenger'
const ATTESTERING = '/behandling/1000098/attestering'

// React attaches __reactProps$ to DOM nodes on hydration. Interagerer vi før det,
// endres DOM uten at React-state oppdateres.
async function goto(page: Page, url: string) {
  await page.goto(url)
  await page.waitForFunction(() => {
    const root = document.querySelector('main')
    return !!root && Object.keys(root).some(key => key.startsWith('__reactProps$'))
  })
}

const tabell = (page: Page) => page.getByRole('table', { name: 'Dagpenger' })
const radForAr = (page: Page, ar: string) => tabell(page).getByRole('row').filter({ hasText: ar })
const nyRad = (page: Page) => tabell(page).getByRole('row').filter({ has: page.getByText('Ny', { exact: true }) })
const belop = (rad: Locator, felt: string) => rad.getByRole('spinbutton', { name: felt, exact: true })

function payloadFra(request: Request) {
  return JSON.parse(new URLSearchParams(request.postData() ?? '').get('payload') ?? 'null')
}

test.describe('oppdater opptjening – dagpenger', () => {
  test.describe.configure({ mode: 'serial' })

  test('viser dagpengene fra POPP med tekstknapper og uten backend-styrte felt', async ({ page }) => {
    await goto(page, SKJEMA)
    const main = page.getByRole('main')

    await expect(main.getByRole('heading', { name: 'Oppdater dagpenger' })).toBeVisible()
    await expect(tabell(page).getByRole('row')).toHaveCount(3)
    await expect(tabell(page).getByRole('columnheader', { name: 'Kilde' })).toHaveCount(0)
    await expect(tabell(page).getByRole('columnheader', { name: 'Rapporttype' })).toHaveCount(0)

    const rad = radForAr(page, '2023')
    await expect(rad.getByRole('button', { name: 'Endre Dagpenger 2023' })).toHaveText('Endre')
    await expect(rad.getByRole('button', { name: 'Slett Dagpenger 2023' })).toHaveText('Slett')
    await expect(page.getByText('Ingen endringer', { exact: true })).toBeVisible()
  })

  test('endrer et beløp, viser tidligere verdi og kan angres', async ({ page }) => {
    await goto(page, SKJEMA)
    const rad = radForAr(page, '2023')

    await rad.getByRole('button', { name: 'Endre Dagpenger 2023' }).click()
    await belop(rad, 'Utbetalte dagpenger').fill('130000')
    await rad.getByRole('button', { name: 'Ferdig Dagpenger 2023' }).click()

    await expect(rad.getByText('Endret', { exact: true })).toBeVisible()
    await expect(rad.getByText('Tidligere: 120 000')).toBeVisible()
    await expect(page.getByText('Utbetalte dagpenger: 120000 → 130000')).toBeVisible()

    await rad.getByRole('button', { name: 'Angre Dagpenger 2023' }).click()
    await expect(page.getByText('Ingen endringer', { exact: true })).toBeVisible()
  })

  test('tømmer og låser uavkortet grunnlag og ferietillegg for fiskere og fangstmenn', async ({ page }) => {
    await goto(page, SKJEMA)
    const rad = radForAr(page, '2023')
    await rad.getByRole('button', { name: 'Endre Dagpenger 2023' }).click()
    const type = rad.getByRole('combobox', { name: 'Type' })

    await type.selectOption('DP_FF')
    for (const felt of ['Uavkortet dagpengegrunnlag', 'Ferietillegg']) {
      await expect(belop(rad, felt)).toBeDisabled()
      await expect(belop(rad, felt)).toHaveValue('')
    }
    await expect(belop(rad, 'Utbetalte dagpenger')).toBeEnabled()

    await type.selectOption('DP')
    await expect(belop(rad, 'Uavkortet dagpengegrunnlag')).toHaveValue('300000')
    await expect(belop(rad, 'Ferietillegg')).toHaveValue('12000')
    await expect(belop(rad, 'Ferietillegg')).toBeEnabled()
    await expect(page.getByText('Ingen endringer', { exact: true })).toBeVisible()
  })

  test('viser ikke feil før brukeren forlater feltet eller prøver å lagre', async ({ page }) => {
    await goto(page, SKJEMA)

    await page.getByRole('button', { name: 'Legg til dagpenger' }).click()
    const rad = nyRad(page)
    await expect(rad).toHaveCount(1)
    await expect(page.getByText('Fyll inn utbetalte dagpenger.')).toBeHidden()

    await belop(rad, 'Utbetalte dagpenger').focus()
    await belop(rad, 'Utbetalte dagpenger').blur()
    await expect(page.getByText('Fyll inn utbetalte dagpenger.')).toBeVisible()
    await expect(belop(rad, 'Utbetalte dagpenger')).toHaveAttribute('aria-invalid', 'true')
    await expect(belop(rad, 'Barnetillegg')).not.toHaveAttribute('aria-invalid', 'true')
  })

  test('markerer feltene som er feil når brukeren prøver å lagre', async ({ page }) => {
    await goto(page, SKJEMA)
    const lagret = page.waitForRequest(request => request.method() === 'POST', { timeout: 1000 }).catch(() => null)

    await page.getByRole('button', { name: 'Legg til dagpenger' }).click()
    const rad = nyRad(page)
    await rad.getByRole('combobox', { name: 'Type' }).selectOption('DP')
    await rad.getByRole('spinbutton', { name: 'År', exact: true }).fill('2023')
    await page.getByRole('button', { name: 'Lagre og gå videre' }).click()

    await expect(rad.getByRole('spinbutton', { name: 'År', exact: true })).toHaveAttribute('aria-invalid', 'true')
    await expect(rad.getByRole('combobox', { name: 'Type' })).toHaveAttribute('aria-invalid', 'true')
    await expect(belop(rad, 'Utbetalte dagpenger')).toHaveAttribute('aria-invalid', 'true')
    await expect(belop(rad, 'Barnetillegg')).not.toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('Det finnes allerede dagpenger med samme år og type.')).toBeVisible()
    await expect(page.getByText('Rett feilene i tabellen før du lagrer.')).toBeVisible()
    expect(await lagret).toBeNull()
  })

  test('sletter en linje og lar den gjenopprettes', async ({ page }) => {
    await goto(page, SKJEMA)
    const rad = radForAr(page, '2024')

    await rad.getByRole('button', { name: 'Slett Dagpenger 2024' }).click()
    await expect(rad.getByText('Slettet', { exact: true })).toBeVisible()
    await expect(page.getByText('Slettede linjer (1)')).toBeVisible()

    await rad.getByRole('button', { name: 'Gjenopprett Dagpenger 2024' }).click()
    await expect(page.getByText('Ingen endringer', { exact: true })).toBeVisible()
  })

  test('lagrer typebytte som ny linje og sletting av den gamle', async ({ page }) => {
    await goto(page, SKJEMA)
    const rad = radForAr(page, '2024')
    await rad.getByRole('button', { name: 'Endre Dagpenger 2024' }).click()
    await rad.getByRole('combobox', { name: 'Type' }).selectOption('DP_FF')

    const innsending = page.waitForRequest(request => request.method() === 'POST')
    await page.getByRole('button', { name: 'Lagre og gå videre' }).click()
    const request = await innsending

    expect(new URLSearchParams(request.postData() ?? '').has('sakId')).toBe(false)
    expect(payloadFra(request)).toEqual({
      dagpengerTilLagring: [
        {
          ar: 2024,
          dagpengerType: 'DP_FF',
          utbetalteDagpenger: 150000,
          barnetillegg: 0,
          uavkortetDagpengegrunnlag: null,
          ferietillegg: null,
        },
      ],
      dagpengerTilSletting: [{ ar: 2024, dagpengerType: 'DP' }],
    })
    await expect(page).toHaveURL(/\/behandling\/1000099\/attestering$/)
    await expect(page.getByText('Dagpenger fiskere og fangstmenn (2024)')).toBeVisible()

    await page.getByRole('radio', { name: 'Godkjenn', exact: true }).check()
    await page.getByRole('button', { name: 'Attester og iverksett' }).click()
    await expect(page).toHaveURL(/attestert-og-iverksatt/)
    await expect(page.getByRole('heading', { name: 'Attestert og iverksatt' })).toBeVisible()
  })
})

test.describe('oppdater opptjening – dagpenger attestering', () => {
  test('viser endringene saksbehandler har gjort', async ({ page }) => {
    await goto(page, ATTESTERING)
    const main = page.getByRole('main')

    await expect(main.getByRole('heading', { name: 'Oppgaven er til attestering' })).toBeVisible()
    await expect(main.getByRole('heading', { name: 'Oppdater dagpenger' })).toBeVisible()
    await expect(tabell(page).getByRole('button')).toHaveCount(0)

    await expect(radForAr(page, '2022').getByText('Slettet', { exact: true })).toBeVisible()
    await expect(radForAr(page, '2023').getByText('Tidligere: 120 000')).toBeVisible()
    await expect(radForAr(page, '2023').getByText('Tidligere: 12 000')).toBeVisible()

    const fiskere = tabell(page).getByRole('row').filter({ hasText: 'Dagpenger fiskere og fangstmenn' })
    await expect(fiskere.getByText('Ny', { exact: true })).toBeVisible()
    await expect(fiskere.getByRole('cell', { name: '–' })).toHaveCount(2)

    await expect(page.getByText('Nye linjer (2)')).toBeVisible()
    await expect(page.getByText('Endrede linjer (1)')).toBeVisible()
    await expect(page.getByText('Slettede linjer (2)')).toBeVisible()
    await expect(main.getByRole('textbox', { name: /Begrunnelse/ })).toHaveValue(
      'Dagpengene for 2024 gjelder fiske, og 2022 er registrert feil.',
    )
  })
})
