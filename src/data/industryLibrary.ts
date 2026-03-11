/**
 * Industry Process Library
 *
 * Implements the 4-level APQC PCF-inspired hierarchy:
 *   Industry → Macroprocess → Process → Subprocess
 *
 * Architecture:
 *   - Base macroprocesses (cross-industry) live in processLibrary.json and are
 *     always included regardless of industry selection.
 *   - Each industry adds its own macroprocesses on top of the base set.
 *   - Helper functions combine base + industry-specific macroprocesses at runtime.
 */

import { Industry, Macroprocess, Process, Subprocess } from '@/types';
import { processLibrary } from './processLibrary';

// ── Manufatura ────────────────────────────────────────────────────────────────

const manufaturaMacroprocesses: Macroprocess[] = [
  {
    id: 'mfg-pp',
    name: 'Planejamento de Produção',
    icon: '🏭',
    processes: [
      {
        id: 'mfg-pp-dem',
        name: 'Planejamento de Demanda',
        subprocesses: [
          { id: 'mfg-pp-01', code: 'MFG-PP-01', name: 'Consolidar previsões de demanda',     process: 'Planejamento de Demanda',             macroprocess: 'Planejamento de Produção', category: 'Production Planning' },
        ],
      },
      {
        id: 'mfg-pp-mps',
        name: 'Planejamento Mestre de Produção',
        subprocesses: [
          { id: 'mfg-pp-02', code: 'MFG-PP-02', name: 'Gerar plano mestre de produção',       process: 'Planejamento Mestre de Produção',      macroprocess: 'Planejamento de Produção', category: 'Production Planning' },
        ],
      },
      {
        id: 'mfg-pp-mrp',
        name: 'Planejamento de Materiais',
        subprocesses: [
          { id: 'mfg-pp-03', code: 'MFG-PP-03', name: 'Calcular necessidades de materiais',   process: 'Planejamento de Materiais',            macroprocess: 'Planejamento de Produção', category: 'Production Planning' },
        ],
      },
      {
        id: 'mfg-pp-seq',
        name: 'Sequenciamento de Produção',
        subprocesses: [
          { id: 'mfg-pp-04', code: 'MFG-PP-04', name: 'Programar ordens de produção',         process: 'Sequenciamento de Produção',           macroprocess: 'Planejamento de Produção', category: 'Production Planning' },
        ],
      },
    ],
  },
  {
    id: 'mfg-pr',
    name: 'Produção',
    icon: '⚙️',
    processes: [
      {
        id: 'mfg-pr-ord',
        name: 'Gestão de Ordens de Produção',
        subprocesses: [
          { id: 'mfg-pr-01', code: 'MFG-PR-01', name: 'Criar ordem de produção',              process: 'Gestão de Ordens de Produção',         macroprocess: 'Produção', category: 'Manufacturing Execution' },
          { id: 'mfg-pr-02', code: 'MFG-PR-02', name: 'Liberar ordem para produção',          process: 'Gestão de Ordens de Produção',         macroprocess: 'Produção', category: 'Manufacturing Execution' },
        ],
      },
      {
        id: 'mfg-pr-exe',
        name: 'Execução da Produção',
        subprocesses: [
          { id: 'mfg-pr-03', code: 'MFG-PR-03', name: 'Apontamento de produção',              process: 'Execução da Produção',                 macroprocess: 'Produção', category: 'Manufacturing Execution' },
          { id: 'mfg-pr-04', code: 'MFG-PR-04', name: 'Registrar consumo de materiais',       process: 'Execução da Produção',                 macroprocess: 'Produção', category: 'Manufacturing Execution' },
          { id: 'mfg-pr-05', code: 'MFG-PR-05', name: 'Registrar produção concluída',         process: 'Execução da Produção',                 macroprocess: 'Produção', category: 'Manufacturing Execution' },
        ],
      },
      {
        id: 'mfg-pr-ctrl',
        name: 'Controle de Produção',
        subprocesses: [
          { id: 'mfg-pr-06', code: 'MFG-PR-06', name: 'Monitorar indicadores de produção',    process: 'Controle de Produção',                 macroprocess: 'Produção', category: 'Manufacturing Execution' },
          { id: 'mfg-pr-07', code: 'MFG-PR-07', name: 'Registrar parada de linha',            process: 'Controle de Produção',                 macroprocess: 'Produção', category: 'Manufacturing Execution' },
        ],
      },
    ],
  },
  {
    id: 'mfg-qa',
    name: 'Qualidade',
    icon: '✅',
    processes: [
      {
        id: 'mfg-qa-insp',
        name: 'Inspeção de Qualidade',
        subprocesses: [
          { id: 'mfg-qa-01', code: 'MFG-QA-01', name: 'Registrar inspeção de produto',        process: 'Inspeção de Qualidade',                macroprocess: 'Qualidade', category: 'Quality Management' },
        ],
      },
      {
        id: 'mfg-qa-nc',
        name: 'Gestão de Não Conformidades',
        subprocesses: [
          { id: 'mfg-qa-02', code: 'MFG-QA-02', name: 'Registrar não conformidade',           process: 'Gestão de Não Conformidades',          macroprocess: 'Qualidade', category: 'Quality Management' },
          { id: 'mfg-qa-03', code: 'MFG-QA-03', name: 'Abrir ação corretiva',                 process: 'Gestão de Não Conformidades',          macroprocess: 'Qualidade', category: 'Quality Management' },
          { id: 'mfg-qa-04', code: 'MFG-QA-04', name: 'Validar ação corretiva',               process: 'Gestão de Não Conformidades',          macroprocess: 'Qualidade', category: 'Quality Management' },
        ],
      },
      {
        id: 'mfg-qa-aud',
        name: 'Auditorias de Qualidade',
        subprocesses: [
          { id: 'mfg-qa-05', code: 'MFG-QA-05', name: 'Planejar auditoria de qualidade',      process: 'Auditorias de Qualidade',              macroprocess: 'Qualidade', category: 'Quality Management' },
          { id: 'mfg-qa-06', code: 'MFG-QA-06', name: 'Registrar resultado de auditoria',     process: 'Auditorias de Qualidade',              macroprocess: 'Qualidade', category: 'Quality Management' },
        ],
      },
    ],
  },
  {
    id: 'mfg-mn',
    name: 'Manutenção',
    icon: '🔧',
    processes: [
      {
        id: 'mfg-mn-prev',
        name: 'Manutenção Preventiva',
        subprocesses: [
          { id: 'mfg-mn-01', code: 'MFG-MN-01', name: 'Criar ordem de manutenção',            process: 'Manutenção Preventiva',                macroprocess: 'Manutenção', category: 'Asset Maintenance' },
          { id: 'mfg-mn-02', code: 'MFG-MN-02', name: 'Planejar manutenção preventiva',       process: 'Manutenção Preventiva',                macroprocess: 'Manutenção', category: 'Asset Maintenance' },
        ],
      },
      {
        id: 'mfg-mn-corr',
        name: 'Manutenção Corretiva',
        subprocesses: [
          { id: 'mfg-mn-03', code: 'MFG-MN-03', name: 'Registrar execução de manutenção',     process: 'Manutenção Corretiva',                 macroprocess: 'Manutenção', category: 'Asset Maintenance' },
          { id: 'mfg-mn-04', code: 'MFG-MN-04', name: 'Registrar parada de máquina',          process: 'Manutenção Corretiva',                 macroprocess: 'Manutenção', category: 'Asset Maintenance' },
        ],
      },
      {
        id: 'mfg-mn-atv',
        name: 'Gestão de Ativos',
        subprocesses: [
          { id: 'mfg-mn-05', code: 'MFG-MN-05', name: 'Cadastrar ativo produtivo',            process: 'Gestão de Ativos',                     macroprocess: 'Manutenção', category: 'Asset Maintenance' },
          { id: 'mfg-mn-06', code: 'MFG-MN-06', name: 'Atualizar histórico de manutenção',    process: 'Gestão de Ativos',                     macroprocess: 'Manutenção', category: 'Asset Maintenance' },
        ],
      },
    ],
  },
];

