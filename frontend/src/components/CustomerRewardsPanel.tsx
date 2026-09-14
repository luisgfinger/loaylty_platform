import { useCallback, useEffect, useState } from 'react'
import { getCustomerRewards, redeemCustomerReward, selectCustomerReward } from '../api/customer-rewards.api'
import { getRewards } from '../api/rewards.api'
import { ApiError } from '../api/client'
import type { CustomerReward, RewardTier } from '../types/customer-reward'
import type { Reward } from '../types/reward'
import { toast } from 'react-toastify'
import { buildRewardWhatsAppMessage, buildWhatsAppUrl, normalizeWhatsAppPhone } from '../utils/whatsapp'

interface CustomerRewardsPanelProps {
  companyId: number
  cpf: string
  token: string
  customerName: string
  customerPhone: string | null
  whatsappOptIn: boolean
}

export function CustomerRewardsPanel({ companyId, cpf, token, customerName, customerPhone, whatsappOptIn }: CustomerRewardsPanelProps) {
  const [rewards, setRewards] = useState<CustomerReward[]>([])
  const [catalog, setCatalog] = useState<Reward[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selecting, setSelecting] = useState<CustomerReward | null>(null)
  const [redeeming, setRedeeming] = useState<CustomerReward | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const [customerRewards, rewardCatalog] = await Promise.all([getCustomerRewards(companyId, cpf, token), getRewards(companyId, token)])
      setRewards(customerRewards.rewards)
      setCatalog(rewardCatalog.rewards)
    } catch (requestError) {
      setError(message(requestError))
    } finally {
      setIsLoading(false)
    }
  }, [companyId, cpf, token])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  async function selectReward(rewardId: number) {
    if (!selecting) return
    setIsSaving(true)
    try {
      await selectCustomerReward(companyId, selecting.idCustomerReward, rewardId, token)
      toast.success('Recompensa escolhida com sucesso.')
      setSelecting(null)
      await load()
    } catch (requestError) {
      toast.error(message(requestError))
    } finally {
      setIsSaving(false)
    }
  }

  async function redeem() {
    if (!redeeming) return
    setIsSaving(true)
    try {
      await redeemCustomerReward(companyId, redeeming.idCustomerReward, token)
      toast.success('Resgate registrado com sucesso.')
      setRedeeming(null)
      await load()
    } catch (requestError) {
      toast.error(message(requestError))
    } finally {
      setIsSaving(false)
    }
  }

  const choices = selecting ? catalog.filter((reward) => reward.isActive && tierFromCost(reward.costAmount) === selecting.finalTier) : []

  return <section className="customer-rewards" aria-labelledby="customer-rewards-title">
    <div><p className="eyebrow">Fidelidade</p><h3 id="customer-rewards-title">Recompensas</h3><p>Benefícios vinculados a este cliente.</p></div>
    {isLoading ? <p className="loading-state" role="status">Carregando recompensas…</p> : error ? <p className="form-error" role="alert">{error}</p> : rewards.length === 0 ? <p className="empty-state">Este cliente ainda não possui recompensas.</p> : <ul className="customer-rewards-list">
      {rewards.map((item) => <li key={item.idCustomerReward}><article>
        <div><strong>{item.reward?.name ?? (item.rewardType === 'CHOICE' ? 'Aguardando escolha da recompensa' : 'Recompensa pendente')}</strong><p><span className="status-badge">{statusLabel(item.status)}</span>{item.expiresAt && <> <span>Validade: <time dateTime={item.expiresAt}>{formatDate(item.expiresAt)}</time></span></>}</p></div>
        <div className="customer-reward-actions">
          {item.status === 'AVAILABLE' && <WhatsAppRewardButton customerName={customerName} customerPhone={customerPhone} whatsappOptIn={whatsappOptIn} reward={item} />}
          {item.status === 'AVAILABLE' && item.rewardType === 'CHOICE' && !item.reward && <button className="secondary-button" type="button" onClick={() => setSelecting(item)}>Escolher recompensa</button>}
          {item.status === 'AVAILABLE' && item.isRedeemable && <button className="primary-button" type="button" onClick={() => setRedeeming(item)}>Registrar resgate</button>}
          {item.status === 'AVAILABLE' && !item.isRedeemable && <small>Ainda não disponível para resgate.</small>}
        </div>
      </article></li>)}
    </ul>}
    {selecting && <section className="reward-confirmation" aria-labelledby="select-reward-title"><h3 id="select-reward-title">Escolher recompensa</h3><p>Selecione uma recompensa da faixa {tierLabel(selecting.finalTier)}.</p>{choices.length === 0 ? <p>Não há recompensas ativas disponíveis nesta faixa.</p> : <ul className="reward-options">{choices.map((reward) => <li key={reward.idReward}><button className="secondary-button" type="button" onClick={() => void selectReward(reward.idReward)} disabled={isSaving}>{reward.name} — {formatCurrency(reward.costAmount)}</button></li>)}</ul>}<button className="secondary-button" type="button" onClick={() => setSelecting(null)} disabled={isSaving}>Cancelar</button></section>}
    {redeeming && <section className="reward-confirmation" aria-labelledby="redeem-reward-title"><h3 id="redeem-reward-title">Confirmar resgate desta recompensa?</h3><p>{redeeming.reward?.name ?? 'A recompensa selecionada'} será marcada como resgatada.</p><div className="form-actions"><button className="primary-button" type="button" onClick={() => void redeem()} disabled={isSaving}>{isSaving ? 'Salvando…' : 'Confirmar resgate'}</button><button className="secondary-button" type="button" onClick={() => setRedeeming(null)} disabled={isSaving}>Cancelar</button></div></section>}
  </section>
}

