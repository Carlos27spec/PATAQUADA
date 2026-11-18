import { Component, lazy, Suspense, useEffect } from "react";
import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
    useLocation,
} from "react-router-dom";
import "./App.css";

// Componentes
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";

// Páginas principais
const Home = lazy(() => import("./pages/home.jsx"));
const Login = lazy(() => import("./pages/login.jsx"));
const Cadastro = lazy(() => import("./pages/cadastro.jsx"));
const EsqueciSenha = lazy(() => import("./pages/esqueci_senha.jsx"));
const RedefinirSenha = lazy(() => import("./pages/redefinir_senha.jsx"));

// Páginas de serviços
const Servicos = lazy(() => import("./pages/servicos/servicos.jsx"));
const Planos = lazy(() => import("./pages/servicos/planos.jsx"));
const Consultas = lazy(() => import("./pages/servicos/consultas.jsx"));
const PetCare = lazy(() => import("./pages/servicos/pet-care.jsx"));

// Loja
const Shop = lazy(() => import("./pages/shop/shop.jsx"));
const Produto = lazy(() => import("./pages/shop/Produto.jsx"));
const Carrinho = lazy(() => import("./pages/shop/Carrinho.jsx"));

// Pagamentos
const Pagamento = lazy(() => import("./pages/shop/Pagamento.jsx"));
const PedidoRetorno = lazy(() => import("./pages/shop/PedidoRetorno.jsx"));

// Administração
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout.jsx"));
const AdminInicio = lazy(() => import("./pages/admin/AdminInicio.jsx"));
const AdminEmBreve = lazy(() => import("./pages/admin/AdminEmBreve.jsx"));
const AdminProdutos = lazy(() => import("./pages/admin/AdminProdutos.jsx"));
const AdminProdutoForm = lazy(() => import("./pages/admin/AdminProdutoForm.jsx"));
const AdminCadastroLista = lazy(() => import("./pages/admin/AdminCadastroLista.jsx"));
const AdminCadastroForm = lazy(() => import("./pages/admin/AdminCadastroForm.jsx"));

// Cadastros genéricos do admin (os campos ficam em pages/admin/cadastrosConfig.js)

// Usuários
const AreaClienteLayout = lazy(() => import("./pages/usuario/AreaClienteLayout.jsx"));
const AreaClienteInicio = lazy(() => import("./pages/usuario/AreaClienteInicio.jsx"));
const ContaEmBreve = lazy(() => import("./pages/usuario/ContaEmBreve.jsx"));
const ContaPedidos = lazy(() => import("./pages/usuario/ContaPedidos.jsx"));
const ContaPedido = lazy(() => import("./pages/usuario/ContaPedido.jsx"));
const ContaDados = lazy(() => import("./pages/usuario/ContaDados.jsx"));
const ContaEndereco = lazy(() => import("./pages/usuario/ContaEndereco.jsx"));

// Página 404
const Erro404 = lazy(() => import("./pages/404/404.jsx"));

// Tratamento de erros por página

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);

        this.state = {
            hasError: false,
        };
    }

    static getDerivedStateFromError() {
        return {
            hasError: true,
        };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Erro ao carregar a página:", error);
        console.error("Detalhes do erro:", errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return <Erro404 />;
        }

        return this.props.children;
    }
}

// Tela de carregamento
function Carregando() {
    return (
        <div className="carregando-pagina">
            <div className="loader"></div>
            <p>Carregando página...</p>
        </div>
    );
}

// Isolamento de erros e carregamento por página
function Pagina({ children }) {
    const { pathname } = useLocation();

    return (
        <ErrorBoundary key={pathname}>
            <Suspense fallback={<Carregando />}>{children}</Suspense>
        </ErrorBoundary>
    );
}

// Ao trocar de página, volta para o topo (a não ser que o link tenha #âncora)
function ScrollToTop() {
    const { pathname, hash } = useLocation();

    useEffect(() => {
        if (!hash) window.scrollTo(0, 0);
    }, [pathname, hash]);

    return null;
}

