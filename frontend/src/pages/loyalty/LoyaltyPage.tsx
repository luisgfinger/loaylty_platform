import { useState, type FormEvent } from 'react'
import { getCustomerCycles, getLoyaltySettings, saveLoyaltySettings } from '../../api/loyalty.api'
import { getCustomerByCpf } from '../../api/customers.api'
import { ApiError } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import type { Customer } from '../../types/customer'
import type { CustomerCycle, CustomerCyclesResponse, LoyaltyLevel, LoyaltySettings } from '../../types/loyalty'
import { formatCpf, getCpfValidationError } from '../../utils/cpf'
import { toast } from 'react-toastify'

type Area = 'overview' | 'customer' | 'settings'

interface SettingsForm { minimumMedianCustomers: string; fallbackMedian: string }

const emptySettings: SettingsForm = { minimumMedianCustomers: '', fallbackMedian: '' }

export function LoyaltyPage() {
  const { session } = useAuth()
  const companyId = session?.company.idCompany ?? 0
  const token = session?.token ?? ''
  const [area, setArea] = useState<Area>('overview')
  const [settings, setSettings] = useState<LoyaltySettings | null>(null)
  const [settingsForm, setSettingsForm] = useState<SettingsForm>(emptySettings)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [settingsMissing, setSettingsMissing] = useState(false)
  const [isLoadingSettings, setIsLoadingSettings] = useState(false)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [settingsError, setSettingsError] = useState('')

  async function openArea(nextArea: Area) {
    setArea(nextArea)
    if (nextArea === 'settings' && !settingsLoaded) await loadSettings()
  }

  async function loadSettings() {
    setSettingsError('')
    setIsLoadingSettings(true)
    try {
      const result = await getLoyaltySettings(companyId, token)
      applySettings(result)
      setSettingsMissing(false)
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 404) {
        setSettings(null)
        setSettingsForm(emptySettings)
        setSettingsMissing(true)
      } else {
        setSettingsError(getLoyaltyError(requestError, 'settings'))
      }
    } finally {
      setSettingsLoaded(true)
      setIsLoadingSettings(false)
    }
  }

  function applySettings(result: LoyaltySettings) {
    setSettings(result)
    setSettingsForm({ minimumMedianCustomers: String(result.minimumMedianCustomers), fallbackMedian: String(result.fallbackMedian) })
  }

  async function submitSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSettingsError('')
    const minimumMedianCustomers = Number(settingsForm.minimumMedianCustomers)
    const fallbackMedian = Number(settingsForm.fallbackMedian.replace(',', '.'))
    if (!Number.isInteger(minimumMedianCustomers) || minimumMedianCustomers < 1) {
      setSettingsError('Informe uma quantidade mínima de clientes maior ou igual a 1.')
      return
    }
    if (!Number.isFinite(fallbackMedian) || fallbackMedian <= 0) {
      setSettingsError('Informe uma mediana de referência maior que zero.')
      return
    }
    setIsSavingSettings(true)
    try {
      applySettings(await saveLoyaltySettings(companyId, { minimumMedianCustomers, fallbackMedian }, token))
      setSettingsMissing(false)
      toast.success('Configurações de fidelidade salvas com sucesso.')
    } catch (requestError) {
      toast.error(getLoyaltyError(requestError, 'settings'))
    } finally {
      setIsSavingSettings(false)
    }
  }

  return <section className="loyalty-page" aria-labelledby="loyalty-title">
    <header className="page-intro"><p className="eyebrow">Programa</p><h1 id="loyalty-title">Fidelidade</h1><p>Acompanhe a jornada dos clientes e mantenha as regras do programa.</p></header>
    <nav className="loyalty-navigation" aria-label="Áreas de fidelidade"><button type="button" className={area === 'overview' ? 'is-active' : ''} aria-current={area === 'overview' ? 'page' : undefined} onClick={() => void openArea('overview')}>Visão geral</button><button type="button" className={area === 'customer' ? 'is-active' : ''} aria-current={area === 'customer' ? 'page' : undefined} onClick={() => void openArea('customer')}>Cliente</button><button type="button" className={area === 'settings' ? 'is-active' : ''} aria-current={area === 'settings' ? 'page' : undefined} onClick={() => void openArea('settings')}>Configurações</button></nav>
    {area === 'overview' && <Overview onOpenCustomer={() => void openArea('customer')} />}
    {area === 'customer' && <CustomerLoyalty companyId={companyId} token={token} />}
    {area === 'settings' && <SettingsPanel form={settingsForm} settings={settings} isLoading={isLoadingSettings} isSaving={isSavingSettings} isMissing={settingsMissing} error={settingsError} onChange={(key, value) => setSettingsForm((current) => ({ ...current, [key]: value }))} onSubmit={submitSettings} onRetry={() => void loadSettings()} />}
  </section>
}

