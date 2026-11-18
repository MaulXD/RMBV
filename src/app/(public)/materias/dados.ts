export type Nivel = "simples" | "detalhado" | "elaborado";

export type Atualizacao = {
  id: string;
  /** ISO, usado para ordenar */
  data: string;
  /** Como a data aparece na tela (ex.: "15/04/2026" ou "2026") */
  quando?: string;
  titulo: string;
  texto: string;
  fonteUrl?: string | null;
  /** true = registrada pela equipe no SCS; false = levantada em fonte pública */
  daEquipe?: boolean;
};

export type Materia = {
  id: string;
  titulo: string;
  subtitulo: string;
  /** Reconhece a tese do cadastro do cliente (ex.: "UFAL 47,94%") */
  tesePadrao?: RegExp;
  resumos: Record<Nivel, string[]>;
  atualizacoes: Atualizacao[];
  fontes: { nome: string; url: string }[];
};

export const NIVEIS: { id: Nivel; nome: string; dica: string }[] = [
  { id: "simples", nome: "Simples", dica: "Para mandar no WhatsApp" },
  { id: "detalhado", nome: "Detalhado", dica: "Para explicar com calma" },
  { id: "elaborado", nome: "Bem elaborado", dica: "Para quem quer entender tudo" },
];

export const ABERTURA =
  "Olá! O advogado responsável separou uma mensagem para te passar a atualização do seu processo. Pode me confirmar seu nome completo?";

