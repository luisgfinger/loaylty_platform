import { useEffect, useState } from 'react'
import { getCustomerCycles } from '../../api/loyalty.api'
import { ApiError } from '../../api/client'
import type { Customer } from '../../types/customer'
import type { CustomerCycle, CustomerCyclesResponse, LoyaltyLevel } from '../../types/loyalty'

export function CustomerLoyaltyPanel({ customer, companyId, token }: { customer: Customer; companyId: number; token: string }) {
  const [cycleData, setCycleData] = useState<CustomerCyclesResponse | null>(null)
  const [isLoading, setIsLoading] = useState(customer.isActive)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const cpf = customer.person.cpf

  useEffect(() => {
    let cancelled = false
    if (!customer.isActive) return
    getCustomerCycles(companyId, cpf, token)
      .then((result) => { if (!cancelled) setCycleData(result) })
      .catch((requestError: unknown) => { if (!cancelled) setError(getLoyaltyError(requestError)) })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [companyId, cpf, token, customer.isActive, retry])

  const openCycle = cycleData?.cycles.find((cycle) => cycle.status === 'OPEN') ?? null
  const closedCycles = cycleData?.cycles.filter((cycle) => cycle.status === 'CLOSED') ?? []

  return <section className="loyalty-customer" aria-labelledby="customer-loyalty-title">
    <div><p className="eyebrow">Fidelidade</p><h3 id="customer-loyalty-title">Jornada do cliente</h3></div>
    <div className="loyalty-customer-summary"><dl>
      <div><dt>Progresso acumulado</dt><dd>{customer.journey?.progress ?? 'Não disponível'}</dd></div>
      <div><dt>Regularidade atual</dt><dd>{customer.journey?.regularity ?? 'Não disponível'}</dd></div>
    </dl></div>
    {!customer.isActive && <p className="loyalty-notice">A API disponibiliza os ciclos somente para clientes ativos. Ative o cliente para consultar seus ciclos.</p>}
    {isLoading && <p className="loading-state" role="status">Carregando ciclos do cliente…</p>}
    {error && <div><p className="form-error" role="alert">{error}</p><button className="secondary-button" type="button" onClick={() => { setCycleData(null); setError(''); setIsLoading(true); setRetry((current) => current + 1) }}>Tentar novamente</button></div>}
    {customer.isActive && !isLoading && !error && cycleData && <><CurrentCycle cycle={openCycle} /><CycleHistory cycles={closedCycles} customerName={customer.person.name} /></>}
  </section>
}

function CurrentCycle({ cycle }: { cycle: CustomerCycle | null }) {
  if (!cycle) return <section className="loyalty-current-cycle"><h4>Ciclo atual</h4><p>Não há ciclo aberto para este cliente no momento.</p></section>
  return <section className="loyalty-current-cycle"><p className="eyebrow">Em andamento</p><h4>Ciclo atual</h4><p><time dateTime={cycle.cycleStart}>{formatDate(cycle.cycleStart)}</time> – <time dateTime={cycle.cycleEnd}>{formatDate(cycle.cycleEnd)}</time></p><p className="loyalty-cycle-note">Os indicadores do ciclo são calculados pelo servidor no fechamento.</p></section>
}

function CycleHistory({ cycles, customerName }: { cycles: CustomerCycle[]; customerName: string }) {
  return <section className="loyalty-history" aria-labelledby="loyalty-history-title"><h4 id="loyalty-history-title">Histórico de ciclos</h4>{cycles.length === 0 ? <p className="empty-state">Este cliente ainda não possui ciclos fechados.</p> : <div className="loyalty-table-wrapper"><table><caption>Ciclos fechados de {customerName}</caption><thead><tr><th scope="col">Período</th><th scope="col">Dias com compra</th><th scope="col">Total</th><th scope="col">Frequência</th><th scope="col">Valor</th><th scope="col">Regularidade</th><th scope="col">Progresso</th></tr></thead><tbody>{cycles.map((cycle) => <tr key={cycle.idCustomerCycle}><td><time dateTime={cycle.cycleStart}>{formatDate(cycle.cycleStart)}</time><span aria-hidden="true"> – </span><time dateTime={cycle.cycleEnd}>{formatDate(cycle.cycleEnd)}</time></td><td>{cycle.purchaseDays ?? 'Não disponível'}</td><td>{cycle.totalAmount === null ? 'Não disponível' : formatCurrency(cycle.totalAmount)}</td><td>{formatFrequency(cycle.frequencyLevel)}</td><td>{formatValue(cycle.valueLevel)}</td><td>{cycle.regularityLevel ?? 'Não disponível'}</td><td>{cycle.progressEarned ?? 'Não disponível'}</td></tr>)}</tbody></table></div>}</section>
}

function formatDate(value: string) { const date = value.slice(0, 10); return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`)) }
function formatCurrency(value: string) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value)) }
function formatFrequency(value: LoyaltyLevel | null) { return value === 'LOW' ? 'Baixa' : value === 'MEDIUM' ? 'Média' : value === 'HIGH' ? 'Alta' : 'Não disponível' }
function formatValue(value: LoyaltyLevel | null) { return value === 'LOW' ? 'Baixo' : value === 'MEDIUM' ? 'Médio' : value === 'HIGH' ? 'Alto' : 'Não disponível' }
function getLoyaltyError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 400) return 'Não foi possível consultar os ciclos com os dados deste cliente.'
    if (error.status === 401) return 'Sua sessão expirou. Entre novamente.'
    if (error.status === 403) return 'Você não possui permissão para consultar a fidelidade desta empresa.'
    if (error.status === 404) return 'Os ciclos deste cliente não estão disponíveis. A API exige um cliente e um vínculo com a empresa ativos.'
  }
  return 'Não foi possível carregar os ciclos agora. Verifique sua conexão e tente novamente.'
}
