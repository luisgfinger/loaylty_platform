import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { createReward, createRewardCategory, getReward, getRewardCategories, getRewards, updateReward, updateRewardCategory } from '../../api/rewards.api'
import { ApiError } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import type { CreateRewardCategoryInput, CreateRewardInput, Reward, RewardCategory, UpdateRewardInput } from '../../types/reward'
import { toast } from 'react-toastify'
import { approveCustomerReward, denyCustomerReward, getPendingCustomerRewards } from '../../api/customer-rewards.api'
import type { ApproveCustomerRewardInput, PendingCustomerReward, RewardTier, RewardType, RedemptionTiming } from '../../types/customer-reward'
import { formatCpf } from '../../utils/cpf'

type Tab = 'rewards' | 'categories' | 'pending'
type View = 'list' | 'create' | 'detail' | 'edit'
type StatusTarget = { type: Tab; id: number; name: string; nextIsActive: boolean }

interface RewardFormValues { name: string; description: string; categoryId: string; costAmount: string }
interface CategoryFormValues { name: string; description: string }

const emptyRewardForm: RewardFormValues = { name: '', description: '', categoryId: '', costAmount: '' }
const emptyCategoryForm: CategoryFormValues = { name: '', description: '' }

export function RewardsPage() {
  const { session } = useAuth()
  const companyId = session?.company.idCompany ?? 0
  const token = session?.token ?? ''
  const [tab, setTab] = useState<Tab>('rewards')
  const [view, setView] = useState<View>('list')
  const [rewards, setRewards] = useState<Reward[]>([])
  const [categories, setCategories] = useState<RewardCategory[]>([])
  const [reward, setReward] = useState<Reward | null>(null)
  const [category, setCategory] = useState<RewardCategory | null>(null)
  const [rewardForm, setRewardForm] = useState<RewardFormValues>(emptyRewardForm)
  const [categoryForm, setCategoryForm] = useState<CategoryFormValues>(emptyCategoryForm)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loadError, setLoadError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [statusTarget, setStatusTarget] = useState<StatusTarget | null>(null)

  const loadCatalog = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const [rewardResult, categoryResult] = await Promise.all([getRewards(companyId, token), getRewardCategories(companyId, token)])
      setRewards(rewardResult.rewards)
      setCategories(categoryResult.categories)
    } catch (error) {
      setLoadError(getRewardsError(error, 'load'))
    } finally {
      setIsLoading(false)
    }
  }, [companyId, token])

  useEffect(() => { void Promise.resolve().then(loadCatalog) }, [loadCatalog])

  function selectTab(nextTab: Tab) {
    setTab(nextTab)
    setView('list')
    setReward(null)
    setCategory(null)
    setFieldErrors({})
    setStatusTarget(null)
  }

  function openCreate() {
    setFieldErrors({})
    setStatusTarget(null)
    if (tab === 'rewards') setRewardForm(emptyRewardForm)
    else setCategoryForm(emptyCategoryForm)
    setView('create')
  }

  async function openRewardDetail(rewardId: number) {
    setFieldErrors({})
    setStatusTarget(null)
    setIsLoading(true)
    try {
      setReward(await getReward(companyId, rewardId, token))
      setView('detail')
    } catch (error) {
      toast.error(getRewardsError(error, 'detail'))
    } finally {
      setIsLoading(false)
    }
  }

  function openRewardEdit(item: Reward) {
    setReward(item)
    setRewardForm({ name: item.name, description: item.description ?? '', categoryId: item.category?.idRewardCategory.toString() ?? '', costAmount: formatAmountInput(item.costAmount) })
    setFieldErrors({})
    setStatusTarget(null)
    setView('edit')
  }

  function openCategoryEdit(item: RewardCategory) {
    setCategory(item)
    setCategoryForm({ name: item.name, description: item.description ?? '' })
    setFieldErrors({})
    setStatusTarget(null)
    setView('edit')
  }

  function validate(name: string, description: string, kind: Tab, costAmount?: string) {
    const errors: Record<string, string> = {}
    if (!name.trim()) errors.name = kind === 'rewards' ? 'Informe o nome da recompensa.' : 'Informe o nome da categoria.'
    else if (name.trim().length > 100) errors.name = 'O nome deve possuir no máximo 100 caracteres.'
    if (description.trim().length > 255) errors.description = 'A descrição deve possuir no máximo 255 caracteres.'
    if (kind === 'rewards' && parseCostAmount(costAmount ?? '') === null) errors.costAmount = 'Informe um custo válido, igual ou maior que zero.'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function submitReward(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validate(rewardForm.name, rewardForm.description, 'rewards', rewardForm.costAmount)) return
    const costAmount = parseCostAmount(rewardForm.costAmount)
    if (costAmount === null) return
    setIsSaving(true)
    try {
      if (view === 'create') {
        const data: CreateRewardInput = { name: rewardForm.name.trim(), description: rewardForm.description.trim() || null, categoryId: rewardForm.categoryId ? Number(rewardForm.categoryId) : null, costAmount }
        await createReward(companyId, data, token)
        toast.success('Recompensa criada com sucesso.')
        setView('list')
      } else if (reward) {
        const data: UpdateRewardInput = { name: rewardForm.name.trim(), description: rewardForm.description.trim() || null, costAmount }
        const currentCategoryId = reward.category?.idRewardCategory.toString() ?? ''
        if (rewardForm.categoryId !== currentCategoryId) data.categoryId = rewardForm.categoryId ? Number(rewardForm.categoryId) : null
        const updated = await updateReward(companyId, reward.idReward, data, token)
        setReward(updated)
        toast.success('Recompensa atualizada com sucesso.')
        setView('detail')
      }
      await loadCatalog()
    } catch (error) {
      toast.error(getRewardsError(error, view === 'create' ? 'createReward' : 'updateReward'))
    } finally {
      setIsSaving(false)
    }
  }

  async function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validate(categoryForm.name, categoryForm.description, 'categories')) return
    setIsSaving(true)
    try {
      const data: CreateRewardCategoryInput = { name: categoryForm.name.trim(), description: categoryForm.description.trim() || null }
      if (view === 'create') {
        await createRewardCategory(companyId, data, token)
        toast.success('Categoria de recompensa criada com sucesso.')
        setView('list')
      } else if (category) {
        await updateRewardCategory(companyId, category.idRewardCategory, data, token)
        toast.success('Categoria de recompensa atualizada com sucesso.')
        setView('list')
      }
      await loadCatalog()
    } catch (error) {
      toast.error(getRewardsError(error, view === 'create' ? 'createCategory' : 'updateCategory'))
    } finally {
      setIsSaving(false)
    }
  }

  async function changeStatus() {
    if (!statusTarget) return
    setIsSaving(true)
    try {
      if (statusTarget.type === 'rewards') {
        const updated = await updateReward(companyId, statusTarget.id, { isActive: statusTarget.nextIsActive }, token)
        if (reward?.idReward === updated.idReward) setReward(updated)
        toast.success(statusTarget.nextIsActive ? 'Recompensa reativada com sucesso.' : 'Recompensa inativada com sucesso.')
      } else {
        await updateRewardCategory(companyId, statusTarget.id, { isActive: statusTarget.nextIsActive }, token)
        toast.success(statusTarget.nextIsActive ? 'Categoria de recompensa reativada com sucesso.' : 'Categoria de recompensa inativada com sucesso.')
      }
      setStatusTarget(null)
      await loadCatalog()
    } catch (error) {
      toast.error(getRewardsError(error, 'status'))
    } finally {
      setIsSaving(false)
    }
  }

  function requestStatus(type: Tab, id: number, name: string, nextIsActive: boolean) {
    if (nextIsActive) {
      setStatusTarget({ type, id, name, nextIsActive })
      return
    }
    setStatusTarget({ type, id, name, nextIsActive })
  }

  const selectedCategoryIsInactive = reward?.category ? categories.find((item) => item.idRewardCategory === reward.category?.idRewardCategory)?.isActive === false : false

  return <section className="rewards-page" aria-labelledby="rewards-title">
    <div className="page-intro"><p className="eyebrow">Catálogo</p><h1 id="rewards-title">Recompensas</h1><p>Gerencie os benefícios disponíveis para os clientes.</p></div>
    <div className="rewards-tabs" role="tablist" aria-label="Seções de recompensas">
      <button type="button" role="tab" id="rewards-tab" aria-selected={tab === 'rewards'} aria-controls="rewards-panel" className={tab === 'rewards' ? 'is-active' : ''} onClick={() => selectTab('rewards')}>Recompensas</button>
      <button type="button" role="tab" id="categories-tab" aria-selected={tab === 'categories'} aria-controls="categories-panel" className={tab === 'categories' ? 'is-active' : ''} onClick={() => selectTab('categories')}>Categorias</button>
      <button type="button" role="tab" id="pending-tab" aria-selected={tab === 'pending'} aria-controls="pending-panel" className={tab === 'pending' ? 'is-active' : ''} onClick={() => selectTab('pending')}>Pendentes</button>
    </div>
    {tab === 'pending' ? <div role="tabpanel" id="pending-panel" aria-labelledby="pending-tab"><PendingRewards companyId={companyId} token={token} /></div> : loadError ? <section className="rewards-unavailable" role="alert"><h2>Não foi possível carregar o catálogo.</h2><p>{loadError}</p><button className="secondary-button" type="button" onClick={() => void loadCatalog()}>Tentar novamente</button></section> : isLoading && view === 'list' ? <p className="loading-state" role="status">Carregando recompensas…</p> : <div role="tabpanel" id={tab === 'rewards' ? 'rewards-panel' : 'categories-panel'} aria-labelledby={tab === 'rewards' ? 'rewards-tab' : 'categories-tab'}>
      {statusTarget && <StatusConfirmation target={statusTarget} isSaving={isSaving} onCancel={() => setStatusTarget(null)} onConfirm={() => void changeStatus()} />}
      {tab === 'rewards' ? <>
        {view === 'list' && <RewardList rewards={rewards} categories={categories} onCreate={openCreate} onOpen={openRewardDetail} onEdit={openRewardEdit} onStatus={requestStatus} />}
        {view === 'create' && <RewardForm title="Nova recompensa" submitLabel="Criar recompensa" form={rewardForm} categories={categories} fieldErrors={fieldErrors} isSaving={isSaving} onChange={(key, value) => setRewardForm((current) => ({ ...current, [key]: value }))} onSubmit={submitReward} onCancel={() => setView('list')} />}
        {view === 'detail' && reward && <RewardDetails reward={reward} categoryInactive={selectedCategoryIsInactive} isSaving={isSaving} onBack={() => setView('list')} onEdit={() => openRewardEdit(reward)} onStatus={requestStatus} />}
        {view === 'edit' && reward && <RewardForm title="Editar recompensa" submitLabel="Salvar alterações" form={rewardForm} categories={categories} currentCategory={reward.category} fieldErrors={fieldErrors} isSaving={isSaving} onChange={(key, value) => setRewardForm((current) => ({ ...current, [key]: value }))} onSubmit={submitReward} onCancel={() => setView('detail')} />}
      </> : <>
        {view === 'list' && <CategoryList categories={categories} onCreate={openCreate} onEdit={openCategoryEdit} onStatus={requestStatus} />}
        {(view === 'create' || (view === 'edit' && category)) && <CategoryForm title={view === 'create' ? 'Nova categoria' : 'Editar categoria'} submitLabel={view === 'create' ? 'Criar categoria' : 'Salvar alterações'} form={categoryForm} fieldErrors={fieldErrors} isSaving={isSaving} onChange={(key, value) => setCategoryForm((current) => ({ ...current, [key]: value }))} onSubmit={submitCategory} onCancel={() => setView('list')} />}
      </>}
    </div>}
  </section>
}

