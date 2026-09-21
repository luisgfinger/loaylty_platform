# Loyalty Platform - Frontend - Codex Instructions


# =====================================================
# OBJETIVO DO PROJETO
# =====================================================

Este projeto é o frontend administrativo da Loyalty Platform.

A Loyalty Platform é uma plataforma SaaS de fidelidade multiempresa.

O frontend deve consumir a API existente localizada em:

../backend

O backend deve ser utilizado exclusivamente como referência para entender:

- rotas HTTP;
- schemas;
- payloads;
- respostas;
- autenticação;
- JWT;
- regras de autorização;
- modelos do Prisma;
- regras de negócio;
- clientes;
- funcionários;
- empresas;
- compras;
- ciclos de fidelidade;
- progressão;
- regularidade;
- configurações de fidelidade;
- recompensas;
- isolamento entre empresas.

O backend existente é a fonte de verdade da API.


# =====================================================
# IDENTIDADE DO PRODUTO
# =====================================================

## Loyalty Platform

"Loyalty Platform" é o nome do sistema SaaS principal.

Ela é a plataforma geral responsável por fornecer a infraestrutura de fidelidade para múltiplas empresas.

A Loyalty Platform deve ser genérica e multi-tenant.

Ela não pertence exclusivamente ao Auto Posto Grando.

Ela deve permitir que várias empresas utilizem o mesmo sistema de forma isolada.


## Responsabilidades gerais da Loyalty Platform

A plataforma pode administrar conceitos como:

- empresas;
- usuários;
- funcionários;
- clientes;
- compras;
- ciclos de fidelidade;
- progressão;
- regularidade;
- regras de fidelidade;
- configurações;
- recompensas;
- autenticação;
- autorização;
- isolamento entre tenants;
- futuramente planos;
- futuramente assinaturas;
- futuramente métricas do SaaS.


# =====================================================
# APG+
# =====================================================

"APG+" é o programa de fidelidade específico da empresa:

Auto Posto Grando

O APG+ utiliza a Loyalty Platform como infraestrutura.

Portanto:

Loyalty Platform
=
produto SaaS principal

APG+
=
programa de fidelidade específico do Auto Posto Grando


## Exemplo conceitual

Loyalty Platform
│
├── Auto Posto Grando
│   └── APG+
│
├── Empresa B
│   └── Programa de fidelidade da Empresa B
│
└── Empresa C
    └── Programa de fidelidade da Empresa C


## Regra importante

Nunca trate APG+ como o nome da plataforma inteira.

APG+ é apenas uma implementação de programa de fidelidade dentro da Loyalty Platform.


# =====================================================
# NOMENCLATURA
# =====================================================

Código genérico da plataforma deve utilizar nomes genéricos.

Prefira:

- Company
- Customer
- Employee
- Purchase
- Loyalty
- CustomerCycle
- CustomerJourney
- Reward
- LoyaltySettings
- Auth
- User

Evite nomes técnicos como:

- ApgCustomer
- ApgPurchase
- ApgEmployee
- ApgLoyaltyService
- ApgApi
- ApgCompany
- ApgUser

Esses conceitos pertencem à Loyalty Platform geral.


## Uso permitido do nome APG+

O nome APG+ pode aparecer quando a interface estiver representando especificamente o programa do Auto Posto Grando.

Exemplos:

- identidade visual;
- nome exibido para usuários;
- cabeçalhos;
- comunicação;
- telas específicas da empresa;
- configurações de branding;
- programa exibido ao cliente final.

Informações específicas do APG+ não devem contaminar componentes genéricos da Loyalty Platform.


# =====================================================
# MULTI-TENANT
# =====================================================

Toda implementação deve considerar que o sistema é multiempresa.

Nunca presuma que existe somente:

- empresa ID 1;
- Auto Posto Grando;
- APG+.

Não faça hardcode de:

- companyId;
- nome da empresa;
- CNPJ;
- endereço;
- telefone;
- e-mail;
- nome do programa;
- identidade visual específica.

