import { expect, type Page, test } from '@playwright/test'

const SKJEMA_URL = '/behandling/5000001/aktivitet/5020001/oppdater-opptjeningsgrunnlag/oppdater-grunnlag'
const ATTESTERING_URL = '/behandling/5000002/attestering'

// React attaches __reactProps$ to DOM nodes on hydration. Interagerer vi før det,
// endres DOM uten at React-state oppdateres.
async function goto(page: Page, url: string) {
  await page.goto(url)
  await page.waitForFunction(() => {
    const root = document.querySelector('main')
    return !!root && Object.keys(root).some(key => key.startsWith('__reactProps$'))
  })
}

function collectControlledWarnings(page: Page) {
  const warnings: string[] = []
  page.on('console', message => {
    const text = message.text()
    if (text.includes('controlled input') || text.includes('uncontrolled input')) {
      warnings.push(text)
    }
  })
  return warnings
}

test.describe('oppdater-grunnlag skjema', () => {
  test('viser opptjening fra grunnlaget i alle seksjoner', async ({ page }) => {
    await goto(page, SKJEMA_URL)
    const main = page.getByRole('main')

    await expect(main.getByRole('heading', { name: 'Inntekter' })).toBeVisible()
    await expect(main.getByRole('heading', { name: 'Dagpenger' })).toBeVisible()
    await expect(main.getByRole('heading', { name: 'Omsorg' })).toBeVisible()
    await expect(main.getByRole('heading', { name: 'Førstegangstjeneste' })).toBeVisible()

    await expect(page.getByRole('combobox', { name: 'Inntektstype' })).toHaveCount(3)
    await expect(page.getByRole('textbox', { name: 'Beløp' })).toHaveCount(3)
    await expect(page.getByRole('textbox', { name: 'Ferietillegg' })).toHaveCount(1)
    await expect(page.getByRole('textbox', { name: 'FOM' })).toHaveValue('15.01.2012')
  })

  test('krever valgt sak før lagring', async ({ page }) => {
    await goto(page, SKJEMA_URL)

    const lagre = page.getByRole('button', { name: 'Lagre og gå videre' })
    await expect(lagre).toBeDisabled()
    await expect(page.getByText('Du må velge en sak før du kan lagre')).toBeVisible()

    await page.getByLabel('Sak').selectOption('23077283')

    await expect(lagre).toBeEnabled()
    await expect(page.getByText('Du må velge en sak før du kan lagre')).toBeHidden()
  })

  test('markerer endret beløp og oppsummerer endringen', async ({ page }) => {
    await goto(page, SKJEMA_URL)

    await page.getByRole('textbox', { name: 'Beløp' }).first().fill('495000')

    await expect(page.getByRole('heading', { name: 'Endringer som vil bli lagret' })).toBeVisible()
    await expect(page.getByText('Endret', { exact: true })).toHaveCount(1)
    await expect(page.getByText('Beløp: 480 000 kr → 495 000 kr')).toBeVisible()
  })

  test('markerer slettet linje og lar den gjenopprettes', async ({ page }) => {
    await goto(page, SKJEMA_URL)

    const omsorgRad = page.getByRole('row').filter({ hasText: 'Omsorg for barn under 6 år' })
    await omsorgRad.getByRole('button', { name: 'Slett' }).click()

    await expect(omsorgRad.getByText('Slettet', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Endringer som vil bli lagret' })).toBeVisible()

    await omsorgRad.getByRole('button', { name: 'Gjenopprett' }).click()
    await expect(page.getByRole('heading', { name: 'Endringer som vil bli lagret' })).toBeHidden()
  })

  test('legger til ny inntektslinje', async ({ page }) => {
    await goto(page, SKJEMA_URL)

    await page.getByRole('button', { name: 'Legg til inntektslinje' }).click()

    await expect(page.getByRole('textbox', { name: 'Beløp' })).toHaveCount(4)
    await expect(page.getByText('Ny', { exact: true })).toHaveCount(1)
  })

  test('låser skattekommune for inntektstyper med fast kommune', async ({ page }) => {
    await goto(page, SKJEMA_URL)

    const kommune = page.getByRole('textbox', { name: 'Skattekommune' }).first()
    await expect(kommune).toBeEnabled()

    await page.getByRole('combobox', { name: 'Inntektstype' }).first().selectOption('SVA_LON')

    await expect(kommune).toHaveValue('2100')
    await expect(kommune).toBeDisabled()
  })

  test('logger ingen controlled/uncontrolled-advarsler ved utfylling', async ({ page }) => {
    const warnings = collectControlledWarnings(page)

    await goto(page, SKJEMA_URL)
    await page.getByLabel('Sak').selectOption('23077283')
    await page.getByRole('textbox', { name: 'Beløp' }).first().fill('495000')
    await page.getByRole('textbox', { name: 'År' }).first().fill('2021')
    await page.getByRole('button', { name: 'Legg til dagpengelinje' }).click()
    await page.getByRole('button', { name: 'Legg til førstegangstjeneste' }).click()
    await page.getByRole('textbox', { name: 'FOM' }).last().fill('01.02.2015')

    expect(warnings).toEqual([])
  })
})

test.describe('oppdater-grunnlag attestering', () => {
  test('viser endringene attestanten skal godkjenne', async ({ page }) => {
    await goto(page, ATTESTERING_URL)

    await expect(page.getByRole('heading', { name: 'Oppgaven er til attestering' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Oppsummering av endringene' })).toBeVisible()
    await expect(page.getByText('Endringene vil først bli gjeldende ved godkjenning.')).toBeVisible()

    await expect(page.getByText('Ny', { exact: true })).toHaveCount(1)
    await expect(page.getByText('Endret', { exact: true })).toHaveCount(1)
    await expect(page.getByText('Slettet', { exact: true })).toHaveCount(1)
  })

  test('viser saksnummer fra vurderingen', async ({ page }) => {
    await goto(page, ATTESTERING_URL)

    await expect(page.getByText('Saksnummer:')).toBeVisible()
    await expect(page.getByRole('button', { name: '23077283' })).toBeVisible()
  })

  test('krever begrunnelse når attestanten ikke godkjenner', async ({ page }) => {
    await goto(page, ATTESTERING_URL)

    await page.getByRole('radio', { name: 'Ikke godkjenn', exact: true }).check()
    await expect(page.getByRole('radiogroup', { name: 'Velg begrunnelse' })).toBeVisible()

    await page.getByRole('button', { name: 'Returner til saksbehandler' }).click()
    await expect(page.getByText('Begrunnelse må fylles ut')).toBeVisible()
  })

  test('godkjenning sender attestanten til kvittering', async ({ page }) => {
    await goto(page, ATTESTERING_URL)

    await page.getByRole('radio', { name: 'Godkjenn', exact: true }).check()
    await page.getByRole('button', { name: 'Attester og iverksett' }).click()

    await expect(page).toHaveURL(/attestert-og-iverksatt/)
  })

  test('logger ingen controlled/uncontrolled-advarsler ved attestering', async ({ page }) => {
    const warnings = collectControlledWarnings(page)

    await goto(page, ATTESTERING_URL)
    await page.getByRole('radio', { name: 'Ikke godkjenn', exact: true }).check()
    await page.getByRole('radio', { name: 'Feil i vedtak', exact: true }).check()
    await page.getByRole('radio', { name: 'Godkjenn', exact: true }).check()

    expect(warnings).toEqual([])
  })
})