function WhatsAppRewardButton({ customerName, customerPhone, whatsappOptIn, reward }: { customerName: string; customerPhone: string | null; whatsappOptIn: boolean; reward: CustomerReward }) {
  const phone = normalizeWhatsAppPhone(customerPhone)
  const disabledReason = !whatsappOptIn ? 'Cliente não autorizou contato por WhatsApp' : !phone ? 'Cliente sem telefone cadastrado' : null

  function openWhatsApp() {
    if (!phone) return
    const message = buildRewardWhatsAppMessage({ customerName, rewardName: reward.reward?.name ?? null, isChoiceWithoutSelection: reward.rewardType === 'CHOICE' && !reward.reward, expiresAt: reward.expiresAt })
    window.open(buildWhatsAppUrl(phone, message), '_blank', 'noopener,noreferrer')
  }

  return <span className="whatsapp-reward-action"><button className="secondary-button" type="button" onClick={openWhatsApp} disabled={Boolean(disabledReason)} title={disabledReason ?? 'Abrir WhatsApp com mensagem de recompensa preenchida'} aria-describedby={disabledReason ? `whatsapp-unavailable-${reward.idCustomerReward}` : undefined}>Enviar WhatsApp</button>{disabledReason && <small id={`whatsapp-unavailable-${reward.idCustomerReward}`}>{disabledReason}</small>}</span>
}

function tierFromCost(value: string): RewardTier { const amount = Number(value); return amount <= 10 ? 'LOW' : amount <= 50 ? 'MEDIUM' : 'HIGH' }
function tierLabel(value: RewardTier | null) { return value === 'LOW' ? 'Baixa' : value === 'MEDIUM' ? 'Média' : value === 'HIGH' ? 'Alta' : 'não definida' }
function statusLabel(value: CustomerReward['status']) { return ({ PENDING: 'Pendente', AVAILABLE: 'Disponível', REDEEMED: 'Resgatada', EXPIRED: 'Expirada', CANCELLED: 'Cancelada' })[value] }
function formatCurrency(value: string) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value)) }
function formatDate(value: string) { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(value)) }
function message(error: unknown) { if (error instanceof ApiError) { if (error.status === 404) return 'Cliente ou recompensa não encontrada.'; if (error.status === 409) return error.message; if (error.status === 401) return 'Sua sessão expirou. Entre novamente.' }; return 'Não foi possível carregar as recompensas do cliente.' }
