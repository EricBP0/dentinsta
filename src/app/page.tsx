import {
  ArrowRight,
  Brain,
  ChartColumn,
  Check,
  FileText,
  GraduationCap,
  Layers,
  Network,
  PenLine,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Stethoscope,
  Video,
} from "lucide-react";
import Link from "next/link";
import { CabecalhoLanding } from "@/components/landing/cabecalho-landing";
import { PreviaProduto } from "@/components/landing/previa-produto";
import { Movimento, Surgir, SurgirItem, SurgirLista } from "@/components/movimento";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatarReais, PRECO, totalParcelado } from "@/lib/preco";

const RECURSOS = [
  {
    icone: Sparkles,
    titulo: "Simulados com correção por IA",
    texto: "Questões objetivas e discursivas no estilo das provas da faculdade. A IA corrige as discursivas critério por critério e mostra o que faltou.",
    destaque: true,
  },
  {
    icone: Layers,
    titulo: "Flashcards inteligentes",
    texto: "Repetição espaçada: cada card volta no dia certo para você não esquecer.",
  },
  { icone: Video, titulo: "Videoaulas", texto: "Aulas objetivas, gravadas por um cirurgião-dentista." },
  { icone: FileText, titulo: "Resumos", texto: "O essencial de cada tema para revisar em minutos." },
  { icone: Network, titulo: "Mapas mentais", texto: "A matéria inteira em uma imagem, para fixar as conexões." },
  {
    icone: GraduationCap,
    titulo: "Certificados",
    texto: "Conclua os itens obrigatórios de cada disciplina e receba seu certificado.",
    largo: true,
  },
];

const PASSOS = [
  { icone: PenLine, titulo: "Crie sua conta", texto: "Escolha Pix ou cartão em até 12x. O acesso é liberado assim que o pagamento é confirmado." },
  { icone: Brain, titulo: "Estude por disciplina", texto: "Vídeos, resumos, mapas mentais e flashcards organizados por período e matéria." },
  { icone: ChartColumn, titulo: "Treine e acompanhe", texto: "Faça simulados, receba a correção comentada e reforce onde você errou." },
];

const DUVIDAS = [
  {
    pergunta: "O acesso é vitalício?",
    resposta:
      "Sim. Tudo o que for publicado até 12 meses depois da sua compra fica seu para sempre. Durante esses 12 meses você também recebe todas as novidades (disciplinas e aulas novas) e usa a IA. Depois, pode renovar para continuar recebendo novidades e usando a IA.",
  },
  {
    pergunta: "Como funciona a correção por IA?",
    resposta:
      "O professor define o gabarito e os critérios de cada questão discursiva. A IA compara sua resposta com esses critérios, dá a nota de cada um e explica o que você acertou e o que faltou. Se discordar, você pode pedir a revisão do professor.",
  },
  {
    pergunta: "Quais as formas de pagamento?",
    resposta: `À vista por ${formatarReais(PRECO.aVistaCentavos)} no Pix ou cartão, ou em até ${PRECO.parcelas}x de ${formatarReais(PRECO.parcelaCentavos)} sem juros no cartão de crédito. O pagamento é processado pelo Asaas.`,
  },
  {
    pergunta: "O certificado vale como hora complementar?",
    resposta:
      "O certificado é de curso livre, com a carga horária da disciplina. Cada faculdade decide o que aceita como atividade complementar — vale confirmar com a coordenação do seu curso.",
  },
  {
    pergunta: "Posso estudar pelo celular?",
    resposta: "Sim. A plataforma funciona no navegador do celular, do tablet e do computador.",
  },
  {
    pergunta: "E se eu me arrepender?",
    resposta: "Você tem 7 dias após a compra para desistir e receber o valor de volta, como garante o Código de Defesa do Consumidor.",
  },
];