Essas informações devem vir da API, da empresa autenticada ou de configurações apropriadas.


# =====================================================
# NÍVEIS DE ADMINISTRAÇÃO
# =====================================================

A Loyalty Platform possui dois contextos administrativos diferentes:

1. Administração da Loyalty Platform
2. Administração de uma empresa específica

Esses dois ambientes não devem ser confundidos.


# =====================================================
# 1. ADMINISTRAÇÃO DA LOYALTY PLATFORM
# =====================================================

A administração geral da Loyalty Platform pertence ao operador do SaaS.

Esse contexto administra as empresas que utilizam a plataforma.

Exemplos de funcionalidades:

- cadastrar empresas;
- listar empresas;
- visualizar empresas;
- editar empresas;
- ativar empresas;
- desativar empresas;
- consultar status das empresas;
- administrar recursos disponíveis;
- visualizar métricas gerais da plataforma;
- futuramente administrar planos;
- futuramente administrar assinaturas;
- futuramente administrar faturamento;
- futuramente administrar configurações globais.


## Exemplo de estrutura conceitual

Loyalty Platform Admin
│
├── Dashboard
│
├── Empresas
│   ├── Listar
│   ├── Cadastrar
│   ├── Visualizar
│   ├── Editar
│   ├── Ativar
│   └── Desativar
│
├── Métricas
│
├── Planos
│
└── Configurações


Esse ambiente não deve ser confundido com o painel administrativo de uma empresa cliente.


# =====================================================
# 2. ADMINISTRAÇÃO DA EMPRESA
# =====================================================

Cada empresa cadastrada na Loyalty Platform possui seu próprio ambiente administrativo.

Esse ambiente deve operar exclusivamente dentro da empresa autenticada.

Exemplo:

Auto Posto Grando
└── APG+


Dentro da administração de uma empresa deve ser possível:

- cadastrar clientes;
- editar clientes;
- consultar clientes;
- ativar clientes;
- inativar clientes;

- cadastrar funcionários;
- editar funcionários;
- consultar funcionários;
- ativar funcionários;
- inativar funcionários;

- registrar compras;
- consultar histórico de compras;

- consultar ciclos de fidelidade;
- consultar progressão;
- consultar regularidade;

- administrar configurações de fidelidade;

- futuramente administrar recompensas;

- editar dados permitidos da própria empresa;

- visualizar dashboards e métricas daquela empresa.


# =====================================================
# ADMINISTRAÇÃO DO APG+
# =====================================================

Quando a empresa autenticada for o Auto Posto Grando, o ambiente administrativo representa o APG+.

Exemplo:

APG+
│
├── Dashboard
│
├── Clientes
│   ├── Listar
│   ├── Cadastrar
│   ├── Visualizar
│   └── Editar
│
├── Compras
│   ├── Registrar
│   └── Histórico
│
├── Fidelidade
│   ├── Ciclos
│   ├── Progressão
│   ├── Regularidade
│   └── Configurações
│
├── Funcionários
│   ├── Listar
│   ├── Cadastrar
│   └── Editar
│
└── Empresa
    └── Dados do Auto Posto Grando


O APG+ não deve visualizar nem administrar dados de outras empresas.


# =====================================================
# OUTRAS EMPRESAS
# =====================================================

Outras empresas poderão utilizar a mesma Loyalty Platform.

Cada empresa deve possuir:

- seus próprios clientes;
- seus próprios funcionários;
- suas próprias compras;
- seus próprios ciclos;
- sua própria progressão;
- sua própria regularidade;
- suas próprias configurações;
- suas próprias recompensas;
- sua própria identidade;
- seu próprio programa de fidelidade.

Nenhum tenant deve acessar os dados de outro tenant.


# =====================================================
# PAPÉIS CONCEITUAIS
# =====================================================

Não confundir:

PLATFORM ADMIN
=
administrador da Loyalty Platform como SaaS.

Responsável por administrar as empresas/tenants.


COMPANY ADMIN
=
administrador de uma empresa dentro da Loyalty Platform.

Responsável pela administração operacional da própria empresa.


