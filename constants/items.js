const tunagem = [
  {
    label: "Motor 1 🔧",
    description: "Motor Nível 1",
    value: "motor_1",
  },
  {
    label: "Motor 2 🔧",
    description: "Motor Nível 2",
    value: "motor_2",
  },
  {
    label: "Motor 3 🔧",
    description: "Motor Nível 3",
    value: "motor_3",
  },
  {
    label: "Motor 4 🔧",
    description: "Motor Nível 4",
    value: "motor_4",
  },
  {
    label: "Transmissão 1 ⚙️",
    description: "Transmissão Nível 1",
    value: "transmissao_1",
  },
  {
    label: "Transmissão 2 ⚙️",
    description: "Transmissão Nível 2",
    value: "transmissao_2",
  },
  {
    label: "Transmissão 3 ⚙️",
    description: "Transmissão Nível 3",
    value: "transmissao_3",
  },
  {
    label: "Transmissão 4 ⚙️",
    description: "Transmissão Nível 4",
    value: "transmissao_4",
  },
  {
    label: "Freio 1 ⛔",
    description: "Freio Nível 1",
    value: "freio_1",
  },
  {
    label: "Freio 2 ⛔",
    description: "Freio Nível 2",
    value: "freio_2",
  },
  {
    label: "Freio 3 ⛔",
    description: "Freio Nível 3",
    value: "freio_3",
  },
  { 
    label: "Turbo 💨", 
    description: "Turbo Boost", 
    value: "turbo" 
  },
  {
    label: "Suspensão 1 🏎️",
    description: "Suspensão Nível 1",
    value: "suspensao_1",
  },
  {
    label: "Suspensão 2 🏎️",
    description: "Suspensão Nível 2",
    value: "suspensao_2",
  },
  {
    label: "Suspensão 3 🏎️",
    description: "Suspensão Nível 3",
    value: "suspensao_3",
  },
  {
    label: "Suspensão 4 🏎️",
    description: "Suspensão Nível 4",
    value: "suspensao_4",
  },
  {
    label: "Suspensão 5 🏎️",
    description: "Suspensão Nível 5",
    value: "suspensao_5",
  },
  {
    label: "Blindagem 20% 💎",
    description: "Blindagem 20%",
    value: "blindagem_20",
  },
  {
    label: "Blindagem 40% 💎",
    description: "Blindagem 40%",
    value: "blindagem_40",
  },
  {
    label: "Blindagem 60% 💎",
    description: "Blindagem 60%",
    value: "blindagem_60",
  },
  {
    label: "Blindagem 80% 💎",
    description: "Blindagem 80%",
    value: "blindagem_80",
  },
  {
    label: "Blindagem 100% 💎",
    description: "Blindagem 100%",
    value: "blindagem_100",
  },
];

const itensIlegais = [
  {
    label: "Drogas 🚬",
    description: "Para catalogar drogas compradas ou vendidas",
    value: "drogas",
  },
  {
    label: "Armas 🔫",
    description: "Para catalogar armas compradas ou vendidas",
    value: "armas",
  },
  {
    label: "Munição 🔫",
    description: "Para catalogar munições",
    value: "municao",
  },
  {
    label: "Placas 🪧",
    description: "Para catalogar placas vendidas",
    value: "placas",
  },
  {
    label: "MasterPick 🪛",
    description: "Para catalogar MasterPick vendidos",
    value: "masterpick",
  },
  {
    label: "Itens Ilegais 📦",
    description: "Para catalogar itens ilegais comprados",
    value: "itens_ilegais",
  },
  {
    label: "Dinheiro Sujo 💸",
    description: "Para catalogar dinheiro sujo",
    value: "dinheiro_sujo",
  },
];

const tipoItens = [
  { label: "AK-47", value: "ak-47" },
  { label: "M-TAR", value: "m-tar" },
  { label: "G3", value: "g3" },
  { label: "Five-Seven", value: "five-seven" },
  { label: "Thompson", value: "thompson" },
  { label: "Munição 5mm", value: "municao-5mm" },
  { label: "Munição 9mm", value: "municao-9mm" },
  { label: "Munição 762mm", value: "municao-762mm" },
  { label: "Farinha", value: "farinha" },
  { label: "Meta", value: "meta" },
  { label: "Erva", value: "erva" },
  { label: "Skunk", value: "skunk" },
  { label: "Rapé", value: "rape" },
  { label: "Lança-perfume", value: "lanca-perfume" },
  { label: "Viagra", value: "viagra" },
  { label: "Balinha", value: "balinha" },
  { label: "Flipper MK1", value: "flipper-mk1" },
  { label: "Flipper MK2", value: "flipper-mk2" },
  { label: "Flipper MK3", value: "flipper-mk3" },
  { label: "Flipper MK4", value: "flipper-mk4" },
  { label: "Flipper MK5", value: "flipper-mk5" },
  { label: "Chave de Ouro", value: "chave-de-ouro" },
  { label: "Chave de Platina", value: "chave-de-platina" },
];

// Constantes de timeout e configurações
const TIMEOUTS = {
  INTERACTION: 60_000,
  MODAL: 120_000,
  MENU: 30_000,
  IMAGE: 120_000,
  DELETE_DELAY: 10_000,
};

// Constantes de roles e canais
const ROLES = {
  MEMBRO: "🧰 | Membro Benny's",
  GERENTE: "🧰 | Gerente",
};

const CHANNELS = {
  CATEGORIA_ID: "1324201838190399488",
  LOGS: "bot-logs",
  RECEBIMENTO: "📦-recebimento-de-carga",
};

module.exports = {
  tunagem,
  itensIlegais,
  tipoItens,
  TIMEOUTS,
  ROLES,
  CHANNELS,
}; 