// ── Varejo ────────────────────────────────────────────────────────────────────

const varejoMacroprocesses: Macroprocess[] = [
  {
    id: 'ret-gp',
    name: 'Gestão de Produtos',
    icon: '🏷️',
    processes: [
      {
        id: 'ret-gp-cad',
        name: 'Cadastro de Produtos',
        subprocesses: [
          { id: 'ret-gp-01', code: 'RET-GP-01', name: 'Criar cadastro de produto',             process: 'Cadastro de Produtos',                 macroprocess: 'Gestão de Produtos', category: 'Product Management' },
          { id: 'ret-gp-02', code: 'RET-GP-02', name: 'Atualizar descrição de produto',        process: 'Cadastro de Produtos',                 macroprocess: 'Gestão de Produtos', category: 'Product Management' },
        ],
      },
      {
        id: 'ret-gp-prec',
        name: 'Gestão de Preços',
        subprocesses: [
          { id: 'ret-gp-03', code: 'RET-GP-03', name: 'Atualizar preço de produto',            process: 'Gestão de Preços',                     macroprocess: 'Gestão de Produtos', category: 'Product Management' },
          { id: 'ret-gp-04', code: 'RET-GP-04', name: 'Aplicar promoção ou desconto',          process: 'Gestão de Preços',                     macroprocess: 'Gestão de Produtos', category: 'Product Management' },
        ],
      },
      {
        id: 'ret-gp-cat',
        name: 'Gestão de Catálogo',
        subprocesses: [
          { id: 'ret-gp-05', code: 'RET-GP-05', name: 'Publicar produto em canais',            process: 'Gestão de Catálogo',                   macroprocess: 'Gestão de Produtos', category: 'Product Management' },
          { id: 'ret-gp-06', code: 'RET-GP-06', name: 'Inativar produto descontinuado',        process: 'Gestão de Catálogo',                   macroprocess: 'Gestão de Produtos', category: 'Product Management' },
        ],
      },
    ],
  },
  {
    id: 'ret-ol',
    name: 'Operações de Loja',
    icon: '🛒',
    processes: [
      {
        id: 'ret-ol-vnd',
        name: 'Gestão de Vendas',
        subprocesses: [
          { id: 'ret-ol-01', code: 'RET-OL-01', name: 'Registrar venda',                       process: 'Gestão de Vendas',                     macroprocess: 'Operações de Loja', category: 'Store Operations' },
          { id: 'ret-ol-02', code: 'RET-OL-02', name: 'Processar pagamento de venda',          process: 'Gestão de Vendas',                     macroprocess: 'Operações de Loja', category: 'Store Operations' },
        ],
      },
      {
        id: 'ret-ol-cx',
        name: 'Gestão de Caixa',
        subprocesses: [
          { id: 'ret-ol-03', code: 'RET-OL-03', name: 'Abertura de caixa',                     process: 'Gestão de Caixa',                      macroprocess: 'Operações de Loja', category: 'Store Operations' },
          { id: 'ret-ol-04', code: 'RET-OL-04', name: 'Fechamento de caixa',                   process: 'Gestão de Caixa',                      macroprocess: 'Operações de Loja', category: 'Store Operations' },
        ],
      },
      {
        id: 'ret-ol-rep',
        name: 'Reposição de Estoque',
        subprocesses: [
          { id: 'ret-ol-05', code: 'RET-OL-05', name: 'Solicitar reposição',                   process: 'Reposição de Estoque',                 macroprocess: 'Operações de Loja', category: 'Store Operations' },
          { id: 'ret-ol-06', code: 'RET-OL-06', name: 'Registrar ruptura de estoque',          process: 'Reposição de Estoque',                 macroprocess: 'Operações de Loja', category: 'Store Operations' },
        ],
      },
    ],
  },
  {
    id: 'ret-gd',
    name: 'Gestão de Devoluções',
    icon: '↩️',
    processes: [
      {
        id: 'ret-gd-dev',
        name: 'Processamento de Devoluções',
        subprocesses: [
          { id: 'ret-gd-01', code: 'RET-GD-01', name: 'Registrar devolução',                   process: 'Processamento de Devoluções',          macroprocess: 'Gestão de Devoluções', category: 'Returns Management' },
          { id: 'ret-gd-02', code: 'RET-GD-02', name: 'Atualizar estoque devolvido',           process: 'Processamento de Devoluções',          macroprocess: 'Gestão de Devoluções', category: 'Returns Management' },
        ],
      },
      {
        id: 'ret-gd-troca',
        name: 'Gestão de Trocas',
        subprocesses: [
          { id: 'ret-gd-03', code: 'RET-GD-03', name: 'Autorizar troca',                       process: 'Gestão de Trocas',                     macroprocess: 'Gestão de Devoluções', category: 'Returns Management' },
          { id: 'ret-gd-04', code: 'RET-GD-04', name: 'Emitir reembolso',                      process: 'Gestão de Trocas',                     macroprocess: 'Gestão de Devoluções', category: 'Returns Management' },
        ],
      },
    ],
  },
];