Exemplo:

PLATFORM ADMIN
└── Loyalty Platform
    ├── Auto Posto Grando
    ├── Empresa B
    └── Empresa C


COMPANY ADMIN
└── Auto Posto Grando
    └── APG+
        ├── Clientes
        ├── Funcionários
        ├── Compras
        └── Fidelidade


O papel ADMIN atualmente existente no backend deve ser tratado de acordo com o contrato atual da API.

Não invente um PLATFORM_ADMIN caso o backend ainda não tenha esse papel.

Se uma funcionalidade da administração geral da Loyalty Platform exigir suporte inexistente no backend:

1. não altere o backend;
2. informe ao usuário;
3. não invente endpoints;
4. não simule comportamento inexistente como se fosse real.


# =====================================================
# SEPARAÇÃO DE INTERFACES
# =====================================================

O frontend deve considerar dois ambientes conceitualmente distintos.


## Ambiente da Loyalty Platform

Destinado à administração do SaaS.

Exemplo conceitual de rotas:

/platform
/platform/dashboard
/platform/companies
/platform/companies/:companyId
/platform/settings


## Ambiente da empresa

Destinado à administração operacional de um tenant.

Exemplo conceitual:

/app
/app/dashboard
/app/customers
/app/purchases
/app/employees
/app/loyalty
/app/company


Os caminhos reais podem ser ajustados conforme a implementação do frontend.

Não crie chamadas de API para endpoints inexistentes apenas porque existe uma rota de frontend.


# =====================================================
# REGRA DE ISOLAMENTO
# =====================================================

Uma operação realizada no ambiente de uma empresa nunca deve acessar dados de outra empresa.

Exemplo:

Um ADMIN do Auto Posto Grando pode:

- cadastrar clientes do Auto Posto Grando;
- editar clientes do Auto Posto Grando;
- cadastrar funcionários do Auto Posto Grando;
- editar funcionários do Auto Posto Grando;
- registrar compras do Auto Posto Grando;
- visualizar compras do Auto Posto Grando;
- consultar fidelidade do Auto Posto Grando;
- editar informações permitidas do Auto Posto Grando.

Ele NÃO pode:

- cadastrar clientes em outra empresa;
- visualizar clientes de outra empresa;
- visualizar funcionários de outra empresa;
- registrar compras para outra empresa;
- alterar configurações de outra empresa;
- administrar tenants da Loyalty Platform.


# =====================================================
# FILOSOFIA DO PROGRAMA APG+
# =====================================================

No caso específico do APG+, a filosofia do programa é:

"O APG não recompensa quem simplesmente gasta mais.
O APG recompensa quem escolhe o APG."

E:

"O cliente não precisa entender o programa.
Ele só precisa ser cliente.
O sistema faz o resto."

Esses princípios pertencem atualmente ao programa APG+.

Não presuma automaticamente que todas as futuras empresas utilizarão exatamente a mesma comunicação, identidade ou estratégia.


# =====================================================
# REGRA ABSOLUTA SOBRE O BACKEND
# =====================================================

O diretório:

../backend

é SOMENTE LEITURA.

Esta é uma regra absoluta.


## NUNCA faça qualquer uma destas ações no backend

- alterar arquivos;
- editar arquivos;
- formatar arquivos;
- renomear arquivos;
- mover arquivos;
- excluir arquivos;
- criar arquivos;
- criar diretórios;
- alterar package.json;
- instalar dependências;
- desinstalar dependências;
- atualizar dependências;
- executar migrations;
- executar prisma migrate;
- executar prisma db push;
- executar prisma format;
- executar prisma generate;
- modificar o banco de dados;
- alterar schemas;
- alterar services;
- alterar controllers ou routes;
- alterar autenticação;
- alterar middleware;
- corrigir automaticamente problemas encontrados;
- alterar configurações;
- executar comandos que possam modificar arquivos do backend.


## Backend como referência

É permitido ler o backend para entender:

- rotas;
- schemas;
- services;
- tipos;
- autenticação;
- autorização;
- Prisma;
- respostas;
- códigos de erro;
- regras de negócio.


