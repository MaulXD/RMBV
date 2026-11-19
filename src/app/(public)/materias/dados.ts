import { MATERIAS_COLETIVAS } from "./coletivas";
import { MATERIAS_COLETIVAS_2 } from "./coletivas2";
import { MATERIAS_COLETIVAS_3 } from "./coletivas3";

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
  /** true = a linha do tempo é do próprio processo coletivo e entra na resposta ao cliente.
   *  false = é histórico de jurisprudência; na resposta entram só as atualizações da equipe. */
  linhaDoProcesso?: boolean;
  /** Grupo em que a matéria aparece no seletor */
  grupo: Grupo;
  /** Ação coletiva (sindicato, associação, MP ou ação civil pública) */
  coletiva?: boolean;
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

export type Grupo = "ufal" | "servidores" | "trabalhador" | "consumidor" | "inss" | "pagamentos";

export const GRUPOS: { id: Grupo; nome: string }[] = [
  { id: "ufal", nome: "Servidores da UFAL" },
  { id: "servidores", nome: "Servidores públicos" },
  { id: "trabalhador", nome: "Trabalhador e poupador" },
  { id: "consumidor", nome: "Consumidor e moradores" },
  { id: "inss", nome: "INSS e aposentadoria" },
  { id: "pagamentos", nome: "Pagamento" },
];

