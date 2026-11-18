import 'dotenv/config';

import express from 'express';

import { db, arquivoBanco } from './src/config/database.js';
import { criarMiddlewareAutenticacao } from './src/middlewares/auth.js';

// Rotas do site
import criarRotasSistema from './src/routes/sistema.js';
import criarRotasUsuarios from './src/routes/usuarios.js';
import criarRotasCarrinho from './src/routes/carrinho.js';
import criarRotasPagamentos from './src/routes/pagamentos.js';
import criarRotasPedidos from './src/routes/pedidos.js';
import criarRotasCatalogo from './src/routes/catalogo.js';
import criarRotasContato from './src/routes/contato.js';
import criarRotasEmpresa from './src/routes/empresa.js';
import { limitar } from './src/utils/helpers.js';
import { registrarRotasFrete } from './src/services/frete.js';

// Área do cliente
import { registrarAreaCliente } from './src/pages/usuario/clienteInicio.js';
import { registrarContaCliente } from './src/pages/usuario/clienteConta.js';

// Área administrativa
import { registrarAdminInicio } from './src/pages/admin/adminInicio.js';
import { registrarAdminProdutos } from './src/pages/admin/adminProdutos.js';
import { registrarAdminCadastros } from './src/pages/admin/adminCadastros.js';

// =====================================================
// CONFIGURAÇÕES INICIAIS
// =====================================================

const app = express();
const PORT = process.env.PORT || 4000;

if (!process.env.JWT_SECRET) {
    console.warn('AVISO: JWT_SECRET não configurado. Utilize uma chave própria no .env.');
}

// CORS: só o site (FRONTEND_URL) pode chamar a API pelo navegador.
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:5173');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Exige login (token) nas rotas que recebem este middleware.
const autenticar = criarMiddlewareAutenticacao(db);

// =====================================================
// ROTAS
// =====================================================

app.use(criarRotasSistema({ autenticar }));     // /, /api/status, /api/me
app.use(criarRotasUsuarios({ autenticar }));    // /api/usuarios/*
app.use(criarRotasCarrinho({ autenticar }));    // /api/carrinho/*
app.use(criarRotasPagamentos({ autenticar }));  // /api/pagamentos/*
app.use(criarRotasPedidos({ autenticar }));     // /api/pedidos/*
app.use(criarRotasCatalogo());                  // produtos, serviços, planos...
app.use(criarRotasEmpresa());                   // /api/empresa (footer)
app.use('/api/contato', criarRotasContato(limitar, db));

registrarAreaCliente({ app, db, autenticar });    // /api/cliente/*
registrarContaCliente({ app, db, autenticar });   // /api/cliente/* (pedidos, conta, endereços)
registrarRotasFrete({ app, db, autenticar });     // /api/cep, /api/frete, /api/usuarios/me/*
registrarAdminInicio({ app, db, autenticar });    // /api/admin/eu, /api/admin/resumo
registrarAdminProdutos({ app, db, autenticar });  // /api/admin/produtos/*
registrarAdminCadastros({ app, db, autenticar }); // /api/admin/cadastros/*

// =====================================================
// ROTA NÃO ENCONTRADA E ERROS
// =====================================================

app.use((req, res) => {
    return res.status(404).json({
        sucesso: false,
        mensagem: 'Rota não encontrada.',
        rota: req.originalUrl
    });
});

// eslint-disable-next-line no-unused-vars
app.use((erro, req, res, next) => {
    console.error('Erro não tratado:', erro);

    return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro interno do servidor.'
    });
});

// =====================================================
// INICIALIZAÇÃO E ENCERRAMENTO
// =====================================================

const servidor = app.listen(PORT, () => {
    console.log(`Servidor PataQuada iniciado na porta ${PORT}`);
    console.log(`Banco utilizado: ${arquivoBanco}`);

    if (!process.env.MP_ACCESS_TOKEN) {
        console.warn('AVISO: MP_ACCESS_TOKEN não configurado. O pagamento pelo Mercado Pago ficará indisponível.');
    }
});

function encerrarServidor() {
    console.log('Encerrando servidor...');

    servidor.close(() => {
        db.close();
        console.log('Conexão com o banco de dados encerrada.');
        process.exit(0);
    });
}

process.on('SIGINT', encerrarServidor);
