import { useState, type FormEvent } from 'react'
import { getLoyaltySettings, saveLoyaltySettings } from '../../api/loyalty.api'
import { ApiError } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import type { LoyaltySettings } from '../../types/loyalty'
import { toast } from 'react-toastify'

type Area = 'overview' | 'settings'

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
    <nav className="loyalty-navigation" aria-label="Áreas de fidelidade"><button type="button" className={area === 'overview' ? 'is-active' : ''} aria-current={area === 'overview' ? 'page' : undefined} onClick={() => void openArea('overview')}>Visão geral</button><button type="button" className={area === 'settings' ? 'is-active' : ''} aria-current={area === 'settings' ? 'page' : undefined} onClick={() => void openArea('settings')}>Configurações</button></nav>
    {area === 'overview' && <Overview />}
    {area === 'settings' && <SettingsPanel form={settingsForm} settings={settings} isLoading={isLoadingSettings} isSaving={isSavingSettings} isMissing={settingsMissing} error={settingsError} onChange={(key, value) => setSettingsForm((current) => ({ ...current, [key]: value }))} onSubmit={submitSettings} onRetry={() => void loadSettings()} />}
  </section>
}

function Overview() {
  return <section className="loyalty-overview" aria-labelledby="loyalty-overview-title"><p className="eyebrow">Visão geral</p><h2 id="loyalty-overview-title">Acompanhamento do programa</h2><p>Os indicadores consolidados e o crescimento mensal ainda não podem ser exibidos com segurança: a API atual não fornece totais de clientes, compras por período ou clientes ativos.</p><p>Assim que esses dados agregados estiverem disponíveis, esta área poderá mostrar o crescimento da base sem estimativas ou números incompletos.</p><p>Consulte dados cadastrais, recompensas e a jornada de fidelidade na área Clientes.</p><a className="secondary-button" href="/app/customers">Consultar cliente</a></section>
}

function SettingsPanel({ form, settings, isLoading, isSaving, isMissing, error, onChange, onSubmit, onRetry }: { form: SettingsForm; settings: LoyaltySettings | null; isLoading: boolean; isSaving: boolean; isMissing: boolean; error: string; onChange: (key: keyof SettingsForm, value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onRetry: () => void }) {
  if (isLoading) return <section className="loyalty-settings"><p className="loading-state" role="status">Carregando configurações…</p></section>
  if (error) return <section className="loyalty-settings"><p className="form-error" role="alert">{error}</p><button className="secondary-button" type="button" onClick={onRetry}>Tentar novamente</button></section>
  return <section className="loyalty-settings" aria-labelledby="loyalty-settings-title"><div><p className="eyebrow">Configurações</p><h2 id="loyalty-settings-title">Regras da mediana</h2><p>Esses parâmetros orientam os cálculos realizados pelo servidor. Revise os valores antes de salvar.</p></div>{isMissing && <p className="loyalty-notice" role="status">Nenhuma configuração foi registrada ainda. Informe os valores para criar a configuração da empresa.</p>}<form className="loyalty-settings-form" onSubmit={onSubmit} noValidate><div className="form-field"><label htmlFor="minimum-median-customers">Quantidade mínima de clientes</label><input id="minimum-median-customers" type="number" min="1" step="1" inputMode="numeric" value={form.minimumMedianCustomers} onChange={(event) => onChange('minimumMedianCustomers', event.target.value)} disabled={isSaving} required aria-describedby="minimum-median-customers-help" /><small id="minimum-median-customers-help">Quantidade mínima necessária para usar a mediana calculada da empresa.</small></div><div className="form-field"><label htmlFor="fallback-median">Mediana de referência (R$)</label><input id="fallback-median" inputMode="decimal" value={form.fallbackMedian} onChange={(event) => onChange('fallbackMedian', event.target.value)} disabled={isSaving} required aria-describedby="fallback-median-help" /><small id="fallback-median-help">Valor de referência usado quando não houver uma mediana confiável disponível.</small></div><div className="form-actions"><button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? 'Salvando…' : settings ? 'Salvar configurações' : 'Criar configurações'}</button></div></form></section>
}

function getLoyaltyError(error: unknown, area: 'customer' | 'settings') { if (error instanceof ApiError) { if (error.status === 400) return area === 'customer' ? 'Informe um CPF válido.' : 'Revise os valores informados e tente novamente.'; if (error.status === 401) return 'Sua sessão expirou. Entre novamente.'; if (error.status === 403) return 'Você não possui permissão para consultar a fidelidade desta empresa.'; if (error.status === 404) return area === 'customer' ? 'Cliente não encontrado nesta empresa.' : 'Configuração de fidelidade não encontrada.' } return 'Não foi possível concluir a operação agora. Verifique sua conexão e tente novamente.' }
