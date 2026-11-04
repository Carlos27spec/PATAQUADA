import { Outlet, ScrollRestoration } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";

export default function Layout() {
  return (
    <>
      <Header />
      <main style={{ minHeight: "60vh" }}>
        <Outlet />
      </main>
      <Footer />
      <ScrollRestoration />
    </>
  );
}
