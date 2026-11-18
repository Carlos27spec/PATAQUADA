import { GRUPOS_MENU } from './menuAdmin.js'
import { PERMISSAO_PAINEL, PERMISSOES_TELA } from './permissoesAdmin.js'

const NOME_ACAO = { ver: 'ver', criar: 'cadastrar', editar: 'editar', excluir: 'excluir' }

// Monta os grupos do menu com as permissões usadas por cada um e as
// telas que cada permissão libera (ex.: PRODUTO_VISUALIZAR -> Produtos, Categorias).
function montarGrupos(todas) {
    const descricao = Object.fromEntries(todas.map(item => [item.chave, item.descricao]))
    const usadas = new Set([PERMISSAO_PAINEL])

    const grupos = GRUPOS_MENU.map(grupo => {
        const porChave = new Map()

        for (const item of grupo.itens) {
            const regras = PERMISSOES_TELA[item.rota] ?? {}

            for (const [acao, chave] of Object.entries(regras)) {
                if (!porChave.has(chave)) porChave.set(chave, new Set())
                porChave.get(chave).add(`${item.titulo} (${NOME_ACAO[acao]})`)
            }
        }

        const permissoes = [...porChave.entries()]
            .filter(([chave]) => descricao[chave] !== undefined)
            .map(([chave, telas]) => {
                usadas.add(chave)
                return { chave, descricao: descricao[chave] || chave, telas: [...telas] }
            })

        return { chave: grupo.chave, titulo: grupo.titulo, icone: grupo.icone, permissoes }
    }).filter(grupo => grupo.permissoes.length > 0)

    // Permissões cadastradas que nenhuma tela usa (ex.: relatórios).
    const outras = todas
        .filter(item => !usadas.has(item.chave))
        .map(item => ({ chave: item.chave, descricao: item.descricao || item.chave, telas: [] }))

    if (outras.length) {
        grupos.push({ chave: 'outras', titulo: 'Outras permissões', icone: 'fa-key', permissoes: outras })
    }

    return grupos
}

// Caixas de marcar das permissões de um tipo de usuário.
// valor: lista de chaves marcadas | todas: [{ chave, descricao }]
function EscolhaPermissoes({ valor = [], todas = [], onChange }) {
    const marcadas = new Set(valor)
    const grupos = montarGrupos(todas)
    const temPainel = marcadas.has(PERMISSAO_PAINEL)

    function alternar(chave, ligado) {
        const nova = new Set(marcadas)
        if (ligado) nova.add(chave)
        else nova.delete(chave)
        onChange([...nova])
    }

    function marcarGrupo(grupo, ligado) {
        const nova = new Set(marcadas)
        for (const { chave } of grupo.permissoes) {
            if (ligado) nova.add(chave)
            else nova.delete(chave)
        }
        onChange([...nova])
    }

    return (
        <div className="adm-permissoes">
            <label className={'adm-permissao adm-permissao--painel' + (temPainel ? ' marcada' : '')}>
                <input
                    type="checkbox"
                    checked={temPainel}
                    onChange={evento => alternar(PERMISSAO_PAINEL, evento.target.checked)}
                />
                <span>
                    <strong>Acessar o painel administrativo</strong>
                    <small>
                        Sem esta opção, o tipo não entra no painel, mesmo com as
                        permissões abaixo (o Cliente, por exemplo, não deve ter).
                    </small>
                </span>
            </label>

            <div className={'adm-permissoes-grupos' + (temPainel ? '' : ' desligado')}>
                {grupos.map(grupo => {
                    const todasMarcadas = grupo.permissoes.every(({ chave }) => marcadas.has(chave))

                    return (
                        <fieldset key={grupo.chave} className="adm-permissoes-grupo">
                            <legend>
                                <i className={`fa-solid ${grupo.icone}`} aria-hidden="true" />
                                {grupo.titulo}
                            </legend>

                            <button
                                type="button"
                                className="adm-link-acao adm-permissoes-todas"
                                onClick={() => marcarGrupo(grupo, !todasMarcadas)}
                            >
                                {todasMarcadas ? 'Desmarcar todas' : 'Marcar todas'}
                            </button>

                            {grupo.permissoes.map(permissao => (
                                <label
                                    key={permissao.chave}
                                    className={'adm-permissao' + (marcadas.has(permissao.chave) ? ' marcada' : '')}
                                >
                                    <input
                                        type="checkbox"
                                        checked={marcadas.has(permissao.chave)}
                                        onChange={evento => alternar(permissao.chave, evento.target.checked)}
                                    />
                                    <span>
                                        <strong>{permissao.descricao}</strong>
                                        {permissao.telas.length > 0 && (
                                            <small>Telas: {permissao.telas.join(', ')}</small>
                                        )}
                                    </span>
                                </label>
                            ))}
                        </fieldset>
                    )
                })}
            </div>
        </div>
    )
}

export default EscolhaPermissoes
