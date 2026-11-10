# 🐾 PATAQUADA

**Sistema de gerenciamento e atendimento para Pet Shop**

O PATAQUADA é uma aplicação web desenvolvida para facilitar o gerenciamento de um pet shop, oferecendo funcionalidades para clientes e administradores. O sistema reúne serviços, consultas, planos e cuidados para animais de estimação em uma única plataforma, com foco em praticidade, organização e facilidade de uso.

---

## 🚀 Tecnologias utilizadas

### Front-end
- **React** – Biblioteca para construção das interfaces.
- **Vite** – Ferramenta de desenvolvimento e build.
- **JavaScript (ES Modules)** – Linguagem utilizada no desenvolvimento.
- **HTML5 e CSS3** – Estruturação e estilização das páginas.
- **React Router DOM** – Gerenciamento de rotas e navegação.

### Back-end
- **Node.js** – Ambiente de execução JavaScript.
- **Express.js** – Framework para criação da API e gerenciamento das requisições.
- **SQLite** – Banco de dados relacional utilizado para armazenamento das informações.
- **Better-SQLite3** – Biblioteca para comunicação e execução de comandos SQL no banco de dados.

### Ferramentas
- **Git e GitHub** – Controle de versão e gerenciamento do código-fonte.
- **Visual Studio Code** – Ambiente de desenvolvimento.

---

## 📌 Funcionalidades

### Área do cliente
- Navegação pelo site e visualização dos serviços disponíveis.
- Consulta de informações sobre planos e cuidados para pets.
- Cadastro e gerenciamento de informações pessoais.
- Gerenciamento de endereços.
- Visualização de pedidos e histórico.
- Carrinho de compras.
- Processo de pagamento.

### Área administrativa
- Acesso à área administrativa.
- Gerenciamento de informações e cadastros.
- Administração dos serviços oferecidos pelo pet shop.
- Gerenciamento de consultas, planos e serviços de Pet Care.
- Consulta e organização dos dados cadastrados.

---

## ⚙️ Instalação e execução

### Pré-requisitos

- Node.js instalado.
- npm instalado.
- Git instalado.

### 1. Clonar o repositório

```bash
git clone https://github.com/Carlos27spec/PATAQUADA.git
```

### 2. Acessar a pasta do projeto

```bash
cd PATAQUADA
```

### 3. Instalar as dependências

```bash
npm install
<<<<<<< HEAD
npm install nodemailer
```
=======
npm install express bcrypt better-sqlite3 dotenv
>>>>>>> 9cf10b6 (banco)

### 4. Executar a aplicação

```bash
npm run dev
```

O Vite disponibilizará o endereço de acesso à aplicação diretamente no terminal.

*Caso o back-end possua um script de inicialização separado, execute-o em outro terminal conforme os scripts definidos no package.json.*

---

## 🗄️ Banco de dados

O projeto utiliza SQLite para armazenamento e gerenciamento dos dados.

O banco de dados contempla informações relacionadas a:

- Usuários e tipos de usuário.
- Clientes e seus respectivos pets.
- Serviços oferecidos.
- Consultas veterinárias.
- Planos.
- Serviços de Pet Care.
- Pedidos e demais informações necessárias ao funcionamento da aplicação.

As operações de consulta, inserção, atualização e exclusão são realizadas pelo back-end, utilizando Better-SQLite3.

---

## 🎨 Identidade visual

A identidade visual do PATAQUADA foi desenvolvida com uma proposta amigável e moderna, utilizando elementos visuais relacionados ao universo pet.

O projeto busca proporcionar uma experiência intuitiva, mantendo consistência visual entre as páginas públicas, a área do cliente e o ambiente administrativo.

---

## 👨‍💻 Desenvolvimento

Projeto acadêmico desenvolvido como atividade do segundo semestre, com o objetivo de aplicar conhecimentos de desenvolvimento web, integração entre front-end e back-end, manipulação de banco de dados e construção de sistemas.

**Repositório:** [Carlos27spec/PATAQUADA](https://github.com/Carlos27spec/PATAQUADA)