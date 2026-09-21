import { useState, type FormEvent } from 'react'
import { getCustomerByCpf } from '../../api/customers.api'
import {
  getCustomerPurchases,
  registerPurchase,
} from '../../api/purchases.api'
import { ApiError } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import type { Customer } from '../../types/customer'
import type { CustomerPurchaseHistory } from '../../types/purchase'
import {
  formatCpf,
  getCpfValidationError,
} from '../../utils/cpf'
import { toast } from 'react-toastify'

export function PurchaseRegistrationPage() {
  const { session } = useAuth()

  const [cpf, setCpf] = useState('')
  const [amount, setAmount] = useState('')
  const [fiscalDocumentNumber, setFiscalDocumentNumber] = useState('')
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [error, setError] = useState('')
  const [cpfError, setCpfError] = useState('')
  const [fiscalDocumentError, setFiscalDocumentError] = useState('')
  const [amountError, setAmountError] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const companyId = session?.company.idCompany ?? 0
  const token = session?.token ?? ''

  function changeCpf(value: string) {
    setCpf(formatCpf(value))
    setCpfError('')
    setCustomer(null)
    setError('')
  }

  async function searchCustomer(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError('')
    setCpfError('')

    const validationError = getCpfValidationError(cpf)

    if (validationError) {
      setCpfError(validationError)
      return
    }

    setIsSearching(true)
    setCustomer(null)

    try {
      setCustomer(
        await getCustomerByCpf(
          companyId,
          cpf,
          token,
        ),
      )
    } catch (requestError) {
      setError(
        getPurchaseError(
          requestError,
          'search',
        ),
      )
    } finally {
      setIsSearching(false)
    }
  }

  async function submitPurchase(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (!customer) {
      return
    }

    setError('')
    setFiscalDocumentError('')
    setAmountError('')

    const normalizedFiscalDocumentNumber =
      fiscalDocumentNumber.trim()

    if (!normalizedFiscalDocumentNumber) {
      setFiscalDocumentError(
        'Informe o número da nota ou cupom fiscal.',
      )
      return
    }

    if (
      normalizedFiscalDocumentNumber.length >
      60
    ) {
      setFiscalDocumentError(
        'O número da nota ou cupom fiscal deve possuir no máximo 60 caracteres.',
      )
      return
    }

    const purchaseAmount =
      amountToNumber(amount)

    if (purchaseAmount <= 0) {
      setAmountError(
        'Informe um valor de compra maior que zero.',
      )
      return
    }

    setIsSubmitting(true)

    try {
      const purchase =
        await registerPurchase(
          companyId,
          {
            cpf: customer.person.cpf,
            fiscalDocumentNumber:
              normalizedFiscalDocumentNumber,
            amount: purchaseAmount,
          },
          token,
        )

      toast.success(
        `Compra registrada com sucesso. Nota/cupom: ${
          purchase.fiscalDocumentNumber ??
          'Não informado'
        }.`,
      )

      setAmount('')
      setFiscalDocumentNumber('')
    } catch (requestError) {
      toast.error(
        getPurchaseError(
          requestError,
          'create',
        ),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section
      className="purchases-page"
      aria-labelledby="purchase-registration-title"
    >
      <div className="page-intro">
        <h1 id="purchase-registration-title">
          Registrar compra
        </h1>

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
        onSubmit={searchCustomer}
        noValidate
      >
        <div className="form-field">
          <label htmlFor="purchase-cpf">
            CPF do cliente
          </label>

          <input
            id="purchase-cpf"
            value={cpf}
            onChange={(event) =>
              changeCpf(event.target.value)
            }
            inputMode="numeric"
            placeholder="000.000.000-00"
            disabled={
              isSearching ||
              isSubmitting
            }
            required
            aria-invalid={Boolean(cpfError)}
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
            onSubmit={submitPurchase}
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
                onChange={(event) => {
                  setFiscalDocumentNumber(
                    event.target.value,
                  )
                  setFiscalDocumentError(
                    '',
                  )
                }}
                disabled={isSubmitting}
                required
                aria-invalid={Boolean(
                  fiscalDocumentError,
                )}
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
                  value={amount}
                  onChange={(event) => {
                    setAmount(
                      formatAmountInput(
                        event.target.value,
                      ),
                    )
                    setAmountError('')
                  }}
                  inputMode="decimal"
                  placeholder="0,00"
                  disabled={isSubmitting}
                  required
                  aria-invalid={Boolean(
                    amountError,
                  )}
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
              disabled={isSubmitting}
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

export function PurchaseHistoryPage() {
  const { session } = useAuth()

  const [cpf, setCpf] = useState('')
  const [history, setHistory] =
    useState<CustomerPurchaseHistory | null>(
      null,
    )

  const [error, setError] = useState('')
  const [cpfError, setCpfError] =
    useState('')

  const [isLoading, setIsLoading] =
    useState(false)

  const companyId =
    session?.company.idCompany ?? 0

  const token =
    session?.token ?? ''

  async function searchHistory(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError('')
    setCpfError('')

    const validationError =
      getCpfValidationError(cpf)

    if (validationError) {
      setCpfError(validationError)
      return
    }

    setIsLoading(true)
    setHistory(null)

    try {
      setHistory(
        await getCustomerPurchases(
          companyId,
          cpf,
          token,
        ),
      )
    } catch (requestError) {
      setError(
        getHistoryError(
          requestError,
        ),
      )
    } finally {
      setIsLoading(false)
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
          Consulte as compras de um
          cliente pelo CPF.
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
        onSubmit={searchHistory}
        noValidate
      >
        <div className="form-field">
          <label htmlFor="purchase-history-cpf">
            CPF do cliente
          </label>

          <input
            id="purchase-history-cpf"
            value={cpf}
            onChange={(event) => {
              setCpf(
                formatCpf(
                  event.target.value,
                ),
              )
              setCpfError('')
              setHistory(null)
              setError('')
            }}
            inputMode="numeric"
            placeholder="000.000.000-00"
            disabled={isLoading}
            required
            aria-invalid={Boolean(
              cpfError,
            )}
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
          disabled={isLoading}
        >
          {isLoading
            ? 'Consultando…'
            : 'Consultar histórico'}
        </button>
      </form>

      <PurchaseHistory
        history={history}
        isLoading={isLoading}
      />
    </section>
  )
}

function PurchaseHistory({
  history,
  isLoading,
}: {
  history: CustomerPurchaseHistory | null
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <p
        className="loading-state purchase-history-loading"
        role="status"
      >
        Carregando histórico…
      </p>
    )
  }

  if (!history) {
    return null
  }

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

      {history.purchases.length ===
        0 && (
        <p className="empty-state">
          Este cliente ainda não
          possui compras registradas.
        </p>
      )}

      {history.purchases.length >
        0 && (
        <div className="purchase-table-wrapper">
          <table>
            <caption>
              Compras de{' '}
              {history.customer.name}
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
              </tr>
            </thead>

            <tbody>
              {history.purchases.map(
                (purchase) => (
                  <tr
                    key={
                      purchase.idPurchase
                    }
                  >
                    <td>
                      <time
                        dateTime={
                          purchase.purchaseDate
                        }
                      >
                        {formatDateTime(
                          purchase.purchaseDate,
                        )}
                      </time>
                    </td>

                    <td>
                      {purchase.fiscalDocumentNumber ??
                        'Não informado'}
                    </td>

                    <td>
                      {formatCurrency(
                        purchase.amount,
                      )}
                    </td>

                    <td>
                      {purchase.registeredBy
                        ?.name ??
                        'Não informado'}
                    </td>
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
    value.replace(/\D/g, '')

  return digits
    ? new Intl.NumberFormat(
        'pt-BR',
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        },
      ).format(
        Number(digits) / 100,
      )
    : ''
}

function amountToNumber(
  value: string,
) {
  const digits =
    value.replace(/\D/g, '')

  return digits
    ? Number(digits) / 100
    : 0
}

function formatCurrency(
  value: string,
) {
  return new Intl.NumberFormat(
    'pt-BR',
    {
      style: 'currency',
      currency: 'BRL',
    },
  ).format(Number(value))
}

function formatDateTime(
  value: string,
) {
  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      dateStyle: 'short',
      timeStyle: 'short',
    },
  ).format(new Date(value))
}

function getPurchaseError(
  error: unknown,
  action: 'search' | 'create',
) {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return action === 'create'
        ? 'Revise o CPF e o valor informado.'
        : 'Informe um CPF válido.'
    }

    if (error.status === 401) {
      return 'Sua sessão expirou. Entre novamente.'
    }

    if (error.status === 403) {
      return 'Você não possui permissão para registrar compras nesta empresa.'
    }

    if (error.status === 404) {
      return 'Cliente não encontrado nesta empresa.'
    }
  }

  return 'Não foi possível concluir a operação agora. Verifique sua conexão e tente novamente.'
}

function getHistoryError(
  error: unknown,
) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Sua sessão expirou. Entre novamente.'
    }

    if (error.status === 403) {
      return 'Você não possui permissão para consultar compras nesta empresa.'
    }

    if (error.status === 404) {
      return 'Cliente não encontrado nesta empresa.'
    }
  }

  return 'Não foi possível carregar o histórico de compras.'
}