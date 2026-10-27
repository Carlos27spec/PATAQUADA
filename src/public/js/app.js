// Formulário de contato: valida no cliente e envia para a API (POST /api/contatos).
const form = document.getElementById("form-contato");
const msg = document.getElementById("form-msg");

function mostrar(texto, tipo) {
  msg.textContent = texto;
  msg.className = `form__msg form__msg--${tipo}`;
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!form.checkValidity()) {
    mostrar("Preencha todos os campos corretamente.", "erro");
    return;
  }
  const botao = form.querySelector("button[type=submit]");
  botao.disabled = true;
  mostrar("Enviando...", "ok");
  try {
    const resp = await fetch("/api/contatos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    if (!resp.ok) throw new Error();
    form.reset();
    mostrar("Mensagem enviada! Obrigado pelo contato.", "ok");
  } catch {
    mostrar("Não foi possível enviar agora. Tente novamente.", "erro");
  } finally {
    botao.disabled = false;
  }
});