function App() {
    return (
        <BrowserRouter>
            <ScrollToTop />

            {/* Cabeçalho em todas as páginas */}
            <Header />

            <Routes>
                {/* Página inicial */}
                <Route path="/" element={<Pagina><Home /></Pagina>} />
                <Route path="/home" element={<Navigate to="/" replace />} />

                {/* "Sobre" e "Contato" são seções da Home (links do header e do footer) */}
                <Route path="/sobre" element={<Navigate to="/#sobre" replace />} />
                <Route path="/contato" element={<Navigate to="/#contato" replace />} />

                {/* Login, cadastro e recuperação de senha */}
                <Route path="/login" element={<Pagina><Login /></Pagina>} />
                <Route path="/cadastro" element={<Pagina><Cadastro /></Pagina>} />
                <Route path="/recuperar-senha" element={<Pagina><EsqueciSenha /></Pagina>} />
                <Route path="/redefinir-senha" element={<Pagina><RedefinirSenha /></Pagina>} />

                {/* Serviços */}
                <Route path="/servicos" element={<Pagina><Servicos /></Pagina>}>
                    <Route index element={<Navigate to="consultas" replace />} />
                    <Route path="planos" element={<Pagina><Planos /></Pagina>} />
                    <Route path="consultas" element={<Pagina><Consultas /></Pagina>} />
                    <Route path="pet-care" element={<Pagina><PetCare /></Pagina>} />
                </Route>

                {/* Loja */}
                <Route path="/shop" element={<Pagina><Shop /></Pagina>} />
                <Route path="/produto/:id" element={<Pagina><Produto /></Pagina>} />
                <Route path="/carrinho" element={<Pagina><Carrinho /></Pagina>} />

                {/* Pagamentos */}
                <Route path="/pagamento" element={<Pagina><Pagamento /></Pagina>} />
                <Route path="/pedido/sucesso" element={<Pagina><PedidoRetorno resultado="sucesso" /></Pagina>} />
                <Route path="/pedido/pendente" element={<Pagina><PedidoRetorno resultado="pendente" /></Pagina>} />
                <Route path="/pedido/falha" element={<Pagina><PedidoRetorno resultado="falha" /></Pagina>} />

                {/* Administração */}
                <Route path="/admin" element={<Pagina><AdminLayout /></Pagina>}>
                    <Route index element={<Pagina><AdminInicio /></Pagina>} />

                    {/* Produtos */}
                    <Route path="produtos" element={<Pagina><AdminProdutos /></Pagina>} />
                    <Route path="produtos/novo" element={<Pagina><AdminProdutoForm /></Pagina>} />
                    <Route path="produtos/:id" element={<Pagina><AdminProdutoForm /></Pagina>} />

                    {/* Categorias */}
                    <Route path="categorias" element={<Pagina><AdminCadastroLista key="categorias" tipo="categorias" /></Pagina>} />
                    <Route path="categorias/novo" element={<Pagina><AdminCadastroForm key="categorias-novo" tipo="categorias" /></Pagina>} />
                    <Route path="categorias/:id" element={<Pagina><AdminCadastroForm key="categorias-editar" tipo="categorias" /></Pagina>} />

                    {/* Fornecedores */}
                    <Route path="fornecedores" element={<Pagina><AdminCadastroLista key="fornecedores" tipo="fornecedores" /></Pagina>} />
                    <Route path="fornecedores/novo" element={<Pagina><AdminCadastroForm key="fornecedores-novo" tipo="fornecedores" /></Pagina>} />
                    <Route path="fornecedores/:id" element={<Pagina><AdminCadastroForm key="fornecedores-editar" tipo="fornecedores" /></Pagina>} />

                    {/* Produtos × Fornecedores */}
                    <Route path="produto-fornecedor" element={<Pagina><AdminCadastroLista key="produto-fornecedor" tipo="produto-fornecedor" /></Pagina>} />
                    <Route path="produto-fornecedor/novo" element={<Pagina><AdminCadastroForm key="produto-fornecedor-novo" tipo="produto-fornecedor" /></Pagina>} />
                    <Route path="produto-fornecedor/:id" element={<Pagina><AdminCadastroForm key="produto-fornecedor-editar" tipo="produto-fornecedor" /></Pagina>} />

                    {/* Estoque (movimentações só são incluídas, nunca editadas) */}
                    <Route path="movimentacoes-estoque" element={<Pagina><AdminCadastroLista key="movimentacoes-estoque" tipo="movimentacoes-estoque" /></Pagina>} />
                    <Route path="movimentacoes-estoque/novo" element={<Pagina><AdminCadastroForm key="movimentacoes-estoque-novo" tipo="movimentacoes-estoque" /></Pagina>} />

                    {/* Serviços e Planos */}
                    <Route path="servicos" element={<Pagina><AdminCadastroLista key="servicos" tipo="servicos" /></Pagina>} />
                    <Route path="servicos/novo" element={<Pagina><AdminCadastroForm key="servicos-novo" tipo="servicos" /></Pagina>} />
                    <Route path="servicos/:id" element={<Pagina><AdminCadastroForm key="servicos-editar" tipo="servicos" /></Pagina>} />
                    <Route path="consultas" element={<Pagina><AdminCadastroLista key="consultas" tipo="consultas" /></Pagina>} />
                    <Route path="consultas/novo" element={<Pagina><AdminCadastroForm key="consultas-novo" tipo="consultas" /></Pagina>} />
                    <Route path="consultas/:id" element={<Pagina><AdminCadastroForm key="consultas-editar" tipo="consultas" /></Pagina>} />
                    <Route path="profissionais" element={<Pagina><AdminCadastroLista key="profissionais" tipo="profissionais" /></Pagina>} />
                    <Route path="profissionais/novo" element={<Pagina><AdminCadastroForm key="profissionais-novo" tipo="profissionais" /></Pagina>} />
                    <Route path="profissionais/:id" element={<Pagina><AdminCadastroForm key="profissionais-editar" tipo="profissionais" /></Pagina>} />
                    <Route path="planos" element={<Pagina><AdminCadastroLista key="planos" tipo="planos" /></Pagina>} />
                    <Route path="planos/novo" element={<Pagina><AdminCadastroForm key="planos-novo" tipo="planos" /></Pagina>} />
                    <Route path="planos/:id" element={<Pagina><AdminCadastroForm key="planos-editar" tipo="planos" /></Pagina>} />
                    <Route path="assinaturas" element={<Pagina><AdminCadastroLista key="assinaturas" tipo="assinaturas" /></Pagina>} />
                    <Route path="assinaturas/novo" element={<Pagina><AdminCadastroForm key="assinaturas-novo" tipo="assinaturas" /></Pagina>} />
                    <Route path="assinaturas/:id" element={<Pagina><AdminCadastroForm key="assinaturas-editar" tipo="assinaturas" /></Pagina>} />
                    <Route path="cobrancas" element={<Pagina><AdminCadastroLista key="cobrancas" tipo="cobrancas" /></Pagina>} />
                    <Route path="cobrancas/novo" element={<Pagina><AdminCadastroForm key="cobrancas-novo" tipo="cobrancas" /></Pagina>} />
                    <Route path="cobrancas/:id" element={<Pagina><AdminCadastroForm key="cobrancas-editar" tipo="cobrancas" /></Pagina>} />

                    {/* Atendimento */}
                    <Route path="agendamentos" element={<Pagina><AdminCadastroLista key="agendamentos" tipo="agendamentos" /></Pagina>} />
                    <Route path="agendamentos/novo" element={<Pagina><AdminCadastroForm key="agendamentos-novo" tipo="agendamentos" /></Pagina>} />
                    <Route path="agendamentos/:id" element={<Pagina><AdminCadastroForm key="agendamentos-editar" tipo="agendamentos" /></Pagina>} />
                    <Route path="historico-agendamentos" element={<Pagina><AdminCadastroLista key="historico-agendamentos" tipo="historico-agendamentos" /></Pagina>} />
                    <Route path="situacoes" element={<Pagina><AdminCadastroLista key="situacoes" tipo="situacoes" /></Pagina>} />
                    <Route path="situacoes/novo" element={<Pagina><AdminCadastroForm key="situacoes-novo" tipo="situacoes" /></Pagina>} />
                    <Route path="situacoes/:id" element={<Pagina><AdminCadastroForm key="situacoes-editar" tipo="situacoes" /></Pagina>} />

                    {/* Clientes */}
                    <Route path="usuarios" element={<Pagina><AdminCadastroLista key="usuarios" tipo="usuarios" /></Pagina>} />
                    <Route path="usuarios/novo" element={<Pagina><AdminCadastroForm key="usuarios-novo" tipo="usuarios" /></Pagina>} />
                    <Route path="usuarios/:id" element={<Pagina><AdminCadastroForm key="usuarios-editar" tipo="usuarios" /></Pagina>} />
                    <Route path="pets" element={<Pagina><AdminCadastroLista key="pets" tipo="pets" /></Pagina>} />
                    <Route path="pets/novo" element={<Pagina><AdminCadastroForm key="pets-novo" tipo="pets" /></Pagina>} />
                    <Route path="pets/:id" element={<Pagina><AdminCadastroForm key="pets-editar" tipo="pets" /></Pagina>} />
                    <Route path="enderecos" element={<Pagina><AdminCadastroLista key="enderecos" tipo="enderecos" /></Pagina>} />
                    <Route path="enderecos/novo" element={<Pagina><AdminCadastroForm key="enderecos-novo" tipo="enderecos" /></Pagina>} />
                    <Route path="enderecos/:id" element={<Pagina><AdminCadastroForm key="enderecos-editar" tipo="enderecos" /></Pagina>} />
                    <Route path="tipos-usuario" element={<Pagina><AdminCadastroLista key="tipos-usuario" tipo="tipos-usuario" /></Pagina>} />
                    <Route path="tipos-usuario/novo" element={<Pagina><AdminCadastroForm key="tipos-usuario-novo" tipo="tipos-usuario" /></Pagina>} />
                    <Route path="tipos-usuario/:id" element={<Pagina><AdminCadastroForm key="tipos-usuario-editar" tipo="tipos-usuario" /></Pagina>} />
                    <Route path="permissoes" element={<Pagina><AdminCadastroLista key="permissoes" tipo="permissoes" /></Pagina>} />
                    <Route path="permissoes/novo" element={<Pagina><AdminCadastroForm key="permissoes-novo" tipo="permissoes" /></Pagina>} />
                    <Route path="permissoes/:id" element={<Pagina><AdminCadastroForm key="permissoes-editar" tipo="permissoes" /></Pagina>} />
                    <Route path="permissoes-tipo" element={<Pagina><AdminCadastroLista key="permissoes-tipo" tipo="permissoes-tipo" /></Pagina>} />
                    <Route path="permissoes-tipo/novo" element={<Pagina><AdminCadastroForm key="permissoes-tipo-novo" tipo="permissoes-tipo" /></Pagina>} />
                    <Route path="permissoes-tipo/:id" element={<Pagina><AdminCadastroForm key="permissoes-tipo-editar" tipo="permissoes-tipo" /></Pagina>} />

                    {/* Pedidos (só acompanhamento: não há "novo") */}
                    <Route path="pedidos" element={<Pagina><AdminCadastroLista key="pedidos" tipo="pedidos" /></Pagina>} />
                    <Route path="pedidos/:id" element={<Pagina><AdminCadastroForm key="pedidos-editar" tipo="pedidos" /></Pagina>} />

                    {/* Configurações */}
                    <Route path="dados-pataquada" element={<Pagina><AdminCadastroForm key="dados-pataquada" tipo="dados-pataquada" /></Pagina>} />
                    <Route path="configuracoes" element={<Pagina><AdminCadastroLista key="configuracoes" tipo="configuracoes" /></Pagina>} />
                    <Route path="configuracoes/novo" element={<Pagina><AdminCadastroForm key="configuracoes-novo" tipo="configuracoes" /></Pagina>} />
                    <Route path="configuracoes/:id" element={<Pagina><AdminCadastroForm key="configuracoes-editar" tipo="configuracoes" /></Pagina>} />

                    {/* Endereço desconhecido dentro do admin */}
                    <Route path="*" element={<Pagina><AdminEmBreve /></Pagina>} />
                </Route>

                {/* Área do cliente */}
                <Route path="/usuarios" element={<AreaClienteLayout />}>
                    <Route index element={<Pagina><AreaClienteInicio /></Pagina>} />
                    <Route path="pedidos" element={<Pagina><ContaPedidos /></Pagina>} />
                    <Route path="pedidos/:id" element={<Pagina><ContaPedido /></Pagina>} />
                    <Route path="dados" element={<Pagina><ContaDados /></Pagina>} />
                    <Route path="endereco" element={<Pagina><ContaEndereco /></Pagina>} />
                    <Route path="*" element={<Pagina><ContaEmBreve /></Pagina>} />
                </Route>

                {/* Página não encontrada */}
                <Route path="*" element={<Erro404 />} />
            </Routes>

            {/* Rodapé em todas as páginas */}
            <Footer />
        </BrowserRouter>
    );
}

export default App;
