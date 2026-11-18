# 🐾 PATAQUADA

**Loja virtual e sistema de gerenciamento para Pet Shop**

O PATAQUADA é uma aplicação web para um pet shop. Clientes podem conhecer os serviços, consultas e planos, comprar produtos com pagamento pelo Mercado Pago e acompanhar seus pedidos. A equipe usa um painel administrativo para cuidar de produtos, estoque, serviços, agendamentos, clientes, pedidos e das configurações da loja. O acesso de cada pessoa ao painel depende das permissões do seu tipo de usuário.

---

## 🚀 Tecnologias utilizadas

### Front-end
- **React 19** – construção das interfaces.
- **Vite** – servidor de desenvolvimento e build.
- **React Router DOM** – rotas e navegação.
- **CSS3** – estilização das páginas (um arquivo CSS por tela).
- **Font Awesome** – ícones.

### Back-end
- **Node.js + Express 5** – API REST.
- **SQLite + Better-SQLite3** – banco de dados e acesso a ele.
- **bcrypt** – criptografia das senhas.
- **Token de autenticação** (`src/middlewares/auth.js`) – login e proteção das rotas.
- **Nodemailer** – e-mails de redefinição de senha e do formulário de contato.
- **dotenv** – configurações em arquivo `.env`.

### Integrações
- **Mercado Pago (Checkout Pro)** – pagamento por cartão e Pix.
- **BrasilAPI / ViaCEP** – busca de endereço pelo CEP.
- **OpenStreetMap (Nominatim)** – localização dos endereços para calcular a distância do frete.
- **FormSubmit** – envio do formulário de contato quando o SMTP não está configurado.

### Ferramentas
- **Git e GitHub** – controle de versão.
- **ESLint** – padronização do código.
- **Concurrently** – roda front-end e back-end com um único comando.

---

## 📌 Funcionalidades

### Site
- Página inicial com informações da empresa e formulário de contato (nome, e-mail, telefone e mensagem).
- Páginas de serviços, consultas, planos e Pet Care.
- Loja com busca, categorias, página do produto e carrinho.
- Busca global no site.
- Rodapé com as redes sociais cadastradas da empresa, incluindo o link do WhatsApp.

### Conta do cliente
- Cadastro com validação de CPF, telefone e senha (mínimo de 8 caracteres, com letra e número). O nome de usuário é único.
- Login por e-mail ou nome de usuário.
- Recuperação de senha por e-mail, com link que vale por 30 minutos.
- Área do cliente com:
  - meus pedidos e os detalhes de cada um;
  - dados pessoais e troca de senha;
  - endereço de entrega.
- Botão "Painel administrativo" para quem tem permissão de acesso.

### Compra e pagamento
- Cálculo de frete pelo CEP, considerando a distância até o endereço da empresa, com frete grátis a partir de um valor.
- Pagamento pelo Mercado Pago (cartão e Pix), aberto em uma nova aba.
- Os itens comprados saem do carrinho quando o pagamento é iniciado.
- Tela de retorno com a situação do pedido e opção de tentar pagar de novo.

### Painel administrativo
- **Produtos:** produtos (com envio de imagem), categorias, fornecedores, vínculo produto-fornecedor e movimentações de estoque.
- **Serviços e planos:** serviços, consultas, profissionais, planos, assinaturas e cobranças.
- **Atendimento:** agendamentos, histórico de agendamentos e situações.
- **Clientes:** usuários, pets e endereços.
- **Pedidos:** lista e detalhes dos pedidos.
- **Configurações:**
  - dados da empresa (endereço, contato e redes sociais);
  - configurações gerais;
  - tipos de usuário e permissões.

#### Permissões
- Cada tipo de usuário tem uma lista de permissões (tabela `permissao_tipo_usuario`).
- No cadastro de **Tipos de usuário** você marca quais telas aquele tipo pode acessar e o que pode fazer em cada uma: ver, cadastrar, editar e excluir.
- A permissão `PAINEL_ACESSAR` libera a entrada no painel. O tipo Cliente não deve tê-la.
- O servidor bloqueia as ações sem permissão.
- O painel esconde os menus e botões que o usuário não pode usar.

