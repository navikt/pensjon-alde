export const formatCurrencyNok = (amount: string | number) => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  const safeAmount = Number.isNaN(numAmount) || numAmount === undefined ? 0 : numAmount
  return new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK' }).format(safeAmount)
}
