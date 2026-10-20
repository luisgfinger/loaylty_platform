import { useEffect, useState, type FormEvent } from 'react'
import { getCustomerByCpf } from '../../api/customers.api'
import {
  deletePurchase,
  getCustomerPurchases,
  getPurchases,
  registerPurchase,
} from '../../api/purchases.api'
import { ApiError } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import type { Customer } from '../../types/customer'
import type {
  CompanyPurchaseHistory,
  CustomerPurchaseHistory,
  Purchase,
} from '../../types/purchase'
import {
  formatCpf,
  getCpfValidationError,
} from '../../utils/cpf'
import { toast } from 'react-toastify'


export function PurchaseRegistrationPage() {
  const { session } = useAuth()

  return (
    <PurchaseRegistrationForm
      key={`${session?.company.idCompany}:${session?.employee.idCompanyEmployee}`}
    />
  )
}


type LastPurchase =
  Pick<
    Purchase,
    | 'idPurchase'
    | 'amount'
    | 'fiscalDocumentNumber'
    | 'purchaseDate'
  > & {
    cancelExpiresAt: number
  }


const cancellationWindow =
  30 * 60 * 1000


function isExpired(
  purchase: LastPurchase,
) {
  return (
    Date.now() >
    purchase.cancelExpiresAt
  )
}


function isLastPurchase(
  value: unknown,
): value is LastPurchase {
  if (
    typeof value !== 'object' ||
    value === null
  ) {
    return false
  }

  return (
    'idPurchase' in value &&
    typeof value.idPurchase ===
      'string' &&
    value.idPurchase.trim() !== '' &&

    'amount' in value &&
    typeof value.amount ===
      'string' &&
    value.amount.trim() !== '' &&
    Number.isFinite(
      Number(value.amount),
    ) &&

    'fiscalDocumentNumber' in value &&
    (
      value.fiscalDocumentNumber ===
        null ||
      typeof value.fiscalDocumentNumber ===
        'string'
    ) &&

    'purchaseDate' in value &&
    typeof value.purchaseDate ===
      'string' &&
    Number.isFinite(
      Date.parse(
        value.purchaseDate,
      ),
    ) &&

    'cancelExpiresAt' in value &&
    typeof value.cancelExpiresAt ===
      'number' &&
    Number.isFinite(
      value.cancelExpiresAt,
    )
  )
}


// Storage serve apenas para lembrar
// a última compra no navegador.
//
// A autorização verdadeira continua
// sendo feita no backend.
function storeLastPurchase(
  key: string,
  purchase: LastPurchase | null,
) {
  try {
    if (purchase) {
      localStorage.setItem(
        key,
        JSON.stringify(
          purchase,
        ),
      )
    } else {
      localStorage.removeItem(
        key,
      )
    }
  } catch {
    // A página continua funcionando
    // mesmo sem localStorage.
  }
}


