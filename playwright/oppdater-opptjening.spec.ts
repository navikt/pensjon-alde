import { expect, type Page, test } from '@playwright/test'

const SKJEMA = {
  inntekt: '/behandling/7000101/aktivitet/7010101/oppdater-opptjening-inntekt/oppdater-grunnlag',
  omsorg: '/behandling/7000201/aktivitet/7010201/oppdater-opptjening-omsorg/oppdater-grunnlag',
  dagpenger: '/behandling/7000301/aktivitet/7010301/oppdater-opptjening-dagpenger/oppdater-grunnlag',
  forstegangstjeneste:
    '/behandling/7000401/aktivitet/7010401/oppdater-opptjening-forstegangstjeneste/oppdater-grunnlag',
}

const ATTESTERING = {
  inntekt: '/behandling/7000102/attestering',
  omsorg: '/behandling/7000202/attestering',
  dagpenger: '/behandling/7000302/attestering',
  forstegangstjeneste: '/behandling/7000402/attestering',
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

test.describe('oppdater opptjening – inntekt', () => {
  test('viser kun inntektsseksjonen med linjene fra grunnlaget', async ({ page }) => {
    await goto(page, SKJEMA.inntekt)
    const main = page.getByRole('main')

    await expect(main.getByRole('heading', { name: 'Oppdater inntekter' })).toBeVisible()
    await expect(main.getByRole('heading', { name: 'Inntekter', exact: true })).toBeVisible()
    await expect(main.getByRole('heading', { name: 'Dagpenger', exact: true })).toBeHidden()
    await expect(main.getByRole('heading', { name: 'Omsorg', exact: true })).toBeHidden()
    await expect(main.getByRole('heading', { name: 'Førstegangstjeneste', exact: true })).toBeHidden()

    await expect(page.getByRole('combobox', { name: 'Inntektstype' })).toHaveCount(3)
    await expect(page.getByRole('textbox', { name: 'Beløp' })).toHaveCount(3)
  })

  test('krever valgt sak før lagring', async ({ page }) => {
    await goto(page, SKJEMA.inntekt)

    await page.getByRole('textbox', { name: 'Beløp' }).first().fill('495000')
    await page.getByRole('button', { name: 'Lagre og gå videre' }).click()

    await expect(page.getByText('Du må velge en sak før du kan lagre')).toBeVisible()

    await page.getByLabel('Sak').selectOption('23077283')

    await expect(page.getByText('Du må velge en sak før du kan lagre')).toBeHidden()
  })

  test('krever minst én endring før lagring', async ({ page }) => {
    await goto(page, SKJEMA.inntekt)

    await page.getByLabel('Sak').selectOption('23077283')
    await page.getByRole('button', { name: 'Lagre og gå videre' }).click()

    await expect(page.getByText('Ingen endringer er registrert. Gjør minst én endring før du lagrer.')).toBeVisible()
  })

  test('markerer endret beløp og oppsummerer endringen', async ({ page }) => {
    await goto(page, SKJEMA.inntekt)

    await page.getByRole('textbox', { name: 'Beløp' }).first().fill('495000')

    await expect(oppsummering(page)).toBeVisible()
    await expect(page.getByText('Endret', { exact: true })).toHaveCount(1)
    await expect(page.getByText('Beløp: 480 000 kr → 495 000 kr')).toBeVisible()
  })

  test('markerer slettet linje og lar den gjenopprettes', async ({ page }) => {
    await goto(page, SKJEMA.inntekt)

    const rad = page
      .getByRole('row')
      .filter({ has: page.getByRole('textbox', { name: 'Beløp' }) })
      .first()
    await rad.getByRole('button', { name: 'Slett' }).click()

    await expect(rad.getByText('Slettet', { exact: true })).toBeVisible()
    await expect(oppsummering(page)).toBeVisible()

    await rad.getByRole('button', { name: 'Gjenopprett' }).click()
    await expect(oppsummering(page)).toBeHidden()
  })

  test('legger til ny inntektslinje', async ({ page }) => {
    await goto(page, SKJEMA.inntekt)

    await page.getByRole('button', { name: 'Legg til inntektslinje' }).click()

    await expect(page.getByRole('textbox', { name: 'Beløp' })).toHaveCount(4)
    await expect(page.getByText('Ny', { exact: true })).toHaveCount(1)
  })

  test('låser skattekommune for inntektstyper med fast kommune', async ({ page }) => {
    await goto(page, SKJEMA.inntekt)

    const kommune = page.getByRole('textbox', { name: 'Skattekommune' }).first()
    await expect(kommune).toBeEnabled()

    await page.getByRole('combobox', { name: 'Inntektstype' }).first().selectOption('SVA_LON')

    await expect(kommune).toHaveValue('2100')
    await expect(kommune).toBeDisabled()
  })

  test('lagrer og sender saksbehandleren tilbake til behandlingen', async ({ page }) => {
    await goto(page, SKJEMA.inntekt)

    await page.getByLabel('Sak').selectOption('23077283')
    await page.getByRole('textbox', { name: 'Beløp' }).first().fill('495000')
    await page.getByRole('button', { name: 'Lagre og gå videre' }).click()

    await expect(page).toHaveURL(/\/behandling\/7000101\?justCompleted=7010101/)
  })

  test('logger ingen controlled/uncontrolled-advarsler ved utfylling', async ({ page }) => {
    const warnings = collectControlledWarnings(page)

    await goto(page, SKJEMA.inntekt)
    await page.getByLabel('Sak').selectOption('23077283')
    await page.getByRole('textbox', { name: 'Beløp' }).first().fill('495000')
    await page.getByRole('textbox', { name: 'År' }).first().fill('2021')
    await page.getByRole('button', { name: 'Legg til inntektslinje' }).click()

    expect(warnings).toEqual([])
  })
})

test.describe('oppdater opptjening – dagpenger', () => {
  test('viser kun dagpengeseksjonen med linjene fra grunnlaget', async ({ page }) => {
    await goto(page, SKJEMA.dagpenger)
    const main = page.getByRole('main')

    await expect(main.getByRole('heading', { name: 'Oppdater dagpenger' })).toBeVisible()
    await expect(main.getByRole('heading', { name: 'Dagpenger', exact: true })).toBeVisible()
    await expect(main.getByRole('heading', { name: 'Inntekter', exact: true })).toBeHidden()

    await expect(page.getByRole('textbox', { name: 'Utbetalte dagpenger' })).toHaveCount(2)
  })

  test('låser grunnlag og ferietillegg for ferietillegg-typen', async ({ page }) => {
    await goto(page, SKJEMA.dagpenger)

    // Linjene sorteres på år, så DP_FF-linja (2020) ligger sist.
    const ffRad = page
      .getByRole('row')
      .filter({ has: page.getByRole('combobox', { name: 'Type' }) })
      .last()

    await expect(ffRad.getByRole('textbox', { name: 'Uavkortet grunnlag' })).toBeDisabled()
    await expect(ffRad.getByRole('textbox', { name: 'Ferietillegg' })).toBeDisabled()
    await expect(ffRad.getByRole('textbox', { name: 'Barnetillegg' })).toBeEnabled()
  })

  test('markerer endret utbetaling og oppsummerer endringen', async ({ page }) => {
    await goto(page, SKJEMA.dagpenger)

    await page.getByRole('textbox', { name: 'Utbetalte dagpenger' }).first().fill('192000')

    await expect(oppsummering(page)).toBeVisible()
    await expect(page.getByText('Utbetalte dagpenger: 185 000 kr → 192 000 kr')).toBeVisible()
  })

  test('legger til ny dagpengelinje', async ({ page }) => {
    await goto(page, SKJEMA.dagpenger)

    await page.getByRole('button', { name: 'Legg til dagpengelinje' }).click()

    await expect(page.getByRole('textbox', { name: 'Utbetalte dagpenger' })).toHaveCount(3)
    await expect(page.getByText('Ny', { exact: true })).toHaveCount(1)
  })
})

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

test.describe('oppdater opptjening – førstegangstjeneste', () => {
  test('viser perioden fra grunnlaget', async ({ page }) => {
    await goto(page, SKJEMA.forstegangstjeneste)
    const main = page.getByRole('main')

    await expect(main.getByRole('heading', { name: 'Oppdater førstegangstjeneste' })).toBeVisible()
    await expect(main.getByRole('heading', { name: 'Førstegangstjeneste', exact: true })).toBeVisible()

    await expect(page.getByRole('textbox', { name: 'FOM' })).toHaveValue('15.01.2012')
    await expect(page.getByRole('textbox', { name: 'TOM' })).toHaveValue('31.12.2012')
  })

  test('markerer endret periodetype og oppsummerer endringen', async ({ page }) => {
    await goto(page, SKJEMA.forstegangstjeneste)

    await page.getByRole('combobox', { name: 'Periodetype' }).first().selectOption('BEFAL')

    await expect(oppsummering(page)).toBeVisible()
    await expect(page.getByText('Endret', { exact: true })).toHaveCount(1)
  })

  test('legger til ny førstegangstjenestelinje', async ({ page }) => {
    await goto(page, SKJEMA.forstegangstjeneste)

    await page.getByRole('button', { name: 'Legg til førstegangstjeneste' }).click()

    await expect(page.getByRole('textbox', { name: 'FOM' })).toHaveCount(2)
    await expect(page.getByText('Ny', { exact: true })).toHaveCount(1)
  })
})

test.describe('oppdater opptjening – attestering', () => {
  test('viser inntektsendringene attestanten skal godkjenne', async ({ page }) => {
    await goto(page, ATTESTERING.inntekt)

    await expect(page.getByRole('heading', { name: 'Oppgaven er til attestering' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Oppsummering av endringene' })).toBeVisible()
    await expect(page.getByText('Endringene vil først bli gjeldende ved godkjenning.')).toBeVisible()

    await expect(page.getByText('Nye linjer (1)')).toBeVisible()
    await expect(page.getByText('Endrede linjer (1)')).toBeVisible()
    await expect(page.getByText('Beløp: 480 000 kr → 495 000 kr')).toBeVisible()
  })

  test('viser dagpengeendringene attestanten skal godkjenne', async ({ page }) => {
    await goto(page, ATTESTERING.dagpenger)

    await expect(page.getByRole('heading', { name: 'Dagpenger' })).toBeVisible()
    await expect(page.getByText('Nye linjer (1)')).toBeVisible()
    await expect(page.getByText('Endrede linjer (1)')).toBeVisible()
  })

  test('viser slettet omsorg attestanten skal godkjenne', async ({ page }) => {
    await goto(page, ATTESTERING.omsorg)

    await expect(page.getByRole('heading', { name: 'Omsorg' })).toBeVisible()
    await expect(page.getByText('Slettede linjer (1)')).toBeVisible()
  })

  test('viser endret førstegangstjeneste attestanten skal godkjenne', async ({ page }) => {
    await goto(page, ATTESTERING.forstegangstjeneste)

    await expect(page.getByRole('heading', { name: 'Førstegangstjeneste' })).toBeVisible()
    await expect(page.getByText('Endrede linjer (1)')).toBeVisible()
    await expect(page.getByText('FOM: 2012-01-15 → 2012-02-01')).toBeVisible()
  })

  test('viser saksnummer fra vurderingen', async ({ page }) => {
    await goto(page, ATTESTERING.inntekt)

    await expect(page.getByText('Saksnummer:')).toBeVisible()
    await expect(page.getByRole('button', { name: '23077283' })).toBeVisible()
  })

  test('krever begrunnelse når attestanten ikke godkjenner', async ({ page }) => {
    await goto(page, ATTESTERING.inntekt)

    await page.getByRole('radio', { name: 'Ikke godkjenn', exact: true }).check()
    await expect(page.getByRole('radiogroup', { name: 'Velg begrunnelse' })).toBeVisible()

    await page.getByRole('button', { name: 'Returner til saksbehandler' }).click()
    await expect(page.getByText('Begrunnelse må fylles ut')).toBeVisible()
  })

  test('godkjenning sender attestanten til kvittering', async ({ page }) => {
    await goto(page, ATTESTERING.inntekt)

    await page.getByRole('radio', { name: 'Godkjenn', exact: true }).check()
    await page.getByRole('button', { name: 'Attester og iverksett' }).click()

    await expect(page).toHaveURL(/attestert-og-iverksatt/)
  })

  test('logger ingen controlled/uncontrolled-advarsler ved attestering', async ({ page }) => {
    const warnings = collectControlledWarnings(page)

    await goto(page, ATTESTERING.inntekt)
    await page.getByRole('radio', { name: 'Ikke godkjenn', exact: true }).check()
    await page.getByRole('radio', { name: 'Feil i vedtak', exact: true }).check()
    await page.getByRole('radio', { name: 'Godkjenn', exact: true }).check()

    expect(warnings).toEqual([])
  })
})