Se encontrar um problema no backend:

1. não altere o backend;
2. informe claramente ao usuário;
3. indique o arquivo relacionado;
4. explique o problema;
5. adapte o frontend ao contrato atual quando possível;
6. aguarde decisão do usuário caso uma alteração de backend seja necessária.


# =====================================================
# DIRETÓRIO PERMITIDO PARA ESCRITA
# =====================================================

Você pode criar, editar, mover, renomear e excluir arquivos somente dentro do projeto frontend.

Diretório permitido:

./

Diretório proibido para escrita:

../backend


BACKEND
=
SOMENTE LEITURA

FRONTEND
=
LEITURA E ESCRITA


# =====================================================
# BACKEND COMO FONTE DE VERDADE
# =====================================================

O backend é a fonte de verdade sobre:

- endpoints;
- métodos HTTP;
- payloads;
- nomes de campos;
- tipos;
- respostas;
- autenticação;
- autorização;
- regras de negócio;
- códigos de erro.


Antes de implementar uma tela que consuma uma API:

1. localize a rota correspondente em ../backend;
2. leia o arquivo de routes;
3. leia o schema de validação;
4. leia o service quando necessário;
5. determine o payload real;
6. determine a resposta real;
7. determine os possíveis códigos de erro;
8. somente então implemente a integração.


Nunca:

- invente endpoints;
- invente campos;
- invente respostas;
- invente regras de negócio;
- mude contratos do backend;
- altere o backend para facilitar o frontend.


Se um endpoint necessário não existir:

1. não crie o endpoint;
2. não altere o backend;
3. informe ao usuário que o endpoint não existe;
4. continue somente com funcionalidades suportadas pela API atual.


# =====================================================
# TECNOLOGIAS DO FRONTEND
# =====================================================

O frontend utiliza:

- React;
- TypeScript;
- Vite.


Antes de adicionar uma nova biblioteca, avalie se ela realmente é necessária.

Não adicione dependências apenas por conveniência quando uma solução simples com as tecnologias existentes for suficiente.


# =====================================================
# PRINCÍPIOS DE ARQUITETURA
# =====================================================

A arquitetura deve priorizar:

- fácil entendimento;
- fácil leitura;
- fácil manutenção;
- responsabilidades claras;
- nomes descritivos;
- baixo acoplamento;
- organização previsível;
- simplicidade;
- consistência.


O código deve ser compreensível por outro desenvolvedor sem exigir conhecimento excessivo sobre abstrações internas.


## Prefira soluções simples e explícitas

Evite:

- overengineering;
- abstrações desnecessárias;
- arquitetura excessivamente complexa;
- padrões utilizados sem necessidade real;
- arquivos gigantes;
- componentes com múltiplas responsabilidades;
- hooks genéricos sem necessidade;
- funções difíceis de interpretar;
- nomes abreviados;
- nomes ambíguos;
- estruturas excessivamente profundas de pastas;
- lógica escondida em abstrações desnecessárias;
- duplicação de lógica.


Antes de criar uma abstração, avalie se ela realmente melhora:

- legibilidade;
- reutilização;
- manutenção;
- separação de responsabilidades.


Uma solução simples, clara e correta é preferível a uma solução sofisticada e difícil de entender.


# =====================================================
# ORGANIZAÇÃO DE PASTAS
# =====================================================

A estrutura de pastas deve ser previsível pelo propósito dos arquivos.

Exemplo recomendado:

src/
│
├── api/
│   ├── client.ts
│   ├── auth.api.ts
│   ├── companies.api.ts
│   ├── customers.api.ts
│   ├── employees.api.ts
│   ├── purchases.api.ts
│   └── loyalty.api.ts
│
├── components/
│   ├── ui/
│   ├── layout/
│   └── feedback/
│
├── pages/
│   ├── auth/
│   ├── platform/
│   ├── dashboard/
│   ├── customers/
│   ├── employees/
│   ├── purchases/
│   ├── loyalty/
│   └── company/
│
├── auth/
│
├── hooks/
│
├── contexts/
│
├── routes/
│
├── types/
│
├── utils/
│
└── main.tsx