export default function Inicio() {
  const desconto = Math.round((1 - PRECO.aVistaCentavos / totalParcelado()) * 100);

  return (
    <Movimento>
      <div className="relative flex-1 overflow-x-clip bg-white">
        {/* fundo do topo */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 -z-0 h-[720px] bg-[radial-gradient(ellipse_at_top,var(--color-teal-50),transparent_70%)]"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[720px] bg-[linear-gradient(to_right,var(--color-slate-100)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-slate-100)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]"
        />

        <CabecalhoLanding />

        <main className="relative">
          {/* Hero */}
          <section className="mx-auto grid max-w-6xl items-center gap-16 px-4 pb-24 pt-12 md:pt-20 lg:grid-cols-2">
            <div className="space-y-6">
              <Surgir>
                <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                  <Stethoscope className="size-3.5" /> Feito para a graduação em Odontologia
                </Badge>
              </Surgir>
              <Surgir atraso={0.05}>
                <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                  Passe nas provas da faculdade com{" "}
                  <span className="bg-gradient-to-r from-teal-700 to-teal-500 bg-clip-text text-transparent">
                    quem entende de Odontologia
                  </span>
                </h1>
              </Surgir>
              <Surgir atraso={0.1}>
                <p className="max-w-xl text-lg text-slate-600">
                  Videoaulas, resumos, mapas mentais e flashcards feitos por um cirurgião-dentista — e simulados com IA
                  que corrige suas respostas como um professor.
                </p>
              </Surgir>
              <Surgir atraso={0.15} className="flex flex-wrap gap-3">
                <Button size="lg" className="h-11 px-5 text-base" asChild>
                  <Link href="/assinar">
                    Começar agora <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="h-11 px-5 text-base" asChild>
                  <a href="#como-funciona">Ver como funciona</a>
                </Button>
              </Surgir>
              <Surgir atraso={0.2}>
                <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="size-4 text-teal-600" /> Acesso vitalício
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="size-4 text-teal-600" /> Pix ou 12x sem juros
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="size-4 text-teal-600" /> 7 dias para desistir
                  </span>
                </p>
              </Surgir>
            </div>
            <div>
              <PreviaProduto />
            </div>
          </section>

          {/* Recursos */}
          <section id="recursos" className="scroll-mt-20 border-t border-slate-100 bg-slate-50/60 py-24">
            <div className="mx-auto max-w-6xl space-y-12 px-4">
              <Surgir className="mx-auto max-w-2xl space-y-3 text-center">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Tudo para estudar em um só lugar</h2>
                <p className="text-slate-600">Organizado por disciplina e período, do jeito que a faculdade cobra.</p>
              </Surgir>
              <SurgirLista className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {RECURSOS.map(({ icone: Icone, titulo, texto, destaque, largo }) => (
                  <SurgirItem
                    key={titulo}
                    className={destaque ? "sm:col-span-2" : largo ? "sm:col-span-2 lg:col-span-3" : ""}
                  >
                    <div
                      className={`group h-full rounded-2xl border p-6 transition-all hover:-translate-y-1 hover:shadow-lg ${
                        destaque
                          ? "border-teal-700 bg-gradient-to-br from-teal-700 to-teal-900 text-white hover:shadow-teal-900/20"
                          : "border-slate-200 bg-white hover:shadow-slate-900/5"
                      }`}
                    >
                      <div
                        className={`mb-4 inline-flex size-10 items-center justify-center rounded-xl ${
                          destaque ? "bg-white/15" : "bg-teal-50 text-teal-700"
                        }`}
                      >
                        <Icone className="size-5" />
                      </div>
                      <h3 className={`font-semibold ${destaque ? "text-xl" : "text-slate-900"}`}>{titulo}</h3>
                      <p className={`mt-2 text-sm leading-relaxed ${destaque ? "text-teal-50" : "text-slate-600"}`}>{texto}</p>
                      {destaque && (
                        <ul className="mt-6 grid gap-2 text-sm text-teal-50 sm:grid-cols-2">
                          <li className="flex gap-2"><Check className="size-4 shrink-0" /> Nota por critério da rubrica do professor</li>
                          <li className="flex gap-2"><Check className="size-4 shrink-0" /> Comentários e o que faltou citar</li>
                          <li className="flex gap-2"><Check className="size-4 shrink-0" /> Prioriza as questões que você errou</li>
                          <li className="flex gap-2"><Check className="size-4 shrink-0" /> Revisão do professor se você discordar</li>
                        </ul>
                      )}
                    </div>
                  </SurgirItem>
                ))}
              </SurgirLista>
            </div>
          </section>

          {/* Como funciona */}
          <section id="como-funciona" className="scroll-mt-20 py-24">
            <div className="mx-auto max-w-6xl space-y-12 px-4">
              <Surgir className="mx-auto max-w-2xl space-y-3 text-center">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Como funciona</h2>
                <p className="text-slate-600">Em poucos minutos você já está estudando.</p>
              </Surgir>
              <SurgirLista className="grid gap-8 md:grid-cols-3">
                {PASSOS.map(({ icone: Icone, titulo, texto }, i) => (
                  <SurgirItem key={titulo} className="relative space-y-3 text-center md:text-left">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-teal-700 text-white shadow-lg shadow-teal-900/20 md:mx-0">
                      <Icone className="size-5" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Passo {i + 1}</p>
                    <h3 className="text-lg font-semibold text-slate-900">{titulo}</h3>
                    <p className="text-sm leading-relaxed text-slate-600">{texto}</p>
                  </SurgirItem>
                ))}
              </SurgirLista>

              <Surgir>
                <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center sm:flex-row sm:text-left">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-teal-700 shadow-sm">
                    <Stethoscope className="size-5" />
                  </div>
                  <p className="text-slate-700">
                    <strong className="text-slate-900">Conteúdo criado e revisado por um cirurgião-dentista de referência.</strong>{" "}
                    As questões geradas com ajuda da IA só entram nos simulados depois da revisão do professor.
                  </p>
                </div>
              </Surgir>
            </div>
          </section>

          {/* Preço */}
          <section id="preco" className="scroll-mt-20 border-t border-slate-100 bg-slate-50/60 py-24">
            <div className="mx-auto max-w-6xl space-y-10 px-4">
              <Surgir className="mx-auto max-w-2xl space-y-3 text-center">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Um pagamento, acesso para sempre</h2>
                <p className="text-slate-600">Sem mensalidade. Pague uma vez e estude no seu ritmo.</p>
              </Surgir>
              <Surgir className="mx-auto max-w-md">
                <div className="relative rounded-3xl border-2 border-teal-600 bg-white p-8 shadow-xl shadow-teal-900/10">
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1">Acesso completo</Badge>
                  <p className="text-center text-5xl font-bold tracking-tight text-slate-900">
                    {PRECO.parcelas}x <span className="text-teal-700">{formatarReais(PRECO.parcelaCentavos)}</span>
                  </p>
                  <p className="mt-1 text-center text-sm text-slate-500">
                    sem juros no cartão · total {formatarReais(totalParcelado())}
                  </p>
                  <p className="mt-4 text-center text-lg text-slate-900">
                    ou <strong>{formatarReais(PRECO.aVistaCentavos)}</strong> à vista
                    <Badge variant="secondary" className="ml-2 align-middle">{desconto}% off</Badge>
                  </p>
                  <ul className="mt-8 space-y-3 text-sm text-slate-700">
                    {[
                      "Acesso vitalício ao conteúdo",
                      "Novas disciplinas e aulas por 12 meses",
                      "Simulados e correção por IA por 12 meses",
                      "Flashcards com repetição espaçada",
                      "Certificado por disciplina",
                    ].map((item) => (
                      <li key={item} className="flex gap-3">
                        <Check className="size-5 shrink-0 text-teal-600" /> {item}
                      </li>
                    ))}
                  </ul>
                  <Button size="lg" className="mt-8 h-12 w-full text-base" asChild>
                    <Link href="/assinar">
                      Quero começar <ArrowRight data-icon="inline-end" />
                    </Link>
                  </Button>
                  <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500">
                    <ShieldCheck className="size-4" /> Pagamento seguro · Pix ou cartão · 7 dias para desistir
                  </p>
                </div>
              </Surgir>
            </div>
          </section>

          {/* Dúvidas */}
          <section id="duvidas" className="scroll-mt-20 py-24">
            <div className="mx-auto max-w-3xl space-y-10 px-4">
              <Surgir className="space-y-3 text-center">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Dúvidas frequentes</h2>
              </Surgir>
              <Surgir>
                <Accordion type="single" collapsible className="rounded-2xl border border-slate-200 bg-white px-6">
                  {DUVIDAS.map((d) => (
                    <AccordionItem key={d.pergunta} value={d.pergunta}>
                      <AccordionTrigger className="text-base">{d.pergunta}</AccordionTrigger>
                      <AccordionContent className="text-slate-600">{d.resposta}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Surgir>
            </div>
          </section>

          {/* Chamada final */}
          <section className="px-4 pb-24">
            <Surgir className="mx-auto max-w-6xl">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-700 to-teal-900 px-6 py-16 text-center text-white">
                <div aria-hidden className="absolute -right-24 -top-24 size-72 rounded-full bg-teal-500/30 blur-3xl" />
                <div aria-hidden className="absolute -bottom-24 -left-24 size-72 rounded-full bg-sky-400/20 blur-3xl" />
                <div className="relative space-y-5">
                  <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Sua próxima prova começa hoje</h2>
                  <p className="mx-auto max-w-xl text-teal-50">
                    Estude com método, treine com simulados e chegue na prova sabendo onde você precisa melhorar.
                  </p>
                  <Button size="lg" variant="secondary" className="h-12 px-6 text-base" asChild>
                    <Link href="/assinar">
                      Começar agora <ArrowRight data-icon="inline-end" />
                    </Link>
                  </Button>
                </div>
              </div>
            </Surgir>
          </section>
        </main>

        <footer className="border-t border-slate-100 py-8">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-slate-500 sm:flex-row">
            <span className="font-semibold text-teal-800">dentinsta</span>
            <span className="inline-flex items-center gap-1.5">
              <Smartphone className="size-4" /> Estude no celular, tablet ou computador
            </span>
            <Link href="/entrar" className="hover:text-slate-900">
              Área do aluno
            </Link>
          </div>
        </footer>
      </div>
    </Movimento>
  );
}