// ── Bancos / Instituições Financeiras ─────────────────────────────────────────

const bancosMacroprocesses: Macroprocess[] = [
  {
    id: 'bnk-ob',
    name: 'Operações Bancárias',
    icon: '🏦',
    processes: [
      {
        id: 'bnk-ob-aber',
        name: 'Abertura de Contas',
        subprocesses: [
          { id: 'bnk-ob-01', code: 'BNK-OB-01', name: 'Receber documentação do cliente',       process: 'Abertura de Contas',                   macroprocess: 'Operações Bancárias', category: 'Banking Operations' },
          { id: 'bnk-ob-02', code: 'BNK-OB-02', name: 'Validar documentos',                    process: 'Abertura de Contas',                   macroprocess: 'Operações Bancárias', category: 'Banking Operations' },
          { id: 'bnk-ob-03', code: 'BNK-OB-03', name: 'Cadastrar cliente',                     process: 'Abertura de Contas',                   macroprocess: 'Operações Bancárias', category: 'Banking Operations' },
        ],
      },
      {
        id: 'bnk-ob-gest',
        name: 'Gestão de Contas',
        subprocesses: [
          { id: 'bnk-ob-04', code: 'BNK-OB-04', name: 'Processar encerramento de conta',       process: 'Gestão de Contas',                     macroprocess: 'Operações Bancárias', category: 'Banking Operations' },
          { id: 'bnk-ob-05', code: 'BNK-OB-05', name: 'Bloquear / desbloquear conta',          process: 'Gestão de Contas',                     macroprocess: 'Operações Bancárias', category: 'Banking Operations' },
        ],
      },
      {
        id: 'bnk-ob-cad',
        name: 'Atualização Cadastral',
        subprocesses: [
          { id: 'bnk-ob-06', code: 'BNK-OB-06', name: 'Atualizar cadastro de cliente',         process: 'Atualização Cadastral',                macroprocess: 'Operações Bancárias', category: 'Banking Operations' },
          { id: 'bnk-ob-07', code: 'BNK-OB-07', name: 'Validar atualização de dados',          process: 'Atualização Cadastral',                macroprocess: 'Operações Bancárias', category: 'Banking Operations' },
        ],
      },
    ],
  },
  {
    id: 'bnk-gc',
    name: 'Gestão de Crédito',
    icon: '💳',
    processes: [
      {
        id: 'bnk-gc-anal',
        name: 'Análise de Crédito',
        subprocesses: [
          { id: 'bnk-gc-01', code: 'BNK-GC-01', name: 'Receber proposta de crédito',           process: 'Análise de Crédito',                   macroprocess: 'Gestão de Crédito', category: 'Credit Management' },
          { id: 'bnk-gc-02', code: 'BNK-GC-02', name: 'Analisar score de crédito',             process: 'Análise de Crédito',                   macroprocess: 'Gestão de Crédito', category: 'Credit Management' },
        ],
      },
      {
        id: 'bnk-gc-form',
        name: 'Formalização de Contratos',
        subprocesses: [
          { id: 'bnk-gc-03', code: 'BNK-GC-03', name: 'Emitir contrato de crédito',            process: 'Formalização de Contratos',            macroprocess: 'Gestão de Crédito', category: 'Credit Management' },
          { id: 'bnk-gc-04', code: 'BNK-GC-04', name: 'Coletar assinatura do contrato',        process: 'Formalização de Contratos',            macroprocess: 'Gestão de Crédito', category: 'Credit Management' },
        ],
      },
      {
        id: 'bnk-gc-gar',
        name: 'Gestão de Garantias',
        subprocesses: [
          { id: 'bnk-gc-05', code: 'BNK-GC-05', name: 'Registrar garantia',                    process: 'Gestão de Garantias',                  macroprocess: 'Gestão de Crédito', category: 'Credit Management' },
          { id: 'bnk-gc-06', code: 'BNK-GC-06', name: 'Monitorar vencimento de garantia',      process: 'Gestão de Garantias',                  macroprocess: 'Gestão de Crédito', category: 'Credit Management' },
        ],
      },
    ],
  },
  {
    id: 'bnk-pg',
    name: 'Pagamentos',
    icon: '💸',
    processes: [
      {
        id: 'bnk-pg-proc',
        name: 'Processamento de Pagamentos',
        subprocesses: [
          { id: 'bnk-pg-01', code: 'BNK-PG-01', name: 'Receber ordem de pagamento',            process: 'Processamento de Pagamentos',          macroprocess: 'Pagamentos', category: 'Payment Processing' },
          { id: 'bnk-pg-02', code: 'BNK-PG-02', name: 'Processar pagamento',                   process: 'Processamento de Pagamentos',          macroprocess: 'Pagamentos', category: 'Payment Processing' },
        ],
      },
      {
        id: 'bnk-pg-liq',
        name: 'Liquidação Financeira',
        subprocesses: [
          { id: 'bnk-pg-03', code: 'BNK-PG-03', name: 'Liquidar transação',                    process: 'Liquidação Financeira',                macroprocess: 'Pagamentos', category: 'Payment Processing' },
          { id: 'bnk-pg-04', code: 'BNK-PG-04', name: 'Confirmar liquidação ao cliente',       process: 'Liquidação Financeira',                macroprocess: 'Pagamentos', category: 'Payment Processing' },
        ],
      },
      {
        id: 'bnk-pg-conc',
        name: 'Conciliação',
        subprocesses: [
          { id: 'bnk-pg-05', code: 'BNK-PG-05', name: 'Conciliar transações',                  process: 'Conciliação',                          macroprocess: 'Pagamentos', category: 'Payment Processing' },
          { id: 'bnk-pg-06', code: 'BNK-PG-06', name: 'Tratar divergências de conciliação',    process: 'Conciliação',                          macroprocess: 'Pagamentos', category: 'Payment Processing' },
        ],
      },
    ],
  },
  {
    id: 'bnk-co',
    name: 'Compliance Operacional',
    icon: '📋',
    processes: [
      {
        id: 'bnk-co-kyc',
        name: 'KYC e Prevenção à Lavagem',
        subprocesses: [
          { id: 'bnk-co-01', code: 'BNK-CO-01', name: 'Executar due diligence de cliente',     process: 'KYC e Prevenção à Lavagem',            macroprocess: 'Compliance Operacional', category: 'Compliance' },
          { id: 'bnk-co-02', code: 'BNK-CO-02', name: 'Monitorar transações suspeitas',        process: 'KYC e Prevenção à Lavagem',            macroprocess: 'Compliance Operacional', category: 'Compliance' },
        ],
      },
      {
        id: 'bnk-co-reg',
        name: 'Reporte Regulatório',
        subprocesses: [
          { id: 'bnk-co-03', code: 'BNK-CO-03', name: 'Preparar relatório regulatório',        process: 'Reporte Regulatório',                  macroprocess: 'Compliance Operacional', category: 'Compliance' },
          { id: 'bnk-co-04', code: 'BNK-CO-04', name: 'Enviar declaração ao regulador',        process: 'Reporte Regulatório',                  macroprocess: 'Compliance Operacional', category: 'Compliance' },
        ],
      },
    ],
  },
];