Não é obrigatório seguir exatamente essa estrutura se existir uma solução mais simples.

A regra principal é:

A localização de um arquivo deve ser previsível pelo seu propósito.


# =====================================================
# COMPONENTES
# =====================================================

Cada componente deve possuir uma responsabilidade clara.

Prefira nomes simples e descritivos.

Exemplos:

CustomerForm

EmployeeForm

PurchaseForm

CustomerTable

EmployeeTable

PageHeader

Sidebar

LoadingState

ErrorMessage


Evite nomes como:

CustomerFormWithValidationAndApiIntegrationAndModalHandler


## Responsabilidades

Componentes de página devem coordenar a tela.

Componentes reutilizáveis devem cuidar da apresentação e interação específica.

A comunicação com a API deve ficar separada dos componentes visuais quando isso melhorar a legibilidade.

Não coloque toda a aplicação dentro de poucos componentes gigantes.


# =====================================================
# FUNÇÕES
# =====================================================

Prefira funções pequenas e com nomes que expressem claramente sua intenção.

Exemplos:

getCustomerByCpf()

createCustomer()

updateCustomer()

createEmployee()

updateEmployee()

registerPurchase()

getCustomerCycles()

formatCurrency()

formatCpf()

logout()


Evite:

handleData()

processStuff()

execute()

doRequest()

runLogic()


O nome da função deve ajudar a entender o que ela faz sem precisar ler toda sua implementação.


# =====================================================
# TYPESCRIPT
# =====================================================

Utilize TypeScript de forma clara.

Evite:

- any;
- tipos excessivamente genéricos;
- tipos extremamente complexos sem necessidade;
- generics criados apenas por abstração;
- casts desnecessários.


Os tipos utilizados para comunicação com a API devem refletir o contrato real do backend.


Prefira tipos simples e compreensíveis.

Exemplo:

interface Customer {
  idCompanyCustomer: number;
  cpf: string;
  name: string;
}


Não crie abstrações genéricas difíceis de interpretar quando uma interface simples resolver o problema.


# =====================================================
# CAMADA DE API
# =====================================================

A comunicação HTTP deve ser centralizada.

Evite chamadas HTTP espalhadas aleatoriamente pelos componentes.

Prefira uma estrutura como:

api/
├── client.ts
├── auth.api.ts
├── customers.api.ts
├── employees.api.ts
├── purchases.api.ts
├── companies.api.ts
└── loyalty.api.ts


O cliente HTTP central deve ser responsável por aspectos comuns como:

- URL base;
- headers;
- Bearer Token;
- tratamento básico de respostas;
- tratamento de 401 quando apropriado.


As funções específicas devem possuir nomes claros.

Exemplo:

login()

getCurrentUser()

getCustomerByCpf()

createCustomer()

updateCustomer()

registerPurchase()

getCustomerPurchases()


# =====================================================
# AUTENTICAÇÃO
# =====================================================

O backend utiliza JWT.

O frontend deve:

- possuir tela de login;
- enviar credenciais para o endpoint real do backend;
- armazenar o token de maneira coerente com a arquitetura escolhida;
- enviar Authorization: Bearer <token>;
- tratar respostas 401;
- tratar respostas 403;
- impedir acesso às páginas administrativas sem autenticação;
- utilizar os dados retornados pelo backend para determinar o contexto da empresa.


Nunca coloque:

- JWT_SECRET;
- senha de banco;
- secrets;
- API keys privadas;
- credenciais do backend

no frontend.


# =====================================================
# EMPRESA AUTENTICADA
# =====================================================

O frontend deve respeitar a empresa associada ao usuário autenticado.

Nunca permita que o usuário simplesmente informe qualquer companyId para acessar outra empresa.

Nunca confie em um companyId arbitrário vindo da interface.

As operações devem respeitar o tenant associado à autenticação e o contrato de segurança já existente no backend.