export const MATERIAS: Materia[] = [
  {
    id: "4794",
    titulo: "Ação dos 47,94% (UFAL)",
    subtitulo: "Índice de 1994 cobrado pela Adufal e pelo Sintufal",
    tesePadrao: /47[,.]94/,
    resumos: {
      simples: [
        "É a ação coletiva da Adufal e do Sintufal que cobra um reajuste de 47,94% de março de 1994. O direito já foi reconhecido pelo STJ.",
        "A UFAL entrou com uma ação rescisória no TRF5 para reduzir esse valor. Em abril de 2026, por 4 votos a 3, o Tribunal aceitou que os aumentos de carreira desde 2008 sejam descontados dos 47,94%.",
        "Como a votação não foi unânime, o caso vai ser julgado de novo por mais desembargadores, ainda sem data. Até lá não há pagamento.",
      ],
      detalhado: [
        "O 47,94% corresponde à variação do IRSM aplicada na conversão dos salários em março de 1994. A Adufal e o Sintufal ajuizaram a ação em 1997. Em junho de 2023 o STJ negou o recurso da Procuradoria e manteve a decisão do TRF5 a favor dos servidores.",
        "A UFAL então ajuizou uma ação rescisória no TRF5, pedindo para descontar do percentual os reajustes e reestruturações de carreira. Desde 2024 a execução segue (cálculos e precatórios), mas nenhum valor é liberado até o fim desse julgamento.",
        "O julgamento passou por pedidos de vista em 2025 e por um empate em março de 2026. Em abril de 2026 uma desembargadora convocada desempatou: 4 a 3 a favor da UFAL, admitindo compensação desde 2008. Por não ter sido unânime, o processo vai a uma composição ampliada do TRF5, e a nova sessão depende de o relator marcar a pauta.",
      ],
      elaborado: [
        "O índice de 47,94% vem do IRSM e corresponde ao reajuste que, segundo os sindicatos, deixou de ser aplicado em março de 1994, durante a conversão dos salários para a URV. A Adufal e o Sintufal ajuizaram a ação em 1997, e a decisão se tornou definitiva em 2018, primeiro para 91 servidores que estavam no processo.",
        "Na execução, a Procuradoria Federal levou ao STJ a tese de que o percentual já teria sido absorvido pelas reestruturações de carreira. Em junho de 2023 o STJ rejeitou o recurso e disse que o ponto estava precluso, ou seja, a UFAL perdeu o momento de discutir isso.",
        "A UFAL respondeu com uma ação rescisória no TRF5, que busca desfazer em parte a decisão definitiva. Em 2024 o Tribunal deixou a execução seguir, com cálculo e expedição de precatórios, mas proibiu qualquer pagamento, retroativo ou no contracheque, até o julgamento da rescisória.",
        "O julgamento começou em 2025. Em abril houve pedido de vista. Em outubro, cinco votos reconheceram o direito aos 47,94%, três deles aceitando compensar reajustes posteriores, e houve novo pedido de vista. Em março de 2026 a votação empatou e o TRF5 decidiu chamar mais um voto para desempatar. Em abril de 2026 a desembargadora convocada acompanhou o relator: 4 a 3 pela compensação dos aumentos de carreira desde 2008.",
        "Esse resultado não encerra o caso. Como não foi unânime, o processo passa automaticamente por uma composição ampliada do TRF5, e a data depende do relator. Na prática, o direito aos 47,94% continua reconhecido, mas o valor final pode ficar menor por causa da compensação, e o pagamento segue suspenso. Antes de passar previsão ao cliente, confira a última nota da Adufal ou do Sintufal.",
      ],
    },
    atualizacoes: [
      {
        id: "4794-2026-04",
        data: "2026-04-15",
        quando: "15/04/2026",
        titulo: "TRF5 admite compensação desde 2008, por 4 a 3",
        texto:
          "Uma desembargadora convocada desempatou a favor da UFAL: reajustes e reestruturações de carreira a partir de 2008 podem ser descontados dos 47,94%. Como não foi unânime, o caso vai a uma composição ampliada do TRF5, sem data marcada. O pagamento continua suspenso.",
        fonteUrl: "https://adufal.org.br/Conteudo/32010",
      },
      {
        id: "4794-2026-03",
        data: "2026-03-25",
        quando: "25/03/2026",
        titulo: "Empate no julgamento da rescisória",
        texto:
          "A sessão de 11 de março terminou empatada. O TRF5 decidiu convocar mais um voto para desempatar, com nova rodada de sustentações orais dos advogados.",
        fonteUrl: "https://sintufal.org.br/conteudo/3558/nota-do-sintufal-e-da-adufal-atualizacao-sobre-o-julgamento-dos",
      },
      {
        id: "4794-2025-10",
        data: "2025-10-22",
        quando: "22/10/2025",
        titulo: "Cinco votos reconhecem o direito; novo pedido de vista",
        texto:
          "Todos os votos mantiveram o direito aos 47,94%. Três aceitaram compensar reajustes posteriores e dois mantiveram a decisão inteira. O desembargador Manoel Erhardt pediu vista.",
        fonteUrl: "https://adufal.org.br/Conteudo/31917",
      },
      {
        id: "4794-2025-04",
        data: "2025-04-23",
        quando: "abril de 2025",
        titulo: "Julgamento suspenso por pedido de vista",
        texto: "O desembargador Leonardo Carvalho pediu vista e a sessão da rescisória foi suspensa.",
        fonteUrl: "https://sintufal.org.br/conteudo/3445/acao-dos-julgamento-da-acao-rescisoria-e-suspenso-por-pedido-de-vistas",
      },
      {
        id: "4794-2024-03",
        data: "2024-03-25",
        quando: "25/03/2024",
        titulo: "Execução segue, mas sem pagamento",
        texto:
          "O TRF5 deixou continuar o cálculo dos valores e a expedição de precatórios. Nenhum pagamento, retroativo ou no contracheque, sai até o julgamento da rescisória.",
        fonteUrl: "https://sintufal.org.br/conteudo/3198/nota-juridica-atualizacao-sobre-a-acao-dos",
      },
      {
        id: "4794-2023-06",
        data: "2023-06-01",
        quando: "junho de 2023",
        titulo: "STJ mantém a decisão a favor dos servidores",
        texto:
          "O STJ negou o recurso da Procuradoria Federal e afastou a tese de absorção por reestruturação de carreira, por estar preclusa.",
        fonteUrl: "https://adufal.org.br/Conteudo/31394",
      },
    ],
    fontes: [
      { nome: "Adufal: nota de abril de 2026 sobre o desempate", url: "https://adufal.org.br/Conteudo/32010" },
      { nome: "Sintufal: nota de março de 2026 sobre o empate", url: "https://sintufal.org.br/conteudo/3558/nota-do-sintufal-e-da-adufal-atualizacao-sobre-o-julgamento-dos" },
      { nome: "Adufal: sessão de 22 de outubro de 2025", url: "https://adufal.org.br/Conteudo/31917" },
      { nome: "Sintufal: nota jurídica de março de 2024", url: "https://sintufal.org.br/conteudo/3198/nota-juridica-atualizacao-sobre-a-acao-dos" },
    ],
  },
  {
    id: "2886",
    titulo: "Ação dos 28,86% (UFAL)",
    subtitulo: "Reajuste de 1993 dado aos militares e não aos civis",
    tesePadrao: /28[,.]86/,
    resumos: {
      simples: [
        "Em 1993 o governo deu 28,86% de aumento aos militares e não aos servidores civis. A Justiça reconheceu que os civis também tinham direito, e na UFAL o valor entrou no contracheque como rubrica judicial.",
        "Em maio de 2025 a UFAL absorveu essa rubrica de 452 docentes, por ordem do Ministério da Gestão, por causa da reestruturação das carreiras. A Adufal anunciou uma ação para cobrar o atrasado de junho de 2019 a abril de 2023.",
        "Em 2026 o Ministério mandou absorver também as rubricas que ainda restam. O Sintufal e a Adufal contestam, porque há decisão judicial que proíbe isso.",
      ],
      detalhado: [
        "As Leis 8.622 e 8.627, de 1993, deram aos militares um reajuste de 28,86%. Os civis foram à Justiça pedindo revisão igual para todos e ganharam. O direito cobre janeiro de 1993 a julho de 1998 e alcança técnicos, docentes, aposentados e pensionistas.",
        "Na UFAL a rubrica foi suspensa em 2019 e reimplantada em maio de 2023 para quase 500 servidores, que assinaram um termo dizendo que ela poderia ser absorvida numa reestruturação de carreira. Em abril de 2025, com base na MP 1.286/2024 e em comunicado do MGI, a UFAL anunciou a absorção total ou parcial para 452 docentes, aplicada em maio.",
        "A Adufal defende que o período sem pagamento, de junho de 2019 a abril de 2023, deve ser pago e anunciou ação judicial para isso. Em 2026 o Ofício Circular SEI 852/2026 do MGI orientou absorver as rubricas restantes, e as entidades responderam que isso fere a coisa julgada.",
      ],
      elaborado: [
        "O 28,86% nasceu de uma diferença de tratamento. Em 1993, as Leis 8.622 e 8.627 reajustaram a remuneração dos militares em 28,86% sem estender o índice aos civis. O STF entendeu que se tratava de revisão geral, que pela Constituição precisa ser igual para todos, e a Justiça mandou pagar a diferença aos civis, descontados os reajustes que alguns já tinham recebido. O período vai de janeiro de 1993 a julho de 1998.",
        "Na UFAL o percentual virou rubrica judicial. Depois de um corte em 2008, o juízo da execução determinou que não fosse absorvido. O TCU fixou como regra a absorção pelas leis de reestruturação de carreira, ressalvados os casos com decisão judicial contrária, e no Acórdão 1614/2019 cobrou providências da UFAL. A rubrica ficou suspensa de 2019 a 2023 e voltou em maio de 2023 para quase 500 servidores, que assinaram termo aceitando a absorção numa futura reestruturação.",
        "Essa reestruturação veio com a MP 1.286/2024. Em 10 de abril de 2025, a UFAL informou que, por comunicado do MGI, absorveria total ou parcialmente a rubrica de 452 docentes, conforme o valor de cada um, a partir da folha de maio. A Adufal sustenta que o retroativo de junho de 2019 a abril de 2023 é devido, porque o próprio MGI reconheceu a legalidade ao reimplantar, e anunciou ação para cobrar.",
        "Em 2026 o MGI enviou o Ofício Circular SEI 852/2026 orientando a absorção das rubricas ainda mantidas. A Adufal e o Sintufal pediram à reitoria que não aplique a medida, citando decisão vigente contra a absorção e exigindo cálculo caso a caso. O grupo do processo URP 2º Grupo, na Justiça do Trabalho, ficaria fora segundo as entidades.",
        "Para o cliente: quem teve a rubrica absorvida deve guardar os contracheques de 2019 em diante, que servem para a cobrança do retroativo. Quem ainda recebe deve avisar o escritório se notar redução no contracheque.",
      ],
    },
    atualizacoes: [
      {
        id: "2886-2026",
        data: "2026-01-01",
        quando: "2026",
        titulo: "MGI manda absorver as rubricas restantes",
        texto:
          "O Ofício Circular SEI 852/2026 orientou a UFAL a absorver as rubricas judiciais ainda mantidas. A Adufal e o Sintufal responderam que há decisão judicial proibindo a absorção e pediram cálculo individual.",
        fonteUrl: "https://site-sintufal.s3.amazonaws.com/uploads/3569/resposta-ao-oficio-circular-sei-852-1-adufal-e-sintufal_9df3d217b0d3fe95311cb0c75e6562cc.pdf",
      },
      {
        id: "2886-2025-04b",
        data: "2025-04-15",
        quando: "15/04/2025",
        titulo: "Absorção confirmada para maio; Adufal vai cobrar o retroativo",
        texto:
          "Em assembleia, a reitoria confirmou a absorção na folha de maio. A Adufal anunciou ação para cobrar os 28,86% de junho de 2019 a abril de 2023.",
        fonteUrl: "https://adufal.org.br/Conteudo/31801",
      },
      {
        id: "2886-2025-04a",
        data: "2025-04-10",
        quando: "10/04/2025",
        titulo: "UFAL anuncia absorção da rubrica de 452 docentes",
        texto:
          "Com base na MP 1.286/2024 e no Comunique 565925 do MGI, a absorção é total ou parcial, conforme o valor de cada servidor.",
        fonteUrl: "https://noticias.ufal.br/ufal/noticias/2025/4/ufal-esclarece-absorcao-da-rubrica-dos-28-86-por-determinacao-do-mgi",
      },
      {
        id: "2886-2023-05",
        data: "2023-05-01",
        quando: "maio de 2023",
        titulo: "Rubrica volta ao contracheque",
        texto: "Quase 500 servidores voltaram a receber os 28,86%, suspensos desde 2019.",
        fonteUrl: "https://noticias.ufal.br/ufal/noticias/2023/5/quase-500-servidores-terao-os-28-86-de-volta-em-seus-contracheques-ja-este-mes",
      },
    ],
    fontes: [
      { nome: "UFAL: nota de abril de 2025 sobre a absorção", url: "https://noticias.ufal.br/ufal/noticias/2025/4/ufal-esclarece-absorcao-da-rubrica-dos-28-86-por-determinacao-do-mgi" },
      { nome: "Adufal: assembleia de abril de 2025", url: "https://adufal.org.br/Conteudo/31801" },
      { nome: "Adufal e Sintufal: resposta ao Ofício SEI 852/2026 (PDF)", url: "https://site-sintufal.s3.amazonaws.com/uploads/3569/resposta-ao-oficio-circular-sei-852-1-adufal-e-sintufal_9df3d217b0d3fe95311cb0c75e6562cc.pdf" },
      { nome: "Memorial ao TCU (PDF)", url: "https://site-sintufal.s3.amazonaws.com/uploads/3501/memorial-tcu-assinado-assinado_2159ad947f955a6cfe9ca86d494df9c2.pdf" },
    ],
  },
  {
    id: "precatorios",
    titulo: "Precatórios e RPV",
    subtitulo: "Como a União paga o que perdeu na Justiça",
    resumos: {
      simples: [
        "Quando a pessoa ganha um processo contra a União, o dinheiro não sai na hora. O juiz manda o tribunal emitir uma ordem de pagamento.",
        "Se o valor for de até 60 salários mínimos, é uma RPV, paga em cerca de 60 dias. Acima disso, vira precatório e entra no orçamento de um ano seguinte.",
        "O precatório que chega ao tribunal até 1º de fevereiro entra no orçamento do ano seguinte. Depois dessa data, fica para um ano depois.",
      ],
      detalhado: [
        "Precatório é a ordem que o tribunal envia ao governo para pagar uma dívida reconhecida em processo que já terminou. RPV (requisição de pequeno valor) é a mesma coisa para valores menores. Na esfera federal, o limite da RPV é de 60 salários mínimos. Quem tem um crédito um pouco acima pode abrir mão do excedente para receber como RPV, que costuma sair em uns 60 dias.",
        "A Emenda Constitucional 136, de 2025, mudou o prazo de corte: agora o precatório precisa ser apresentado até 1º de fevereiro para entrar no orçamento do ano seguinte (antes era 2 de abril). O TRF2 dá um exemplo: precatório apresentado depois de 1º de fevereiro de 2026 deve ser pago até 31 de dezembro de 2028.",
        "A emenda também trocou a Selic por outro modelo de correção e juros. A constitucionalidade dela está em discussão no STF, na ADI 7873, então algumas regras podem mudar.",
      ],
      elaborado: [
        "Todo valor que a Fazenda Pública deve por decisão judicial definitiva segue a fila do artigo 100 da Constituição. O juiz da execução expede a requisição, o tribunal confere e envia ao órgão devedor, e o pagamento sai pelo orçamento. Para a União, os valores vão do Conselho da Justiça Federal aos TRFs, que depositam em conta judicial em nome do credor.",
        "Há duas vias. A RPV vale para créditos de até 60 salários mínimos contra a União e é paga em até 60 dias depois da requisição. O precatório vale para o que passa disso e depende da data em que chega ao tribunal. Com a EC 136/2025, a data de corte passou de 2 de abril para 1º de fevereiro. Quem perde o corte espera um ciclo orçamentário inteiro a mais.",
        "Idosos a partir de 60 anos, pessoas com doença grave e pessoas com deficiência têm prioridade e podem receber uma parte antes, até o triplo do limite da RPV. O resto segue a ordem normal. Créditos de natureza alimentar, como salário, aposentadoria e diferenças de remuneração de servidor, também passam na frente dos demais.",
        "A EC 136 trocou a Selic por um novo critério de correção e juros a partir da promulgação. Para contas com data-base anterior a setembro de 2025, a atualização segue a regra antiga até agosto de 2025 e a nova daí em diante. No orçamento federal, a emenda tirou os precatórios do limite de gastos primários em 2026. O estoque federal de 2026 fica perto de R$ 70 bilhões.",
        "O ponto que ainda pode mudar o cálculo é a ADI 7873, no STF, que questiona a emenda. Enquanto não houver julgamento, vale a regra nova. Quem tem crédito para receber deve conferir no site do TRF da sua região se a requisição já foi expedida e em qual ano orçamentário entrou.",
      ],
    },
    atualizacoes: [
      {
        id: "prec-2025-09",
        data: "2025-09-09",
        quando: "setembro de 2025",
        titulo: "Promulgada a EC 136/2025",
        texto:
          "O prazo de corte dos precatórios passou de 2 de abril para 1º de fevereiro, e a Selic deu lugar a um novo critério de correção e juros. A emenda é questionada no STF na ADI 7873.",
        fonteUrl: "https://www.camara.leg.br/noticias/1198404-congresso-nacional-promulga",
      },
    ],
    fontes: [
      { nome: "Câmara dos Deputados: promulgação da emenda", url: "https://www.camara.leg.br/noticias/1198404-congresso-nacional-promulga" },
      { nome: "TRF2: diferenças entre precatório e RPV", url: "https://trf2.jus.br/jfrj/artigo/especialidade-civel-previdenciaria/principais-diferencas-entre-precatorio-rpv" },
      { nome: "TRF6: EC 136 e prazo de inclusão", url: "https://portal.trf6.jus.br/?p=108129" },
      { nome: "Congresso em Foco: o que muda nos pagamentos", url: "https://www.congressoemfoco.com.br/noticia/111781/nova-emenda-dos-precatorios-entenda-o-que-muda-nos-pagamentos" },
    ],
  },
];

export function materiaDaTese(teseNome: string | null | undefined): Materia | null {
  if (!teseNome) return null;
  return MATERIAS.find((m) => m.tesePadrao?.test(teseNome)) ?? null;
}

/** Junta as atualizações registradas pela equipe com as levantadas em fonte pública, mais novas primeiro. */
export function juntarAtualizacoes(daEquipe: Atualizacao[], publicas: Atualizacao[]): Atualizacao[] {
  return [...daEquipe.map((a) => ({ ...a, daEquipe: true })), ...publicas].sort((a, b) => b.data.localeCompare(a.data));
}

export function quandoTexto(a: Atualizacao) {
  if (a.quando) return a.quando;
  const d = new Date(a.data);
  return Number.isNaN(d.getTime()) ? a.data : d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}
