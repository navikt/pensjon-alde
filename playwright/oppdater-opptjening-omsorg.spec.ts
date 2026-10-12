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

const oppsummering = (page: Page) => page.getByRole('heading', { name: 'Oppsummering av endringer' })

test.describe('oppdater opptjening – omsorg', () => {
  test('viser omsorgslinjene gruppert per person uten mulighet for å legge til', async ({ page }) => {
    await goto(page, SKJEMA.omsorg)
    const main = page.getByRole('main')

    await expect(main.getByRole('heading', { name: 'Oppdater omsorg' })).toBeVisible()
    await expect(main.getByRole('button', { name: /Legg til/ })).toBeHidden()

    await expect(main.getByRole('table', { name: /^Omsorg for / })).toHaveCount(3)
    await expect(
      main
        .getByRole('table', { name: 'Omsorg for 01011012345' })
        .getByRole('row')
        .filter({ hasText: 'Omsorg for barn under 6 år' }),
    ).toHaveCount(2)
  })

  test('sletter en omsorgslinje og lar den gjenopprettes', async ({ page }) => {
    await goto(page, SKJEMA.omsorg)

    await expect(oppsummering(page)).toBeVisible()
    await expect(page.getByText('Ingen endringer', { exact: true })).toBeVisible()

    const rad = page.getByRole('row').filter({ hasText: 'Omsorg for barn' }).first()
    await rad.getByRole('button', { name: 'Slett' }).click()

    await expect(rad.getByText('Slettet', { exact: true })).toBeVisible()
    await expect(page.getByText('Slettede linjer (1)')).toBeVisible()

    await rad.getByRole('button', { name: 'Gjenopprett' }).click()
    await expect(page.getByText('Ingen endringer', { exact: true })).toBeVisible()
  })
})

test.describe('oppdater opptjening – attestering', () => {
  test('viser slettet omsorg attestanten skal godkjenne', async ({ page }) => {
    await goto(page, ATTESTERING.omsorg)

    await expect(page.getByRole('heading', { name: 'Oppgaven er til attestering' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Oppdater omsorg' })).toBeVisible()
    await expect(oppsummering(page)).toBeVisible()
    await expect(page.getByRole('table', { name: /^Omsorg for / })).toHaveCount(2)
    await expect(
      page.getByRole('table', { name: 'Omsorg for 01011012345' }).getByRole('cell', { name: 'Slettet' }),
    ).toBeVisible()
    await expect(
      page.getByRole('table', { name: 'Omsorg for 01010254321' }).getByRole('cell', { name: 'Slettet' }),
    ).toHaveCount(0)
    await expect(page.getByText('Slettede linjer (1)')).toBeVisible()
    await expect(page.getByText('Omsorg for barn under 6 år - eget vedtak (2010) – omsorg for 01011012345')).toBeVisible()
  })

  test('viser valgt sak fra vurderingen', async ({ page }) => {
    await goto(page, ATTESTERING.omsorg)

    await expect(page.getByRole('main').getByRole('combobox', { name: /Sak/ })).toHaveValue('23077283')
  })

  test('krever begrunnelse når attestanten ikke godkjenner', async ({ page }) => {
    await goto(page, ATTESTERING.omsorg)

    await page.getByRole('radio', { name: 'Ikke godkjenn', exact: true }).check()
    await expect(page.getByRole('radiogroup', { name: 'Velg begrunnelse' })).toBeVisible()

    await page.getByRole('button', { name: 'Returner til saksbehandler' }).click()
    await expect(page.getByText('Begrunnelse må fylles ut')).toBeVisible()
  })

  test('returnert behandling sendes til returnert-siden, ikke oppsummering', async ({ page }) => {
    await page.goto('/behandling/7000204')

    await expect(page).toHaveURL(/\/behandling\/7000204\/attestering-returnert-til-saksbehandler$/)
    await expect(page.getByRole('heading', { name: 'Returnert til saksbehandler' })).toBeVisible()
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

  test('beholder valgt begrunnelse når attesteringssiden rendres på nytt under innsending', async ({ page }) => {
    let slippForesporsel = () => {}
    const venter = new Promise<void>(resolve => {
      slippForesporsel = resolve
    })
    await page.route('**/*.data*', async route => {
      if (route.request().method() === 'POST') await venter
      await route.continue()
    })

    await goto(page, ATTESTERING.omsorg)
    await page.getByRole('radio', { name: 'Ikke godkjenn', exact: true }).check()
    const begrunnelse = page.getByRole('radio', { name: 'Feil i vedtak', exact: true })
    await begrunnelse.check()

    const innsending = page.waitForRequest(request => request.method() === 'POST')
    await page.getByRole('button', { name: 'Returner til saksbehandler' }).click()
    await innsending
    await expect(page.locator('form').filter({ hasText: 'Velg begrunnelse' }).getByRole('button')).toBeDisabled()

    await expect(begrunnelse).toBeChecked()

    slippForesporsel()
    await page.unrouteAll({ behavior: 'ignoreErrors' })
  })
})