function RewardList({ rewards, categories, onCreate, onOpen, onEdit, onStatus }: { rewards: Reward[]; categories: RewardCategory[]; onCreate: () => void; onOpen: (id: number) => void; onEdit: (reward: Reward) => void; onStatus: (type: Tab, id: number, name: string, next: boolean) => void }) {
  return <section className="rewards-section"><div className="page-section-heading"><div><h2>Recompensas</h2><p>Benefícios que podem ser disponibilizados no programa.</p></div><button className="primary-button" type="button" onClick={onCreate}>Nova recompensa</button></div>{rewards.length === 0 ? <EmptyState title="Nenhuma recompensa cadastrada." action="Criar primeira recompensa" onAction={onCreate} /> : <div className="rewards-table-wrapper"><table className="rewards-table"><caption>Recompensas da empresa</caption><thead><tr><th scope="col">Nome</th><th scope="col">Categoria</th><th scope="col">Descrição</th><th scope="col">Custo para a empresa</th><th scope="col">Status</th><th scope="col"><span className="visually-hidden">Ações</span></th></tr></thead><tbody>{rewards.map((item) => { const categoryInactive = item.category ? categories.find((category) => category.idRewardCategory === item.category?.idRewardCategory)?.isActive === false : false; return <tr key={item.idReward}><td><strong>{item.name}</strong></td><td>{item.category ? <>{item.category.name}{categoryInactive && <small className="reward-category-inactive">Inativa</small>}</> : 'Sem categoria'}</td><td>{item.description ?? 'Não informada'}</td><td>{formatCurrency(item.costAmount)}</td><td><StatusBadge active={item.isActive} /></td><td className="rewards-actions"><button className="secondary-button" type="button" onClick={() => onOpen(item.idReward)}>Ver detalhes</button><button className="secondary-button" type="button" onClick={() => onEdit(item)}>Editar</button><button className={item.isActive ? 'danger-button' : 'secondary-button'} type="button" onClick={() => onStatus('rewards', item.idReward, item.name, !item.isActive)}>{item.isActive ? 'Inativar' : 'Reativar'}</button></td></tr> })}</tbody></table></div>}</section>
}