# =====================================================
# HTML SEMÂNTICO
# =====================================================

O frontend deve utilizar HTML semântico sempre que existir um elemento apropriado.

Evite utilizar `<div>` para tudo.

A estrutura HTML deve representar semanticamente o conteúdo da página.


## Estrutura geral

Utilize quando apropriado:

- `<header>`
- `<nav>`
- `<main>`
- `<section>`
- `<article>`
- `<aside>`
- `<footer>`


Exemplo:

<header>
  ...
</header>

<nav>
  ...
</nav>

<main>
  <section>
    ...
  </section>
</main>


Em React, utilize normalmente esses elementos através de JSX.


# =====================================================
# NAVEGAÇÃO SEMÂNTICA
# =====================================================

Links devem ser links.

Utilize:

<a>

ou componentes de roteamento que semanticamente renderizem links.


Não utilize:

<div onClick={...}>

ou:

<span onClick={...}>

quando a ação representa navegação.


# =====================================================
# BOTÕES
# =====================================================

Ações devem utilizar:

<button>


Exemplos:

- salvar;
- cadastrar;
- editar;
- cancelar;
- confirmar;
- abrir modal;
- fechar modal;
- registrar compra;
- ativar;
- inativar.


Não utilize `<div>` ou `<span>` como botão.


Sempre configure corretamente:

type="button"

ou:

type="submit"

conforme o contexto.


# =====================================================
# FORMULÁRIOS
# =====================================================

Formulários devem utilizar:

<form>


Campos devem possuir `<label>` associado ao controle correspondente.

Utilize corretamente:

- `<input>`
- `<select>`
- `<textarea>`
- `<button>`


Exemplo:

<form>
  <div>
    <label htmlFor="cpf">
      CPF
    </label>

    <input
      id="cpf"
      name="cpf"
      type="text"
    />
  </div>

  <button type="submit">
    Cadastrar
  </button>
</form>


Nunca utilize placeholder como substituto de label.


# =====================================================
# TABELAS
# =====================================================

Dados realmente tabulares devem utilizar HTML de tabela.

Utilize:

- `<table>`
- `<caption>` quando apropriado;
- `<thead>`
- `<tbody>`
- `<tr>`
- `<th>`
- `<td>`


Exemplos de dados tabulares:

- lista de clientes;
- lista de funcionários;
- histórico de compras;
- ciclos;
- empresas da Loyalty Platform.


Não recrie uma tabela inteira utilizando várias `<div>` quando os dados são semanticamente tabulares.


# =====================================================
# TÍTULOS
# =====================================================

Respeite hierarquia de títulos.

Utilize:

- `<h1>`
- `<h2>`
- `<h3>`
- `<h4>`


Cada página normalmente deve possuir um `<h1>` principal.

Não escolha heading pelo tamanho visual.

A aparência deve ser definida pelo CSS.


Exemplo:

<h1>Clientes</h1>

<section>
  <h2>Clientes ativos</h2>
</section>


# =====================================================
# LISTAS
# =====================================================

Quando o conteúdo representar semanticamente uma lista, utilize:

- `<ul>`
- `<ol>`
- `<li>`


Não utilize vários `<div>` quando uma lista HTML representa melhor a informação.


# =====================================================
# DATAS E CONTATOS
# =====================================================

Quando apropriado, utilize:

<time>

para representar datas e horários.


Quando semanticamente adequado, utilize:

<address>

para informações de contato ou endereço.


# =====================================================
# ACESSIBILIDADE
# =====================================================

Acessibilidade deve fazer parte da implementação desde o início.

Prefira sempre a semântica nativa do HTML antes de utilizar ARIA.

ARIA deve complementar o HTML e não substituir elementos semânticos existentes.


Prefira:

<button type="button">
  Editar cliente
</button>


Evite:

<div
  role="button"
  tabIndex={0}
>
  Editar cliente
</div>


## Requisitos gerais