function Overview({ onOpenCustomer }: { onOpenCustomer: () => void }) {
  return <section className="loyalty-overview" aria-labelledby="loyalty-overview-title"><p className="eyebrow">Visão geral</p><h2 id="loyalty-overview-title">Acompanhamento do programa</h2><p>Os indicadores consolidados e o crescimento mensal ainda não podem ser exibidos com segurança: a API atual não fornece totais de clientes, compras por período ou clientes ativos.</p><p>Assim que esses dados agregados estiverem disponíveis, esta área poderá mostrar o crescimento da base sem estimativas ou números incompletos.</p><button className="secondary-button" type="button" onClick={onOpenCustomer}>Consultar fidelidade de um cliente</button></section>
}

function CustomerLoyalty({ companyId, token }: { companyId: number; token: string }) {
  const [cpf, setCpf] = useState('')
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [cycleData, setCycleData] = useState<CustomerCyclesResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [cpfError, setCpfError] = useState('')

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setCpfError('')
    const validationError = getCpfValidationError(cpf)
    if (validationError) {
      setCpfError(validationError)
      return
    }
    setIsLoading(true)
    setCustomer(null)
    setCycleData(null)
    try {
      const [customerResult, cyclesResult] = await Promise.all([getCustomerByCpf(companyId, cpf, token), getCustomerCycles(companyId, cpf, token)])
      setCustomer(customerResult)
      setCycleData(cyclesResult)
    } catch (requestError) {
      setError(getLoyaltyError(requestError, 'customer'))
    } finally {
      setIsLoading(false)
    }
  }

  const openCycle = cycleData?.cycles.find((cycle) => cycle.status === 'OPEN') ?? null
  const closedCycles = cycleData?.cycles.filter((cycle) => cycle.status === 'CLOSED') ?? []
  return <section className="loyalty-customer" aria-labelledby="loyalty-customer-title"><div><p className="eyebrow">Consulta individual</p><h2 id="loyalty-customer-title">Jornada do cliente</h2><p>Localize um cliente pelo CPF para consultar os ciclos calculados pelo programa.</p></div>{error && <p className="form-error" role="alert">{error}</p>}<form className="loyalty-search" onSubmit={search} noValidate><div className="form-field"><label htmlFor="loyalty-cpf">CPF do cliente</label><input id="loyalty-cpf" value={cpf} onChange={(event) => { setCpf(formatCpf(event.target.value)); setCpfError(''); setError(''); setCustomer(null); setCycleData(null) }} inputMode="numeric" placeholder="000.000.000-00" disabled={isLoading} required aria-invalid={Boolean(cpfError)} aria-describedby={cpfError ? 'loyalty-cpf-error' : undefined} />{cpfError && <p className="form-field-error" id="loyalty-cpf-error">{cpfError}</p>}</div><button className="primary-button" type="submit" disabled={isLoading}>{isLoading ? 'Consultando…' : 'Consultar fidelidade'}</button></form>{isLoading && <p className="loading-state" role="status">Carregando jornada do cliente…</p>}{customer && cycleData && <><article className="loyalty-customer-summary" aria-labelledby="loyalty-customer-name"><p className="eyebrow">Cliente</p><h3 id="loyalty-customer-name">{cycleData.customer.name}</h3><p>{formatCpf(cycleData.customer.cpf)}</p><dl><div><dt>Progresso acumulado</dt><dd>{customer.journey?.progress ?? 'Não disponível'}</dd></div><div><dt>Regularidade atual</dt><dd>{customer.journey?.regularity ?? 'Não disponível'}</dd></div></dl></article><CurrentCycle cycle={openCycle} /><CycleHistory cycles={closedCycles} customerName={cycleData.customer.name} /></>}</section>
}

function CurrentCycle({ cycle }: { cycle: CustomerCycle | null }) {
  if (!cycle) return <section className="loyalty-current-cycle"><h3>Ciclo atual</h3><p>Não há ciclo aberto para este cliente no momento.</p></section>
  return <section className="loyalty-current-cycle"><p className="eyebrow">Em andamento</p><h3>Ciclo atual</h3><p><time dateTime={cycle.cycleStart}>{formatDate(cycle.cycleStart)}</time> – <time dateTime={cycle.cycleEnd}>{formatDate(cycle.cycleEnd)}</time></p><p className="loyalty-cycle-note">Os indicadores do ciclo são calculados pelo servidor no fechamento.</p></section>
}