function CategoryList({ categories, onCreate, onEdit, onStatus }: { categories: RewardCategory[]; onCreate: () => void; onEdit: (category: RewardCategory) => void; onStatus: (type: Tab, id: number, name: string, next: boolean) => void }) {
  return <section className="rewards-section"><div className="page-section-heading"><div><h2>Categorias de recompensa</h2><p>Organize o catálogo por tipos de benefício.</p></div><button className="primary-button" type="button" onClick={onCreate}>Nova categoria</button></div>{categories.length === 0 ? <EmptyState title="Nenhuma categoria cadastrada." action="Criar primeira categoria" onAction={onCreate} /> : <div className="rewards-table-wrapper"><table className="rewards-table"><caption>Categorias da empresa</caption><thead><tr><th scope="col">Nome</th><th scope="col">Descrição</th><th scope="col">Status</th><th scope="col"><span className="visually-hidden">Ações</span></th></tr></thead><tbody>{categories.map((item) => <tr key={item.idRewardCategory}><td><strong>{item.name}</strong></td><td>{item.description ?? 'Não informada'}</td><td><StatusBadge active={item.isActive} /></td><td className="rewards-actions"><button className="secondary-button" type="button" onClick={() => onEdit(item)}>Editar</button><button className={item.isActive ? 'danger-button' : 'secondary-button'} type="button" onClick={() => onStatus('categories', item.idRewardCategory, item.name, !item.isActive)}>{item.isActive ? 'Inativar' : 'Reativar'}</button></td></tr>)}</tbody></table></div>}</section>
}

