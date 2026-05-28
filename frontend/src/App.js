import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PortalCandidato from "@/pages/PortalCandidato";
import LoginGovBr from "@/pages/LoginGovBr";
import AutorizacaoDados from "@/pages/AutorizacaoDados";
import Cadastro from "@/pages/Cadastro";
import Protocolo from "@/pages/Protocolo";
import AdminLogin from "@/pages/AdminLogin";
import AdminLayout from "@/pages/admin/AdminLayout";
import Dashboard from "@/pages/admin/Dashboard";
import Inscricoes from "@/pages/admin/Inscricoes";
import Cadastros from "@/pages/admin/Cadastros";
import Usuarios from "@/pages/admin/Usuarios";
import Configuracoes from "@/pages/admin/Configuracoes";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PortalCandidato />} />
          <Route path="/login" element={<LoginGovBr />} />
          <Route path="/autorizacao" element={<AutorizacaoDados />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/protocolo" element={<Protocolo />} />

          {/* === Painel Admin === */}
          <Route path="/donaspainel/login" element={<AdminLogin />} />
          <Route path="/donaspainel" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="inscricoes" element={<Inscricoes />} />
            <Route path="cadastros" element={<Cadastros />} />
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="configuracoes" element={<Configuracoes />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
