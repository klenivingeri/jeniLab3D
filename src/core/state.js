const STORAGE_KEYS = {
    config: 'zoom_config',
    estoque: 'zoom_estoque',
    pedidos: 'zoom_pedidos',
    historico: 'zoom_historico',
    galeria: 'zoom_galeria',
    clientes: 'zoom_clientes',
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

const MIGRACAO_STATUS_PEDIDO = {
    Finalizado: 'EmProcessamento',
    Enviado: 'Finalizado',
};

function migrarStatusPedidos(pedidos) {
    return pedidos.map((p) =>
        MIGRACAO_STATUS_PEDIDO[p.status] ? { ...p, status: MIGRACAO_STATUS_PEDIDO[p.status] } : p
    );
}

export const state = {
    config: load(STORAGE_KEYS.config, defaultConfig),
    estoque: load(STORAGE_KEYS.estoque, defaultEstoque),
    pedidos: migrarStatusPedidos(load(STORAGE_KEYS.pedidos, [])),
    historico: load(STORAGE_KEYS.historico, []),
    galeria: load(STORAGE_KEYS.galeria, []),
    clientes: load(STORAGE_KEYS.clientes, []),
    insumosVinculados: [],
};

localStorage.setItem(STORAGE_KEYS.pedidos, JSON.stringify(state.pedidos));

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

export function saveClientes() {
    localStorage.setItem(STORAGE_KEYS.clientes, JSON.stringify(state.clientes));
}

export function upsertClienteDoPedido({ clienteNome, clienteTelefone, clienteCep, clienteRua, clienteNumero, clienteBairro }) {
    const nome = (clienteNome || '').trim();
    if (!nome) return;

    const chave = nome.toLowerCase();
    const existente = state.clientes.find((c) => c.nome.trim().toLowerCase() === chave);
    const dados = {
        nome,
        telefone: clienteTelefone || existente?.telefone || '',
        cep: clienteCep || existente?.cep || '',
        rua: clienteRua || existente?.rua || '',
        numero: clienteNumero || existente?.numero || '',
        bairro: clienteBairro || existente?.bairro || '',
    };

    if (existente) {
        state.clientes = state.clientes.map((c) => (c.id === existente.id ? { ...c, ...dados } : c));
    } else {
        state.clientes = [...state.clientes, { id: Date.now(), ...dados }];
    }

    saveClientes();
}