// ── Serviços / BPO ────────────────────────────────────────────────────────────

const servicosBpoMacroprocesses: Macroprocess[] = [
  {
    id: 'bpo-gc',
    name: 'Gestão de Contratos',
    icon: '📄',
    processes: [
      {
        id: 'bpo-gc-cad',
        name: 'Cadastro de Contratos',
        subprocesses: [
          { id: 'bpo-gc-01', code: 'BPO-GC-01', name: 'Registrar contrato',                    process: 'Cadastro de Contratos',                macroprocess: 'Gestão de Contratos', category: 'Contract Management' },
          { id: 'bpo-gc-02', code: 'BPO-GC-02', name: 'Atualizar condições contratuais',       process: 'Cadastro de Contratos',                macroprocess: 'Gestão de Contratos', category: 'Contract Management' },
        ],
      },
      {
        id: 'bpo-gc-vig',
        name: 'Gestão de Vigência',
        subprocesses: [
          { id: 'bpo-gc-03', code: 'BPO-GC-03', name: 'Notificar vencimento de contrato',      process: 'Gestão de Vigência',                   macroprocess: 'Gestão de Contratos', category: 'Contract Management' },
          { id: 'bpo-gc-04', code: 'BPO-GC-04', name: 'Monitorar SLA contratual',              process: 'Gestão de Vigência',                   macroprocess: 'Gestão de Contratos', category: 'Contract Management' },
        ],
      },
      {
        id: 'bpo-gc-ren',
        name: 'Renovação de Contratos',
        subprocesses: [
          { id: 'bpo-gc-05', code: 'BPO-GC-05', name: 'Renovar contrato',                      process: 'Renovação de Contratos',               macroprocess: 'Gestão de Contratos', category: 'Contract Management' },
          { id: 'bpo-gc-06', code: 'BPO-GC-06', name: 'Registrar aditivo contratual',          process: 'Renovação de Contratos',               macroprocess: 'Gestão de Contratos', category: 'Contract Management' },
        ],
      },
    ],
  },
  {
    id: 'bpo-os',
    name: 'Operações de Serviço',
    icon: '🛠️',
    processes: [
      {
        id: 'bpo-os-exe',
        name: 'Execução de Serviços',
        subprocesses: [
          { id: 'bpo-os-01', code: 'BPO-OS-01', name: 'Registrar solicitação de serviço',      process: 'Execução de Serviços',                 macroprocess: 'Operações de Serviço', category: 'Service Operations' },
          { id: 'bpo-os-02', code: 'BPO-OS-02', name: 'Atribuir responsável',                  process: 'Execução de Serviços',                 macroprocess: 'Operações de Serviço', category: 'Service Operations' },
        ],
      },
      {
        id: 'bpo-os-ent',
        name: 'Controle de Entregas',
        subprocesses: [
          { id: 'bpo-os-03', code: 'BPO-OS-03', name: 'Registrar execução',                    process: 'Controle de Entregas',                 macroprocess: 'Operações de Serviço', category: 'Service Operations' },
          { id: 'bpo-os-04', code: 'BPO-OS-04', name: 'Validar entrega',                       process: 'Controle de Entregas',                 macroprocess: 'Operações de Serviço', category: 'Service Operations' },
        ],
      },
      {
        id: 'bpo-os-sol',
        name: 'Gestão de Solicitações',
        subprocesses: [
          { id: 'bpo-os-05', code: 'BPO-OS-05', name: 'Priorizar fila de solicitações',        process: 'Gestão de Solicitações',               macroprocess: 'Operações de Serviço', category: 'Service Operations' },
          { id: 'bpo-os-06', code: 'BPO-OS-06', name: 'Escalar solicitação crítica',           process: 'Gestão de Solicitações',               macroprocess: 'Operações de Serviço', category: 'Service Operations' },
        ],
      },
    ],
  },
  {
    id: 'bpo-gp',
    name: 'Gestão de Projetos',
    icon: '📊',
    processes: [
      {
        id: 'bpo-gp-plan',
        name: 'Planejamento de Projetos',
        subprocesses: [
          { id: 'bpo-gp-01', code: 'BPO-GP-01', name: 'Criar escopo de projeto',               process: 'Planejamento de Projetos',             macroprocess: 'Gestão de Projetos', category: 'Project Management' },
          { id: 'bpo-gp-02', code: 'BPO-GP-02', name: 'Definir cronograma e marcos',           process: 'Planejamento de Projetos',             macroprocess: 'Gestão de Projetos', category: 'Project Management' },
        ],
      },
      {
        id: 'bpo-gp-mon',
        name: 'Monitoramento de Projetos',
        subprocesses: [
          { id: 'bpo-gp-03', code: 'BPO-GP-03', name: 'Atualizar status do projeto',           process: 'Monitoramento de Projetos',            macroprocess: 'Gestão de Projetos', category: 'Project Management' },
          { id: 'bpo-gp-04', code: 'BPO-GP-04', name: 'Registrar desvio de prazo ou custo',    process: 'Monitoramento de Projetos',            macroprocess: 'Gestão de Projetos', category: 'Project Management' },
        ],
      },
    ],
  },
];

