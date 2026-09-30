// Texto do certificado (puro, testável). Curso livre: não é reconhecido pelo MEC.

export type DadosCertificado = {
  nomeAluno: string;
  disciplina: string;
  cargaHoraria: number;
  emitidoEm: Date;
  codigo: string;
  urlValidacao: string;
  plataforma: string;
  responsavel: string;
  responsavelCargo: string;
};

export function dataPorExtenso(data: Date): string {
  return data.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
}

export function montarTextoCertificado(dados: DadosCertificado) {
  const horas = dados.cargaHoraria === 1 ? "1 hora" : `${dados.cargaHoraria} horas`;
  return {
    abertura: "Certificamos que",
    corpo:
      dados.cargaHoraria > 0
        ? `concluiu a disciplina ${dados.disciplina}, com carga horária de ${horas}, na plataforma de estudos ${dados.plataforma}.`
        : `concluiu a disciplina ${dados.disciplina} na plataforma de estudos ${dados.plataforma}.`,
    data: dataPorExtenso(dados.emitidoEm),
    rodape:
      "Certificado de curso livre, emitido com base na conclusão de todos os conteúdos obrigatórios da disciplina. " +
      "Não substitui diploma nem é reconhecido pelo MEC.",
  };
}

/** Responsável que assina o certificado (configurável sem mexer no código). */
export function responsavelCertificado() {
  return {
    plataforma: process.env.CERTIFICADO_PLATAFORMA || "dentinsta",
    responsavel: process.env.CERTIFICADO_RESPONSAVEL || "Coordenação pedagógica",
    responsavelCargo: process.env.CERTIFICADO_RESPONSAVEL_CARGO || "",
  };
}