const MATERIAS_BASE: Materia[] = [
  {
    id: "4794",
    grupo: "ufal",
    coletiva: true,
    titulo: "Ação dos 47,94% (UFAL)",
    subtitulo: "Índice de 1994 cobrado pela Adufal e pelo Sintufal",
    tesePadrao: /47[,.]94/,
    linhaDoProcesso: true,
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
    grupo: "ufal",
    coletiva: true,
    titulo: "Ação dos 28,86% (UFAL)",
    subtitulo: "Reajuste de 1993 dado aos militares e não aos civis",
    tesePadrao: /28[,.]86/,
    linhaDoProcesso: true,
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
    id: "urp",
    grupo: "ufal",
    coletiva: true,
    titulo: "Ação da URP de 1989 (26,05%)",
    subtitulo: "Rubrica judicial dos servidores da UFAL",
    tesePadrao: /URP|26[,.]05/i,
    linhaDoProcesso: true,
    resumos: {
      simples: [
        "A URP de fevereiro de 1989 é um reajuste de 26,05% que os servidores da UFAL ganharam em reclamações trabalhistas abertas em 1989. Desde então ele aparece no contracheque como rubrica judicial.",
        "Em abril de 2026 o Ministério da Gestão mandou absorver essa rubrica aos poucos, usando 60% de cada aumento futuro. A Adufal e o Sintufal pediram que a regra não seja aplicada na UFAL, porque há decisão judicial que proíbe a absorção.",
        "Quem recebe a URP deve acompanhar o contracheque e avisar o escritório se o valor diminuir.",
      ],
      detalhado: [
        "A URP (Unidade de Referência de Preços) de fevereiro de 1989 corrigiria os salários em 26,05%. Na UFAL o direito veio de reclamações trabalhistas de 1989, entre elas a do grupo conhecido como URP 2º Grupo (RT 0157300-52.1989.5.19.0003), e o valor ficou no contracheque como rubrica judicial.",
        "O TCU cobra a absorção há anos. Em 2017 o Acórdão 6.492 mandou a UFAL absorver as rubricas de URP, 3,17% e 28,86% em 180 dias, ressalvando quem tem decisão judicial que proíbe a absorção. A UFAL transformou essas rubricas em VPNI, que não recebe reajuste.",
        "Em 4 de abril de 2026 o MGI publicou o comunicado 566443, fruto de um acordo no TCU sobre a UnB: a URP passa a ser absorvida com 60% dos aumentos permanentes concedidos a partir de abril de 2026, em vez de ser cortada de uma vez. Fica de fora quem tem decisão judicial que garante expressamente a não absorção. A Adufal e o Sintufal responderam à reitoria que é o caso da UFAL e pediram, no mínimo, análise individual.",
      ],
      elaborado: [
        "A URP de fevereiro de 1989, de 26,05%, é um resíduo do Plano Verão. Os servidores da UFAL, então regidos pela CLT, cobraram a diferença na Justiça do Trabalho. Nas reclamações 0157300-52.1989.5.19.0003 (URP 2º Grupo) e 0064700-12.1989.5.19.0003 o percentual foi incorporado, e segundo as entidades o título judicial proibiu a absorção.",
        "O TCU nunca aceitou bem essas rubricas. Em 2017, no Acórdão 6.492, mandou a UFAL absorver em 180 dias as rubricas de URP, 3,17% e 28,86% já transitadas em julgado, com ressalva para os casos com decisão que veda a absorção. Em 2019, no Acórdão 1614, voltou a cobrar providências. A UFAL respondeu que as rubricas já tinham virado VPNI, sem reajuste desde então.",
        "No STF a discussão tem andado a favor dos servidores. Em 17 de março de 2025 a 1ª Turma, com a ministra Cármen Lúcia como relatora, garantiu a URP de docentes da UnB contra a exclusão determinada pelo TCU, por segurança jurídica e proteção da confiança. Em dezembro de 2025 a Adufal e o Sintufal levaram um memorial ao presidente do TCU pedindo que a UFAL recebesse o mesmo tratamento da UnB e que as supressões fossem suspensas. O memorial informa também que o TST cassou a decisão do TRT-19 que tinha extinguido o processo da URP 2º Grupo.",
        "Em abril de 2026 veio a regra nova. O comunicado 566443 do MGI, de 4 de abril, e o Ofício Circular SEI 852/2026 mandam converter a URP em VPNI e absorvê-la com 60% dos aumentos permanentes a partir de abril de 2026. Quem tem decisão judicial que garante a não absorção e quem já teve a rubrica totalmente absorvida ficam de fora. As entidades responderam à reitoria que a orientação saiu de um processo da UnB, que o pedido delas para participar foi negado e que o caso da UFAL está na ressalva. Pediram que a regra não seja aplicada ou, subsidiariamente, que cada servidor tenha procedimento próprio.",
        "Para o cliente: o direito continua no contracheque enquanto não houver absorção. Se a rubrica cair ou mudar de nome, guarde os contracheques e fale com o escritório, porque a ressalva judicial pode ser usada para contestar.",
      ],
    },
    atualizacoes: [
      {
        id: "urp-2026-04b",
        data: "2026-04-09",
        quando: "abril de 2026",
        titulo: "Adufal e Sintufal contestam o Ofício 852/2026",
        texto:
          "As entidades pediram à reitora que não aplique a absorção na UFAL, porque a decisão da URP 2º Grupo veda a absorção, ou que cada servidor tenha análise individual.",
        fonteUrl: "https://site-sintufal.s3.amazonaws.com/uploads/3569/resposta-ao-oficio-circular-sei-852-1-adufal-e-sintufal_9df3d217b0d3fe95311cb0c75e6562cc.pdf",
      },
      {
        id: "urp-2026-04a",
        data: "2026-04-04",
        quando: "04/04/2026",
        titulo: "MGI define absorção gradual da URP",
        texto:
          "O comunicado 566443 manda absorver a URP com 60% dos aumentos permanentes a partir de abril de 2026. Fica de fora quem tem decisão judicial que garante a não absorção.",
        fonteUrl: "https://www.gov.br/servidor/pt-br/canais_atendimento/central-sipec/comunicas-1/abril-2026/comunicado-566443-sigepe-aj-orientacoes-para-absorcao-da-urp-de-1989-26-05_.pdf",
      },
      {
        id: "urp-2025-12",
        data: "2025-12-03",
        quando: "dezembro de 2025",
        titulo: "Memorial ao TCU pede o mesmo tratamento da UnB",
        texto:
          "A Adufal e o Sintufal pediram a suspensão das supressões de URP, 3,17% e 28,86% na UFAL e a inclusão no acordo feito para a UnB.",
        fonteUrl: "https://site-sintufal.s3.amazonaws.com/uploads/3501/memorial-tcu-assinado-assinado_2159ad947f955a6cfe9ca86d494df9c2.pdf",
      },
      {
        id: "urp-2025-03",
        data: "2025-03-17",
        quando: "17/03/2025",
        titulo: "STF garante a URP de docentes da UnB",
        texto:
          "A 1ª Turma concedeu o mandado de segurança 26156 contra a exclusão da URP pelo TCU, por segurança jurídica e proteção da confiança.",
        fonteUrl: "https://site-sintufal.s3.amazonaws.com/uploads/3501/memorial-tcu-assinado-assinado_2159ad947f955a6cfe9ca86d494df9c2.pdf",
      },
    ],
    fontes: [
      { nome: "MGI: comunicado 566443 sobre a absorção da URP (PDF)", url: "https://www.gov.br/servidor/pt-br/canais_atendimento/central-sipec/comunicas-1/abril-2026/comunicado-566443-sigepe-aj-orientacoes-para-absorcao-da-urp-de-1989-26-05_.pdf" },
      { nome: "Adufal e Sintufal: resposta ao Ofício SEI 852/2026 (PDF)", url: "https://site-sintufal.s3.amazonaws.com/uploads/3569/resposta-ao-oficio-circular-sei-852-1-adufal-e-sintufal_9df3d217b0d3fe95311cb0c75e6562cc.pdf" },
      { nome: "Memorial da Adufal e do Sintufal ao TCU (PDF)", url: "https://site-sintufal.s3.amazonaws.com/uploads/3501/memorial-tcu-assinado-assinado_2159ad947f955a6cfe9ca86d494df9c2.pdf" },
      { nome: "TCU: solução consensual da URP da UnB", url: "https://portal.tcu.gov.br/publicacoes-institucionais/solucoes-consensuais/unidade-de-referencia-padrao-dos-servidores-da-fub-un-b" },
    ],
  },
  {
    id: "317",
    grupo: "servidores",
    coletiva: true,
    titulo: "Ação dos 3,17% (URV de 1995)",
    subtitulo: "Perda na conversão dos salários dos servidores federais",
    tesePadrao: /3[,.]17/,
    resumos: {
      simples: [
        "Na conversão dos salários para a URV, os servidores federais ficaram com uma perda de 3,17% a partir de janeiro de 1995. A MP 2.225-45, de 2001, reconheceu essa diferença.",
        "O valor é devido de janeiro de 1995 até a reestruturação da carreira de cada servidor. Quem tem execução em andamento recebe pelo cálculo feito no processo.",
        "O STJ ainda vai decidir, no Tema 1344, se esse limite de tempo pode ser definido na fase de execução. O resultado pode mexer no cálculo de algumas ações.",
      ],
      detalhado: [
        "O 3,17% é o resíduo da conversão dos vencimentos dos servidores federais para a URV. A MP 2.225-45/2001 reconheceu a diferença e propôs pagar os atrasados parcelados. Em março de 2004 o STF decidiu que o parcelamento não vale para o servidor que não aceitou o acordo.",
        "Em 2010 a 3ª Seção do STJ fixou em cinco anos o prazo para pedir o reajuste, contados da MP de 2001, com efeitos desde janeiro de 1995. O direito vai até a reestruturação da carreira, quando o novo salário passa a absorver a diferença.",
        "Na UFAL o 3,17% virou rubrica judicial e depois VPNI, e está na lista de absorções cobradas pelo TCU desde o Acórdão 6.492/2017. A Adufal e o Sintufal contestam essa absorção no TCU.",
      ],
      elaborado: [
        "Em 1994 os vencimentos dos servidores federais foram convertidos em URV. A conversão deixou uma diferença de 3,17%, reconhecida pela MP 2.225-45/2001, que também propôs pagar os atrasados em parcelas mediante acordo.",
        "Em 31 de março de 2004, no RE 401436, o STF decidiu que o parcelamento previsto no artigo 11 da MP não vale para quem não o aceitou. Quem foi à Justiça pôde cobrar sem parcelamento. Em maio de 2010 a 3ª Seção do STJ, por unanimidade, fixou em cinco anos o prazo para pedir o reajuste, contados da MP de 2001, e manteve os efeitos financeiros desde janeiro de 1995.",
        "O ponto que mais gera dúvida é o fim do direito. A diferença é devida até a reestruturação da carreira de cada servidor, porque a nova tabela de salários absorve o resíduo. O STJ afetou o Tema 1344 para decidir se esse limite de tempo pode ser fixado na fase de cumprimento de sentença, mesmo sem ter sido discutido antes. Até a tese sair, cálculos de execução podem ficar parados ou ser contestados.",
        "Nas execuções coletivas, a prescrição também é discutida. Em 2023 o TRF4 afastou a prescrição de uma execução individual de título coletivo do 3,17%, porque o título não fixou prazo. A decisão é do Rio Grande do Sul e não vincula o TRF5, que julga os processos de Alagoas.",
        "Na UFAL a rubrica foi transformada em VPNI e entra no pedido de absorção do TCU, ao lado da URP e dos 28,86%. Em dezembro de 2025 a Adufal e o Sintufal pediram ao TCU a suspensão das supressões. Para o cliente: quem ainda recebe deve avisar o escritório se o valor cair. Quem tem execução deve aguardar o cálculo do processo.",
      ],
    },
    atualizacoes: [
      {
        id: "317-2025-12",
        data: "2025-12-03",
        quando: "dezembro de 2025",
        titulo: "Memorial ao TCU contra a absorção na UFAL",
        texto: "A Adufal e o Sintufal pediram a suspensão das supressões das rubricas de 3,17%, URP e 28,86%.",
        fonteUrl: "https://site-sintufal.s3.amazonaws.com/uploads/3501/memorial-tcu-assinado-assinado_2159ad947f955a6cfe9ca86d494df9c2.pdf",
      },
      {
        id: "317-2023-05",
        data: "2023-05-06",
        quando: "maio de 2023",
        titulo: "TRF4 afasta prescrição em execução coletiva",
        texto: "A execução individual de título coletivo do 3,17% não prescreveu, porque o título não fixou prazo. Decisão regional, sem efeito no TRF5.",
        fonteUrl: "https://wagner.adv.br/acao-coletiva-prescricao-da-pretensao-executoria-inocorrencia-reajuste-de-317-base-de-calculo/",
      },
      {
        id: "317-2010-05",
        data: "2010-05-07",
        quando: "maio de 2010",
        titulo: "STJ fixa prazo de cinco anos",
        texto: "A 3ª Seção decidiu que o servidor tinha cinco anos, contados da MP 2.225-45/2001, para pedir o reajuste.",
        fonteUrl: "https://www.cjf.jus.br/cjf/outras-noticias/2010/maio/prazo-para-servidor-pedir-reposicao-salarial-e-de-cinco-anos",
      },
      {
        id: "317-2004-03",
        data: "2004-03-31",
        quando: "31/03/2004",
        titulo: "STF: parcelamento só para quem aceitou",
        texto: "No RE 401436 o STF decidiu que o parcelamento da MP 2.225-45 não vale para o servidor que o recusou.",
        fonteUrl: "https://noticias.stf.jus.br/?p=5501",
      },
    ],
    fontes: [
      { nome: "STF: julgamento do RE 401436 (2004)", url: "https://noticias.stf.jus.br/?p=5501" },
      { nome: "CJF: prazo de cinco anos para pedir o 3,17%", url: "https://www.cjf.jus.br/cjf/outras-noticias/2010/maio/prazo-para-servidor-pedir-reposicao-salarial-e-de-cinco-anos" },
      { nome: "STJ Tema 1344 (resumo)", url: "https://juris.damasio.com.br/temas/stj/1344" },
      { nome: "Memorial da Adufal e do Sintufal ao TCU (PDF)", url: "https://site-sintufal.s3.amazonaws.com/uploads/3501/memorial-tcu-assinado-assinado_2159ad947f955a6cfe9ca86d494df9c2.pdf" },
    ],
  },
  {
    id: "medicos",
    grupo: "servidores",
    titulo: "Médicos com dois vínculos públicos",
    subtitulo: "Teto por vínculo e carga horária na acumulação",
    tesePadrao: /m[eé]dic/i,
    resumos: {
      simples: [
        "A Constituição permite que o médico tenha dois cargos públicos quando os horários são compatíveis. Em 2017 o STF decidiu que, nesses casos, o teto salarial vale para cada vínculo separado, e não para a soma dos dois.",
        "Se o Estado ou o município cortou parte do salário somando os dois vínculos, o chamado abate-teto, esse corte pode ser questionado. Contra o poder público a cobrança alcança os últimos cinco anos.",
        "Cada caso depende do tipo de vínculo. O advogado confere o seu antes de passar prazo ou valor.",
      ],
      detalhado: [
        "Em 27 de abril de 2017 o STF julgou os Temas 377 e 384 e decidiu que, nas acumulações permitidas pela Constituição, o teto remuneratório incide sobre cada vínculo isoladamente. O Tema 384 trata justamente de médicos estaduais que já acumulavam dois cargos antes da Emenda 41, de 2003.",
        "A carga horária também deixou de ser obstáculo. Em abril de 2019 o STJ abandonou o limite de 60 horas semanais para profissionais de saúde, e em 2020 o STF fixou no Tema 1081 que a acumulação depende só da compatibilidade de horários, verificada caso a caso.",
        "Quem teve desconto pelo teto calculado sobre a soma dos vínculos pode cobrar a diferença. Pelo Decreto 20.910/1932, dívidas do Estado e dos municípios prescrevem em cinco anos, então quanto antes a ação entrar, mais meses ela alcança.",
      ],
      elaborado: [
        "O artigo 37 da Constituição proíbe acumular cargos públicos, com exceções. Uma delas são dois cargos privativos de profissional de saúde, como o médico que trabalha para o Estado e para um município, desde que os horários sejam compatíveis.",
        "O problema mais comum é o teto. Muitos entes somavam os dois salários e cortavam o que passava do teto, o abate-teto. Em 27 de abril de 2017, nos Recursos Extraordinários 612975 e 602043 (Temas 377 e 384), o STF decidiu por maioria que, nas acumulações autorizadas, o teto incide sobre cada vínculo separadamente. O Tema 384 trata de médicos estaduais que já tinham dois cargos antes da Emenda 41/2003.",
        "A jornada era o outro argumento contra a acumulação. Vários órgãos aplicavam um limite de 60 horas semanais. Em abril de 2019 a Primeira Seção do STJ, no REsp 1767955, passou a exigir apenas a comprovação de compatibilidade de horários. Em março de 2020 o STF fixou a mesma tese no Tema 1081: a acumulação depende unicamente da compatibilidade de horários, verificada no caso concreto, mesmo que uma lei limite a jornada.",
        "Na prática, quem sofreu abate-teto sobre a soma pode pedir a devolução do que foi descontado e o fim do desconto. O Decreto 20.910/1932 limita a cobrança contra Estado e municípios aos cinco anos anteriores à ação. O cálculo depende das fichas financeiras de cada vínculo.",
        "Há um cuidado. Quem trabalha como celetista em fundação ou empresa pública segue regras próprias. Em 2021 o TST permitiu que a Fundação Hospitalar de Saúde de Aracaju descontasse de um médico celetista o que passava do teto, incluindo horas extras. Por isso o advogado precisa conferir o tipo de cada vínculo antes de prometer resultado.",
      ],
    },
    atualizacoes: [
      {
        id: "med-2021-04",
        data: "2021-04-20",
        quando: "abril de 2021",
        titulo: "TST mantém abate-teto de médico celetista em Aracaju",
        texto:
          "A 5ª Turma permitiu que a Fundação Hospitalar de Saúde de Aracaju descontasse o que passava do teto, inclusive horas extras. O caso é de vínculo CLT, com regra diferente da do servidor estatutário.",
        fonteUrl: "https://www2.oabrs.org.br/jornalDaOrdem/fundacao-hospitalar-pode-descontar-do-salario-de-medico-valores-que-ultrapassam-teto-constitucional/47432",
      },
      {
        id: "med-2020-03",
        data: "2020-03-20",
        quando: "março de 2020",
        titulo: "STF: basta a compatibilidade de horários",
        texto:
          "No Tema 1081 o STF fixou que as acumulações permitidas dependem só da compatibilidade de horários, mesmo que uma lei limite a jornada semanal.",
        fonteUrl: "https://tesesesumulas.com.br/tese/stf/1081",
      },
      {
        id: "med-2019-04",
        data: "2019-04-15",
        quando: "abril de 2019",
        titulo: "STJ abandona o limite de 60 horas",
        texto:
          "A Primeira Seção passou a exigir dos profissionais de saúde apenas a comprovação de compatibilidade de horários.",
        fonteUrl: "https://wagner.adv.br/primeira-secao-alinha-entendimento-e-profissionais-de-saude-devem-apenas-comprovar-compatibilidade-de-horarios-para-acumular-cargos/",
      },
      {
        id: "med-2017-04",
        data: "2017-04-27",
        quando: "27/04/2017",
        titulo: "STF: teto vale para cada vínculo",
        texto:
          "Nos Temas 377 e 384 o STF decidiu que, na acumulação autorizada, o teto incide sobre cada vínculo isoladamente, e não sobre a soma.",
        fonteUrl: "https://noticias.stf.jus.br/?p=41953",
      },
    ],
    fontes: [
      { nome: "STF: teto em acumulação de cargos (2017)", url: "https://noticias.stf.jus.br/?p=41953" },
      { nome: "STF Tema 1081 (texto da tese)", url: "https://tesesesumulas.com.br/tese/stf/1081" },
      { nome: "STJ: compatibilidade de horários para profissionais de saúde", url: "https://wagner.adv.br/primeira-secao-alinha-entendimento-e-profissionais-de-saude-devem-apenas-comprovar-compatibilidade-de-horarios-para-acumular-cargos/" },
      { nome: "Decreto 20.910/1932 (prescrição contra a Fazenda)", url: "https://www.planalto.gov.br/ccivil_03/decreto/antigos/d20910.htm" },
    ],
  },
  {
    id: "terco-ferias",
    grupo: "servidores",
    titulo: "Contribuição sobre o terço de férias",
    subtitulo: "PSS do servidor sobre verbas que não entram na aposentadoria",
    tesePadrao: /ter[cç]o de f[eé]rias|PSS/i,
    resumos: {
      simples: [
        "O servidor público paga contribuição para a previdência, o PSS. Em 2018 o STF decidiu que ela não pode ser cobrada sobre verbas que não entram no cálculo da aposentadoria, como o terço de férias.",
        "Quem teve esse desconto pode pedir a devolução do que pagou nos últimos cinco anos.",
        "A decisão vale para servidor federal, como os da UFAL e do IFAL. Servidor de estado ou município pode ter regra diferente no regime dele.",
      ],
      detalhado: [
        "Em 11 de outubro de 2018 o STF concluiu o RE 593068 (Tema 163) e fixou a tese: não incide contribuição previdenciária sobre verba não incorporável aos proventos de aposentadoria do servidor público. O terço constitucional de férias está entre essas verbas.",
        "Com isso, o servidor pode pedir a restituição do PSS descontado sobre o terço de férias. A devolução costuma alcançar os cinco anos anteriores à ação, e os tribunais aplicam a prescrição quinquenal.",
        "Esse tema é diferente do Tema 985 do STF, de 2020, que trata da contribuição paga pelas empresas sobre o terço de férias dos empregados. Não misture os dois ao explicar ao cliente.",
      ],
      elaborado: [
        "A contribuição do servidor ao regime próprio, o PSS, existe para custear a aposentadoria. Por isso o STF entendeu que ela só pode incidir sobre verbas que vão compor os proventos. Em 11 de outubro de 2018, no RE 593068 (Tema 163), relatado pelo ministro Barroso, o Plenário fixou a tese de que não incide contribuição previdenciária sobre verba não incorporável aos proventos de aposentadoria do servidor público.",
        "O terço de férias é o exemplo mais citado, mas a tese alcança outras parcelas que não levam à aposentadoria, como serviço extraordinário e adicional noturno, conforme o caso. O pedido é a restituição do que foi descontado e o fim do desconto.",
        "A restituição costuma ficar limitada aos cinco anos anteriores à ação. Houve divergência em alguns tribunais: o TRF3, em 2021, considerou devida a contribuição sobre férias gozadas e indevida sobre férias indenizadas. Por isso o advogado confere as fichas financeiras e o tipo de férias antes de calcular.",
        "Duas confusões comuns. O Tema 985, de 2020, trata da contribuição patronal das empresas sobre o terço de férias dos empregados, e não do PSS do servidor. E servidores estaduais e municipais dependem da lei do próprio regime, que pode ter regra diferente. Para servidor federal, como os da UFAL e do IFAL, a tese do Tema 163 se aplica diretamente.",
      ],
    },
    atualizacoes: [
      {
        id: "terco-2018-10",
        data: "2018-10-11",
        quando: "11/10/2018",
        titulo: "STF afasta PSS sobre verbas que não entram na aposentadoria",
        texto:
          "No Tema 163 o STF fixou que não incide contribuição previdenciária do servidor sobre verba não incorporável aos proventos, como o terço de férias.",
        fonteUrl: "https://noticias.stf.jus.br/postsnoticias/stf-conclui-julgamento-sobre-incidencia-de-contribuicao-previdenciaria-em-parcelas-recebidas-por-servidores/",
      },
    ],
    fontes: [
      { nome: "STF: julgamento do Tema 163 (2018)", url: "https://noticias.stf.jus.br/postsnoticias/stf-conclui-julgamento-sobre-incidencia-de-contribuicao-previdenciaria-em-parcelas-recebidas-por-servidores/" },
      { nome: "STF: página do Tema 163", url: "https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=163" },
    ],
  },
  {
    id: "vida-toda",
    grupo: "inss",
    titulo: "Revisão da vida toda (INSS)",
    subtitulo: "Tese derrubada pelo STF em 2024",
    tesePadrao: /vida toda/i,
    resumos: {
      simples: [
        "A revisão da vida toda pedia que o INSS calculasse a aposentadoria com todas as contribuições, inclusive as anteriores a julho de 1994. Em março de 2024 o STF mudou de posição e derrubou a tese.",
        "Quem recebeu algum valor por decisão judicial até 5 de abril de 2024 não precisa devolver. Quem tinha ação aberta até essa data também não paga honorários nem custas.",
        "As ações que ainda estão abertas tendem a ser julgadas contra o aposentado. O advogado confere como ficou o seu processo.",
      ],
      detalhado: [
        "Em 21 de março de 2024, ao julgar as ADIs 2110 e 2111, o STF declarou constitucional a regra de transição da Lei 9.876/1999, que considera só as contribuições a partir de julho de 1994. Com isso a revisão da vida toda deixou de valer.",
        "Em abril de 2025 o STF decidiu, por unanimidade, que quem recebeu valores por decisão judicial até 5 de abril de 2024 não devolve nada, e que os autores de ações pendentes até essa data não pagam honorários nem custas. Em novembro de 2025 confirmou o mesmo no Tema 1102.",
        "Em junho de 2026 o STF rejeitou o último recurso, da CNTM, e o relator mandou certificar o trânsito em julgado. Não há mais como reverter a tese.",
      ],
      elaborado: [
        "A Lei 9.876/1999 criou uma regra de transição: para quem já contribuía antes dela, a aposentadoria seria calculada só com os salários a partir de julho de 1994. A revisão da vida toda pedia a opção pela regra definitiva, que usa todas as contribuições, quando isso desse um valor maior. Em 2022 o STF chegou a aceitar a tese no Tema 1102.",
        "Em 21 de março de 2024 o Tribunal mudou de posição. Nas ADIs 2110 e 2111 declarou constitucional a regra de transição, o que derrubou a revisão. A ata foi publicada em 5 de abril de 2024, data usada como marco da modulação.",
        "Em 10 de abril de 2025, ao julgar embargos na ADI 2111, o STF decidiu por unanimidade que quem recebeu valores por decisão judicial, provisória ou definitiva, até 5 de abril de 2024 não precisa devolver. Os autores de ações pendentes até essa data também ficaram livres de honorários e custas. Em 25 de novembro de 2025 o Plenário acolheu os embargos do INSS no Tema 1102 e fixou que quem se enquadra na regra de transição não pode optar pela regra definitiva, mesmo que seja melhor, mantendo a mesma proteção.",
        "Em junho de 2026 o STF rejeitou o recurso da CNTM na ADI 2111, e o relator determinou a certificação do trânsito em julgado. Para o cliente: a ação não deve trazer ganho, mas também não gera dívida se ele recebeu algo até abril de 2024 ou tinha processo aberto até essa data. O advogado confere se o processo dele já foi encerrado.",
      ],
    },
    atualizacoes: [
      {
        id: "vt-2026-06",
        data: "2026-06-12",
        quando: "junho de 2026",
        titulo: "STF rejeita o último recurso",
        texto: "O Plenário rejeitou o recurso da CNTM na ADI 2111, e o relator mandou certificar o trânsito em julgado.",
        fonteUrl: "https://agenciabrasil.ebc.com.br/justica/noticia/2026-06/stf-rejeita-alterar-decisao-que-vetou-revisao-da-vida-toda",
      },
      {
        id: "vt-2025-11",
        data: "2025-11-25",
        quando: "25/11/2025",
        titulo: "Tema 1102 confirma a regra de transição",
        texto:
          "O STF acolheu os embargos do INSS: quem se enquadra na regra de transição não pode escolher a regra definitiva. Ficou mantida a dispensa de devolução, honorários e custas até 05/04/2024.",
        fonteUrl: "https://noticias.stf.jus.br/postsnoticias/stf-reafirma-decisao-que-superou-tese-da-revisao-da-vida-toda/",
      },
      {
        id: "vt-2025-04",
        data: "2025-04-10",
        quando: "10/04/2025",
        titulo: "Ninguém precisa devolver o que recebeu",
        texto:
          "Por unanimidade, o STF decidiu que valores recebidos por decisão judicial até 05/04/2024 não serão devolvidos e que ações pendentes até essa data não pagam honorários nem custas.",
        fonteUrl: "https://noticias.stf.jus.br/postsnoticias/segurados-nao-precisam-devolver-valores-recebidos-do-inss-com-base-na-tese-da-revisao-da-vida-toda-decide-stf/",
      },
      {
        id: "vt-2024-03",
        data: "2024-03-21",
        quando: "21/03/2024",
        titulo: "STF derruba a revisão da vida toda",
        texto: "Nas ADIs 2110 e 2111 o STF declarou constitucional a regra de transição da Lei 9.876/1999.",
        fonteUrl: "https://noticias.stf.jus.br/postsnoticias/stf-reafirma-decisao-que-superou-tese-da-revisao-da-vida-toda/",
      },
    ],
    fontes: [
      { nome: "STF: embargos no Tema 1102 (novembro de 2025)", url: "https://noticias.stf.jus.br/postsnoticias/stf-reafirma-decisao-que-superou-tese-da-revisao-da-vida-toda/" },
      { nome: "STF: segurados não devolvem valores (abril de 2025)", url: "https://noticias.stf.jus.br/postsnoticias/segurados-nao-precisam-devolver-valores-recebidos-do-inss-com-base-na-tese-da-revisao-da-vida-toda-decide-stf/" },
      { nome: "Agência Brasil: último recurso rejeitado (junho de 2026)", url: "https://agenciabrasil.ebc.com.br/justica/noticia/2026-06/stf-rejeita-alterar-decisao-que-vetou-revisao-da-vida-toda" },
    ],
  },
  {
    id: "descontos-inss",
    grupo: "inss",
    titulo: "Descontos indevidos no INSS",
    subtitulo: "Mensalidades de associações cobradas sem autorização",
    tesePadrao: /descont/i,
    resumos: {
      simples: [
        "Em abril de 2025 a Polícia Federal e a CGU revelaram que associações descontavam mensalidades de aposentados e pensionistas sem autorização. O INSS suspendeu esses descontos.",
        "O governo devolveu o dinheiro, corrigido, a quem contestou pelo Meu INSS, pela Central 135 ou nos Correios. O prazo para contestar terminou em 20 de junho de 2026.",
        "Quem perdeu o prazo, discorda do valor ou quer indenização pode entrar com ação. O INSS não manda link nem cobra taxa para devolver dinheiro: mensagem assim é golpe.",
      ],
      detalhado: [
        "A Operação Sem Desconto, de 23 de abril de 2025, investigou descontos de mensalidades associativas feitos sem autorização em benefícios do INSS. A estimativa da investigação é de R$ 6,3 bilhões descontados entre 2019 e 2024. O INSS suspendeu os acordos com as associações.",
        "A devolução foi administrativa. O beneficiário contestava o desconto, a associação tinha 15 dias úteis para responder e, sem resposta ou com prova irregular, ele podia aderir ao acordo pelo Meu INSS ou nos Correios. Valeram os descontos de março de 2020 a março de 2025, corrigidos pelo IPCA. Até junho de 2026 foram pagos mais de R$ 3,2 bilhões a 4,7 milhões de pessoas.",
        "O prazo de contestação acabou em 20 de junho de 2026. Depois disso, a saída é a ação judicial, que pode pedir a devolução e indenização por dano moral. O STJ vai decidir no Tema 1.435 se esse dano é presumido ou precisa ser provado.",
      ],
      elaborado: [
        "Em 23 de abril de 2025 a Polícia Federal e a CGU deflagraram a Operação Sem Desconto, em 13 estados e no Distrito Federal, com 211 mandados de busca e bloqueio de mais de R$ 1 bilhão. A investigação estima R$ 6,3 bilhões descontados de aposentados e pensionistas entre 2019 e 2024 por associações, sem autorização. O INSS suspendeu os acordos de cooperação e os descontos.",
        "O governo montou uma devolução sem processo. O beneficiário contestava no Meu INSS, na Central 135 ou nos Correios, e a associação tinha 15 dias úteis para apresentar a autorização. Se não respondesse, ou mostrasse prova irregular, como assinatura falsa, o beneficiário podia aderir ao acordo no Meu INSS (Consultar Pedidos, Cumprir Exigência, Aceito receber) ou nos Correios. Valeram os descontos de março de 2020 a março de 2025, corrigidos pelo IPCA, e o pagamento sai em até três dias úteis após a adesão. Indígenas, quilombolas e maiores de 80 anos receberam sem precisar aderir. Quem já tinha ação e ainda não tinha recebido precisou desistir dela para aderir.",
        "O prazo de contestação foi prorrogado até 20 de junho de 2026 e não reabriu. Naquele mês o balanço oficial passava de R$ 3,2 bilhões devolvidos a 4,7 milhões de beneficiários.",
        "A ação judicial é o caminho para quem perdeu o prazo, discorda do valor ou quer indenização. Os tribunais estaduais divergem: alguns concedem devolução em dobro e dano moral, outros exigem prova do abalo quando o valor é pequeno. Em 22 de maio de 2026 o STJ afetou o Tema 1.435 para decidir se o dano moral nesses casos é presumido. Só os processos que já estão no STJ ficaram suspensos.",
        "Aviso para repassar ao cliente: o INSS não envia link nem SMS e não cobra taxa para devolver dinheiro. Qualquer contato assim é golpe.",
      ],
    },
    atualizacoes: [
      {
        id: "inss-2026-06",
        data: "2026-06-20",
        quando: "20/06/2026",
        titulo: "Fim do prazo para contestar",
        texto:
          "Terminou o prazo de contestação, com mais de R$ 3,2 bilhões devolvidos a 4,7 milhões de beneficiários. Quem não contestou só pode cobrar na Justiça.",
        fonteUrl: "https://agenciagov.ebc.com.br/noticias/202606/beneficiarios-podem-contestar-descontos-indevidos-ate-este-sabado-20-de-junho-1",
      },
      {
        id: "inss-2026-05",
        data: "2026-05-22",
        quando: "22/05/2026",
        titulo: "STJ vai decidir sobre o dano moral",
        texto:
          "O Tema 1.435 vai definir se o desconto indevido em benefício gera dano moral presumido. Só os recursos que já estão no STJ ficaram suspensos.",
        fonteUrl: "https://www.ieprev.com.br/noticias/stj-definira-se-descontos-indevidos-em-beneficios-previdenciarios-geram-dano-moral-presumido",
      },
      {
        id: "inss-2026-01",
        data: "2026-01-08",
        quando: "08/01/2026",
        titulo: "R$ 2,84 bilhões devolvidos",
        texto: "O governo informou a devolução a 4,1 milhões de beneficiários, corrigida pelo IPCA, sem necessidade de ação judicial.",
        fonteUrl: "https://agenciagov.ebc.com.br/noticias/202601/governo-federal-ja-devolveu-mais-de-r-2-8-bilhoes-a-quatro-milhoes-de-aposentados-e-pensionistas-vitimas-de-fraudes",
      },
      {
        id: "inss-2025-04",
        data: "2025-04-23",
        quando: "23/04/2025",
        titulo: "Operação Sem Desconto",
        texto: "PF e CGU revelaram os descontos sem autorização. O INSS suspendeu os acordos com as associações.",
        fonteUrl: "https://agenciagov.ebc.com.br/noticias/202504/201cprotecao-aos-aposentados201d-diz-lewandowski-sobre-operacao-contra-fraudes-em-descontos-no-inss",
      },
    ],
    fontes: [
      { nome: "Agência Gov: fim do prazo de contestação (junho de 2026)", url: "https://agenciagov.ebc.com.br/noticias/202606/beneficiarios-podem-contestar-descontos-indevidos-ate-este-sabado-20-de-junho-1" },
      { nome: "Agência Gov: como funciona a devolução (janeiro de 2026)", url: "https://agenciagov.ebc.com.br/noticias/202601/governo-federal-ja-devolveu-mais-de-r-2-8-bilhoes-a-quatro-milhoes-de-aposentados-e-pensionistas-vitimas-de-fraudes" },
      { nome: "IEPREV: STJ afeta o Tema 1.435", url: "https://www.ieprev.com.br/noticias/stj-definira-se-descontos-indevidos-em-beneficios-previdenciarios-geram-dano-moral-presumido" },
      { nome: "Agência Gov: Operação Sem Desconto (abril de 2025)", url: "https://agenciagov.ebc.com.br/noticias/202504/201cprotecao-aos-aposentados201d-diz-lewandowski-sobre-operacao-contra-fraudes-em-descontos-no-inss" },
    ],
  },
  {
    id: "precatorios",
    grupo: "pagamentos",
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

export const MATERIAS: Materia[] = [...MATERIAS_BASE, ...MATERIAS_COLETIVAS, ...MATERIAS_COLETIVAS_2, ...MATERIAS_COLETIVAS_3];

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
