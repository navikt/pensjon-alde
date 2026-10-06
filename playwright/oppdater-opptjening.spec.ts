import { expect, type Page, test } from '@playwright/test'

const SKJEMA = {
  omsorg: '/behandling/7000201/aktivitet/7010201/oppdater-opptjening-omsorg/oppdater-omsorg',
}

const ATTESTERING = {
  omsorg: '/behandling/7000202/attestering',
}

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

const oppsummering = (page: Page) => page.getByRole('heading', { name: 'Endringer som vil bli lagret' })

test.describe('oppdater opptjening – omsorg', () => {
  test('viser omsorgslinjene som lesefelt uten mulighet for å legge til', async ({ page }) => {
    await goto(page, SKJEMA.omsorg)
    const main = page.getByRole('main')

    await expect(main.getByRole('heading', { name: 'Oppdater omsorg' })).toBeVisible()
    await expect(main.getByRole('heading', { name: 'Omsorg', exact: true })).toBeVisible()
    await expect(main.getByRole('button', { name: /Legg til/ })).toBeHidden()

    await expect(main.getByRole('row').filter({ hasText: 'Omsorg for barn' })).toHaveCount(2)
  })

  test('sletter en omsorgslinje og lar den gjenopprettes', async ({ page }) => {
    await goto(page, SKJEMA.omsorg)

    const rad = page.getByRole('row').filter({ hasText: 'Omsorg for barn' }).first()
    await rad.getByRole('button', { name: 'Slett' }).click()

    await expect(rad.getByText('Slettet', { exact: true })).toBeVisible()
    await expect(oppsummering(page)).toBeVisible()

    await rad.getByRole('button', { name: 'Gjenopprett' }).click()
    await expect(oppsummering(page)).toBeHidden()
  })
})

test.describe('oppdater opptjening – attestering', () => {
  test('viser slettet omsorg attestanten skal godkjenne', async ({ page }) => {
    await goto(page, ATTESTERING.omsorg)

    await expect(page.getByRole('heading', { name: 'Oppgaven er til attestering' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Oppsummering av endringene' })).toBeVisible()
    await expect(page.getByText('Endringene vil først bli gjeldende ved godkjenning.')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Omsorg' })).toBeVisible()
    await expect(page.getByText('Slettede linjer (1)')).toBeVisible()
    await expect(page.getByText('Omsorg for barn under 6 år (2010) – omsorg for 01011012345')).toBeVisible()
  })

  test('viser saksnummer fra vurderingen', async ({ page }) => {
    await goto(page, ATTESTERING.omsorg)

    await expect(page.getByText('Saksnummer:')).toBeVisible()
    await expect(page.getByRole('button', { name: '23077283' })).toBeVisible()
  })

  test('krever begrunnelse når attestanten ikke godkjenner', async ({ page }) => {
    await goto(page, ATTESTERING.omsorg)

    await page.getByRole('radio', { name: 'Ikke godkjenn', exact: true }).check()
    await expect(page.getByRole('radiogroup', { name: 'Velg begrunnelse' })).toBeVisible()

    await page.getByRole('button', { name: 'Returner til saksbehandler' }).click()
    await expect(page.getByText('Begrunnelse må fylles ut')).toBeVisible()
  })

  test('godkjenning sender attestanten til kvittering', async ({ page }) => {
    await goto(page, ATTESTERING.omsorg)

    await page.getByRole('radio', { name: 'Godkjenn', exact: true }).check()
    await page.getByRole('button', { name: 'Attester og iverksett' }).click()

    await expect(page).toHaveURL(/attestert-og-iverksatt/)
  })

  test('logger ingen controlled/uncontrolled-advarsler ved attestering', async ({ page }) => {
    const warnings = collectControlledWarnings(page)

    await goto(page, ATTESTERING.omsorg)
    await page.getByRole('radio', { name: 'Ikke godkjenn', exact: true }).check()
    await page.getByRole('radio', { name: 'Feil i vedtak', exact: true }).check()
    await page.getByRole('radio', { name: 'Godkjenn', exact: true }).check()

    expect(warnings).toEqual([])
  })
})