function PurchaseRegistrationForm() {
  const { session } = useAuth()

  const [
    cpf,
    setCpf,
  ] = useState('')

  const [
    amount,
    setAmount,
  ] = useState('')

  const [
    fiscalDocumentNumber,
    setFiscalDocumentNumber,
  ] = useState('')

  const [
    customer,
    setCustomer,
  ] =
    useState<Customer | null>(
      null,
    )

  const [
    error,
    setError,
  ] = useState('')

  const [
    cpfError,
    setCpfError,
  ] = useState('')

  const [
    fiscalDocumentError,
    setFiscalDocumentError,
  ] = useState('')

  const [
    amountError,
    setAmountError,
  ] = useState('')

  const [
    isSearching,
    setIsSearching,
  ] = useState(false)

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false)

  const [
    lastPurchase,
    setLastPurchase,
  ] =
    useState<LastPurchase | null>(
      null,
    )

  const [
    isCancelling,
    setIsCancelling,
  ] = useState(false)


  const companyId =
    session?.company.idCompany ??
    0

  const token =
    session?.token ??
    ''

  const employeeId =
    session?.employee
      .idCompanyEmployee

  const role =
    session?.employee.role

  const storageKey =
    companyId &&
    employeeId
      ? `loyalty:last-purchase:${companyId}:${employeeId}`
      : null


  // ===================================================
  // RECUPERAR ÚLTIMA COMPRA
  // ===================================================

  useEffect(() => {
    setLastPurchase(
      null,
    )

    if (!storageKey) {
      return
    }

    try {
      const saved =
        localStorage.getItem(
          storageKey,
        )

      if (
        saved === null
      ) {
        return
      }

      const parsed: unknown =
        JSON.parse(
          saved,
        )

      if (
        !isLastPurchase(
          parsed,
        ) ||
        (
          role === 'CAIXA' &&
          isExpired(
            parsed,
          )
        )
      ) {
        storeLastPurchase(
          storageKey,
          null,
        )

        return
      }

      setLastPurchase({
        idPurchase:
          parsed.idPurchase,

        amount:
          parsed.amount,

        fiscalDocumentNumber:
          parsed.fiscalDocumentNumber,

        purchaseDate:
          parsed.purchaseDate,

        cancelExpiresAt:
          parsed.cancelExpiresAt,
      })
    } catch {
      storeLastPurchase(
        storageKey,
        null,
      )
    }
  }, [
    storageKey,
    role,
  ])


  // ===================================================
  // EXPIRAR BOTÃO DO CAIXA
  // ===================================================

  useEffect(() => {
    if (
      role !== 'CAIXA' ||
      !lastPurchase ||
      !storageKey
    ) {
      return
    }

    function checkExpiration() {
      if (
        lastPurchase &&
        isExpired(
          lastPurchase,
        )
      ) {
        setLastPurchase(
          null,
        )

        storeLastPurchase(
          storageKey!,
          null,
        )
      }
    }

    checkExpiration()

    const timer =
      window.setInterval(
        checkExpiration,
        15_000,
      )

    return () =>
      window.clearInterval(
        timer,
      )
  }, [
    lastPurchase,
    role,
    storageKey,
  ])


  // ===================================================
  // CANCELAR ÚLTIMA COMPRA
  // ===================================================

  async function cancelLastPurchase() {
    if (
      !lastPurchase ||
      !storageKey ||
      isCancelling ||
      isSubmitting
    ) {
      return
    }

    const confirmed =
      window.confirm(
        `Tem certeza que deseja cancelar a última compra?\n\n` +
        `Valor: ${formatCurrency(lastPurchase.amount)}\n` +
        `Nota/Cupom: ${lastPurchase.fiscalDocumentNumber ?? 'Não informado'}\n\n` +
        `A venda será excluída e a contribuição ao fundo de recompensas será estornada.\n\n` +
        `O progresso de fidelidade já concedido não será alterado.`,
      )

    if (!confirmed) {
      return
    }

    setIsCancelling(
      true,
    )

    try {
      await deletePurchase(
        companyId,
        lastPurchase.idPurchase,
        token,
      )

      setLastPurchase(
        null,
      )

      storeLastPurchase(
        storageKey,
        null,
      )

      toast.success(
        'Última compra cancelada com sucesso.',
      )
    } catch (
      requestError
    ) {
      if (
        requestError instanceof
          ApiError &&
        requestError.status ===
          404
      ) {
        setLastPurchase(
          null,
        )

        storeLastPurchase(
          storageKey,
          null,
        )

        toast.error(
          'A compra não foi encontrada.',
        )

      } else if (
        requestError instanceof
          ApiError &&
        requestError.status ===
          403
      ) {
        toast.error(
          requestError.message ||
          'Não foi possível cancelar esta compra.',
        )

        if (
          role === 'CAIXA' &&
          isExpired(
            lastPurchase,
          )
        ) {
          setLastPurchase(
            null,
          )

          storeLastPurchase(
            storageKey,
            null,
          )
        }

      } else {
        toast.error(
          'Não foi possível cancelar a última compra.',
        )
      }

    } finally {
      setIsCancelling(
        false,
      )
    }
  }


  // ===================================================
  // ALTERAR CPF
  // ===================================================

  function changeCpf(
    value: string,
  ) {
    setCpf(
      formatCpf(
        value,
      ),
    )

    setCpfError('')
    setCustomer(null)
    setError('')
  }


  // ===================================================
  // LOCALIZAR CLIENTE
  // ===================================================

  async function searchCustomer(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError('')
    setCpfError('')

    const validationError =
      getCpfValidationError(
        cpf,
      )

    if (
      validationError
    ) {
      setCpfError(
        validationError,
      )

      return
    }

    setIsSearching(
      true,
    )

    setCustomer(
      null,
    )

    try {
      setCustomer(
        await getCustomerByCpf(
          companyId,
          cpf,
          token,
        ),
      )

    } catch (
      requestError
    ) {
      setError(
        getPurchaseError(
          requestError,
          'search',
        ),
      )

    } finally {
      setIsSearching(
        false,
      )
    }
  }


  // ===================================================
  // REGISTRAR COMPRA
  // ===================================================

  async function submitPurchase(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (
      !customer ||
      isCancelling ||
      isSubmitting
    ) {
      return
    }

    setError('')
    setFiscalDocumentError('')
    setAmountError('')

    const normalizedFiscalDocumentNumber =
      fiscalDocumentNumber.trim()

    if (
      !normalizedFiscalDocumentNumber
    ) {
      setFiscalDocumentError(
        'Informe o número da nota ou cupom fiscal.',
      )

      return
    }

    if (
      normalizedFiscalDocumentNumber
        .length > 60
    ) {
      setFiscalDocumentError(
        'O número da nota ou cupom fiscal deve possuir no máximo 60 caracteres.',
      )

      return
    }

    const purchaseAmount =
      amountToNumber(
        amount,
      )

    if (
      purchaseAmount <= 0
    ) {
      setAmountError(
        'Informe um valor de compra maior que zero.',
      )

      return
    }

    setIsSubmitting(
      true,
    )

    try {
      const purchase =
        await registerPurchase(
          companyId,
          {
            cpf:
              customer.person.cpf,

            fiscalDocumentNumber:
              normalizedFiscalDocumentNumber,

            amount:
              purchaseAmount,
          },
          token,
        )


      // O prazo visual de 30 minutos começa
      // no momento em que o frontend recebe
      // confirmação da venda.
      //
      // A segurança real continua sendo
      // validada pelo backend.

      const latest:
        LastPurchase = {
          idPurchase:
            purchase.idPurchase,

          amount:
            purchase.amount,

          fiscalDocumentNumber:
            purchase
              .fiscalDocumentNumber,

          purchaseDate:
            purchase.purchaseDate,

          cancelExpiresAt:
            Date.now() +
            cancellationWindow,
        }


      setLastPurchase(
        latest,
      )


      if (
        storageKey
      ) {
        storeLastPurchase(
          storageKey,
          latest,
        )
      }


      toast.success(
        `Compra registrada com sucesso. Nota/cupom: ${
          purchase.fiscalDocumentNumber ??
          'Não informado'
        }.`,
      )


      setAmount('')
      setFiscalDocumentNumber('')

    } catch (
      requestError
    ) {
      toast.error(
        getPurchaseError(
          requestError,
          'create',
        ),
      )

    } finally {
      setIsSubmitting(
        false,
      )
    }
  }


  return (
    <section
      className="purchases-page"
      aria-labelledby="purchase-registration-title"
    >
      <div className="page-intro">
        <div className="purchase-page-title-row">
          <h1 id="purchase-registration-title">
            Registrar compra
          </h1>

          {lastPurchase && (
            <button
              className="secondary-button cancel-last-purchase-button"
              type="button"
              onClick={
                cancelLastPurchase
              }
              disabled={
                isCancelling ||
                isSubmitting
              }
            >
              {isCancelling
                ? 'Cancelando…'
                : 'Cancelar última compra'}
            </button>
          )}
        </div>

        <p>
          Localize o cliente, confirme sua
          identidade e informe o valor.
        </p>
      </div>


      {error && (
        <p
          className="form-error"
          role="alert"
        >
          {error}
        </p>
      )}


      <form
        className="purchase-search"
        onSubmit={
          searchCustomer
        }
        noValidate
      >
        <div className="form-field">
          <label htmlFor="purchase-cpf">
            CPF do cliente
          </label>

          <input
            id="purchase-cpf"
            value={cpf}
            onChange={(
              event
            ) =>
              changeCpf(
                event
                  .target
                  .value,
              )
            }
            inputMode="numeric"
            placeholder="000.000.000-00"
            disabled={
              isSearching ||
              isSubmitting
            }
            required
            aria-invalid={
              Boolean(
                cpfError,
              )
            }
            aria-describedby={
              cpfError
                ? 'purchase-cpf-error'
                : undefined
            }
          />

          {cpfError && (
            <p
              className="form-field-error"
              id="purchase-cpf-error"
            >
              {cpfError}
            </p>
          )}
        </div>

        <button
          className="primary-button"
          type="submit"
          disabled={
            isSearching ||
            isSubmitting
          }
        >
          {isSearching
            ? 'Consultando…'
            : 'Localizar cliente'}
        </button>
      </form>


      {customer && (
        <>
          <article
            className="purchase-customer"
            aria-labelledby="purchase-customer-name"
          >
            <p className="eyebrow">
              Compra para
            </p>

            <h2 id="purchase-customer-name">
              {customer.person.name}
            </h2>

            <p>
              {formatCpf(
                customer.person.cpf,
              )}
            </p>
          </article>


          <form
            className="purchase-form"
            onSubmit={
              submitPurchase
            }
            noValidate
          >
            <div className="form-field">
              <label htmlFor="purchase-fiscal-document">
                Nº da nota ou cupom fiscal
              </label>

              <input
                id="purchase-fiscal-document"
                value={
                  fiscalDocumentNumber
                }
                onChange={(
                  event
                ) => {
                  setFiscalDocumentNumber(
                    event.target.value,
                  )

                  setFiscalDocumentError(
                    '',
                  )
                }}
                disabled={
                  isSubmitting ||
                  isCancelling
                }
                required
                aria-invalid={
                  Boolean(
                    fiscalDocumentError,
                  )
                }
                aria-describedby={
                  fiscalDocumentError
                    ? 'purchase-fiscal-document-error'
                    : undefined
                }
              />

              {fiscalDocumentError && (
                <p
                  className="form-field-error"
                  id="purchase-fiscal-document-error"
                >
                  {fiscalDocumentError}
                </p>
              )}
            </div>


            <div className="form-field">
              <label htmlFor="purchase-amount">
                Valor da compra
              </label>

              <div className="currency-field">
                <span aria-hidden="true">
                  R$
                </span>

                <input
                  id="purchase-amount"
                  value={
                    amount
                  }
                  onChange={(
                    event
                  ) => {
                    setAmount(
                      formatAmountInput(
                        event.target.value,
                      ),
                    )

                    setAmountError('')
                  }}
                  inputMode="decimal"
                  placeholder="0,00"
                  disabled={
                    isSubmitting ||
                    isCancelling
                  }
                  required
                  aria-invalid={
                    Boolean(
                      amountError,
                    )
                  }
                  aria-describedby={
                    amountError
                      ? 'purchase-amount-help purchase-amount-error'
                      : 'purchase-amount-help'
                  }
                />
              </div>

              <small id="purchase-amount-help">
                O valor será registrado
                para {customer.person.name}.
              </small>

              {amountError && (
                <p
                  className="form-field-error"
                  id="purchase-amount-error"
                >
                  {amountError}
                </p>
              )}
            </div>

            <button
              className="primary-button"
              type="submit"
              disabled={
                isSubmitting ||
                isCancelling
              }
            >
              {isSubmitting
                ? 'Registrando compra…'
                : 'Registrar compra'}
            </button>
          </form>
        </>
      )}


      {!customer &&
        error.includes(
          'Cliente não encontrado',
        ) && (
          <p className="purchase-create-link">
            Ainda não é cliente?{' '}
            <a
              href={`/app/customers?create=1&cpf=${encodeURIComponent(
                cpf,
              )}`}
            >
              Cadastrar cliente
            </a>
          </p>
        )}
    </section>
  )
}


