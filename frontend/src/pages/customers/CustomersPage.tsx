import { useState, type FormEvent } from "react";
import {
  createCustomer,
  getCustomerByCpf,
  updateCustomer,
} from "../../api/customers.api";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/useAuth";
import type {
  CreateCustomerInput,
  Customer,
  UpdateCustomerInput,
} from "../../types/customer";

type View = "search" | "create" | "edit";
const emptyForm: CreateCustomerInput = {
  cpf: "",
  name: "",
  email: "",
  phoneNumber: "",
  dateOfBirth: "",
  whatsappOptIn: false,
};

export function CustomersPage() {
  const { session } = useAuth();
  const [view, setView] = useState<View>("search");
  const [cpf, setCpf] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<CreateCustomerInput>(emptyForm);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const companyId = session?.company.idCompany ?? 0;
  const token = session?.token ?? "";
  function resetFeedback() {
    setError("");
    setMessage("");
  }
  function updateForm<K extends keyof CreateCustomerInput>(
    key: K,
    value: CreateCustomerInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetFeedback();
    if (cpf.replace(/\D/g, "").length !== 11) {
      setError("Informe um CPF com 11 dígitos.");
      return;
    }
    setIsSearching(true);
    setCustomer(null);
    try {
      setCustomer(await getCustomerByCpf(companyId, cpf, token));
    } catch (requestError) {
      setError(getMessage(requestError, "search"));
    } finally {
      setIsSearching(false);
    }
  }
  function openCreate() {
    resetFeedback();
    setCustomer(null);
    setForm({ ...emptyForm, cpf: cpf.replace(/\D/g, "") });
    setView("create");
  }
  function openEdit() {
    if (!customer) return;
    resetFeedback();
    setForm({
      cpf: customer.person.cpf,
      name: customer.person.name,
      email: customer.person.email ?? "",
      phoneNumber: customer.person.phoneNumber ?? "",
      dateOfBirth: dateInput(customer.person.dateOfBirth),
      whatsappOptIn: customer.whatsappOptIn,
    });
    setView("edit");
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetFeedback();
    if (view === "create" && form.cpf.replace(/\D/g, "").length !== 11) {
      setError("Informe um CPF com 11 dígitos.");
      return;
    }
    if (form.name.trim().length < 2) {
      setError("Informe o nome completo do cliente.");
      return;
    }
    setIsSaving(true);
    const data = normalized(form);
    try {
      if (view === "create") {
        await createCustomer(companyId, { ...data, cpf: form.cpf }, token);
        const created = await getCustomerByCpf(companyId, form.cpf, token);
        setCustomer(created);
        setCpf(created.person.cpf);
        setMessage("Cliente cadastrado com sucesso.");
        setView("search");
      } else if (customer) {
        const update: UpdateCustomerInput = {
          name: data.name,
          email: data.email ?? null,
          phoneNumber: data.phoneNumber ?? null,
          dateOfBirth: data.dateOfBirth ?? null,
          whatsappOptIn: data.whatsappOptIn,
        };
        await updateCustomer(companyId, customer.person.cpf, update, token);
        setCustomer(
          await getCustomerByCpf(companyId, customer.person.cpf, token),
        );
        setMessage("Dados do cliente atualizados.");
        setView("search");
      }
    } catch (requestError) {
      setError(
        getMessage(requestError, view === "create" ? "create" : "update"),
      );
    } finally {
      setIsSaving(false);
    }
  }
  async function changeStatus() {
    if (!customer) return;
    resetFeedback();
    setIsSaving(true);
    const nextIsActive = !customer.isActive;
    try {
      await updateCustomer(
        companyId,
        customer.person.cpf,
        { isActive: nextIsActive },
        token,
      );
      setCustomer(
        await getCustomerByCpf(companyId, customer.person.cpf, token),
      );
      setMessage(
        nextIsActive
          ? "Cliente ativado com sucesso."
          : "Cliente inativado com sucesso.",
      );
    } catch (requestError) {
      setError(getMessage(requestError, "update"));
    } finally {
      setIsSaving(false);
    }
  }
  return (
    <section className="customers-page" aria-labelledby="customers-title">
      <div className="page-intro page-intro--with-action">
        <div>
          <p className="eyebrow">Operação</p>
          <h1 id="customers-title">Clientes</h1>
          <p>Consulte um cliente pelo CPF ou faça um novo cadastro.</p>
        </div>
        <button className="primary-button" type="button" onClick={openCreate}>
          Cadastrar cliente
        </button>
      </div>
      {message && (
        <p className="form-success" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {view === "search" && (
        <>
          <form className="customer-search" onSubmit={search} noValidate>
            <div className="form-field">
              <label htmlFor="customer-cpf">CPF do cliente</label>
              <input
                id="customer-cpf"
                value={cpf}
                onChange={(event) => setCpf(event.target.value)}
                inputMode="numeric"
                placeholder="000.000.000-00"
                disabled={isSearching}
                required
              />
            </div>
            <button
              className="primary-button"
              type="submit"
              disabled={isSearching}
            >
              {isSearching ? "Consultando…" : "Consultar cliente"}
            </button>
          </form>
          {customer && (
            <CustomerDetails
              customer={customer}
              isSaving={isSaving}
              onEdit={openEdit}
              onChangeStatus={changeStatus}
            />
          )}
        </>
      )}
      {(view === "create" || view === "edit") && (
        <CustomerForm
          form={form}
          isSaving={isSaving}
          isEdit={view === "edit"}
          onChange={updateForm}
          onSubmit={save}
          onCancel={() => {
            resetFeedback();
            setView("search");
          }}
        />
      )}
    </section>
  );
}

function CustomerDetails({
  customer,
  isSaving,
  onEdit,
  onChangeStatus,
}: {
  customer: Customer;
  isSaving: boolean;
  onEdit: () => void;
  onChangeStatus: () => void;
}) {
  return (
    <article className="customer-card" aria-labelledby="customer-name">
      <div className="customer-card-header">
        <div>
          <p className="eyebrow">Cliente encontrado</p>
          <h2 id="customer-name">{customer.person.name}</h2>
          <p
            className={
              customer.isActive
                ? "status-badge"
                : "status-badge status-badge--inactive"
            }
          >
            {customer.isActive ? "Ativo" : "Inativo"}
          </p>
        </div>
        <div className="customer-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={onEdit}
            disabled={isSaving}
          >
            Editar dados
          </button>
          <button
            className={customer.isActive ? "danger-button" : "secondary-button"}
            type="button"
            onClick={onChangeStatus}
            disabled={isSaving}
          >
            {isSaving
              ? "Salvando…"
              : customer.isActive
                ? "Inativar cliente"
                : "Ativar cliente"}
          </button>
        </div>
      </div>
      <dl className="customer-details">
        <Detail label="CPF" value={formatCpf(customer.person.cpf)} />
        <Detail
          label="E-mail"
          value={customer.person.email ?? "Não informado"}
        />
        <Detail
          label="Telefone"
          value={customer.person.phoneNumber ?? "Não informado"}
        />
        <Detail
          label="Data de nascimento"
          value={formatDate(customer.person.dateOfBirth)}
        />
        <Detail
          label="WhatsApp"
          value={
            customer.whatsappOptIn ? "Autoriza contato" : "Não autoriza contato"
          }
        />
        <Detail
          label="Cadastro"
          value={formatDate(customer.registrationDate)}
        />
      </dl>
    </article>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
function CustomerForm({
  form,
  isSaving,
  isEdit,
  onChange,
  onSubmit,
  onCancel,
}: {
  form: CreateCustomerInput;
  isSaving: boolean;
  isEdit: boolean;
  onChange: <K extends keyof CreateCustomerInput>(
    key: K,
    value: CreateCustomerInput[K],
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  return (
    <form className="customer-form" onSubmit={onSubmit} noValidate>
      <div>
        <p className="eyebrow">
          {isEdit ? "Atualizar cadastro" : "Novo cadastro"}
        </p>
        <h2>{isEdit ? "Edite os dados do cliente" : "Cadastre um cliente"}</h2>
        <p className="form-description">
          Campos marcados com * são obrigatórios.
        </p>
      </div>
      <div className="customer-form-grid">
        <Field
          id="form-cpf"
          label="CPF *"
          value={form.cpf}
          onChange={(value) => onChange("cpf", value)}
          disabled={isSaving || isEdit}
        />
        <Field
          id="form-name"
          label="Nome completo *"
          value={form.name}
          onChange={(value) => onChange("name", value)}
          disabled={isSaving}
        />
        <Field
          id="form-email"
          label="E-mail"
          type="email"
          value={form.email ?? ""}
          onChange={(value) => onChange("email", value)}
          disabled={isSaving}
        />
        <Field
          id="form-phone"
          label="Telefone"
          type="tel"
          value={form.phoneNumber ?? ""}
          onChange={(value) => onChange("phoneNumber", value)}
          disabled={isSaving}
        />
        <Field
          id="form-birthdate"
          label="Data de nascimento"
          type="date"
          value={form.dateOfBirth ?? ""}
          onChange={(value) => onChange("dateOfBirth", value)}
          disabled={isSaving}
        />
        <label className="checkbox-field" htmlFor="form-whatsapp">
          <input
            id="form-whatsapp"
            type="checkbox"
            checked={form.whatsappOptIn}
            onChange={(event) =>
              onChange("whatsappOptIn", event.target.checked)
            }
            disabled={isSaving}
          />{" "}
          Autoriza contato por WhatsApp
        </label>
      </div>
      <div className="form-actions">
        <button className="primary-button" type="submit" disabled={isSaving}>
          {isSaving
            ? "Salvando…"
            : isEdit
              ? "Salvar alterações"
              : "Cadastrar cliente"}
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
function Field({
  id,
  label,
  type = "text",
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required={label.endsWith("*")}
      />
    </div>
  );
}
function normalized(form: CreateCustomerInput): CreateCustomerInput {
  return {
    ...form,
    cpf: form.cpf.replace(/\D/g, ""),
    name: form.name.trim(),
    email: form.email?.trim() || undefined,
    phoneNumber: form.phoneNumber?.replace(/\D/g, "") || undefined,
    dateOfBirth: form.dateOfBirth || undefined,
  };
}
function dateInput(value: string | null) {
  return value ? value.slice(0, 10) : "";
}
function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
        new Date(value),
      )
    : "Não informado";
}
function formatCpf(value: string) {
  return value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}
function getMessage(error: unknown, action: "search" | "create" | "update") {
  if (error instanceof ApiError) {
    if (error.status === 404)
      return action === "search"
        ? "Cliente não encontrado. Confira o CPF ou faça um novo cadastro."
        : "Cliente não encontrado.";
    if (error.status === 409)
      return "Já existe um cliente cadastrado com este CPF nesta empresa.";
    if (error.status === 400)
      return "Revise os dados informados e tente novamente.";
    if (error.status === 403)
      return "Você não possui permissão para realizar esta ação.";
    if (error.status === 401) return "Sua sessão expirou. Entre novamente.";
  }
  return "Não foi possível concluir a ação agora. Verifique sua conexão e tente novamente.";
}
