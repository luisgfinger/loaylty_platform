import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { createEmployee, getEmployeeByCpf, getEmployees, updateEmployee } from '../../api/employees.api'
import { ApiError } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import type { CreateEmployeeInput, EmployeeDetail, EmployeeListItem, UpdateEmployeeInput } from '../../types/employee'
import { formatCpf, getCpfValidationError, normalizeCpf } from '../../utils/cpf'
import { toast } from 'react-toastify'

type View = 'list' | 'create' | 'detail' | 'edit'

interface EmployeeFormValues {
  cpf: string
  name: string
  email: string
  phoneNumber: string
  dateOfBirth: string
  admissionDate: string
  terminationDate: string
  role: string
}

const emptyForm: EmployeeFormValues = { cpf: '', name: '', email: '', phoneNumber: '', dateOfBirth: '', admissionDate: '', terminationDate: '', role: '' }

export function EmployeesPage() {
  const { session } = useAuth()
  const [employees, setEmployees] = useState<EmployeeListItem[]>([])
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null)
  const [view, setView] = useState<View>('list')
  const [form, setForm] = useState<EmployeeFormValues>(emptyForm)
  const [error, setError] = useState('')
  const [cpfError, setCpfError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [confirmInactivation, setConfirmInactivation] = useState(false)
  const companyId = session?.company.idCompany ?? 0
  const token = session?.token ?? ''
  const currentEmployeeId = session?.employee.idCompanyEmployee
  const isEditingSelf = employee?.idCompanyEmployee === currentEmployeeId

  const loadEmployees = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getEmployees(companyId, token)
      setEmployees(result.employees)
    } catch (requestError) {
      setError(getEmployeeError(requestError, 'list'))
    } finally {
      setIsLoading(false)
    }
  }, [companyId, token])

  useEffect(() => { void Promise.resolve().then(loadEmployees) }, [loadEmployees])

  function clearFeedback() {
    setError('')
  }

  function openCreate() {
    clearFeedback()
    setForm(emptyForm)
    setCpfError('')
    setEmployee(null)
    setView('create')
  }

  async function openDetail(cpf: string) {
    clearFeedback()
    setIsLoading(true)
    try {
      setEmployee(await getEmployeeByCpf(companyId, cpf, token))
      setConfirmInactivation(false)
      setView('detail')
    } catch (requestError) {
      setError(getEmployeeError(requestError, 'detail'))
    } finally {
      setIsLoading(false)
    }
  }

  function openEdit() {
    if (!employee) return
    clearFeedback()
    const person = employee.companyPerson.person
    setForm({ cpf: person.cpf, name: person.name, email: person.email ?? '', phoneNumber: person.phoneNumber ?? '', dateOfBirth: dateInput(person.dateOfBirth), admissionDate: dateInput(employee.admissionDate), terminationDate: dateInput(employee.terminationDate), role: employee.role?.role ?? '' })
    setView('edit')
  }

  function updateForm<K extends keyof EmployeeFormValues>(key: K, value: EmployeeFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submitEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    clearFeedback()
    setCpfError('')
    const validationError = view === 'create' ? getCpfValidationError(form.cpf) : null
    if (validationError) {
      setCpfError(validationError)
      return
    }
    if (form.name.trim().length < 2) {
      setError('Informe o nome completo do funcionário.')
      return
    }

    setIsSaving(true)
    try {
      if (view === 'create') {
        const data: CreateEmployeeInput = { cpf: normalizeCpf(form.cpf), name: form.name.trim(), email: form.email.trim() || undefined, phoneNumber: form.phoneNumber.replace(/\D/g, '') || undefined, dateOfBirth: form.dateOfBirth || undefined, admissionDate: form.admissionDate || undefined, role: form.role.trim() || undefined }
        await createEmployee(companyId, data, token)
        await loadEmployees()
        setView('list')
        toast.success('Funcionário cadastrado com sucesso.')
      } else if (employee) {
        const data: UpdateEmployeeInput = { name: form.name.trim(), email: form.email.trim() || null, phoneNumber: form.phoneNumber.replace(/\D/g, '') || null, dateOfBirth: form.dateOfBirth || null, admissionDate: form.admissionDate || null, terminationDate: form.terminationDate || null }
        if (!isEditingSelf) data.role = form.role.trim() || null
        await updateEmployee(companyId, employee.companyPerson.person.cpf, data, token)
        await refreshEmployee(employee.companyPerson.person.cpf)
        await loadEmployees()
        setView('detail')
        toast.success('Funcionário atualizado com sucesso.')
      }
    } catch (requestError) {
      toast.error(getEmployeeError(requestError, view === 'create' ? 'create' : 'update'))
    } finally {
      setIsSaving(false)
    }
  }

  async function refreshEmployee(cpf: string) {
    setEmployee(await getEmployeeByCpf(companyId, cpf, token))
  }

  async function changeStatus() {
    if (!employee) return
    clearFeedback()
    setIsSaving(true)
    const nextIsActive = !employee.isActive
    try {
      await updateEmployee(companyId, employee.companyPerson.person.cpf, { isActive: nextIsActive }, token)
      await refreshEmployee(employee.companyPerson.person.cpf)
      await loadEmployees()
      toast.success(nextIsActive ? 'Funcionário ativado com sucesso.' : 'Funcionário inativado com sucesso.')
    } catch (requestError) {
      const message = getEmployeeError(requestError, 'status')
      if (isEditingSelf && !nextIsActive) toast.warning(message)
      else toast.error(message)
    } finally {
      setIsSaving(false)
      setConfirmInactivation(false)
    }
  }

  if (isLoading && view === 'list') return <section className="employees-page"><p className="loading-state" role="status">Carregando funcionários…</p></section>

  return <section className="employees-page" aria-labelledby="employees-title">
    {error && <p className="form-error" role="alert">{error}</p>}

    {view === 'list' && <EmployeeList employees={employees} onCreate={openCreate} onOpen={openDetail} />}
    {view === 'create' && <EmployeeForm title="Cadastrar funcionário" submitLabel="Cadastrar funcionário" form={form} isSaving={isSaving} cpfError={cpfError} onChange={updateForm} onSubmit={submitEmployee} onCancel={() => setView('list')} />}
    {view === 'detail' && employee && <EmployeeDetails employee={employee} isSaving={isSaving} isEditingSelf={isEditingSelf} isConfirmingInactivation={confirmInactivation} onBack={() => setView('list')} onEdit={openEdit} onRequestInactivation={() => setConfirmInactivation(true)} onCancelInactivation={() => setConfirmInactivation(false)} onChangeStatus={changeStatus} />}
    {view === 'edit' && employee && <EmployeeForm title="Editar funcionário" submitLabel="Salvar alterações" form={form} isSaving={isSaving} disableCpf disableRole={isEditingSelf} showTermination selfRoleMessage={isEditingSelf ? 'Seu próprio cargo ADMIN não pode ser removido.' : undefined} onChange={updateForm} onSubmit={submitEmployee} onCancel={() => setView('detail')} />}
  </section>
}

