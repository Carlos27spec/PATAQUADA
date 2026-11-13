import { useCallback, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import insignea from "../assets/Insignea-mini.png";
import { SearchIcon, CartIcon, UserIcon } from "./Icons";
import BuscaGlobal from "../pages/search/BuscaGlobal";
import "./Header.css";

const links = [
  { to: "/", label: "Home" },
  { to: "/servicos", label: "Serviços" },
  { to: "/shop", label: "Shop" },
  { to: "/#sobre", label: "Sobre" },
  { to: "/#contato", label: "Contato" },
];

function separar(to) {
  const [path, h = ""] = to.split("#");
  return { path, hash: h ? `#${h}` : "" };
}

export default function Header() {
  const [open, setOpen] = useState(false);
  // A pesquisa lembra em qual página foi aberta: se a rota mudar
  // (botão voltar, por exemplo), ela deixa de aparecer sozinha.
  const [busca, setBusca] = useState({ aberta: false, em: "" });
  const { pathname, hash } = useLocation();

  const buscaVisivel = busca.aberta && busca.em === pathname;

  const abrirBusca = () => {
    setOpen(false);
    setBusca({ aberta: true, em: pathname });
  };

  const fecharBusca = useCallback(() => {
    setBusca({ aberta: false, em: "" });
  }, []);

  const estaAtivo = (to) => {
    const alvo = separar(to);
    return pathname === alvo.path && hash === alvo.hash;
  };

  const aoClicar = (to) => {
    setOpen(false);
    const alvo = separar(to);

    if (pathname !== alvo.path) return;

    if (alvo.hash) {
      document
        .getElementById(alvo.hash.slice(1))
        ?.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <header className="header">
      <Link to="/" className="header__logo" onClick={() => aoClicar("/")}>
        <div className="footer-logo">
          <img src={insignea} alt="" />
          <span>
            Pata<span className="logo-destaque">Quada</span>
          </span>
        </div>
      </Link>

      <button
        className="header__toggle"
        aria-label="Abrir menu"
        aria-expanded={open}
        aria-controls="menu-principal"
        onClick={() => setOpen((o) => !o)}
      >
        <span /><span /><span />
      </button>

      <div id="menu-principal" className={`header__menu ${open ? "is-open" : ""}`}>
        <nav className="header__nav" aria-label="Principal">
          {links.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={estaAtivo(to) ? "is-active" : undefined}
              onClick={() => aoClicar(to)}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="header__actions">
          <button
            type="button"
            aria-label="Buscar"
            aria-haspopup="dialog"
            aria-expanded={buscaVisivel}
            onClick={abrirBusca}
          >
            <SearchIcon />
          </button>

          <Link to="/carrinho" aria-label="Carrinho">
            <CartIcon />
          </Link>

          <Link to="/login" aria-label="Minha conta">
            <UserIcon />
          </Link>
        </div>
      </div>

      {buscaVisivel && <BuscaGlobal aoFechar={fecharBusca} />}
    </header>
  );
}