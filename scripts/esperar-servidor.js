// Usado pelo "npm run dev": espera o back-end abrir a porta antes de
// liberar o Vite, para as mensagens do servidor aparecerem primeiro.
// Se o servidor demorar mais de 30 s, libera o Vite mesmo assim.
import net from 'node:net'
import process from 'node:process'

const PORTA = Number(process.env.PORT || 4000)
const LIMITE = Date.now() + 30_000

function tentar() {
    const conexao = net.connect(PORTA, '127.0.0.1')

    conexao.once('connect', () => {
        conexao.end()
        // Pequena folga para o servidor terminar de escrever as mensagens.
        setTimeout(() => process.exit(0), 200)
    })

    conexao.once('error', () => {
        conexao.destroy()

        if (Date.now() > LIMITE) {
            process.exit(0)
        }

        setTimeout(tentar, 250)
    })
}

tentar()
