import { useCallback, useEffect, useState } from 'react';

import {
    carregarCarrinho,
    chamarApi
} from './carrinho.js';
// ========================================
// AJUSTE CONFORME O SEU PROJETO
// ========================================

// Rota da tela de login (usada quando o cliente ainda não entrou).
export const ROTA_LOGIN = '/login';

// ========================================
// TOTAIS
// ========================================

// Só para exibir: quem decide o valor cobrado é o servidor.
// frete = null significa "ainda não calculado" (falta o CEP).
export function totaisDoCarrinho(itens, frete = null) {
    const subtotal = itens.reduce((soma, item) => soma + item.subtotal, 0);

    return {
        subtotal,
        frete,
        total: subtotal + (frete ?? 0)
    };
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

// Nome, telefone e endereços salvos do cliente logado.
// Devolve { usuario: { nome, email, telefone }, enderecos: [...] }.
export function carregarDadosEntrega() {
    return chamarApi('/api/usuarios/me/entrega');
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

// Consulta direta ao ViaCEP (usada se o servidor não responder).
async function buscarCepNoViaCep(digitos) {
    try {
        const resposta = await fetch(
            `https://viacep.com.br/ws/${digitos}/json/`
        );

        const dados = await resposta.json();

        if (!resposta.ok || dados.erro) {
            return { encontrado: false };
        }

        return {
            encontrado: true,
            endereco: {
                cep: digitos,
                logradouro: dados.logradouro || '',
                bairro: dados.bairro || '',
                cidade: dados.localidade || '',
                uf: dados.uf || ''
            }
        };
    } catch {
        return null;
    }
}

// Preenche rua, bairro, cidade e UF a partir do CEP.
// Primeiro pergunta ao servidor (/api/cep); se ele não responder,
// consulta o ViaCEP direto.
// Devolve { encontrado: true, endereco }, { encontrado: false }
// (CEP inexistente) ou null (nenhum serviço respondeu).
export async function buscarCep(cep) {
    const digitos = String(cep).replace(/\D/g, '');

    if (digitos.length !== 8) {
        return null;
    }

    try {
        const resposta = await chamarApi(`/api/cep/${digitos}`, {
            autenticado: false
        });

        return { encontrado: true, endereco: resposta.endereco };
    } catch (erro) {
        if (erro.status === 404 && erro.message === 'CEP não encontrado.') {
            return { encontrado: false };
        }

        return buscarCepNoViaCep(digitos);
    }
}

// ========================================
// FRETE
// ========================================

// Devolve { opcoes: [{ codigo, nome, valor, gratis, prazo_dias,
// data_prevista }], destino, regiao_nome, distancia_km, ... }.
export function calcularFreteDoCarrinho({ cep, itens }) {
    return chamarApi('/api/frete/calcular', {
        metodo: 'POST',
        autenticado: false,
        corpo: {
            cep: String(cep).replace(/\D/g, ''),
            itens: itens.map(item => ({
                id_produto: item.id,
                quantidade: item.quantidade
            }))
        }
    });
}

// "2026-11-20" -> "qui., 20 de nov."
export function formatarDataEntrega(dataIso) {
    if (!dataIso) {
        return '';
    }

    const [ano, mes, dia] = dataIso.split('-').map(Number);

    return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
    });
}

// ========================================
// PAGAMENTO (servidor + Mercado Pago)
// ========================================

// Cria o pedido e devolve { pedido_id, init_point }.
// idEndereco: endereço salvo na conta (o servidor busca no banco).
// salvarEndereco: guarda o endereço digitado na conta do cliente.
export function criarPagamento({
    forma,
    entrega,
    freteOpcao,
    idEndereco = null,
    salvarEndereco = false
}) {
    return chamarApi('/api/pagamentos/preferencia', {
        metodo: 'POST',
        corpo: {
            forma,
            entrega,
            frete_opcao: freteOpcao,
            id_endereco: idEndereco ?? undefined,
            salvar_endereco: salvarEndereco
        }
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