// ── Saúde ─────────────────────────────────────────────────────────────────────

const saudeMacroprocesses: Macroprocess[] = [
  {
    id: 'sde-gp',
    name: 'Gestão de Pacientes',
    icon: '🏥',
    processes: [
      {
        id: 'sde-gp-adm',
        name: 'Admissão e Alta',
        subprocesses: [
          { id: 'sde-gp-01', code: 'SDE-GP-01', name: 'Registrar admissão do paciente',         process: 'Admissão e Alta',          macroprocess: 'Gestão de Pacientes',    category: 'Patient Management' },
          { id: 'sde-gp-02', code: 'SDE-GP-02', name: 'Processar alta hospitalar',              process: 'Admissão e Alta',          macroprocess: 'Gestão de Pacientes',    category: 'Patient Management' },
        ],
      },
      {
        id: 'sde-gp-pro',
        name: 'Prontuário Eletrônico',
        subprocesses: [
          { id: 'sde-gp-03', code: 'SDE-GP-03', name: 'Atualizar prontuário do paciente',       process: 'Prontuário Eletrônico',    macroprocess: 'Gestão de Pacientes',    category: 'Patient Management' },
          { id: 'sde-gp-04', code: 'SDE-GP-04', name: 'Registrar evolução clínica',             process: 'Prontuário Eletrônico',    macroprocess: 'Gestão de Pacientes',    category: 'Patient Management' },
        ],
      },
    ],
  },
  {
    id: 'sde-ag',
    name: 'Agendamento',
    icon: '📅',
    processes: [
      {
        id: 'sde-ag-con',
        name: 'Agendamento de Consultas',
        subprocesses: [
          { id: 'sde-ag-01', code: 'SDE-AG-01', name: 'Agendar consulta médica',                process: 'Agendamento de Consultas', macroprocess: 'Agendamento',            category: 'Scheduling' },
          { id: 'sde-ag-02', code: 'SDE-AG-02', name: 'Confirmar e lembrar agendamento',        process: 'Agendamento de Consultas', macroprocess: 'Agendamento',            category: 'Scheduling' },
          { id: 'sde-ag-03', code: 'SDE-AG-03', name: 'Registrar cancelamento ou falta',        process: 'Agendamento de Consultas', macroprocess: 'Agendamento',            category: 'Scheduling' },
        ],
      },
      {
        id: 'sde-ag-exa',
        name: 'Agendamento de Exames',
        subprocesses: [
          { id: 'sde-ag-04', code: 'SDE-AG-04', name: 'Solicitar autorização de exame',         process: 'Agendamento de Exames',    macroprocess: 'Agendamento',            category: 'Scheduling' },
          { id: 'sde-ag-05', code: 'SDE-AG-05', name: 'Agendar exame e notificar paciente',     process: 'Agendamento de Exames',    macroprocess: 'Agendamento',            category: 'Scheduling' },
        ],
      },
    ],
  },
  {
    id: 'sde-fat',
    name: 'Faturamento Hospitalar',
    icon: '💊',
    processes: [
      {
        id: 'sde-fat-tiss',
        name: 'Faturamento para Convênios',
        subprocesses: [
          { id: 'sde-fat-01', code: 'SDE-FAT-01', name: 'Montar conta hospitalar (TISS)',       process: 'Faturamento para Convênios', macroprocess: 'Faturamento Hospitalar', category: 'Healthcare Billing' },
          { id: 'sde-fat-02', code: 'SDE-FAT-02', name: 'Submeter lote de cobrança',            process: 'Faturamento para Convênios', macroprocess: 'Faturamento Hospitalar', category: 'Healthcare Billing' },
          { id: 'sde-fat-03', code: 'SDE-FAT-03', name: 'Controlar e contestar glosas',         process: 'Faturamento para Convênios', macroprocess: 'Faturamento Hospitalar', category: 'Healthcare Billing' },
        ],
      },
    ],
  },
];

// ── Logística / Transporte ────────────────────────────────────────────────────

