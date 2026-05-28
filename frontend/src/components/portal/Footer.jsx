import React from "react";
import { useNavigate } from "react-router-dom";
import { Facebook, Instagram, MessageCircle } from "lucide-react";

export default function Footer() {
  const navigate = useNavigate();
  const goLogin = (e) => {
    if (e) e.preventDefault();
    navigate("/login");
  };

  return (
    <footer
      className="w-full mt-4 cursor-pointer"
      style={{ background: "#071D41", color: "#ffffff" }}
      data-testid="footer"
      onClick={goLogin}
    >
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-10">
        <div className="text-center mb-10">
          <p className="text-2xl font-extrabold tracking-wide">ESA</p>
          <p className="text-[13px] mt-1 tracking-[0.2em] opacity-90">
            AQUI SÃO FORJADOS OS LÍDERES DE PEQUENAS FRAÇÕES
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div data-testid="footer-contato">
            <h5 className="font-bold tracking-wider text-sm mb-3">CONTATO</h5>
            <p className="text-sm opacity-95">(35) 3239-4046</p>
          </div>
          <div data-testid="footer-redes">
            <h5 className="font-bold tracking-wider text-sm mb-3">
              REDES SOCIAIS
            </h5>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={goLogin}
                aria-label="Facebook"
                className="hover:opacity-75 bg-transparent border-0 p-0 cursor-pointer text-white"
                data-testid="footer-facebook"
              >
                <Facebook size={22} />
              </button>
              <button
                onClick={goLogin}
                aria-label="Instagram"
                className="hover:opacity-75 bg-transparent border-0 p-0 cursor-pointer text-white"
                data-testid="footer-instagram"
              >
                <Instagram size={22} />
              </button>
              <button
                onClick={goLogin}
                aria-label="WhatsApp"
                className="hover:opacity-75 bg-transparent border-0 p-0 cursor-pointer text-white"
                data-testid="footer-whatsapp"
              >
                <MessageCircle size={22} />
              </button>
            </div>
          </div>
          <div data-testid="footer-govbr">
            <h5 className="font-bold tracking-wider text-sm mb-3">GOVBR</h5>
            <button
              onClick={goLogin}
              className="text-sm hover:underline opacity-95 bg-transparent border-0 p-0 cursor-pointer text-white"
            >
              Acessar gov.br
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