function EmployeeList({ employees, onCreate, onOpen }: { employees: EmployeeListItem[]; onCreate: () => void; onOpen: (cpf: string) => void }) {
  return <><div className="page-intro page-intro--with-action"><div><p className="eyebrow">Administração</p><h1 id="employees-title">Funcionários</h1><p>Gerencie os funcionários e os acessos administrativos da empresa.</p></div><button className="primary-button" type="button" onClick={onCreate}>Cadastrar funcionário</button></div>{employees.length === 0 ? <section className="employee-empty" aria-labelledby="employee-empty-title"><h2 id="employee-empty-title">Nenhum funcionário cadastrado.</h2><p>Cadastre o primeiro funcionário para começar a organizar a equipe.</p><button className="primary-button" type="button" onClick={onCreate}>Cadastrar funcionário</button></section> : <div className="employee-table-wrapper"><table className="employee-table"><caption>Funcionários da empresa</caption><thead><tr><th scope="col">Nome</th><th scope="col">Cargo</th><th scope="col">Telefone</th><th scope="col">Status</th><th scope="col">Admissão</th><th scope="col"><span className="visually-hidden">Ações</span></th></tr></thead><tbody>{employees.map((item) => <tr key={item.idCompanyEmployee}><td><strong>{item.person.name}</strong><small>{formatCpf(item.person.cpf)}</small></td><td>{item.role?.role ?? 'Não informado'}</td><td>{item.person.phoneNumber ?? 'Não informado'}</td><td><span className={item.isActive ? 'status-badge' : 'status-badge status-badge--inactive'}>{item.isActive ? 'Ativo' : 'Inativo'}</span></td><td>{formatDate(item.admissionDate)}</td><td><button className="secondary-button" type="button" onClick={() => onOpen(item.person.cpf)}>Ver detalhes</button></td></tr>)}</tbody></table></div>}</>
}

function EmployeeDetails({ employee, isSaving, isEditingSelf, isConfirmingInactivation, onBack, onEdit, onRequestInactivation, onCancelInactivation, onChangeStatus }: { employee: EmployeeDetail; isSaving: boolean; isEditingSelf: boolean; isConfirmingInactivation: boolean; onBack: () => void; onEdit: () => void; onRequestInactivation: () => void; onCancelInactivation: () => void; onChangeStatus: () => void }) {
  const person = employee.companyPerson.person
  return <><div className="page-intro page-intro--with-action"><div><p className="eyebrow">Funcionário</p><h1 id="employees-title">{person.name}</h1><p>{formatCpf(person.cpf)}</p></div><button className="secondary-button" type="button" onClick={onBack}>Voltar para lista</button></div><article className="employee-card"><div className="employee-card-header"><div><p className={employee.isActive ? 'status-badge' : 'status-badge status-badge--inactive'}>{employee.isActive ? 'Ativo' : 'Inativo'}</p></div><div className="employee-actions"><button className="secondary-button" type="button" onClick={onEdit} disabled={isSaving}>Editar funcionário</button>{employee.isActive ? <button className="danger-button" type="button" onClick={onRequestInactivation} disabled={isSaving || isEditingSelf}>Inativar funcionário</button> : <button className="secondary-button" type="button" onClick={onChangeStatus} disabled={isSaving}>Ativar funcionário</button>}</div></div>{isEditingSelf && <p className="employee-note">Você não pode inativar seu próprio usuário administrador.</p>}{isConfirmingInactivation && <section className="employee-confirmation" aria-labelledby="employee-confirmation-title"><h2 id="employee-confirmation-title">Inativar funcionário?</h2><p>Deseja continuar?</p><div className="form-actions"><button className="danger-button" type="button" onClick={onChangeStatus} disabled={isSaving}>{isSaving ? 'Salvando…' : 'Confirmar inativação'}</button><button className="secondary-button" type="button" onClick={onCancelInactivation} disabled={isSaving}>Cancelar</button></div></section>}<dl className="employee-details"><Detail label="E-mail" value={person.email ?? 'Não informado'} /><Detail label="Telefone" value={person.phoneNumber ?? 'Não informado'} /><Detail label="Cargo" value={employee.role?.role ?? 'Não informado'} /><Detail label="Admissão" value={formatDate(employee.admissionDate)} /><Detail label="Desligamento" value={formatDate(employee.terminationDate)} /><Detail label="Também é cliente" value={employee.companyPerson.customer ? 'Sim' : 'Não'} /></dl></article></>
}