// =====================================================
// HISTÓRICO
// =====================================================

type PurchaseHistoryResult =
  | {
      kind: 'company'
      data: CompanyPurchaseHistory
    }
  | {
      kind: 'customer'
      data: CustomerPurchaseHistory
    }


type CancellablePurchase =
  Pick<
    Purchase,
    | 'idPurchase'
    | 'amount'
    | 'purchaseDate'
  >


export function PurchaseHistoryPage() {
  const { session } = useAuth()

  const role =
    session?.employee.role

  const isAdmin =
    role === 'ADMIN'

  const [
    cancellingPurchaseIds,
    setCancellingPurchaseIds,
  ] =
    useState<Set<string>>(
      () =>
        new Set(),
    )

  const [
    cpf,
    setCpf,
  ] = useState('')

  const [
    history,
    setHistory,
  ] =
    useState<PurchaseHistoryResult | null>(
      null,
    )

  const [
    error,
    setError,
  ] = useState('')

  const [
    cpfError,
    setCpfError,
  ] = useState('')

  const [
    isLoading,
    setIsLoading,
  ] = useState(false)

  const companyId =
    session?.company.idCompany ??
    0

  const token =
    session?.token ??
    ''


  useEffect(() => {
    if (
      !companyId ||
      !token
    ) {
      return
    }

    let cancelled =
      false

    setIsLoading(
      true,
    )

    setHistory(
      null,
    )

    setError('')

    getPurchases(
      companyId,
      token,
    )
      .then(
        (
          data,
        ) => {
          if (
            !cancelled
          ) {
            setHistory({
              kind:
                'company',

              data,
            })
          }
        },
      )
      .catch(
        (
          requestError:
            unknown,
        ) => {
          if (
            !cancelled
          ) {
            setError(
              getHistoryError(
                requestError,
              ),
            )
          }
        },
      )
      .finally(
        () => {
          if (
            !cancelled
          ) {
            setIsLoading(
              false,
            )
          }
        },
      )

    return () => {
      cancelled =
        true
    }
  }, [
    companyId,
    token,
  ])


  function removePurchase(
    purchaseId: string,
  ) {
    setHistory(
      (
        current,
      ) => {
        if (
          !current
        ) {
          return current
        }

        if (
          current.kind ===
          'company'
        ) {
          return {
            ...current,

            data: {
              ...current.data,

              purchases:
                current
                  .data
                  .purchases
                  .filter(
                    (
                      purchase,
                    ) =>
                      purchase
                        .idPurchase !==
                      purchaseId,
                  ),
            },
          }
        }

        return {
          ...current,

          data: {
            ...current.data,

            purchases:
              current
                .data
                .purchases
                .filter(
                  (
                    purchase,
                  ) =>
                    purchase
                      .idPurchase !==
                    purchaseId,
                ),
          },
        }
      },
    )
  }


  async function cancelPurchase(
    purchase:
      CancellablePurchase,
    customerName:
      string,
  ) {
    if (
      !isAdmin ||
      !companyId ||
      !token ||
      cancellingPurchaseIds
        .has(
          purchase
            .idPurchase,
        )
    ) {
      return
    }

    const confirmed =
      window.confirm(
        `Tem certeza que deseja cancelar esta venda?\n\n` +
        `Cliente: ${customerName}\n` +
        `Valor: ${formatCurrency(purchase.amount)}\n` +
        `Data: ${formatDateTime(purchase.purchaseDate)}\n\n` +
        `A venda será excluída e a contribuição ao fundo de recompensas será estornada.\n\n` +
        `O progresso de fidelidade já concedido não será alterado.`,
      )

    if (!confirmed) {
      return
    }

    setCancellingPurchaseIds(
      (
        current,
      ) =>
        new Set(
          current,
        ).add(
          purchase
            .idPurchase,
        ),
    )

    try {
      await deletePurchase(
        companyId,
        purchase.idPurchase,
        token,
      )

      removePurchase(
        purchase.idPurchase,
      )

      toast.success(
        'Venda cancelada com sucesso.',
      )

    } catch (
      requestError
    ) {
      if (
        requestError instanceof
          ApiError &&
        requestError.status ===
          404
      ) {
        removePurchase(
          purchase.idPurchase,
        )

        toast.error(
          'A venda não foi encontrada.',
        )

      } else if (
        requestError instanceof
          ApiError &&
        requestError.status ===
          403
      ) {
        toast.error(
          'Você não possui permissão para cancelar esta venda.',
        )

      } else if (
        requestError instanceof
          ApiError &&
        requestError.status ===
          401
      ) {
        toast.error(
          'Sua sessão expirou. Entre novamente.',
        )

      } else {
        toast.error(
          'Não foi possível cancelar a venda.',
        )
      }

    } finally {
      setCancellingPurchaseIds(
        (
          current,
        ) => {
          const next =
            new Set(
              current,
            )

          next.delete(
            purchase
              .idPurchase,
          )

          return next
        },
      )
    }
  }


  async function searchHistory(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError('')
    setCpfError('')

    const validationError =
      cpf.trim()
        ? getCpfValidationError(
            cpf,
          )
        : ''

    if (
      validationError
    ) {
      setCpfError(
        validationError,
      )

      return
    }

    setIsLoading(
      true,
    )

    setHistory(
      null,
    )

    try {
      if (
        cpf.trim()
      ) {
        const data =
          await getCustomerPurchases(
            companyId,
            cpf,
            token,
          )

        setHistory({
          kind:
            'customer',

          data,
        })

      } else {
        const data =
          await getPurchases(
            companyId,
            token,
          )

        setHistory({
          kind:
            'company',

          data,
        })
      }

    } catch (
      requestError
    ) {
      setError(
        getHistoryError(
          requestError,
        ),
      )

    } finally {
      setIsLoading(
        false,
      )
    }
  }


  return (
    <section
      className="purchases-page"
      aria-labelledby="purchase-history-page-title"
    >
      <div className="page-intro">
        <p className="eyebrow">
          Consulta
        </p>

        <h1 id="purchase-history-page-title">
          Histórico de compras
        </h1>

        <p>
          Consulte todas as compras da empresa ou filtre pelo CPF do cliente.
        </p>
      </div>


      {error && (
        <p
          className="form-error"
          role="alert"
        >
          {error}
        </p>
      )}


      <form
        className="purchase-search"
        onSubmit={
          searchHistory
        }
        noValidate
      >
        <div className="form-field">
          <label htmlFor="purchase-history-cpf">
            CPF do cliente (opcional)
          </label>

          <input
            id="purchase-history-cpf"
            value={cpf}
            onChange={(
              event
            ) => {
              setCpf(
                formatCpf(
                  event
                    .target
                    .value,
                ),
              )

              setCpfError('')
              setHistory(null)
              setError('')
            }}
            inputMode="numeric"
            placeholder="000.000.000-00"
            disabled={
              isLoading
            }
            aria-invalid={
              Boolean(
                cpfError,
              )
            }
            aria-describedby={
              cpfError
                ? 'purchase-history-cpf-error'
                : undefined
            }
          />

          {cpfError && (
            <p
              className="form-field-error"
              id="purchase-history-cpf-error"
            >
              {cpfError}
            </p>
          )}
        </div>

        <button
          className="primary-button"
          type="submit"
          disabled={
            isLoading
          }
        >
          {isLoading
            ? 'Consultando…'
            : 'Consultar histórico'}
        </button>
      </form>


      <PurchaseHistory
        history={
          history
        }
        isLoading={
          isLoading
        }
        isAdmin={
          isAdmin
        }
        cancellingPurchaseIds={
          cancellingPurchaseIds
        }
        onCancelPurchase={
          cancelPurchase
        }
      />
    </section>
  )
}