const logisticaMacroprocesses: Macroprocess[] = [
  {
    id: 'log-fr',
    name: 'Gestão de Frotas',
    icon: '🚛',
    processes: [
      {
        id: 'log-fr-prog',
        name: 'Programação de Rotas',
        subprocesses: [
          { id: 'log-fr-01', code: 'LOG-FR-01', name: 'Programar rota de entrega',               process: 'Programação de Rotas',     macroprocess: 'Gestão de Frotas',       category: 'Fleet Management' },
          { id: 'log-fr-02', code: 'LOG-FR-02', name: 'Registrar saída de veículo',              process: 'Programação de Rotas',     macroprocess: 'Gestão de Frotas',       category: 'Fleet Management' },
          { id: 'log-fr-03', code: 'LOG-FR-03', name: 'Registrar chegada e ocorrências',         process: 'Programação de Rotas',     macroprocess: 'Gestão de Frotas',       category: 'Fleet Management' },
        ],
      },
      {
        id: 'log-fr-mnt',
        name: 'Manutenção de Veículos',
        subprocesses: [
          { id: 'log-fr-04', code: 'LOG-FR-04', name: 'Agendar manutenção preventiva',           process: 'Manutenção de Veículos',   macroprocess: 'Gestão de Frotas',       category: 'Fleet Management' },
          { id: 'log-fr-05', code: 'LOG-FR-05', name: 'Registrar manutenção corretiva',          process: 'Manutenção de Veículos',   macroprocess: 'Gestão de Frotas',       category: 'Fleet Management' },
        ],
      },
    ],
  },
  {
    id: 'log-arm',
    name: 'Armazenagem',
    icon: '🏗️',
    processes: [
      {
        id: 'log-arm-rec',
        name: 'Recebimento',
        subprocesses: [
          { id: 'log-arm-01', code: 'LOG-ARM-01', name: 'Conferir carga recebida',               process: 'Recebimento',              macroprocess: 'Armazenagem',            category: 'Warehouse Operations' },
          { id: 'log-arm-02', code: 'LOG-ARM-02', name: 'Registrar entrada em estoque',          process: 'Recebimento',              macroprocess: 'Armazenagem',            category: 'Warehouse Operations' },
        ],
      },
      {
        id: 'log-arm-exp',
        name: 'Expedição',
        subprocesses: [
          { id: 'log-arm-03', code: 'LOG-ARM-03', name: 'Separar e embalar pedido',              process: 'Expedição',                macroprocess: 'Armazenagem',            category: 'Warehouse Operations' },
          { id: 'log-arm-04', code: 'LOG-ARM-04', name: 'Emitir nota fiscal de saída',           process: 'Expedição',                macroprocess: 'Armazenagem',            category: 'Warehouse Operations' },
          { id: 'log-arm-05', code: 'LOG-ARM-05', name: 'Emitir romaneio de carga',              process: 'Expedição',                macroprocess: 'Armazenagem',            category: 'Warehouse Operations' },
        ],
      },
    ],
  },
  {
    id: 'log-rastr',
    name: 'Rastreamento de Entregas',
    icon: '📍',
    processes: [
      {
        id: 'log-rastr-mon',
        name: 'Monitoramento',
        subprocesses: [
          { id: 'log-rastr-01', code: 'LOG-RST-01', name: 'Atualizar status de entrega',         process: 'Monitoramento',            macroprocess: 'Rastreamento de Entregas', category: 'Delivery Tracking' },
          { id: 'log-rastr-02', code: 'LOG-RST-02', name: 'Registrar ocorrência de entrega',     process: 'Monitoramento',            macroprocess: 'Rastreamento de Entregas', category: 'Delivery Tracking' },
          { id: 'log-rastr-03', code: 'LOG-RST-03', name: 'Confirmar entrega ao destinatário',   process: 'Monitoramento',            macroprocess: 'Rastreamento de Entregas', category: 'Delivery Tracking' },
        ],
      },
    ],
  },
];

// ── Seguros ───────────────────────────────────────────────────────────────────

const segurosMacroprocesses: Macroprocess[] = [
  {
    id: 'seg-ap',
    name: 'Emissão de Apólices',
    icon: '📜',
    processes: [
      {
        id: 'seg-ap-prop',
        name: 'Proposta e Aceitação',
        subprocesses: [
          { id: 'seg-ap-01', code: 'SEG-AP-01', name: 'Cadastrar proposta de seguro',            process: 'Proposta e Aceitação',     macroprocess: 'Emissão de Apólices',    category: 'Policy Issuance' },
          { id: 'seg-ap-02', code: 'SEG-AP-02', name: 'Analisar risco e aceitar proposta',       process: 'Proposta e Aceitação',     macroprocess: 'Emissão de Apólices',    category: 'Policy Issuance' },
          { id: 'seg-ap-03', code: 'SEG-AP-03', name: 'Emitir apólice e enviar ao segurado',     process: 'Proposta e Aceitação',     macroprocess: 'Emissão de Apólices',    category: 'Policy Issuance' },
        ],
      },
      {
        id: 'seg-ap-end',
        name: 'Endosso e Cancelamento',
        subprocesses: [
          { id: 'seg-ap-04', code: 'SEG-AP-04', name: 'Processar endosso de apólice',            process: 'Endosso e Cancelamento',   macroprocess: 'Emissão de Apólices',    category: 'Policy Issuance' },
          { id: 'seg-ap-05', code: 'SEG-AP-05', name: 'Processar cancelamento de apólice',       process: 'Endosso e Cancelamento',   macroprocess: 'Emissão de Apólices',    category: 'Policy Issuance' },
        ],
      },
    ],
  },
  {
    id: 'seg-sin',
    name: 'Gestão de Sinistros',
    icon: '⚠️',
    processes: [
      {
        id: 'seg-sin-avi',
        name: 'Aviso e Análise',
        subprocesses: [
          { id: 'seg-sin-01', code: 'SEG-SIN-01', name: 'Registrar aviso de sinistro',           process: 'Aviso e Análise',          macroprocess: 'Gestão de Sinistros',    category: 'Claims Management' },
          { id: 'seg-sin-02', code: 'SEG-SIN-02', name: 'Analisar cobertura e documentação',     process: 'Aviso e Análise',          macroprocess: 'Gestão de Sinistros',    category: 'Claims Management' },
          { id: 'seg-sin-03', code: 'SEG-SIN-03', name: 'Regulação e liquidação do sinistro',    process: 'Aviso e Análise',          macroprocess: 'Gestão de Sinistros',    category: 'Claims Management' },
        ],
      },
    ],
  },
  {
    id: 'seg-cob',
    name: 'Cobrança de Prêmios',
    icon: '💰',
    processes: [
      {
        id: 'seg-cob-prm',
        name: 'Emissão e Cobrança',
        subprocesses: [
          { id: 'seg-cob-01', code: 'SEG-COB-01', name: 'Emitir boleto de prêmio',               process: 'Emissão e Cobrança',       macroprocess: 'Cobrança de Prêmios',    category: 'Premium Billing' },
          { id: 'seg-cob-02', code: 'SEG-COB-02', name: 'Baixar pagamento de prêmio',            process: 'Emissão e Cobrança',       macroprocess: 'Cobrança de Prêmios',    category: 'Premium Billing' },
          { id: 'seg-cob-03', code: 'SEG-COB-03', name: 'Processar renovação de apólice',        process: 'Emissão e Cobrança',       macroprocess: 'Cobrança de Prêmios',    category: 'Premium Billing' },
        ],
      },
    ],
  },
];

// ── Tecnologia / SaaS ─────────────────────────────────────────────────────────

