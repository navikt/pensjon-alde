/** biome-ignore-all lint/suspicious/noExplicitAny: Will fix soon */
import { formatISO, isValid, parse } from 'date-fns'

type Processor<T> = Partial<Record<keyof T, (value: any) => any>>

export const parseForm = <T extends Record<string, any>>(formData: FormData, processor?: Processor<T>): T => {
  const entries = Array.from(formData.entries())

  const processEntry = ([key, value]: [string, FormDataEntryValue]): [string, any] => {
    const processorFn = processor?.[key as keyof T]
    return [key, processorFn ? processorFn(value) : value]
  }

  const processedEntries = entries.map(processEntry)

  const addMissingKeys = (acc: Record<string, any>): T => {
    if (!processor) return acc as T

    return Object.keys(processor).reduce(
      (result, key) => ({
        // biome-ignore lint/performance/noAccumulatingSpread: Will fix soon
        ...result,
        [key]: key in result ? result[key] : processor[key as keyof T]?.(undefined),
      }),
      acc,
    ) as T
  }

  return addMissingKeys(Object.fromEntries(processedEntries))
}

export const checkbox = (value: any): boolean => value === 'on'

export const dateInput = (value: any): string | null => {
  if (!value || value === '') return null
  if (typeof value !== 'string') return null

  const date = parse(value, 'dd.MM.yyyy', new Date())
  if (!isValid(date)) return null

  return formatISO(date, { representation: 'date' })
}
