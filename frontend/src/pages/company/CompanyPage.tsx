import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { getCompany, updateCompany } from '../../api/companies.api'
import { ApiError } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import type { Company, UpdateCompanyInput } from '../../types/company'
import { toast } from 'react-toastify'

interface CompanyFormValues {
  name: string
  cnpj: string
  ie: string
  email: string
  phoneNumber: string
  address: string
}

const emptyForm: CompanyFormValues = { name: '', cnpj: '', ie: '', email: '', phoneNumber: '', address: '' }

export function CompanyPage() {
  const { session } = useAuth()
  const companyId = session?.company.idCompany ?? 0
  const token = session?.token ?? ''
  const [company, setCompany] = useState<Company | null>(null)
  const [form, setForm] = useState<CompanyFormValues>(emptyForm)
  const [savedForm, setSavedForm] = useState<CompanyFormValues>(emptyForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const loadCompany = useCallback(async () => {
    setIsLoading(true)
    try {
      const currentCompany = await getCompany(companyId, token)
      applyCompany(currentCompany)
    } catch (requestError) {
      setError(getCompanyError(requestError))
    } finally {
      setIsLoading(false)
    }
  }, [companyId, token])

  useEffect(() => { void Promise.resolve().then(loadCompany) }, [loadCompany])

  const isDirty = useMemo(() => !sameCompanyData(form, savedForm), [form, savedForm])

  function applyCompany(currentCompany: Company) {
    const nextForm = formFromCompany(currentCompany)
    setCompany(currentCompany)
    setForm(nextForm)
    setSavedForm(nextForm)
  }

  function updateForm<K extends keyof CompanyFormValues>(key: K, value: CompanyFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!company || !isDirty) return

    const data = changedCompanyData(form, savedForm)
    if (data.name !== undefined && data.name.length < 2) {
      setError('Informe um nome de empresa com pelo menos 2 caracteres.')
      return
    }
    if (data.cnpj !== undefined && data.cnpj.length !== 14) {
      setError('Informe um CNPJ com 14 dígitos.')
      return
    }

    setIsSaving(true)
    try {
      applyCompany(await updateCompany(companyId, data, token))
      toast.success('Dados da empresa atualizados com sucesso.')
    } catch (requestError) {
      toast.error(getCompanyError(requestError))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <section className="company-page"><p className="loading-state" role="status">Carregando dados da empresa…</p></section>

  return <section className="company-page" aria-labelledby="company-title">
    <header className="page-intro">
      <p className="eyebrow">Administração</p>
      <h1 id="company-title">Empresa</h1>
      <p>Consulte e mantenha os dados da sua empresa.</p>
    </header>

    {error && <p className="form-error" role="alert">{error}</p>}

    {!company ? <section className="company-unavailable" aria-labelledby="company-unavailable-title"><h2 id="company-unavailable-title">Não foi possível carregar a empresa.</h2><p>Verifique sua conexão e tente novamente.</p><button className="secondary-button" type="button" onClick={() => { setError(''); void loadCompany() }}>Tentar novamente</button></section> : <form className="company-form" onSubmit={submit} noValidate>
      <fieldset>
        <legend>Informações gerais</legend>
        <div className="company-form-grid">
          <Field id="company-name" label="Nome da empresa *" value={form.name} disabled={isSaving} onChange={(value) => updateForm('name', value)} />
          <Field id="company-cnpj" label="CNPJ *" value={form.cnpj} inputMode="numeric" disabled={isSaving} onChange={(value) => updateForm('cnpj', formatCnpj(value))} />
          <Field id="company-ie" label="Inscrição estadual (IE)" value={form.ie} disabled={isSaving} onChange={(value) => updateForm('ie', value)} />
        </div>
      </fieldset>

      <fieldset>
        <legend>Contato</legend>
        <div className="company-form-grid">
          <Field id="company-email" label="E-mail" type="email" value={form.email} disabled={isSaving} onChange={(value) => updateForm('email', value)} />
          <Field id="company-phone" label="Telefone" type="tel" inputMode="tel" value={form.phoneNumber} disabled={isSaving} onChange={(value) => updateForm('phoneNumber', formatPhone(value))} />
        </div>
      </fieldset>

      <fieldset>
        <legend>Endereço</legend>
        <Field id="company-address" label="Endereço" value={form.address} disabled={isSaving} onChange={(value) => updateForm('address', value)} />
      </fieldset>

      {isDirty && <p className="company-unsaved" id="company-unsaved" role="status">Existem alterações não salvas.</p>}
      <div className="form-actions"><button className="primary-button" type="submit" disabled={isSaving || !isDirty} aria-describedby={isDirty ? 'company-unsaved' : undefined}>{isSaving ? 'Salvando…' : 'Salvar alterações'}</button></div>
    </form>}
  </section>
}

function Field({ id, label, type = 'text', inputMode, value, disabled, onChange }: { id: string; label: string; type?: string; inputMode?: 'numeric' | 'tel'; value: string; disabled: boolean; onChange: (value: string) => void }) {
  return <div className="form-field"><label htmlFor={id}>{label}</label><input id={id} type={type} inputMode={inputMode} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} required={label.endsWith('*')} /></div>
}

function formFromCompany(company: Company): CompanyFormValues {
  return { name: company.name, cnpj: formatCnpj(company.cnpj), ie: company.ie ?? '', email: company.email ?? '', phoneNumber: formatPhone(company.phoneNumber ?? ''), address: company.address ?? '' }
}

function normalized(form: CompanyFormValues) {
  return { name: form.name.trim(), cnpj: form.cnpj.replace(/\D/g, ''), ie: form.ie.trim(), email: form.email.trim(), phoneNumber: form.phoneNumber.replace(/\D/g, ''), address: form.address.trim() }
}

function sameCompanyData(first: CompanyFormValues, second: CompanyFormValues) {
  const firstData = normalized(first)
  const secondData = normalized(second)
  return Object.keys(firstData).every((key) => firstData[key as keyof typeof firstData] === secondData[key as keyof typeof secondData])
}

function changedCompanyData(current: CompanyFormValues, saved: CompanyFormValues): UpdateCompanyInput {
  const currentData = normalized(current)
  const savedData = normalized(saved)
  const data: UpdateCompanyInput = {}
  if (currentData.name !== savedData.name) data.name = currentData.name
  if (currentData.cnpj !== savedData.cnpj) data.cnpj = currentData.cnpj
  if (currentData.ie !== savedData.ie) data.ie = currentData.ie || null
  if (currentData.email !== savedData.email) data.email = currentData.email || null
  if (currentData.phoneNumber !== savedData.phoneNumber) data.phoneNumber = currentData.phoneNumber || null
  if (currentData.address !== savedData.address) data.address = currentData.address || null
  return data
}

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  return digits.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2')
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  return digits.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2')
}

function getCompanyError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 400) return 'Revise os dados informados e tente novamente.'
    if (error.status === 401) return 'Sua sessão expirou. Entre novamente.'
    if (error.status === 403) return 'Você não possui permissão para administrar esta empresa.'
    if (error.status === 404) return 'Empresa não encontrada.'
    if (error.status === 409) return 'Este CNPJ já está utilizado por outra empresa.'
  }
  return 'Não foi possível concluir a operação agora. Verifique sua conexão e tente novamente.'
}
