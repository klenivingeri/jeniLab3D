import { mountHeader } from './components/header/header.js';
import { mountModalEstoque } from './components/modal-estoque/modal-estoque.js';
import { mountCalculadoraPage } from './pages/calculadora/calculadora.js';
import { mountAcompanhamentoPage } from './pages/acompanhamento/acompanhamento.js';
import { mountHistoricoPage } from './pages/historico/historico.js';
import { mountGaleriaPage } from './pages/galeria/galeria.js';
import { mountEstoquePage } from './pages/estoque/estoque.js';
import { mountAjustesPage } from './pages/ajustes/ajustes.js';

const TAB_IDS = ['calc', 'galeria', 'acompanhamento', 'historico', 'estoque', 'ajustes'];

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
    if (tabId === 'estoque') estoquePage.refresh();
    if (tabId === 'ajustes') ajustesPage.refresh();
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

const acompanhamentoPage = mountAcompanhamentoPage(pageContainers.acompanhamento, {
    onSalvoHistorico: () => switchTab('historico'),
    onAbrirPedido: abrirPedidoNaCalculadora,
});

const historicoPage = mountHistoricoPage(pageContainers.historico, {
    onAbrirPedido: abrirPedidoNaCalculadora,
});

const estoquePage = mountEstoquePage(pageContainers.estoque, {
    onAbrirModal: () => modalEstoque.open(),
    onEditarItem: (item) => modalEstoque.open(item),
});

const ajustesPage = mountAjustesPage(pageContainers.ajustes);

switchTab('calc');
