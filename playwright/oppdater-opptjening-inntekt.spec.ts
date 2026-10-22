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

const tabell = (page: Page, navn: string, ar: string) =>
  page.getByRole('main').getByRole('table', { name: `${navn}, inntektsår ${ar}`, exact: true })

const rad = (page: Page, tabellnavn: string, ar: string, type: string) =>
  tabell(page, tabellnavn, ar).getByRole('row').filter({ hasText: type })

const arSeksjon = (page: Page, ar: string) => page.getByRole('region', { name: `Inntektsår ${ar}`, exact: true })

async function velgAr(page: Page, ar: string) {
  await page.getByRole('main').getByRole('combobox', { name: 'Inntektsår' }).click()
  await page.getByRole('option', { name: ar, exact: true }).click()
  await expect(arSeksjon(page, ar)).toBeVisible()
}

async function leggTilAr(page: Page, ar: string) {
  const velger = page.getByRole('main').getByRole('combobox', { name: 'Inntektsår' })
  await velger.fill(ar)
  await velger.press('Enter')
  await expect(arSeksjon(page, ar)).toBeVisible()
}

const utenNbsp = (tekst: string | null) => (tekst ?? '').replace(/\s/g, ' ')

test.describe('oppdater opptjening – inntekt', () => {
  test('viser én tabell per kategori for valgt år, uten årskolonne', async ({ page }) => {
    await goto(page, SKJEMA.inntekt)
    const main = page.getByRole('main')

    await expect(main.getByRole('heading', { name: 'Oppdater inntekt' })).toBeVisible()
    await velgAr(page, '2020')

    const pgi = tabell(page, 'Pensjonsgivende inntekt', '2020')
    await expect(pgi.getByRole('columnheader', { name: /Pensjonsdel/ })).toBeVisible()
    await expect(pgi.getByRole('columnheader', { name: /Næring, fiske mv\./ })).toBeVisible()
    await expect(pgi.getByRole('columnheader', { name: 'År', exact: true })).toHaveCount(0)
    await expect(pgi.getByRole('row')).toHaveCount(3)

    const fil = tabell(page, 'Inntekt fra fil', '2020')
    await expect(fil.getByRole('columnheader', { name: 'Jord-, skog- og fiskebruk' })).toBeVisible()
    await expect(fil.getByRole('row')).toHaveCount(2)

    const annet = tabell(page, 'Annen inntekt', '2020')
    await expect(annet.getByRole('row').filter({ hasText: 'Dagpenger' })).toBeVisible()
    await expect(annet.getByRole('button')).toHaveCount(0)

    const seksjon = arSeksjon(page, '2020')
    await expect(seksjon.getByRole('button', { name: 'Legg til pensjonsgivende inntekt' })).toBeVisible()
    await expect(seksjon.getByRole('button', { name: 'Legg til inntekt fra fil' })).toBeVisible()
    await expect(seksjon.getByRole('button', { name: 'Legg til annen inntekt' })).toBeHidden()
  })

  test('endrer et beløp, viser endringen i oppsummeringen og lar den angres', async ({ page }) => {
    await goto(page, SKJEMA.inntekt)
    await velgAr(page, '2020')

    const linje = rad(page, 'Pensjonsgivende inntekt', '2020', 'Fastland')
    await linje.getByRole('button', { name: 'Endre' }).click()
    const redigeres = tabell(page, 'Pensjonsgivende inntekt', '2020')
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
    await velgAr(page, '2020')

    const linje = rad(page, 'Pensjonsgivende inntekt', '2020', 'Svalbard')
    await linje.getByRole('button', { name: 'Slett' }).click()

    await expect(linje.getByText('Slettet', { exact: true })).toBeVisible()
    await expect(page.getByText('Slettede linjer (1)')).toBeVisible()

    await linje.getByRole('button', { name: 'Gjenopprett' }).click()
    await expect(page.getByText('Ingen endringer', { exact: true })).toBeVisible()
  })

  test('validerer beløp, avviser 0 og holder linjer med feil utenfor oppsummeringen', async ({ page }) => {
    await goto(page, SKJEMA.inntekt)
    const main = page.getByRole('main')
    await velgAr(page, '2020')
    const fil = tabell(page, 'Inntekt fra fil', '2020')

    await arSeksjon(page, '2020').getByRole('button', { name: 'Legg til inntekt fra fil' }).click()
    const ny = fil.getByRole('row').filter({ hasText: 'Ny' })
    await expect(ny.getByRole('combobox', { name: 'Type' })).toHaveValue('Utenlandsinntekt')
    await expect(ny.getByRole('textbox', { name: 'År' })).toHaveCount(0)
    await expect(fil.getByText('Fyll ut minst ett beløp')).toBeHidden()

    await main.getByRole('combobox', { name: 'Sak' }).selectOption('23077283')
    await main.getByRole('button', { name: 'Lagre og gå videre' }).click()

    await expect(page.getByRole('link', { name: /Fyll ut minst ett beløp/ })).toBeVisible()
    await expect(fil.getByText('Fyll ut minst ett beløp')).toBeVisible()
    await expect(page.getByText('Ingen endringer er registrert', { exact: false })).toBeHidden()
    await expect(page.getByText('Ingen endringer', { exact: true })).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`${SKJEMA.inntekt}$`))

    const lonn = ny.getByRole('textbox', { name: 'Lønn', exact: true })
    await lonn.fill('0')
    await lonn.blur()
    await expect(lonn).toHaveAccessibleDescription(/Lønn kan ikke være 0/)
    await expect(page.getByText('Ingen endringer', { exact: true })).toBeVisible()

    await lonn.fill('1000')
    await expect(fil.getByText('Lønn kan ikke være 0')).toBeHidden()
    await expect(page.getByText('Nye linjer (1)')).toBeVisible()
  })

  test('tilbyr bare inntektstyper som ikke er i bruk for året', async ({ page }) => {
    await goto(page, SKJEMA.inntekt)
    await velgAr(page, '2020')
    const seksjon = arSeksjon(page, '2020')
    const pgi = tabell(page, 'Pensjonsgivende inntekt', '2020')

    await seksjon.getByRole('button', { name: 'Legg til pensjonsgivende inntekt' }).click()
    const type = pgi.getByRole('row').filter({ hasText: 'Ny' }).getByRole('combobox', { name: 'Type' })
    await expect(type).toHaveValue('KildeskattPaaLoennPgi')
    await expect(type.locator('option[value="FastlandPgi"]')).toBeDisabled()
    await expect(type.locator('option[value="SvalbardPgi"]')).toBeDisabled()
    await expect(seksjon.getByRole('button', { name: 'Legg til pensjonsgivende inntekt' })).toBeDisabled()

    await pgi.getByRole('button', { name: 'Slett 2020 Pensjonsgivende inntekt, Svalbard', exact: true }).click()
    await expect(type.locator('option[value="SvalbardPgi"]')).toBeEnabled()
    await expect(seksjon.getByRole('button', { name: 'Legg til pensjonsgivende inntekt' })).toBeEnabled()
  })

  test('sender hele det berørte året til lagring', async ({ page }) => {
    await goto(page, SKJEMA.inntekt)
    const main = page.getByRole('main')
    await velgAr(page, '2020')

    const svalbard = rad(page, 'Pensjonsgivende inntekt', '2020', 'Svalbard')
    await svalbard.getByRole('button', { name: 'Slett' }).click()

    await leggTilAr(page, '2022')
    await arSeksjon(page, '2022').getByRole('button', { name: 'Legg til pensjonsgivende inntekt' }).click()
    const ny = tabell(page, 'Pensjonsgivende inntekt', '2022').getByRole('row').filter({ hasText: 'Ny' })
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