function PendingRewards({ companyId, token }: { companyId: number; token: string }) {
  const [data, setData] = useState<{ rewardFundBalance: string; pendingRewards: PendingCustomerReward[] } | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [selected, setSelected] = useState<{ item: PendingCustomerReward; action: 'approve' | 'deny' } | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true); setError('')
    try { setData(await getPendingCustomerRewards(companyId, token)) } catch (requestError) { setError(getCustomerRewardError(requestError)) } finally { setIsLoading(false) }
  }, [companyId, token])

  useEffect(() => { void Promise.resolve().then(load) }, [load])
  async function approve(item: PendingCustomerReward, input: ApproveCustomerRewardInput) {
    try { await approveCustomerReward(companyId, item.idCustomerReward, input, token); toast.success('Recompensa aprovada com sucesso.'); setSelected(null); await load() } catch (requestError) { toast.error(getCustomerRewardError(requestError)) }
  }
  async function deny(item: PendingCustomerReward, decisionNote: string | null) {
    try { await denyCustomerReward(companyId, item.idCustomerReward, decisionNote, token); toast.success('Recompensa negada.'); setSelected(null); await load() } catch (requestError) { toast.error(getCustomerRewardError(requestError)) }
  }

  if (isLoading) return <p className="loading-state" role="status">Carregando pendências…</p>
  if (error) return <section className="rewards-unavailable" role="alert"><h2>Não foi possível carregar as pendências.</h2><p>{error}</p><button className="secondary-button" type="button" onClick={() => void load()}>Tentar novamente</button></section>
  if (!data) return null
  return <section className="rewards-section pending-rewards"><div className="page-section-heading"><div><p className="eyebrow">Fidelidade</p><h2>Pendentes</h2><p>Analise as recompensas aguardando uma decisão.</p></div><dl className="fund-balance"><div><dt>Saldo do programa</dt><dd>{formatCurrency(data.rewardFundBalance)}</dd></div></dl></div>{selected?.action === 'approve' && <ApprovalPanel item={selected.item} fundBalance={data.rewardFundBalance} companyId={companyId} token={token} onCancel={() => setSelected(null)} onSubmit={approve} />}{selected?.action === 'deny' && <DenialPanel item={selected.item} onCancel={() => setSelected(null)} onSubmit={deny} />}{data.pendingRewards.length === 0 ? <EmptyState title="Nenhuma recompensa pendente no momento." action="Atualizar" onAction={() => void load()} /> : <div className="rewards-table-wrapper"><table className="rewards-table"><caption>Recompensas pendentes da empresa</caption><thead><tr><th scope="col">Cliente</th><th scope="col">CPF</th><th scope="col">Data</th><th scope="col">Categoria sugerida</th><th scope="col"><span className="visually-hidden">Ações</span></th></tr></thead><tbody>{data.pendingRewards.map((item) => <tr key={item.idCustomerReward}><td><strong>{item.customer.name}</strong></td><td>{formatCpf(item.customer.cpf)}</td><td><time dateTime={item.earnedAt}>{formatDateTime(item.earnedAt)}</time></td><td>{tierLabel(item.suggestedTier)}</td><td className="rewards-actions"><button className="primary-button" type="button" onClick={() => setSelected({ item, action: 'approve' })}>Aprovar</button><button className="secondary-button" type="button" onClick={() => setSelected({ item, action: 'deny' })}>Negar</button></td></tr>)}</tbody></table></div>}</section>
}