function PurchaseHistory({
  history:
    result,

  isLoading,

  isAdmin,

  cancellingPurchaseIds,

  onCancelPurchase,
}: {
  history:
    PurchaseHistoryResult | null

  isLoading:
    boolean

  isAdmin:
    boolean

  cancellingPurchaseIds:
    ReadonlySet<string>

  onCancelPurchase: (
    purchase:
      CancellablePurchase,

    customerName:
      string,
  ) => Promise<void>
}) {
  if (
    isLoading
  ) {
    return (
      <p
        className="loading-state purchase-history-loading"
        role="status"
      >
        Carregando histórico…
      </p>
    )
  }


  if (
    !result
  ) {
    return null
  }


  if (
    result.kind ===
    'company'
  ) {
    return (
      <section
        className="purchase-history"
        aria-label="Compras da empresa"
      >
        {result.data
          .purchases
          .length === 0
          ? (
            <p className="empty-state">
              Nenhuma compra registrada até o momento.
            </p>
          )
          : (
            <div className="purchase-table-wrapper">
              <table>
                <caption>
                  Compras da empresa
                </caption>

                <thead>
                  <tr>
                    <th scope="col">
                      Data e hora
                    </th>

                    <th scope="col">
                      Cliente
                    </th>

                    <th scope="col">
                      Valor
                    </th>

                    <th scope="col">
                      Registrada por
                    </th>

                    {isAdmin && (
                      <th scope="col">
                        Ações
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {result
                    .data
                    .purchases
                    .map(
                      (
                        purchase,
                      ) => (
                        <tr
                          key={
                            purchase
                              .idPurchase
                          }
                        >
                          <td>
                            <time
                              dateTime={
                                purchase
                                  .purchaseDate
                              }
                            >
                              {formatDateTime(
                                purchase
                                  .purchaseDate,
                              )}
                            </time>
                          </td>

                          <td>
                            {purchase
                              .customer
                              .name}
                          </td>

                          <td>
                            {formatCurrency(
                              purchase
                                .amount,
                            )}
                          </td>

                          <td>
                            {purchase
                              .registeredBy
                              ?.name ??
                              'Não informado'}
                          </td>

                          {isAdmin && (
                            <td>
                              <button
                                className="danger-button purchase-cancel-button"
                                type="button"
                                disabled={
                                  cancellingPurchaseIds
                                    .has(
                                      purchase
                                        .idPurchase,
                                    )
                                }
                                onClick={
                                  () =>
                                    onCancelPurchase(
                                      purchase,
                                      purchase
                                        .customer
                                        .name,
                                    )
                                }
                              >
                                {cancellingPurchaseIds
                                  .has(
                                    purchase
                                      .idPurchase,
                                  )
                                  ? 'Cancelando…'
                                  : 'Cancelar venda'}
                              </button>
                            </td>
                          )}
                        </tr>
                      ),
                    )}
                </tbody>
              </table>
            </div>
          )}
      </section>
    )
  }


  const history =
    result.data


  return (
    <section
      className="purchase-history"
      aria-labelledby="purchase-history-title"
    >
      <div>
        <p className="eyebrow">
          Cliente
        </p>

        <h2 id="purchase-history-title">
          {history.customer.name}
        </h2>

        <p>
          {formatCpf(
            history.customer.cpf,
          )}
        </p>
      </div>


      {history
        .purchases
        .length === 0 && (
          <p className="empty-state">
            Este cliente ainda não possui compras registradas.
          </p>
        )}


      {history
        .purchases
        .length > 0 && (
          <div className="purchase-table-wrapper">
            <table>
              <caption>
                Compras de{' '}
                {history
                  .customer
                  .name}
              </caption>

              <thead>
                <tr>
                  <th scope="col">
                    Data
                  </th>

                  <th scope="col">
                    Nota/Cupom
                  </th>

                  <th scope="col">
                    Valor
                  </th>

                  <th scope="col">
                    Registrada por
                  </th>

                  {isAdmin && (
                    <th scope="col">
                      Ações
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {history
                  .purchases
                  .map(
                    (
                      purchase,
                    ) => (
                      <tr
                        key={
                          purchase
                            .idPurchase
                        }
                      >
                        <td>
                          <time
                            dateTime={
                              purchase
                                .purchaseDate
                            }
                          >
                            {formatDateTime(
                              purchase
                                .purchaseDate,
                            )}
                          </time>
                        </td>

                        <td>
                          {purchase
                            .fiscalDocumentNumber ??
                            'Não informado'}
                        </td>

                        <td>
                          {formatCurrency(
                            purchase
                              .amount,
                          )}
                        </td>

                        <td>
                          {purchase
                            .registeredBy
                            ?.name ??
                            'Não informado'}
                        </td>

                        {isAdmin && (
                          <td>
                            <button
                              className="danger-button purchase-cancel-button"
                              type="button"
                              disabled={
                                cancellingPurchaseIds
                                  .has(
                                    purchase
                                      .idPurchase,
                                  )
                              }
                              onClick={
                                () =>
                                  onCancelPurchase(
                                    purchase,
                                    history
                                      .customer
                                      .name,
                                  )
                              }
                            >
                              {cancellingPurchaseIds
                                .has(
                                  purchase
                                    .idPurchase,
                                )
                                ? 'Cancelando…'
                                : 'Cancelar venda'}
                            </button>
                          </td>
                        )}
                      </tr>
                    ),
                  )}
              </tbody>
            </table>
          </div>
        )}
    </section>
  )
}


function formatAmountInput(
  value: string,
) {
  const digits =
    value.replace(
      /\D/g,
      '',
    )

  return digits
    ? new Intl.NumberFormat(
        'pt-BR',
        {
          minimumFractionDigits:
            2,

          maximumFractionDigits:
            2,
        },
      ).format(
        Number(
          digits,
        ) /
        100,
      )
    : ''
}


function amountToNumber(
  value: string,
) {
  const digits =
    value.replace(
      /\D/g,
      '',
    )

  return digits
    ? Number(
        digits,
      ) /
      100
    : 0
}


function formatCurrency(
  value: string,
) {
  return new Intl.NumberFormat(
    'pt-BR',
    {
      style:
        'currency',

      currency:
        'BRL',
    },
  ).format(
    Number(
      value,
    ),
  )
}


function formatDateTime(
  value: string,
) {
  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      dateStyle:
        'short',

      timeStyle:
        'short',
    },
  ).format(
    new Date(
      value,
    ),
  )
}


function getPurchaseError(
  error: unknown,
  action:
    'search' |
    'create',
) {
  if (
    error instanceof
    ApiError
  ) {
    if (
      error.status ===
      400
    ) {
      return action ===
        'create'
        ? 'Revise o CPF e o valor informado.'
        : 'Informe um CPF válido.'
    }

    if (
      error.status ===
      401
    ) {
      return 'Sua sessão expirou. Entre novamente.'
    }

    if (
      error.status ===
      403
    ) {
      return 'Você não possui permissão para registrar compras nesta empresa.'
    }

    if (
      error.status ===
      404
    ) {
      return 'Cliente não encontrado nesta empresa.'
    }
  }

  return 'Não foi possível concluir a operação agora. Verifique sua conexão e tente novamente.'
}


function getHistoryError(
  error: unknown,
) {
  if (
    error instanceof
    ApiError
  ) {
    if (
      error.status ===
      401
    ) {
      return 'Sua sessão expirou. Entre novamente.'
    }

    if (
      error.status ===
      403
    ) {
      return 'Você não possui permissão para consultar compras nesta empresa.'
    }

    if (
      error.status ===
      404
    ) {
      return 'Cliente não encontrado nesta empresa.'
    }
  }

  return 'Não foi possível carregar o histórico de compras.'
}