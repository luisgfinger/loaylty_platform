export function normalizeWhatsAppPhone(phone: string | null | undefined): string | null {
  const digits = phone?.replace(/\D/g, '') ?? ''

  if (/^55\d{10,11}$/.test(digits)) return digits
  if (/^\d{10,11}$/.test(digits)) return `55${digits}`

  return null
}

export function buildWhatsAppUrl(phone: string, message: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

export function buildRewardWhatsAppMessage({
  customerName,
  rewardName,
  isChoiceWithoutSelection,
  expiresAt,
}: {
  customerName: string
  rewardName: string | null
  isChoiceWithoutSelection: boolean
  expiresAt: string | null
}) {
  const firstName = customerName.trim().split(/\s+/)[0] || 'cliente'
  const rewardText = isChoiceWithoutSelection
    ? 'Você tem uma nova recompensa disponível para escolher no Auto Posto Grando.'
    : `Você tem uma nova recompensa disponível: ${rewardName ?? 'Recompensa'}.`
  const expirationText = expiresAt ? `\n\nVálida até ${formatWhatsAppDate(expiresAt)}.` : ''
  const nextVisitText = isChoiceWithoutSelection
    ? 'Na sua próxima visita, informe seu CPF para consultar.'
    : 'Na sua próxima visita, informe seu CPF para consultar e utilizar.'

  return `Olá, ${firstName}!\n\n${rewardText}${expirationText}\n\n${nextVisitText}\n\nAuto Posto Grando`
}

function formatWhatsAppDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value))
}