- controles devem funcionar por teclado;
- inputs devem possuir labels;
- botões devem possuir nomes claros;
- links devem indicar corretamente seu destino;
- foco deve ser visível;
- mensagens de erro devem ser compreensíveis;
- não dependa somente de cores para transmitir informação;
- imagens relevantes devem possuir `alt`;
- imagens decorativas devem utilizar `alt=""`.


# =====================================================
# MODAIS
# =====================================================

Caso sejam utilizados modais:

- devem possuir título claro;
- devem possuir estrutura acessível;
- devem tratar foco adequadamente;
- devem permitir navegação por teclado;
- devem possuir botão explícito para fechar;
- devem utilizar botões semanticamente corretos;
- não devem depender exclusivamente de clique fora do modal.


Sempre prefira bibliotecas/componentes acessíveis ou implementação simples e correta.


# =====================================================
# CSS E SEMÂNTICA
# =====================================================

Nunca escolha um elemento HTML apenas pela aparência desejada.

Escolha primeiro o elemento semanticamente correto.

Depois aplique o estilo.


Evite:

<div className="button">
  Salvar
</div>


Prefira:

<button className="button">
  Salvar
</button>


A aparência visual nunca deve determinar a semântica do documento.


# =====================================================
# RESPONSIVIDADE
# =====================================================

A interface deve funcionar adequadamente em:

- desktop;
- notebook;
- tablet;
- celular.


Não construa a interface supondo apenas telas grandes.

Tabelas, formulários, navegação e dashboards devem permanecer utilizáveis em telas menores.


# =====================================================
# ESTADOS DA INTERFACE
# =====================================================

Toda tela que consome a API deve considerar quando apropriado:

- loading;
- sucesso;
- erro;
- conteúdo vazio;
- não autorizado;
- acesso proibido.


Evite interfaces que simplesmente ficam vazias quando ocorre erro.


# =====================================================
# ERROS DA API
# =====================================================

O frontend deve respeitar os códigos retornados pelo backend.

Exemplos:

400
=
dados inválidos

401
=
não autenticado

403
=
sem permissão

404
=
recurso não encontrado

409
=
conflito


Não transforme todos os erros em uma mensagem genérica se o backend fornecer informação útil.


# =====================================================
# REGRAS DE NEGÓCIO
# =====================================================

Regras de negócio devem permanecer no backend.

O frontend pode:

- validar formato;
- melhorar experiência;
- impedir submissões obviamente inválidas;
- apresentar resultados;
- apresentar estados.


O frontend não deve redefinir regras importantes da Loyalty Platform.

Exemplos:

- progressão;
- cálculo de mediana;
- frequência;
- regularidade;
- fechamento de ciclos;
- permissões;
- isolamento de empresa.

Essas regras pertencem ao backend.


# =====================================================
# FIDELIDADE
# =====================================================

Não tente recalcular no frontend valores que já são calculados pelo backend.

Exemplo:

O frontend não deve recalcular:

- nível de frequência;
- nível de valor;
- mediana;
- percentual da mediana;
- progressão;
- regularidade.

Exiba os dados fornecidos pela API.


# =====================================================
# DADOS MONETÁRIOS
# =====================================================

Valores monetários devem ser exibidos de forma apropriada para o usuário.

No contexto atual brasileiro, utilize formatação adequada quando necessário.

Exemplo visual:

R$ 250,00


Não altere o valor original retornado pela API.


# =====================================================
# CPF, CNPJ E TELEFONE
# =====================================================

É permitido aplicar máscaras visuais no frontend.

Porém, antes de enviar à API, respeite o formato esperado pelo backend.

Nunca altere a identidade real dos dados apenas para apresentação.


# =====================================================
# NÃO DUPLICAR REGRAS
# =====================================================

Sempre que o backend já possuir uma regra, não implemente uma segunda versão independente no frontend.

O frontend deve apresentar e consumir.

O backend deve decidir regras de negócio.


# =====================================================
# DEPENDÊNCIAS
# =====================================================

Não instale bibliotecas desnecessárias.

Antes de adicionar uma dependência:

1. verifique se o projeto já possui solução equivalente;
2. avalie se a funcionalidade pode ser implementada de forma simples;
3. avalie impacto de manutenção;
4. só então adicione a dependência.