function EmployeeForm({ title, submitLabel, form, isSaving, cpfError, disableCpf = false, disableRole = false, showTermination = false, selfRoleMessage, onChange, onSubmit, onCancel }: { title: string; submitLabel: string; form: EmployeeFormValues; isSaving: boolean; cpfError?: string; disableCpf?: boolean; disableRole?: boolean; showTermination?: boolean; selfRoleMessage?: string; onChange: <K extends keyof EmployeeFormValues>(key: K, value: EmployeeFormValues[K]) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  return <form className="employee-form" onSubmit={onSubmit} noValidate><div><p className="eyebrow">Administração</p><h1 id="employees-title">{title}</h1><p className="form-description">Campos marcados com * são obrigatórios.</p></div><div className="employee-form-grid"><Field id="employee-cpf" label="CPF *" value={form.cpf} disabled={isSaving || disableCpf} error={cpfError} onChange={(value) => onChange('cpf', formatCpf(value))} /><Field id="employee-name" label="Nome completo *" value={form.name} disabled={isSaving} onChange={(value) => onChange('name', value)} /><Field id="employee-email" label="E-mail" type="email" value={form.email} disabled={isSaving} onChange={(value) => onChange('email', value)} /><Field id="employee-phone" label="Telefone" type="tel" value={form.phoneNumber} disabled={isSaving} onChange={(value) => onChange('phoneNumber', value)} /><Field id="employee-birthdate" label="Data de nascimento" type="date" value={form.dateOfBirth} disabled={isSaving} onChange={(value) => onChange('dateOfBirth', value)} /><Field id="employee-admission" label="Data de admissão" type="date" value={form.admissionDate} disabled={isSaving} onChange={(value) => onChange('admissionDate', value)} />{showTermination && <Field id="employee-termination" label="Data de desligamento" type="date" value={form.terminationDate} disabled={isSaving} onChange={(value) => onChange('terminationDate', value)} />}<Field id="employee-role" label="Cargo" value={form.role} disabled={isSaving || disableRole} onChange={(value) => onChange('role', value)} />{selfRoleMessage && <p className="employee-note">{selfRoleMessage}</p>}</div><div className="form-actions"><button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? 'Salvando…' : submitLabel}</button><button className="secondary-button" type="button" onClick={onCancel} disabled={isSaving}>Cancelar</button></div></form>
}

function Field({ id, label, type = 'text', value, disabled, error, onChange }: { id: string; label: string; type?: string; value: string; disabled: boolean; error?: string; onChange: (value: string) => void }) {
  return <div className="form-field"><label htmlFor={id}>{label}</label><input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} required={label.endsWith('*')} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />{error && <p className="form-field-error" id={`${id}-error`}>{error}</p>}</div>
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>
}


function dateInput(value: string | null) {
  return value ? value.slice(0, 10) : ''
}

function formatDate(value: string | null) {
  if (!value) return 'Não informado'
  const date = value.slice(0, 10)
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))
}

function getEmployeeError(error: unknown, action: 'list' | 'detail' | 'create' | 'update' | 'status') {
  if (error instanceof ApiError) {
    if (error.status === 400) return 'Revise os dados informados e tente novamente.'
    if (error.status === 401) return 'Sua sessão expirou. Entre novamente.'
    if (error.status === 403) return 'Você não possui permissão para administrar funcionários nesta empresa.'
    if (error.status === 404) return action === 'list' ? 'Empresa não encontrada.' : 'Funcionário não encontrado nesta empresa.'
    if (error.status === 409) {
      if (action === 'create') return 'Funcionário já cadastrado nesta empresa.'
      if (action === 'status') return 'Você não pode inativar o próprio usuário administrador.'
      if (action === 'update') return 'Você não pode remover o próprio cargo de ADMIN.'
    }
  }
  return 'Não foi possível concluir a operação agora. Verifique sua conexão e tente novamente.'
}
