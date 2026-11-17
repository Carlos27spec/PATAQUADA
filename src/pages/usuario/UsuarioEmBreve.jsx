
import { Link, useLocation } from 'react-router-dom'

import './usuario.css'

import patinha from '../../assets/paw.png'

const paginas = {
    pedidos: 'Meus Pedidos',
    carrinho: 'Carrinho',
    conta: 'Minha Conta',
    endereco: 'Meu Endereço',
    ajuda: 'Central de Ajuda',
    notificacoes: 'Notificações',
    'ver-todos': 'Todos os pedidos'
}

function obterTitulo(pathname) {
    const partes = pathname.split('/').filter(Boolean)
    const ultimaParte = partes[partes.length - 1]

    if (ultimaParte === '1048') {
        return 'Detalhes do Pedido'
    }

    return paginas[ultimaParte] || 'Esta funcionalidade'
}

function UsuarioEmBreve() {
    const { pathname } = useLocation()

    const titulo = obterTitulo(pathname)

    return (
        <div className="cli-em-breve">

            <div className="cli-em-breve-card">

                <div className="cli-em-breve-ilustracao">
                    <img src={patinha} alt="" />

                    <span>
                        <i className="fa-solid fa-paw" />
                    </span>
                </div>

                <span className="cli-em-breve-etiqueta">
                    <i className="fa-solid fa-hammer" />
                    Estamos preparando novidades
                </span>

                <h1>Em breve!</h1>

                <h2>{titulo}</h2>

                <p>
                    Estamos trabalhando para deixar essa
                    experiência ainda melhor para você e seu pet.
                </p>

                <p>
                    Essa funcionalidade estará disponível
                    nas próximas atualizações da PataQuada.
                </p>

                <Link to="/usuarios" className="cli-botao">
                    <i className="fa-solid fa-house" />
                    Voltar para o Início
                </Link>

                <span className="cli-em-breve-rodape">
                    Obrigado por fazer parte da nossa família!
                    <i className="fa-solid fa-heart" />
                </span>

            </div>

        </div>
    )
}

export default UsuarioEmBreve