function ApprovalPanel({ item, fundBalance, companyId, token, onCancel, onSubmit }: { item: PendingCustomerReward; fundBalance: string; companyId: number; token: string; onCancel: () => void; onSubmit: (item: PendingCustomerReward, input: ApproveCustomerRewardInput) => Promise<void> }) {
  const [rewardType, setRewardType] = useState<RewardType>('DIRECT'); const [finalTier, setFinalTier] = useState<RewardTier>(item.suggestedTier); const [timing, setTiming] = useState<RedemptionTiming>('IMMEDIATE'); const [rewardId, setRewardId] = useState(''); const [expiresOn, setExpiresOn] = useState(''); const [decisionNote, setDecisionNote] = useState(''); const [rewards, setRewards] = useState<Reward[]>([]); const [isLoading, setIsLoading] = useState(true); const [isSaving, setIsSaving] = useState(false); const [fieldError, setFieldError] = useState('')
  useEffect(() => { void getRewards(companyId, token).then((result) => setRewards(result.rewards)).catch((requestError) => setFieldError(getCustomerRewardError(requestError))).finally(() => setIsLoading(false)) }, [companyId, token])
  const availableRewards = rewards.filter((reward) => reward.isActive && tierFromCost(reward.costAmount) === finalTier)
  const selectedReward = availableRewards.find((reward) => reward.idReward === Number(rewardId))
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setFieldError(''); if (rewardType === 'DIRECT' && !selectedReward) { setFieldError('Selecione uma recompensa ativa desta faixa.'); return }; if (decisionNote.trim().length > 255) { setFieldError('A observação deve possuir no máximo 255 caracteres.'); return }; setIsSaving(true); try { await onSubmit(item, { rewardType, finalTier, ...(rewardType === 'DIRECT' ? { rewardId: selectedReward!.idReward } : {}), redemptionTiming: timing, expiresOn: expiresOn || null, decisionNote: decisionNote.trim() || null }) } finally { setIsSaving(false) } }
  return <form className="reward-confirmation approval-panel" onSubmit={submit} noValidate><div><p className="eyebrow">Cliente: {item.customer.name}</p><h2>Aprovar recompensa pendente</h2><p>Categoria sugerida: <strong>{tierLabel(item.suggestedTier)}</strong></p></div><div className="reward-form-grid"><div className="form-field"><label htmlFor="approval-type">Tipo de concessão</label><select id="approval-type" value={rewardType} disabled={isSaving} onChange={(event) => { setRewardType(event.target.value as RewardType); setRewardId('') }}><option value="DIRECT">Administrador escolhe a recompensa</option><option value="CHOICE">Cliente escolhe a recompensa</option></select></div><div className="form-field"><label htmlFor="approval-tier">Tier final</label><select id="approval-tier" value={finalTier} disabled={isSaving} onChange={(event) => { setFinalTier(event.target.value as RewardTier); setRewardId('') }}><option value="LOW">Baixa</option><option value="MEDIUM">Média</option><option value="HIGH">Alta</option></select></div>{rewardType === 'DIRECT' && <div className="form-field"><label htmlFor="approval-reward">Recompensa *</label><select id="approval-reward" value={rewardId} disabled={isSaving || isLoading} onChange={(event) => setRewardId(event.target.value)}><option value="">Selecione uma recompensa</option>{availableRewards.map((reward) => <option key={reward.idReward} value={reward.idReward}>{reward.name} — {formatCurrency(reward.costAmount)}</option>)}</select>{!isLoading && availableRewards.length === 0 && <small>Não há recompensas ativas nesta faixa.</small>}</div>}<div className="form-field"><label htmlFor="approval-timing">Disponibilidade</label><select id="approval-timing" value={timing} disabled={isSaving} onChange={(event) => setTiming(event.target.value as RedemptionTiming)}><option value="IMMEDIATE">Disponível imediatamente</option><option value="NEXT_PURCHASE">Após a próxima compra</option><option value="NEXT_PURCHASE_DAY">No próximo dia de compra</option></select></div><div className="form-field"><label htmlFor="approval-expiration">Expiração</label><input id="approval-expiration" type="date" value={expiresOn} disabled={isSaving} onChange={(event) => setExpiresOn(event.target.value)} /></div><TextAreaField id="approval-note" label="Observação" value={decisionNote} error={fieldError} disabled={isSaving} onChange={setDecisionNote} /></div>{rewardType === 'CHOICE' ? <p className="reward-choice-note">O valor necessário será reservado no fundo com base nas recompensas disponíveis desta faixa.</p> : selectedReward && <dl className="approval-balance"><div><dt>Custo da recompensa</dt><dd>{formatCurrency(selectedReward.costAmount)}</dd></div><div><dt>Saldo atual</dt><dd>{formatCurrency(fundBalance)}</dd></div><div><dt>Saldo estimado após aprovação</dt><dd>{formatCurrency(String(Number(fundBalance) - Number(selectedReward.costAmount)))}</dd></div></dl>}<FormActions isSaving={isSaving} submitLabel="Confirmar aprovação" onCancel={onCancel} /></form>
}

