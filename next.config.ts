import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fontes lidas do disco para gerar o PDF do certificado.
  outputFileTracingIncludes: {
    "/aluno/certificados/*/pdf": ["./assets/fontes/**/*"],
  },
};

export default nextConfig;
