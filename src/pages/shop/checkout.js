import { useCallback, useEffect, useState } from 'react';

import {
    carregarCarrinho,
    chamarApi
} from './carrinho.js';
import { calcularFrete } from './shop.js';

// ========================================
// AJUSTE CONFORME O SEU PROJETO
// ========================================

// Rota da tela de login (usada quando o cliente ainda não entrou).
export const ROTA_LOGIN = '/login';

// Onde o endereço de entrega fica salvo no navegador, para o
// cliente não precisar digitar de novo na próxima compra.
const CHAVE_ENTREGA = 'pataquada_entrega';

// ========================================
// TOTAIS
// ========================================

// Só para exibir: quem decide o valor cobrado é o servidor.
export function totaisDoCarrinho(itens) {
    const subtotal = itens.reduce((soma, item) => soma + item.subtotal, 0);
    const frete = calcularFrete(subtotal);

    return { subtotal, frete, total: subtotal + frete };
}

// ========================================
// FORMAS DE PAGAMENTO
// (o código é o que o servidor espera em /api/pagamentos/preferencia)
// ========================================

export const FORMAS_PAGAMENTO = [
    {
        codigo: 'PIX',
        nome: 'Pix',
        descricao: 'Pagamento instantâneo'
    },
    {
        codigo: 'CREDITO',
        nome: 'Cartão de Crédito',
        descricao: 'Parcele em até 12x'
    },
    {
        codigo: 'DEBITO',
        nome: 'Cartão de Débito',
        descricao: 'Débito à vista'
    },
    {
        codigo: 'BOLETO',
        nome: 'Boleto Bancário',
        descricao: 'Pague no seu banco'
    }
];

// ========================================
// ENDEREÇO DE ENTREGA
// ========================================

export const ENTREGA_VAZIA = {
    destinatario: '',
    telefone: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: ''
};

export function lerEntregaSalva() {
    try {
        const salva = JSON.parse(
            localStorage.getItem(CHAVE_ENTREGA) || '{}'
        );

        return { ...ENTREGA_VAZIA, ...salva };
    } catch {
        return { ...ENTREGA_VAZIA };
    }
}

export function salvarEntrega(entrega) {
    localStorage.setItem(CHAVE_ENTREGA, JSON.stringify(entrega));
}

export function formatarCep(valor) {
    const digitos = String(valor).replace(/\D/g, '').slice(0, 8);

    return digitos.length > 5
        ? `${digitos.slice(0, 5)}-${digitos.slice(5)}`
        : digitos;
}

export function formatarTelefone(valor) {
    const digitos = String(valor).replace(/\D/g, '').slice(0, 11);

    if (digitos.length <= 2) {
        return digitos;
    }

    const ddd = digitos.slice(0, 2);
    const resto = digitos.slice(2);
    const corte = resto.length > 8 ? 5 : 4;

    return resto.length > corte
        ? `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`
        : `(${ddd}) ${resto}`;
}

// Preenche rua, bairro, cidade e UF a partir do CEP (ViaCEP).
// Se o serviço estiver fora do ar, devolve null e o cliente digita.
export async function buscarCep(cep) {
    const digitos = String(cep).replace(/\D/g, '');

    if (digitos.length !== 8) {
        return null;
    }

    try {
        const resposta = await fetch(
            `https://viacep.com.br/ws/${digitos}/json/`
        );

        const dados = await resposta.json();

        if (!resposta.ok || dados.erro) {
            return null;
        }

        return {
            logradouro: dados.logradouro || '',
            bairro: dados.bairro || '',
            cidade: dados.localidade || '',
            uf: dados.uf || ''
        };
    } catch {
        return null;
    }
}

// ========================================
// PAGAMENTO (servidor + Mercado Pago)
// ========================================

// Cria o pedido e devolve { pedido_id, init_point }.
export function criarPagamento({ forma, entrega }) {
    return chamarApi('/api/pagamentos/preferencia', {
        metodo: 'POST',
        corpo: { forma, entrega }
    });
}

// Confere o pagamento no servidor (que consulta o Mercado Pago).
export function confirmarPagamento({ pedidoId, paymentId }) {
    return chamarApi('/api/pagamentos/confirmar', {
        metodo: 'POST',
        corpo: {
            pedido_id: pedidoId ? Number(pedidoId) : undefined,
            payment_id: paymentId || undefined
        }
    });
}

// ========================================
// HOOK DO CARRINHO
// ========================================

export function useCarrinho() {
    const [estado, setEstado] = useState({
        itens: [],
        logado: false,
        aviso: null,
        carregando: true,
        erro: null,
        status: null
    });

    const [versao, setVersao] = useState(0);

    useEffect(() => {
        let ativo = true;

        async function carregar() {
            try {
                const resultado = await carregarCarrinho();

                if (ativo) {
                    setEstado({
                        ...resultado,
                        carregando: false,
                        erro: null,
                        status: null
                    });
                }

            } catch (erro) {
                if (ativo) {
                    setEstado(anterior => ({
                        ...anterior,
                        carregando: false,
                        erro: erro.message,
                        status: erro.status ?? null
                    }));
                }
            }
        }

        carregar();

        return () => {
            ativo = false;
        };
    }, [versao]);

    const recarregar = useCallback(() => {
        setVersao(atual => atual + 1);
    }, []);

    return {
        ...estado,
        totais: totaisDoCarrinho(estado.itens),
        recarregar
    };
}
