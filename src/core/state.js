const STORAGE_KEYS = {
    config: 'zoom_config',
    estoque: 'zoom_estoque',
    pedidos: 'zoom_pedidos',
    historico: 'zoom_historico',
    galeria: 'zoom_galeria',
};

const defaultConfig = {
    watts: 150,
    kwh: 1.25,
    maquinaPreco: 3500,
    vidaUtil: 5000,
    custoKgPadrao: 100,
    maoDeObra: 15,
};

const defaultEstoque = [
    { id: 1, nome: 'Filamento PLA Branco', categoria: 'Filamento', qtdTotal: 1000, custoTotal: 90 },
    { id: 2, nome: 'Corrente para Chaveiro', categoria: 'Insumo', qtdTotal: 100, custoTotal: 20 },
    { id: 3, nome: 'Caixa de Embalagem', categoria: 'Insumo', qtdTotal: 50, custoTotal: 45 },
];

function load(key, fallback) {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
}

export const state = {
    config: load(STORAGE_KEYS.config, defaultConfig),
    estoque: load(STORAGE_KEYS.estoque, defaultEstoque),
    pedidos: load(STORAGE_KEYS.pedidos, []),
    historico: load(STORAGE_KEYS.historico, []),
    galeria: load(STORAGE_KEYS.galeria, []),
    insumosVinculados: [],
};

export function saveConfig() {
    localStorage.setItem(STORAGE_KEYS.config, JSON.stringify(state.config));
}

export function saveEstoque() {
    localStorage.setItem(STORAGE_KEYS.estoque, JSON.stringify(state.estoque));
}

export function savePedidos() {
    localStorage.setItem(STORAGE_KEYS.pedidos, JSON.stringify(state.pedidos));
}

export function saveHistorico() {
    localStorage.setItem(STORAGE_KEYS.historico, JSON.stringify(state.historico));
}

export function saveGaleria() {
    localStorage.setItem(STORAGE_KEYS.galeria, JSON.stringify(state.galeria));
}

export function clearPedidos() {
    state.pedidos = [];
    localStorage.removeItem(STORAGE_KEYS.pedidos);
}