---

## 📁 Estrutura do projeto

```
PATAQUADA/
├── server.js               # Inicia a API e registra as rotas
├── vite.config.js          # Vite (repassa /api para a porta 4000)
├── database/
│   ├── pataquadaDB.db      # Banco SQLite
│   └── scripts/            # Creates, Inserts, Triggers/Views, Drop/Delete
├── documentacao/           # Briefing, modelos e dicionário do banco
└── src/
    ├── App.jsx             # Rotas do front-end
    ├── components/         # Cabeçalho, rodapé, ícones...
    ├── config/             # Conexão com o banco
    ├── middlewares/        # Autenticação
    ├── routes/             # Rotas da API (usuários, carrinho, pedidos, pagamentos...)
    ├── services/           # Regras de carrinho, pedidos, frete e Mercado Pago
    ├── utils/              # Funções de apoio e regras de senha/usuário
    ├── images/             # Imagens por tipo: produtos, categorias, servicos, planos...
    └── pages/
        ├── admin/          # Painel administrativo
        ├── usuario/        # Área do cliente
        ├── shop/           # Loja, carrinho e pagamento
        ├── servicos/       # Serviços, consultas, planos e Pet Care
        ├── search/         # Busca global
        └── 404/            # Página não encontrada
```

### Imagens
O banco guarda **somente o nome do arquivo** da imagem (por exemplo, `racao-premium-para-caes-adultos-10kg.png`). O arquivo fica em `src/images/<tipo>/`. Quando você envia uma imagem pelo painel, ela é renomeada a partir do nome do item e salva na pasta certa.

---

## ⚙️ Instalação e execução

### Pré-requisitos
- Node.js 20 ou superior
- npm
- Git

### 1. Clonar o repositório

```bash
git clone https://github.com/Carlos27spec/PATAQUADA.git
cd PATAQUADA
```

### 2. Instalar as dependências

Na pasta do projeto, rode:

```bash
npm install
```

Esse comando lê o `package.json` e instala tudo de que o projeto precisa. Se preferir instalar os pacotes um a um, os comandos são:

```bash
# Front-end
npm install react react-dom react-router-dom

# Back-end
npm install express cors dotenv better-sqlite3 bcrypt jsonwebtoken nodemailer

# Ferramentas de desenvolvimento
npm install -D vite @vitejs/plugin-react concurrently eslint @eslint/js eslint-plugin-react-hooks eslint-plugin-react-refresh globals
```

> Se o `better-sqlite3` ou o `bcrypt` derem erro na instalação, confira se o Node.js está atualizado e rode `npm install` de novo.

### 3. Configurar o `.env`

Crie um arquivo chamado `.env` na raiz do projeto, ao lado do `package.json`, e preencha as variáveis abaixo:

```env
JWT_SECRET=
FRONTEND_URL=
MP_ACCESS_TOKEN=
EMAIL_PASS=
```

