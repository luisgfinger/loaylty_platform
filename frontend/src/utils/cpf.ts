export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, '')
}

export function formatCpf(value: string): string {
  const digits = normalizeCpf(value).slice(0, 11)
  return digits.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function isValidCpf(value: string): boolean {
  const cpf = normalizeCpf(value)
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false
  const numbers = cpf.split('').map(Number)
  let sum = 0
  for (let index = 0; index < 9; index += 1) sum += numbers[index] * (10 - index)
  let firstDigit = (sum * 10) % 11
  if (firstDigit === 10) firstDigit = 0
  if (firstDigit !== numbers[9]) return false
  sum = 0
  for (let index = 0; index < 10; index += 1) sum += numbers[index] * (11 - index)
  let secondDigit = (sum * 10) % 11
  if (secondDigit === 10) secondDigit = 0
  return secondDigit === numbers[10]
}

export function getCpfValidationError(value: string): string | null {
  const cpf = normalizeCpf(value)
  if (!cpf) return 'Informe o CPF.'
  if (cpf.length !== 11) return 'Informe um CPF válido.'
  return isValidCpf(cpf) ? null : 'CPF inválido.'
}
