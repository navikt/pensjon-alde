import { expect, type Page, test } from '@playwright/test'

const SKJEMA = {
  inntekt: '/behandling/7000301/aktivitet/7010301/oppdater-opptjening-inntekt/oppdater-inntekt',
}

const ATTESTERING = {
  inntekt: '/behandling/7000302/attestering',
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

const tabell = (page: Page, navn: string) => page.getByRole('main').getByRole('table', { name: navn, exact: true })

const rad = (page: Page, tabellnavn: string, ar: string, type: string) =>
  tabell(page, tabellnavn).getByRole('row').filter({ hasText: ar }).filter({ hasText: type })

const utenNbsp = (tekst: string | null) => (tekst ?? '').replace(/\s/g, ' ')

test.describe('oppdater opptjening – inntekt', () => {
  test('viser én tabell per kategori med beløpsfeltene som kolonner', async ({ page }) => {
    await goto(page, SKJEMA.inntekt)
    const main = page.getByRole('main')

    await expect(main.getByRole('heading', { name: 'Oppdater inntekt' })).toBeVisible()

    const pgi = tabell(page, 'Pensjonsgivende inntekt')
    await expect(pgi.getByRole('columnheader', { name: 'Lønn, bare pensjonsdel' })).toBeVisible()
    await expect(pgi.getByRole('columnheader', { name: 'Næring fra fiske, fangst eller familiebarnehage' })).toBeVisible()
    await expect(pgi.getByRole('row')).toHaveCount(5)

    const fil = tabell(page, 'Inntekt fra fil')
    await expect(fil.getByRole('columnheader', { name: 'Jord-, skog- og fiskebruk' })).toBeVisible()
    await expect(fil.getByRole('row')).toHaveCount(4)

    const annet = tabell(page, 'Annen inntekt')
    await expect(annet.getByRole('row').filter({ hasText: 'Dagpenger' })).toBeVisible()
    await expect(annet.getByRole('button')).toHaveCount(0)

    await expect(main.getByRole('button', { name: 'Legg til pensjonsgivende inntekt' })).toBeVisible()
    await expect(main.getByRole('button', { name: 'Legg til inntekt fra fil' })).toBeVisible()
    await expect(main.getByRole('button', { name: 'Legg til annen inntekt' })).toBeHidden()
  })

  test('endrer et beløp, viser endringen i oppsummeringen og lar den angres', async ({ page }) => {
    await goto(page, SKJEMA.inntekt)

    const linje = rad(page, 'Pensjonsgivende inntekt', '2020', 'Fastland')
    await linje.getByRole('button', { name: 'Endre' }).click()
    const redigeres = tabell(page, 'Pensjonsgivende inntekt')
      .getByRole('row')
      .filter({ has: page.getByRole('button', { name: 'Ferdig' }) })
    await redigeres.getByRole('textbox', { name: 'Lønn', exact: true }).fill('495000')
    await redigeres.getByRole('button', { name: 'Ferdig' }).click()

    await expect(linje.getByText('Endret', { exact: true })).toBeVisible()
    await expect(page.getByText('Endrede linjer (1)')).toBeVisible()
    expect(utenNbsp(await page.getByText(/^Lønn: 480/).textContent())).toBe('Lønn: 480 000 kr → 495 000 kr')

    await linje.getByRole('button', { name: 'Angre' }).click()
    await expect(page.getByText('Ingen endringer', { exact: true })).toBeVisible()
    await expect(linje.getByRole('cell', { name: /480 000/ })).toBeVisible()
  })

  test('sletter en inntektslinje og lar den gjenopprettes', async ({ page }) => {
    await goto(page, SKJEMA.inntekt)

    const linje = rad(page, 'Pensjonsgivende inntekt', '2020', 'Svalbard')
    await linje.getByRole('button', { name: 'Slett' }).click()

    await expect(linje.getByText('Slettet', { exact: true })).toBeVisible()
    await expect(page.getByText('Slettede linjer (1)')).toBeVisible()

    await linje.getByRole('button', { name: 'Gjenopprett' }).click()
    await expect(page.getByText('Ingen endringer', { exact: true })).toBeVisible()
  })

  test('viser valideringsfeil først når feltet er forlatt, og stopper lagring med feil', async ({ page }) => {
    await goto(page, SKJEMA.inntekt)
    const main = page.getByRole('main')
    const fil = tabell(page, 'Inntekt fra fil')

    await main.getByRole('button', { name: 'Legg til inntekt fra fil' }).click()
    const ar = fil.getByRole('textbox', { name: 'År' })
    await expect(ar).toBeVisible()
    await expect(fil.getByText('År må ha fire siffer')).toBeHidden()

    await ar.fill('20')
    await ar.blur()
    await expect(ar).toHaveAccessibleDescription(/År må ha fire siffer/)
    await expect(fil.getByText('Fyll ut minst ett beløp')).toBeHidden()

    await main.getByRole('combobox', { name: 'Sak' }).selectOption('23077283')
    await main.getByRole('button', { name: 'Lagre og gå videre' }).click()

    await expect(page.getByText('Rett feilene i skjemaet før du lagrer.')).toBeVisible()
    await expect(fil.getByText('Fyll ut minst ett beløp')).toBeVisible()
    await expect(fil.getByRole('textbox', { name: 'Lønn', exact: true })).toHaveAttribute('aria-invalid', 'true')
    await expect(page).toHaveURL(new RegExp(`${SKJEMA.inntekt}$`))
  })

  test('avviser samme inntektstype to ganger i samme år', async ({ page }) => {
    await goto(page, SKJEMA.inntekt)
    const pgi = tabell(page, 'Pensjonsgivende inntekt')

    await page.getByRole('main').getByRole('button', { name: 'Legg til pensjonsgivende inntekt' }).click()
    await expect(pgi.getByRole('combobox', { name: 'Type' })).toHaveValue('FastlandPgi')
    const ar = pgi.getByRole('textbox', { name: 'År' })
    await ar.fill('2021')
    await ar.blur()

    await expect(pgi.getByText('Inntektstypen er allerede registrert for dette året')).toBeVisible()
    await expect(pgi.getByRole('combobox', { name: 'Type' })).toHaveAttribute('aria-invalid', 'true')

    await pgi.getByRole('combobox', { name: 'Type' }).selectOption('SvalbardPgi')
    await expect(pgi.getByText('Inntektstypen er allerede registrert for dette året')).toBeHidden()
  })

  test('sender hele det berørte året til lagring', async ({ page }) => {
    await goto(page, SKJEMA.inntekt)
    const main = page.getByRole('main')

    const svalbard = rad(page, 'Pensjonsgivende inntekt', '2020', 'Svalbard')
    await svalbard.getByRole('button', { name: 'Slett' }).click()

    await main.getByRole('button', { name: 'Legg til pensjonsgivende inntekt' }).click()
    const ny = tabell(page, 'Pensjonsgivende inntekt').getByRole('row').filter({ hasText: 'Ny' })
    await ny.getByRole('textbox', { name: 'År' }).fill('2022')
    await ny.getByRole('textbox', { name: 'Lønn', exact: true }).fill('530 000')

    await main.getByRole('combobox', { name: 'Sak' }).selectOption('23077283')

    const innsending = page.waitForRequest(request => request.method() === 'POST')
    await main.getByRole('button', { name: 'Lagre og gå videre' }).click()
    const skjema = new URLSearchParams((await innsending).postData() ?? '')

    expect(skjema.get('sakId')).toBe('23077283')
    expect(JSON.parse(skjema.get('payload') ?? '{}')).toEqual({
      fnr: '12345678901',
      inntekterPerAr: [
        {
          inntektAr: 2020,
          inntekterFilformat: [
            { inntektsType: 'Innenlandsinntekt', belopLoenn: 480000, belopNaering: 25000, belopJsf: null },
          ],
          inntekterPgi: [
            {
              inntektsType: 'FastlandPgi',
              belopLoennsinntekt: 480000,
              belopLoennsinntektBarePensjonsdel: null,
              belopNaeringsinntekt: 25000,
              belopNaeringsinntektFraFiskeFangstEllerFamiliebarnehage: null,
            },
          ],
        },
        {
          inntektAr: 2022,
          inntekterFilformat: [],
          inntekterPgi: [
            {
              inntektsType: 'FastlandPgi',
              belopLoennsinntekt: 530000,
              belopLoennsinntektBarePensjonsdel: null,
              belopNaeringsinntekt: null,
              belopNaeringsinntektFraFiskeFangstEllerFamiliebarnehage: null,
            },
          ],
        },
      ],
    })
  })
})

test.describe('oppdater opptjening inntekt – attestering', () => {
  test('viser endrede, nye og slettede inntekter attestanten skal godkjenne', async ({ page }) => {
    await goto(page, ATTESTERING.inntekt)

    await expect(page.getByRole('heading', { name: 'Oppgaven er til attestering' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Oppdater inntekt' })).toBeVisible()

    await expect(rad(page, 'Pensjonsgivende inntekt', '2020', 'Fastland').getByText('Endret')).toBeVisible()
    await expect(rad(page, 'Pensjonsgivende inntekt', '2020', 'Svalbard').getByText('Slettet')).toBeVisible()
    await expect(rad(page, 'Pensjonsgivende inntekt', '2022', 'Fastland').getByText('Ny')).toBeVisible()
    await expect(rad(page, 'Inntekt fra fil', '2020', 'Innenlandsinntekt').getByText('Endret')).toBeVisible()

    await expect(page.getByText('Nye linjer (1)')).toBeVisible()
    await expect(page.getByText('Endrede linjer (2)')).toBeVisible()
    await expect(page.getByText('Slettede linjer (1)')).toBeVisible()

    await expect(page.getByRole('main').getByRole('button', { name: /Legg til|Endre|Slett/ })).toHaveCount(0)
  })

  test('viser valgt sak og begrunnelse fra vurderingen', async ({ page }) => {
    await goto(page, ATTESTERING.inntekt)

    await expect(page.getByRole('main').getByRole('combobox', { name: /Sak/ })).toHaveValue('23077283')
    await expect(page.getByText('Lønn for 2020 var feilrapportert av arbeidsgiver.')).toBeVisible()
  })
})