function CycleHistory({ cycles, customerName }: { cycles: CustomerCycle[]; customerName: string }) {
  return <section className="loyalty-history" aria-labelledby="loyalty-history-title"><h3 id="loyalty-history-title">Histórico de ciclos</h3>{cycles.length === 0 ? <p className="empty-state">Este cliente ainda não possui ciclos fechados.</p> : <div className="loyalty-table-wrapper"><table><caption>Ciclos fechados de {customerName}</caption><thead><tr><th scope="col">Período</th><th scope="col">Dias com compra</th><th scope="col">Total</th><th scope="col">Frequência</th><th scope="col">Valor</th><th scope="col">Regularidade</th><th scope="col">Progresso</th></tr></thead><tbody>{cycles.map((cycle) => <tr key={cycle.idCustomerCycle}><td><time dateTime={cycle.cycleStart}>{formatDate(cycle.cycleStart)}</time><span aria-hidden="true"> – </span><time dateTime={cycle.cycleEnd}>{formatDate(cycle.cycleEnd)}</time></td><td>{cycle.purchaseDays ?? 'Não disponível'}</td><td>{cycle.totalAmount === null ? 'Não disponível' : formatCurrency(cycle.totalAmount)}</td><td>{formatFrequency(cycle.frequencyLevel)}</td><td>{formatValue(cycle.valueLevel)}</td><td>{cycle.regularityLevel ?? 'Não disponível'}</td><td>{cycle.progressEarned ?? 'Não disponível'}</td></tr>)}</tbody></table></div>}</section>
}

function SettingsPanel({ form, settings, isLoading, isSaving, isMissing, error, onChange, onSubmit, onRetry }: { form: SettingsForm; settings: LoyaltySettings | null; isLoading: boolean; isSaving: boolean; isMissing: boolean; error: string; onChange: (key: keyof SettingsForm, value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onRetry: () => void }) {
  if (isLoading) return <section className="loyalty-settings"><p className="loading-state" role="status">Carregando configurações…</p></section>
  if (error) return <section className="loyalty-settings"><p className="form-error" role="alert">{error}</p><button className="secondary-button" type="button" onClick={onRetry}>Tentar novamente</button></section>
  return <section className="loyalty-settings" aria-labelledby="loyalty-settings-title"><div><p className="eyebrow">Configurações</p><h2 id="loyalty-settings-title">Regras da mediana</h2><p>Esses parâmetros orientam os cálculos realizados pelo servidor. Revise os valores antes de salvar.</p></div>{isMissing && <p className="loyalty-notice" role="status">Nenhuma configuração foi registrada ainda. Informe os valores para criar a configuração da empresa.</p>}<form className="loyalty-settings-form" onSubmit={onSubmit} noValidate><div className="form-field"><label htmlFor="minimum-median-customers">Quantidade mínima de clientes</label><input id="minimum-median-customers" type="number" min="1" step="1" inputMode="numeric" value={form.minimumMedianCustomers} onChange={(event) => onChange('minimumMedianCustomers', event.target.value)} disabled={isSaving} required aria-describedby="minimum-median-customers-help" /><small id="minimum-median-customers-help">Quantidade mínima necessária para usar a mediana calculada da empresa.</small></div><div className="form-field"><label htmlFor="fallback-median">Mediana de referência (R$)</label><input id="fallback-median" inputMode="decimal" value={form.fallbackMedian} onChange={(event) => onChange('fallbackMedian', event.target.value)} disabled={isSaving} required aria-describedby="fallback-median-help" /><small id="fallback-median-help">Valor de referência usado quando não houver uma mediana confiável disponível.</small></div><div className="form-actions"><button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? 'Salvando…' : settings ? 'Salvar configurações' : 'Criar configurações'}</button></div></form></section>
}

function formatDate(value: string) { const date = value.slice(0, 10); return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`)) }
function formatCurrency(value: string) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value)) }
function formatFrequency(value: LoyaltyLevel | null) { return value === 'LOW' ? 'Baixa' : value === 'MEDIUM' ? 'Média' : value === 'HIGH' ? 'Alta' : 'Não disponível' }
function formatValue(value: LoyaltyLevel | null) { return value === 'LOW' ? 'Baixo' : value === 'MEDIUM' ? 'Médio' : value === 'HIGH' ? 'Alto' : 'Não disponível' }
function getLoyaltyError(error: unknown, area: 'customer' | 'settings') { if (error instanceof ApiError) { if (error.status === 400) return area === 'customer' ? 'Informe um CPF válido.' : 'Revise os valores informados e tente novamente.'; if (error.status === 401) return 'Sua sessão expirou. Entre novamente.'; if (error.status === 403) return 'Você não possui permissão para consultar a fidelidade desta empresa.'; if (error.status === 404) return area === 'customer' ? 'Cliente não encontrado nesta empresa.' : 'Configuração de fidelidade não encontrada.' } return 'Não foi possível concluir a operação agora. Verifique sua conexão e tente novamente.' }