| Variável | O que colocar |
|---|---|
| `JWT_SECRET` | Um texto longo e aleatório. Ele protege o login, então não compartilhe. |
| `FRONTEND_URL` | O endereço onde o site abre (o Vite mostra no terminal ao rodar `npm run dev`). |
| `MP_ACCESS_TOKEN` | O Access Token do Mercado Pago: no [painel de desenvolvedor](https://www.mercadopago.com.br/developers/panel), abra a sua aplicação e copie a credencial. Use a **de teste** enquanto desenvolve. |
| `EMAIL_PASS` | A senha de app da conta que envia os e-mails (veja abaixo). No Gmail, ative a verificação em duas etapas e gere a senha em [Senhas de app](https://myaccount.google.com/apppasswords). A senha normal da conta não funciona. |

**Já ficam no banco (não vão no `.env`).** Altere pelo painel administrativo:
- **Configurações > Dados da empresa:** nome, endereço, e-mail, telefone, WhatsApp e redes sociais.
- **Configurações > Configurações da loja:**
  - `email_envio`: conta que envia os e-mails. Se ficar vazia, usa o e-mail de Dados da empresa.
  - `whatsapp_vendas`: outro WhatsApp para o site. Se ficar vazio, usa o de Dados da empresa.
  - `frete_gratis_a_partir_de` e os demais `frete_*`: valores do frete, em centavos. Use `0` para desligar o frete grátis.

Cada chave de configuração é única: o painel não deixa cadastrar duas iguais.

**Variáveis opcionais**, só se precisar mudar o comportamento padrão:

| Variável | Para que serve |
|---|---|
| `PORT` | Porta do back-end (padrão 4000). Se mudar, ajuste também o `vite.config.js`. |
| `DB_NAME` | Nome de outro arquivo de banco dentro de `database/`. |
| `VITE_API_URL` | Endereço da API, quando o back-end estiver em outro servidor. |
| `BACKEND_URL` | Endereço público (https) do back-end, para o Mercado Pago avisar os pagamentos. |
| `EMAIL_USER`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_FROM` | Usar outra conta ou outro servidor de e-mail no lugar do que está no banco. |
| `ADMIN_TIPOS_USUARIO` | Emergência: dá todas as permissões ao tipo de usuário informado (pelo id), caso ninguém consiga entrar no painel. |

> Depois de alterar o `.env`, pare o `npm run dev` (Ctrl+C) e rode de novo.

> Sem o `EMAIL_PASS`, em desenvolvimento o link de redefinição de senha aparece no terminal.

### 4. Executar

```bash
npm run dev
```

Esse comando inicia ao mesmo tempo:
- o **front-end** (Vite), em `http://localhost:5173`;
- o **back-end** (Express), em `http://localhost:4000`, reiniciando sozinho quando um arquivo muda.

### Outros comandos

| Comando | O que faz |
|---|---|
| `npm run server` | Inicia somente o back-end |
| `npm run build` | Gera a versão de produção em `dist/` |
| `npm run preview` | Abre a versão gerada pelo build |
| `npm run lint` | Verifica o código com o ESLint |

---

## 🗄️ Banco de dados

O projeto usa **SQLite**, com o arquivo `database/pataquadaDB.db`. Os scripts de criação e de carga ficam em `database/scripts/`. Os modelos conceitual e lógico e o dicionário de dados estão em `documentacao/`.

Principais grupos de tabelas:
- **Usuários e acesso:** usuários, tipos de usuário, permissões e permissões por tipo.
- **Clientes:** pets e endereços.
- **Loja:** produtos, categorias, fornecedores, estoque, carrinho, pedidos e itens do pedido.
- **Serviços:** serviços, consultas, profissionais, planos, assinaturas e cobranças.
- **Atendimento:** agendamentos, histórico e situações.
- **Empresa:** dados da PataQuada (endereço, contato e redes sociais) e configurações gerais.

---

## 💳 Testando o pagamento

1. Coloque no `MP_ACCESS_TOKEN` o Access Token **de teste** da sua conta Mercado Pago.
2. Faça uma compra no site e pague com um cartão de teste do Mercado Pago.
3. O retorno automático para o site e o aviso de pagamento (webhook) só funcionam com um endereço **https** público. Em ambiente local, use a tela de retorno do pedido para conferir a situação.

---

## 🎨 Identidade visual

A identidade visual do PATAQUADA é amigável e moderna, com elementos do universo pet como patinhas e mascotes. As páginas públicas, a área do cliente e o painel administrativo seguem a mesma paleta de cores.

---

## 👨‍💻 Desenvolvimento

Projeto acadêmico desenvolvido como atividade do segundo semestre. O objetivo é aplicar conhecimentos de desenvolvimento web, integração entre front-end e back-end, banco de dados e construção de sistemas.

**Repositório:** [Carlos27spec/PATAQUADA](https://github.com/Carlos27spec/PATAQUADA)
