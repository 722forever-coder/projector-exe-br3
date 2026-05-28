import React from "react";

export default function Hero() {
  return (
    <section
      className="w-full bg-white border-b border-gray-200"
      data-testid="hero"
    >
      <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-10 py-4 sm:py-6">
        <h1 className="txt-page-title" data-testid="hero-title">
          Portal do candidato
        </h1>
        <p className="mt-2 txt-page-subtitle" data-testid="hero-subtitle">
          Concurso de Admissão aos Cursos de Formação e Graduação de Sargentos
        </p>
      </div>
    </section>
  );
}