const tecnologiaMacroprocesses: Macroprocess[] = [
  {
    id: 'tec-ob',
    name: 'Onboarding de Clientes',
    icon: '🚀',
    processes: [
      {
        id: 'tec-ob-prov',
        name: 'Provisionamento',
        subprocesses: [
          { id: 'tec-ob-01', code: 'TEC-OB-01', name: 'Criar conta e ambiente do cliente',       process: 'Provisionamento',          macroprocess: 'Onboarding de Clientes', category: 'Customer Onboarding' },
          { id: 'tec-ob-02', code: 'TEC-OB-02', name: 'Configurar parâmetros iniciais',          process: 'Provisionamento',          macroprocess: 'Onboarding de Clientes', category: 'Customer Onboarding' },
          { id: 'tec-ob-03', code: 'TEC-OB-03', name: 'Habilitar usuários e permissões',         process: 'Provisionamento',          macroprocess: 'Onboarding de Clientes', category: 'Customer Onboarding' },
        ],
      },
      {
        id: 'tec-ob-trn',
        name: 'Treinamento e Ativação',
        subprocesses: [
          { id: 'tec-ob-04', code: 'TEC-OB-04', name: 'Enviar materiais de onboarding',          process: 'Treinamento e Ativação',   macroprocess: 'Onboarding de Clientes', category: 'Customer Onboarding' },
          { id: 'tec-ob-05', code: 'TEC-OB-05', name: 'Registrar conclusão de onboarding',       process: 'Treinamento e Ativação',   macroprocess: 'Onboarding de Clientes', category: 'Customer Onboarding' },
        ],
      },
    ],
  },
  {
    id: 'tec-sup',
    name: 'Suporte Técnico',
    icon: '🛟',
    processes: [
      {
        id: 'tec-sup-cha',
        name: 'Gestão de Chamados',
        subprocesses: [
          { id: 'tec-sup-01', code: 'TEC-SUP-01', name: 'Abrir e classificar chamado',           process: 'Gestão de Chamados',       macroprocess: 'Suporte Técnico',        category: 'Technical Support' },
          { id: 'tec-sup-02', code: 'TEC-SUP-02', name: 'Escalar chamado crítico (L2/L3)',       process: 'Gestão de Chamados',       macroprocess: 'Suporte Técnico',        category: 'Technical Support' },
          { id: 'tec-sup-03', code: 'TEC-SUP-03', name: 'Encerrar chamado e registrar solução',  process: 'Gestão de Chamados',       macroprocess: 'Suporte Técnico',        category: 'Technical Support' },
        ],
      },
    ],
  },
  {
    id: 'tec-bil',
    name: 'Billing / Cobrança',
    icon: '🧾',
    processes: [
      {
        id: 'tec-bil-rec',
        name: 'Cobrança Recorrente',
        subprocesses: [
          { id: 'tec-bil-01', code: 'TEC-BIL-01', name: 'Gerar fatura recorrente (MRR)',         process: 'Cobrança Recorrente',      macroprocess: 'Billing / Cobrança',     category: 'SaaS Billing' },
          { id: 'tec-bil-02', code: 'TEC-BIL-02', name: 'Processar pagamento / falha',           process: 'Cobrança Recorrente',      macroprocess: 'Billing / Cobrança',     category: 'SaaS Billing' },
          { id: 'tec-bil-03', code: 'TEC-BIL-03', name: 'Gerenciar upgrade / downgrade de plano', process: 'Cobrança Recorrente',     macroprocess: 'Billing / Cobrança',     category: 'SaaS Billing' },
        ],
      },
    ],
  },
];

// ── Telecom ───────────────────────────────────────────────────────────────────

const telecomMacroprocesses: Macroprocess[] = [
  {
    id: 'tel-at',
    name: 'Ativação de Serviços',
    icon: '📡',
    processes: [
      {
        id: 'tel-at-lin',
        name: 'Ativação de Linha',
        subprocesses: [
          { id: 'tel-at-01', code: 'TEL-AT-01', name: 'Ativar linha / SIM card',                 process: 'Ativação de Linha',        macroprocess: 'Ativação de Serviços',   category: 'Service Activation' },
          { id: 'tel-at-02', code: 'TEL-AT-02', name: 'Configurar plano e serviços adicionais',  process: 'Ativação de Linha',        macroprocess: 'Ativação de Serviços',   category: 'Service Activation' },
          { id: 'tel-at-03', code: 'TEL-AT-03', name: 'Validar ativação e notificar cliente',    process: 'Ativação de Linha',        macroprocess: 'Ativação de Serviços',   category: 'Service Activation' },
        ],
      },
    ],
  },
  {
    id: 'tel-port',
    name: 'Portabilidade',
    icon: '🔄',
    processes: [
      {
        id: 'tel-port-sol',
        name: 'Processamento de Portabilidade',
        subprocesses: [
          { id: 'tel-port-01', code: 'TEL-PRT-01', name: 'Receber solicitação de portabilidade', process: 'Processamento de Portabilidade', macroprocess: 'Portabilidade',       category: 'Number Portability' },
          { id: 'tel-port-02', code: 'TEL-PRT-02', name: 'Validar elegibilidade e documentação', process: 'Processamento de Portabilidade', macroprocess: 'Portabilidade',       category: 'Number Portability' },
          { id: 'tel-port-03', code: 'TEL-PRT-03', name: 'Confirmar portabilidade no sistema',   process: 'Processamento de Portabilidade', macroprocess: 'Portabilidade',       category: 'Number Portability' },
        ],
      },
    ],
  },
  {
    id: 'tel-cob',
    name: 'Cobrança e Faturamento',
    icon: '📋',
    processes: [
      {
        id: 'tel-cob-fat',
        name: 'Geração de Faturas',
        subprocesses: [
          { id: 'tel-cob-01', code: 'TEL-COB-01', name: 'Gerar fatura mensal do cliente',        process: 'Geração de Faturas',       macroprocess: 'Cobrança e Faturamento', category: 'Telecom Billing' },
          { id: 'tel-cob-02', code: 'TEL-COB-02', name: 'Enviar fatura por e-mail / app',        process: 'Geração de Faturas',       macroprocess: 'Cobrança e Faturamento', category: 'Telecom Billing' },
          { id: 'tel-cob-03', code: 'TEL-COB-03', name: 'Processar débito automático',           process: 'Geração de Faturas',       macroprocess: 'Cobrança e Faturamento', category: 'Telecom Billing' },
        ],
      },
    ],
  },
];

// ── Setor Público ─────────────────────────────────────────────────────────────

