import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fontes e símbolo da marca lidos do disco para gerar o PDF do certificado.
  outputFileTracingIncludes: {
    "/aluno/certificados/*/pdf": ["./assets/fontes/**/*", "./assets/marca/**/*"],
  },
};

export default nextConfig;