Evite transformar o projeto em uma coleção excessiva de bibliotecas.


# =====================================================
# ALTERAÇÕES
# =====================================================

Antes de realizar alterações significativas:

1. analise a estrutura existente;
2. identifique os arquivos relacionados;
3. leia o backend quando precisar entender a API;
4. mantenha compatibilidade com o backend;
5. altere somente o frontend;
6. preserve padrões já utilizados no projeto.


Não realize grandes refatorações sem necessidade.

Não substitua tecnologias existentes sem motivo claro.

Não reorganize todo o projeto apenas por preferência pessoal.


# =====================================================
# IMPLEMENTAÇÃO INCREMENTAL
# =====================================================

Prefira implementar funcionalidades por etapas.

Exemplo:

1. estrutura;
2. integração;
3. comportamento;
4. estados de erro;
5. refinamento visual;
6. testes.


Não tente implementar dezenas de funcionalidades simultaneamente quando puder desenvolver e validar uma parte por vez.


# =====================================================
# PRIORIDADE DE DESENVOLVIMENTO
# =====================================================

Ao implementar uma funcionalidade, priorize nesta ordem:

1. funcionamento correto;
2. compatibilidade com o backend;
3. segurança;
4. isolamento entre empresas;
5. legibilidade;
6. semântica HTML;
7. acessibilidade;
8. manutenção;
9. reutilização;
10. responsividade;
11. aparência visual.


Uma interface bonita nunca deve comprometer:

- funcionamento;
- segurança;
- clareza;
- semântica;
- acessibilidade.


# =====================================================
# REGRAS FINAIS PARA O CODEX
# =====================================================

Sempre:

- leia antes de alterar;
- entenda antes de abstrair;
- prefira código simples;
- prefira nomes claros;
- utilize HTML semântico;
- mantenha componentes pequenos e focados;
- respeite o backend;
- respeite os tenants;
- respeite os contratos da API;
- escreva somente no frontend.


Nunca:

- altere o backend;
- invente endpoints;
- invente regras;
- faça hardcode do Auto Posto Grando em infraestrutura genérica;
- trate APG+ como a Loyalty Platform inteira;
- permita acesso entre tenants;
- introduza complexidade sem necessidade.


# =====================================================
# RESUMO DA ARQUITETURA
# =====================================================

LOYALTY PLATFORM
=
SAAS PRINCIPAL
+
MULTI-TENANT
+
ADMINISTRAÇÃO DAS EMPRESAS CLIENTES


ADMINISTRAÇÃO DA LOYALTY PLATFORM
=
GERENCIAMENTO DOS TENANTS / EMPRESAS


EMPRESA
=
TENANT ISOLADO DENTRO DA LOYALTY PLATFORM


ADMINISTRAÇÃO DA EMPRESA
=
CLIENTES
+
FUNCIONÁRIOS
+
COMPRAS
+
FIDELIDADE
+
CONFIGURAÇÕES
+
DADOS DAQUELA EMPRESA


AUTO POSTO GRANDO
=
UMA EMPRESA/TENANT DA LOYALTY PLATFORM


APG+
=
PROGRAMA DE FIDELIDADE DO AUTO POSTO GRANDO


APG+ NÃO É A LOYALTY PLATFORM.


PLATFORM ADMIN
=
ADMINISTRA O SAAS E AS EMPRESAS


COMPANY ADMIN
=
ADMINISTRA SOMENTE SUA PRÓPRIA EMPRESA


BACKEND
=
FONTE DE VERDADE
+
REFERÊNCIA SOMENTE LEITURA


FRONTEND
=
ÁREA PERMITIDA PARA DESENVOLVIMENTO


ARQUITETURA
=
SIMPLES
+
PREVISÍVEL
+
FÁCIL DE ENTENDER
+
FÁCIL DE MANTER


FRONTEND
=
LEGÍVEL
+
SEMÂNTICO
+
ACESSÍVEL
+
RESPONSIVO