const setorPublicoMacroprocesses: Macroprocess[] = [
  {
    id: 'gov-lic',
    name: 'Licitações e Contratos',
    icon: '🏛️',
    processes: [
      {
        id: 'gov-lic-edi',
        name: 'Processo Licitatório',
        subprocesses: [
          { id: 'gov-lic-01', code: 'GOV-LIC-01', name: 'Publicar edital de licitação',          process: 'Processo Licitatório',     macroprocess: 'Licitações e Contratos', category: 'Public Procurement' },
          { id: 'gov-lic-02', code: 'GOV-LIC-02', name: 'Receber e analisar propostas',          process: 'Processo Licitatório',     macroprocess: 'Licitações e Contratos', category: 'Public Procurement' },
          { id: 'gov-lic-03', code: 'GOV-LIC-03', name: 'Homologar e publicar resultado',        process: 'Processo Licitatório',     macroprocess: 'Licitações e Contratos', category: 'Public Procurement' },
        ],
      },
      {
        id: 'gov-lic-cont',
        name: 'Gestão de Contratos Públicos',
        subprocesses: [
          { id: 'gov-lic-04', code: 'GOV-LIC-04', name: 'Formalizar contrato administrativo',    process: 'Gestão de Contratos Públicos', macroprocess: 'Licitações e Contratos', category: 'Public Procurement' },
          { id: 'gov-lic-05', code: 'GOV-LIC-05', name: 'Monitorar execução contratual',         process: 'Gestão de Contratos Públicos', macroprocess: 'Licitações e Contratos', category: 'Public Procurement' },
        ],
      },
    ],
  },
  {
    id: 'gov-cid',
    name: 'Atendimento ao Cidadão',
    icon: '👥',
    processes: [
      {
        id: 'gov-cid-sol',
        name: 'Gestão de Solicitações',
        subprocesses: [
          { id: 'gov-cid-01', code: 'GOV-CID-01', name: 'Receber e protocolar solicitação',      process: 'Gestão de Solicitações',   macroprocess: 'Atendimento ao Cidadão', category: 'Citizen Services' },
          { id: 'gov-cid-02', code: 'GOV-CID-02', name: 'Encaminhar para área competente',       process: 'Gestão de Solicitações',   macroprocess: 'Atendimento ao Cidadão', category: 'Citizen Services' },
          { id: 'gov-cid-03', code: 'GOV-CID-03', name: 'Registrar resposta e encerrar',         process: 'Gestão de Solicitações',   macroprocess: 'Atendimento ao Cidadão', category: 'Citizen Services' },
        ],
      },
    ],
  },
  {
    id: 'gov-prot',
    name: 'Gestão de Protocolos',
    icon: '📁',
    processes: [
      {
        id: 'gov-prot-rec',
        name: 'Protocolo de Documentos',
        subprocesses: [
          { id: 'gov-prot-01', code: 'GOV-PRT-01', name: 'Protocolar documento ou processo',     process: 'Protocolo de Documentos',  macroprocess: 'Gestão de Protocolos',   category: 'Document Management' },
          { id: 'gov-prot-02', code: 'GOV-PRT-02', name: 'Distribuir e despachar para área',     process: 'Protocolo de Documentos',  macroprocess: 'Gestão de Protocolos',   category: 'Document Management' },
          { id: 'gov-prot-03', code: 'GOV-PRT-03', name: 'Arquivar processo concluído',          process: 'Protocolo de Documentos',  macroprocess: 'Gestão de Protocolos',   category: 'Document Management' },
        ],
      },
    ],
  },
];

// ── Industry definitions ───────────────────────────────────────────────────────

export const INDUSTRIES: Industry[] = [
  {
    id: 'manufatura',
    name: 'Manufatura',
    macroprocesses: manufaturaMacroprocesses,
  },
  {
    id: 'varejo',
    name: 'Varejo',
    macroprocesses: varejoMacroprocesses,
  },
  {
    id: 'bancos',
    name: 'Bancos / Instituições Financeiras',
    macroprocesses: bancosMacroprocesses,
  },
  {
    id: 'servicos-bpo',
    name: 'Serviços / BPO',
    macroprocesses: servicosBpoMacroprocesses,
  },
  {
    id: 'saude',
    name: 'Saúde',
    macroprocesses: saudeMacroprocesses,
  },
  {
    id: 'logistica',
    name: 'Logística / Transporte',
    macroprocesses: logisticaMacroprocesses,
  },
  {
    id: 'seguros',
    name: 'Seguros',
    macroprocesses: segurosMacroprocesses,
  },
  {
    id: 'tecnologia',
    name: 'Tecnologia / SaaS',
    macroprocesses: tecnologiaMacroprocesses,
  },
  {
    id: 'telecom',
    name: 'Telecom',
    macroprocesses: telecomMacroprocesses,
  },
  {
    id: 'setor-publico',
    name: 'Setor Público',
    macroprocesses: setorPublicoMacroprocesses,
  },
];

// ── Helper functions ───────────────────────────────────────────────────────────

/**
 * Returns the full list of macroprocesses for a given industry:
 * base (cross-industry) macroprocesses + industry-specific ones.
 *
 * Pass `null` or an unknown id to get only the base macroprocesses.
 */
export function getMacroprocessesForIndustry(industryId: string | null): Macroprocess[] {
  const industry = INDUSTRIES.find((i) => i.id === industryId);
  return [...processLibrary, ...(industry?.macroprocesses ?? [])];
}

/**
 * Returns every macroprocess — base + all industry-specific ones combined.
 * Useful for lookup functions that must resolve any subprocess id.
 */
export function getAllMacroprocesses(): Macroprocess[] {
  const industryMacros = INDUSTRIES.flatMap((i) => i.macroprocesses);
  return [...processLibrary, ...industryMacros];
}

/**
 * Finds and returns the full context (macroprocess + process + subprocess)
 * for a given subprocess id across the entire combined library.
 *
 * Drop-in replacement for local `lookupSubprocess` functions used in the
 * diagnostic pages, extended to cover industry-specific subprocesses.
 *
 * Returns `null` if not found.
 */
export function lookupSubprocessById(subprocessId: string): {
  macroprocess: Macroprocess;
  process: Process;
  subprocess: Subprocess;
} | null {
  for (const macro of getAllMacroprocesses()) {
    for (const process of macro.processes) {
      for (const subprocess of process.subprocesses) {
        if (subprocess.id === subprocessId) {
          return { macroprocess: macro, process, subprocess };
        }
      }
    }
  }
  return null;
}
