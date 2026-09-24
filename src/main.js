import { mountHeader } from './components/header/header.js';
import { mountModalEstoque } from './components/modal-estoque/modal-estoque.js';
import { mountModalBackup } from './components/modal-backup/modal-backup.js';
import { mountCalculadoraPage } from './pages/calculadora/calculadora.js';
import { mountAcompanhamentoPage } from './pages/acompanhamento/acompanhamento.js';
import { mountHistoricoPage } from './pages/historico/historico.js';
import { mountGaleriaPage } from './pages/galeria/galeria.js';
import { mountEstoquePage } from './pages/estoque/estoque.js';
import { mountAjustesPage } from './pages/ajustes/ajustes.js';
import { mountDashboardPage } from './pages/dashboard/dashboard.js';
import { mountClientesPage } from './pages/clientes/clientes.js';
import { mountModalCliente } from './components/modal-cliente/modal-cliente.js';

const TAB_IDS = ['calc', 'galeria', 'acompanhamento', 'historico', 'clientes', 'estoque', 'ajustes', 'dashboard'];

const pageOutlet = document.querySelector('#page-outlet');
const pageContainers = {};
TAB_IDS.forEach((tabId) => {
    const div = document.createElement('div');
    div.id = `page-${tabId}`;
    div.classList.add('page-content', 'hidden');
    pageOutlet.appendChild(div);
    pageContainers[tabId] = div;
});

function switchTab(tabId) {
    TAB_IDS.forEach((id) => pageContainers[id].classList.toggle('hidden', id !== tabId));
    header.setActive(tabId);

    if (tabId === 'calc') calculadoraPage.refreshSelects();
    if (tabId === 'galeria') galeriaPage.refresh();
    if (tabId === 'acompanhamento') acompanhamentoPage.refresh();
    if (tabId === 'historico') historicoPage.refresh();
    if (tabId === 'clientes') clientesPage.refresh();
    if (tabId === 'estoque') estoquePage.refresh();
    if (tabId === 'ajustes') ajustesPage.refresh();
    if (tabId === 'dashboard') dashboardPage.refresh();
}

const header = mountHeader(document.querySelector('#app-header'), switchTab);

const modalEstoque = mountModalEstoque(document.querySelector('#modal-outlet'), () => {
    estoquePage.refresh();
    calculadoraPage.refreshSelects();
});

const calculadoraPage = mountCalculadoraPage(pageContainers.calc, {
    onGotoEstoque: () => switchTab('estoque'),
    onPedidoSalvo: () => switchTab('acompanhamento'),
});

function abrirPedidoNaCalculadora(pedido) {
    switchTab('calc');
    calculadoraPage.loadPedido(pedido);
}

const galeriaPage = mountGaleriaPage(pageContainers.galeria, {
    onCriarPedido: (item) => {
        switchTab('calc');
        calculadoraPage.carregarModelo(item);
    },
});

const modalBackup = mountModalBackup(document.querySelector('#modal-backup-outlet'), () => {
    acompanhamentoPage.refresh();
    historicoPage.refresh();
});

const acompanhamentoPage = mountAcompanhamentoPage(pageContainers.acompanhamento, {
    onSalvoHistorico: () => switchTab('historico'),
    onAbrirPedido: abrirPedidoNaCalculadora,
});

const historicoPage = mountHistoricoPage(pageContainers.historico, {
    onAbrirPedido: abrirPedidoNaCalculadora,
    onAbrirBackup: () => modalBackup.open(),
    onAbrirDashboard: () => switchTab('dashboard'),
});

const dashboardPage = mountDashboardPage(pageContainers.dashboard, {
    onVoltar: () => switchTab('historico'),
});

const estoquePage = mountEstoquePage(pageContainers.estoque, {
    onAbrirModal: () => modalEstoque.open(),
    onEditarItem: (item) => modalEstoque.open(item),
});

const modalCliente = mountModalCliente(document.querySelector('#modal-cliente-outlet'), () => {
    clientesPage.refresh();
});

const clientesPage = mountClientesPage(pageContainers.clientes, {
    onAbrirModal: () => modalCliente.open(),
    onEditarCliente: (cliente) => modalCliente.open(cliente),
});

const ajustesPage = mountAjustesPage(pageContainers.ajustes);

switchTab('calc');