function DenialPanel({ item, onCancel, onSubmit }: { item: PendingCustomerReward; onCancel: () => void; onSubmit: (item: PendingCustomerReward, decisionNote: string | null) => Promise<void> }) { const [note, setNote] = useState(''); const [isSaving, setIsSaving] = useState(false); async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (note.trim().length > 255) return; setIsSaving(true); try { await onSubmit(item, note.trim() || null) } finally { setIsSaving(false) } } return <form className="reward-confirmation" onSubmit={submit}><h2>Negar recompensa pendente?</h2><p>A pendência de {item.customer.name} será cancelada.</p><TextAreaField id="denial-note" label="Motivo da recusa (opcional)" value={note} disabled={isSaving} onChange={setNote} /><FormActions isSaving={isSaving} submitLabel="Confirmar recusa" onCancel={onCancel} /></form> }

function RewardDetails({ reward, categoryInactive, isSaving, onBack, onEdit, onStatus }: { reward: Reward; categoryInactive: boolean; isSaving: boolean; onBack: () => void; onEdit: () => void; onStatus: (type: Tab, id: number, name: string, next: boolean) => void }) {
  return <section className="reward-details"><div className="page-section-heading"><div><p className="eyebrow">Recompensa</p><h2>{reward.name}</h2></div><button className="secondary-button" type="button" onClick={onBack}>Voltar para lista</button></div><div className="reward-details-actions"><button className="secondary-button" type="button" onClick={onEdit} disabled={isSaving}>Editar recompensa</button><button className={reward.isActive ? 'danger-button' : 'secondary-button'} type="button" onClick={() => onStatus('rewards', reward.idReward, reward.name, !reward.isActive)} disabled={isSaving}>{reward.isActive ? 'Inativar recompensa' : 'Reativar recompensa'}</button></div><dl><div><dt>Status</dt><dd><StatusBadge active={reward.isActive} /></dd></div><div><dt>Categoria</dt><dd>{reward.category ? <>{reward.category.name}{categoryInactive && <small className="reward-category-inactive">Inativa</small>}</> : 'Sem categoria'}</dd></div><div><dt>Custo para a empresa</dt><dd>{formatCurrency(reward.costAmount)}</dd></div><div><dt>Descrição</dt><dd>{reward.description ?? 'Não informada'}</dd></div></dl></section>
}

