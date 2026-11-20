export function lagPdfBlob(pdf: number[] | string, contentType: string): Blob {
  if (contentType.split(';')[0].trim().toLowerCase() !== 'application/pdf') {
    throw new Error('Brevet er ikke en PDF')
  }

  const bytes = typeof pdf === 'string' ? Uint8Array.from(atob(pdf), char => char.charCodeAt(0)) : new Uint8Array(pdf)

  if (bytes.length === 0) {
    throw new Error('PDF-en er tom')
  }

  return new Blob([bytes], { type: 'application/pdf' })
}
