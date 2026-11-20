import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { AktivitetDTO } from '~/types/behandling'
import { ForhandsvisVedtaksbrev, type Vedtaksbrev } from './ForhandsvisVedtaksbrev'
import { lagPdfBlob } from './pdf'

const aktivitet = { friendlyName: 'Forhåndsvis vedtaksbrev' } as AktivitetDTO
const brev: Vedtaksbrev = {
  pdf: [37, 80, 68, 70, 45, 49, 46, 55],
  contentType: 'application/pdf',
  displayTitle: 'Vedtak om alderspensjon',
  distribusjonstype: 'VEDTAK',
  brevtype: 'VEDTAKSBREV',
}

describe('ForhandsvisVedtaksbrev', () => {
  it('viser alle brevtitler og metadata uten lagring eller fortsett-knapp', () => {
    const html = renderToStaticMarkup(
      <ForhandsvisVedtaksbrev
        aktivitet={aktivitet}
        grunnlag={{ brev: [brev, { ...brev, displayTitle: 'Informasjon om utbetaling' }] }}
      />,
    )

    expect(html).toContain('Vedtak om alderspensjon')
    expect(html).toContain('Informasjon om utbetaling')
    expect(html).toContain('Brevtype: VEDTAKSBREV')
    expect(html).toContain('Distribusjonstype: VEDTAK')
    expect(html).not.toContain('<form')
    expect(html).not.toContain('<button')
  })

  it('viser en melding når det ikke finnes brev', () => {
    const html = renderToStaticMarkup(<ForhandsvisVedtaksbrev aktivitet={aktivitet} grunnlag={{ brev: [] }} />)

    expect(html).toContain('Ingen vedtaksbrev tilgjengelig for forhåndsvisning.')
    expect(html).not.toContain('<iframe')
  })
})

describe('lagPdfBlob', () => {
  it('bevarer signerte bytes fra Kotlin ByteArray i JSON', async () => {
    const blob = lagPdfBlob([37, 80, 68, 70, -1, -128, 0, 127], 'application/pdf')

    expect(Array.from(new Uint8Array(await blob.arrayBuffer()))).toEqual([37, 80, 68, 70, 255, 128, 0, 127])
    expect(blob.type).toBe('application/pdf')
  })

  it('dekoder base64 uten å endre binære bytes', async () => {
    const blob = lagPdfBlob('JVBERv+AAH8=', 'application/pdf')

    expect(Array.from(new Uint8Array(await blob.arrayBuffer()))).toEqual([37, 80, 68, 70, 255, 128, 0, 127])
  })

  it.each([{ pdf: [] }, { pdf: '' }])('avviser tomt PDF-innhold: %j', ({ pdf }) => {
    expect(() => lagPdfBlob(pdf, 'application/pdf')).toThrow('PDF-en er tom')
  })

  it('avviser andre innholdstyper', () => {
    expect(() => lagPdfBlob(brev.pdf, 'text/html')).toThrow('Brevet er ikke en PDF')
  })

  it('avviser ugyldig base64', () => {
    expect(() => lagPdfBlob('ikke gyldig base64!', 'application/pdf')).toThrow()
  })
})