function RewardForm({ title, submitLabel, form, categories, currentCategory, fieldErrors, isSaving, onChange, onSubmit, onCancel }: { title: string; submitLabel: string; form: RewardFormValues; categories: RewardCategory[]; currentCategory?: Reward['category']; fieldErrors: Record<string, string>; isSaving: boolean; onChange: (key: keyof RewardFormValues, value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  const availableCategories = categories.filter((item) => item.isActive || item.idRewardCategory === currentCategory?.idRewardCategory)
  const currentIsInactive = currentCategory && categories.find((item) => item.idRewardCategory === currentCategory.idRewardCategory)?.isActive === false
  return <form className="reward-form" onSubmit={onSubmit} noValidate><div><p className="eyebrow">Catálogo</p><h2>{title}</h2><p className="form-description">Campos marcados com * são obrigatórios.</p></div><div className="reward-form-grid"><TextField id="reward-name" label="Nome da recompensa *" value={form.name} error={fieldErrors.name} disabled={isSaving} onChange={(value) => onChange('name', value)} /><CurrencyField id="reward-cost-amount" label="Custo para a empresa *" value={form.costAmount} error={fieldErrors.costAmount} disabled={isSaving} onChange={(value) => onChange('costAmount', value)} /><div className="form-field"><label htmlFor="reward-category">Categoria</label><select id="reward-category" value={form.categoryId} disabled={isSaving} onChange={(event) => onChange('categoryId', event.target.value)}><option value="">Sem categoria</option>{availableCategories.map((item) => <option key={item.idRewardCategory} value={item.idRewardCategory}>{item.name}{!item.isActive ? ' (Inativa)' : ''}</option>)}</select>{currentIsInactive && <small>Esta categoria está inativa e só é mantida para preservar a associação atual.</small>}</div><TextAreaField id="reward-description" label="Descrição" value={form.description} error={fieldErrors.description} disabled={isSaving} onChange={(value) => onChange('description', value)} /></div><FormActions isSaving={isSaving} submitLabel={submitLabel} onCancel={onCancel} /></form>
}

function CategoryForm({ title, submitLabel, form, fieldErrors, isSaving, onChange, onSubmit, onCancel }: { title: string; submitLabel: string; form: CategoryFormValues; fieldErrors: Record<string, string>; isSaving: boolean; onChange: (key: keyof CategoryFormValues, value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  return <form className="reward-form" onSubmit={onSubmit} noValidate><div><p className="eyebrow">Catálogo</p><h2>{title}</h2><p className="form-description">Campos marcados com * são obrigatórios.</p></div><div className="reward-form-grid"><TextField id="category-name" label="Nome da categoria *" value={form.name} error={fieldErrors.name} disabled={isSaving} onChange={(value) => onChange('name', value)} /><TextAreaField id="category-description" label="Descrição" value={form.description} error={fieldErrors.description} disabled={isSaving} onChange={(value) => onChange('description', value)} /></div><FormActions isSaving={isSaving} submitLabel={submitLabel} onCancel={onCancel} /></form>
}

function TextField({ id, label, value, error, disabled, onChange }: { id: string; label: string; value: string; error?: string; disabled: boolean; onChange: (value: string) => void }) { return <div className="form-field"><label htmlFor={id}>{label}</label><input id={id} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />{error && <p className="form-field-error" id={`${id}-error`}>{error}</p>}</div> }
function CurrencyField({ id, label, value, error, disabled, onChange }: { id: string; label: string; value: string; error?: string; disabled: boolean; onChange: (value: string) => void }) { return <div className="form-field"><label htmlFor={id}>{label}</label><div className="currency-field"><span aria-hidden="true">R$</span><input id={id} value={value} disabled={disabled} inputMode="decimal" placeholder="0,00" onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} /></div>{error && <p className="form-field-error" id={`${id}-error`}>{error}</p>}</div> }
function TextAreaField({ id, label, value, error, disabled, onChange }: { id: string; label: string; value: string; error?: string; disabled: boolean; onChange: (value: string) => void }) { return <div className="form-field"><label htmlFor={id}>{label}</label><textarea id={id} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />{error && <p className="form-field-error" id={`${id}-error`}>{error}</p>}</div> }
function FormActions({ isSaving, submitLabel, onCancel }: { isSaving: boolean; submitLabel: string; onCancel: () => void }) { return <div className="form-actions"><button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? 'Salvando…' : submitLabel}</button><button className="secondary-button" type="button" onClick={onCancel} disabled={isSaving}>Cancelar</button></div> }
function EmptyState({ title, action, onAction }: { title: string; action: string; onAction: () => void }) { return <section className="rewards-empty"><h3>{title}</h3><button className="primary-button" type="button" onClick={onAction}>{action}</button></section> }
function StatusBadge({ active }: { active: boolean }) { return <span className={active ? 'status-badge' : 'status-badge status-badge--inactive'}>{active ? 'Ativa' : 'Inativa'}</span> }
function StatusConfirmation({ target, isSaving, onCancel, onConfirm }: { target: StatusTarget; isSaving: boolean; onCancel: () => void; onConfirm: () => void }) { const action = target.nextIsActive ? 'Reativar' : 'Inativar'; const label = target.type === 'rewards' ? 'recompensa' : 'categoria'; return <section className="reward-confirmation" aria-labelledby="reward-confirmation-title"><h2 id="reward-confirmation-title">{action} {label}?</h2><p>{target.nextIsActive ? `Deseja reativar “${target.name}”?` : `“${target.name}” deixará de estar disponível para novas utilizações. Deseja continuar?`}</p><div className="form-actions"><button className={target.nextIsActive ? 'primary-button' : 'danger-button'} type="button" onClick={onConfirm} disabled={isSaving}>{isSaving ? 'Salvando…' : `Confirmar ${target.nextIsActive ? 'reativação' : 'inativação'}`}</button><button className="secondary-button" type="button" onClick={onCancel} disabled={isSaving}>Cancelar</button></div></section> }

function tierFromCost(costAmount: string): RewardTier { const amount = Number(costAmount); return amount <= 10 ? 'LOW' : amount <= 50 ? 'MEDIUM' : 'HIGH' }
function tierLabel(tier: RewardTier | null) { return tier === 'LOW' ? 'Baixa' : tier === 'MEDIUM' ? 'Média' : tier === 'HIGH' ? 'Alta' : 'Não definida' }
function formatDateTime(value: string) { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }

function getCustomerRewardError(error: unknown) {
  if (error instanceof ApiError) {
    const messages: Record<string, string> = {
      'A recompensa escolhida não pertence à faixa selecionada': 'A recompensa escolhida não pertence à faixa selecionada.',
      'Não existem recompensas ativas nessa faixa': 'Não há recompensas ativas disponíveis nesta faixa.',
      'Recompensa pendente não encontrada': 'Esta pendência não está mais disponível.',
      'Recompensa não encontrada ou inativa': 'Recompensa não encontrada ou inativa.',
      'Data de expiração inválida': 'Data de expiração inválida.',
      'A recompensa expiraria antes de poder ser resgatada': 'A data de expiração é anterior à primeira data possível de resgate.',
    }
    if (messages[error.message]) return messages[error.message]
    if (error.status === 401) return 'Sua sessão expirou. Entre novamente.'
    if (error.status === 403) return 'Você não possui permissão para realizar esta ação.'
    if (error.status === 400) return 'Revise os dados informados e tente novamente.'
  }
  return 'Não foi possível concluir a operação agora. Verifique sua conexão e tente novamente.'
}

function parseCostAmount(value: string) {
  const normalizedValue = value.trim()
  if (!/^\d+(?:[,.]\d{1,2})?$/.test(normalizedValue)) return null
  const costAmount = Number(normalizedValue.replace(',', '.'))
  return Number.isFinite(costAmount) && costAmount >= 0 ? costAmount : null
}

function formatAmountInput(value: string) {
  const amount = Number(value)
  return Number.isFinite(amount) ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) : ''
}

function formatCurrency(value: string) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))
}

function getRewardsError(error: unknown, action: 'load' | 'detail' | 'createReward' | 'updateReward' | 'createCategory' | 'updateCategory' | 'status') {
  if (error instanceof ApiError) {
    if (error.status === 400) return 'Revise os dados informados e tente novamente.'
    if (error.status === 401) return 'Sua sessão expirou. Entre novamente.'
    if (error.status === 403) return 'Você não possui permissão para administrar recompensas nesta empresa.'
    if (error.status === 404) {
      if (action === 'load') return 'Empresa não encontrada.'
      if (action === 'detail') return 'Recompensa não encontrada nesta empresa.'
      if (action === 'createReward' || action === 'updateReward') return 'A recompensa ou a categoria selecionada não foi encontrada ou está inativa.'
      return 'O item não foi encontrado nesta empresa.'
    }
    if (error.status === 409 && (action === 'createCategory' || action === 'updateCategory')) return 'Já existe uma categoria de recompensa com este nome.'
  }
  return 'Não foi possível concluir a operação agora. Verifique sua conexão e tente novamente.'
}
