import dashboardHtml from './dashboard.html?raw';
import { state } from '../../core/state.js';
import { Chart } from 'chart.js/auto';

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const COR_ACCENT = '#8b5cf6';
const COR_GRID = 'rgba(255,255,255,0.06)';
const COR_TEXTO = '#9ca3af';
const CORES_PIZZA = ['#8b5cf6', '#06b6d4', '#f59e0b', '#22c55e', '#ef4444', '#3b82f6', '#ec4899'];

function pad2(n) {
    return String(n).padStart(2, '0');
}

function parseDataBR(str) {
    if (!str || typeof str !== 'string') return null;
    const [d, m, y] = str.split('/').map(Number);
    if (!d || !m || !y) return null;
    return new Date(y, m - 1, d);
}

function dataDoPedido(p) {
    return parseDataBR(p.dataEnvio) || parseDataBR(p.data);
}

function getPeriodos() {
    const anoAtual = new Date().getFullYear();
    const periodos = [
        { id: '7d', label: '7 dias', tipo: 'dias', valor: 7 },
        { id: '30d', label: '30 dias', tipo: 'dias', valor: 30 },
        { id: '6m', label: '6 meses', tipo: 'meses', valor: 6 },
        { id: '12m', label: '12 meses', tipo: 'meses', valor: 12 },
    ];
    for (let i = 0; i < 5; i += 1) {
        const ano = anoAtual - i;
        periodos.push({ id: `ano-${ano}`, label: String(ano), tipo: 'ano', valor: ano });
    }
    return periodos;
}

function getIntervalo(periodo) {
    const hoje = new Date();
    const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59, 999);

    if (periodo.tipo === 'dias') {
        const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - (periodo.valor - 1));
        return { inicio, fim: fimHoje, granularidade: 'dia' };
    }

    if (periodo.tipo === 'meses') {
        const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - periodo.valor, hoje.getDate());
        return { inicio, fim: fimHoje, granularidade: 'mes' };
    }

    const inicio = new Date(periodo.valor, 0, 1);
    const fim = new Date(periodo.valor, 11, 31, 23, 59, 59, 999);
    return { inicio, fim, granularidade: 'mes' };
}

function chaveDia(d) {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function chaveMes(d) {
    return `${d.getFullYear()}-${d.getMonth()}`;
}

function construirBaldes(inicio, fim, granularidade) {
    const baldes = [];

    if (granularidade === 'dia') {
        const cursor = new Date(inicio);
        while (cursor <= fim) {
            baldes.push({ chave: chaveDia(cursor), label: `${pad2(cursor.getDate())}/${pad2(cursor.getMonth() + 1)}` });
            cursor.setDate(cursor.getDate() + 1);
        }
        return baldes;
    }

    const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    const fimMes = new Date(fim.getFullYear(), fim.getMonth(), 1);
    while (cursor <= fimMes) {
        baldes.push({ chave: chaveMes(cursor), label: `${MESES_ABREV[cursor.getMonth()]}/${String(cursor.getFullYear()).slice(2)}` });
        cursor.setMonth(cursor.getMonth() + 1);
    }
    return baldes;
}

function formatBRL(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function nomeCliente(p) {
    return typeof p.clienteNome === 'string' ? p.clienteNome.trim() : '';
}

function top7PorMapa(mapa) {
    return Object.entries(mapa)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7);
}

function renderRanking(container, itens, formatarValor) {
    if (itens.length === 0) {
        container.innerHTML = '<p class="text-xs text-gray-500">Sem dados para este período.</p>';
        return;
    }

    container.innerHTML = itens
        .map(
            ([nome, valor], i) => `
                <div class="flex items-center justify-between gap-2 text-xs">
                    <span class="flex items-center gap-2 text-gray-300 truncate">
                        <span class="w-4 text-gray-500 font-mono">${i + 1}º</span>
                        <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${CORES_PIZZA[i % CORES_PIZZA.length]}"></span>
                        <span class="truncate">${nome}</span>
                    </span>
                    <span class="text-gray-400 font-mono shrink-0">${formatarValor(valor)}</span>
                </div>
            `
        )
        .join('');
}

function dadosPizza(itens) {
    return {
        labels: itens.map(([nome]) => nome),
        datasets: [
            {
                data: itens.map(([, valor]) => valor),
                backgroundColor: itens.map((_, i) => CORES_PIZZA[i % CORES_PIZZA.length]),
                borderColor: '#111827',
                borderWidth: 2,
            },
        ],
    };
}

export function mountDashboardPage(container, { onVoltar } = {}) {
    container.innerHTML = dashboardHtml;

    const periodosEl = container.querySelector('#dash-periodos');
    const qtdPedidosEl = container.querySelector('#dash-qtd-pedidos');
    const valorTotalEl = container.querySelector('#dash-valor-total');
    const valorTotalToggleEl = container.querySelector('#dash-valor-total-toggle');
    const produtoTopEl = container.querySelector('#dash-produto-top');
    const produtoTopQtdEl = container.querySelector('#dash-produto-top-qtd');
    const vazioEl = container.querySelector('#dash-vazio');
    const canvasFaturamento = container.querySelector('#dash-chart-faturamento');
    const canvasHoras = container.querySelector('#dash-chart-horas');
    const canvasProdutos = container.querySelector('#dash-chart-produtos');
    const canvasClientes = container.querySelector('#dash-chart-clientes');
    const rankingProdutosEl = container.querySelector('#dash-ranking-produtos');
    const rankingClientesEl = container.querySelector('#dash-ranking-clientes');
    const cardClientesEl = container.querySelector('#dash-card-clientes');

    container.querySelector('#dash-voltar').addEventListener('click', () => onVoltar && onVoltar());

    let periodoAtivoId = '30d';
    let chartFaturamento = null;
    let chartHoras = null;
    let chartProdutos = null;
    let chartClientes = null;
    let valorTotalOculto = true;
    let valorTotalAtual = 0;

    function renderValorTotal() {
        valorTotalEl.innerText = valorTotalOculto ? '••••••' : formatBRL(valorTotalAtual);
        valorTotalToggleEl.querySelector('i').className = `fa-solid ${valorTotalOculto ? 'fa-eye-slash' : 'fa-eye'}`;
    }

    valorTotalToggleEl.addEventListener('click', () => {
        valorTotalOculto = !valorTotalOculto;
        renderValorTotal();
    });

    function renderBotoesPeriodo() {
        periodosEl.innerHTML = getPeriodos()
            .map(
                (periodo) => `
                    <button
                        data-periodo="${periodo.id}"
                        class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                            periodo.id === periodoAtivoId
                                ? 'bg-accent/20 text-accent border-accent/40'
                                : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
                        }"
                    >${periodo.label}</button>
                `
            )
            .join('');

        periodosEl.querySelectorAll('[data-periodo]').forEach((btn) => {
            btn.addEventListener('click', () => {
                periodoAtivoId = btn.dataset.periodo;
                render();
            });
        });
    }

    function render() {
        renderBotoesPeriodo();

        const periodo = getPeriodos().find((p) => p.id === periodoAtivoId);
        const { inicio, fim, granularidade } = getIntervalo(periodo);

        const filtrados = state.historico.filter((p) => {
            const data = dataDoPedido(p);
            return data && data >= inicio && data <= fim;
        });

        vazioEl.classList.toggle('hidden', filtrados.length > 0);

        qtdPedidosEl.innerText = filtrados.length;

        valorTotalAtual = filtrados.reduce((soma, p) => soma + (p.custoTotal || 0), 0);
        renderValorTotal();

        const qtdPorProduto = {};
        const valorPorCliente = {};
        filtrados.forEach((p) => {
            qtdPorProduto[p.nome] = (qtdPorProduto[p.nome] || 0) + (p.qtd || 0);
            const cliente = nomeCliente(p);
            if (cliente) {
                valorPorCliente[cliente] = (valorPorCliente[cliente] || 0) + (p.custoTotal || 0);
            }
        });

        const top7Produtos = top7PorMapa(qtdPorProduto);
        if (top7Produtos.length > 0) {
            produtoTopEl.innerText = top7Produtos[0][0];
            produtoTopQtdEl.innerText = `${top7Produtos[0][1]} un vendidas`;
        } else {
            produtoTopEl.innerText = '-';
            produtoTopQtdEl.innerText = '0 un vendidas';
        }

        renderRanking(rankingProdutosEl, top7Produtos, (v) => `${v} un`);
        if (chartProdutos) {
            chartProdutos.data = dadosPizza(top7Produtos);
            chartProdutos.update();
        } else {
            chartProdutos = new Chart(canvasProdutos, {
                type: 'pie',
                data: dadosPizza(top7Produtos),
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
            });
        }

        const top7Clientes = top7PorMapa(valorPorCliente);
        cardClientesEl.classList.toggle('hidden', top7Clientes.length === 0);
        if (top7Clientes.length > 0) {
            renderRanking(rankingClientesEl, top7Clientes, (v) => formatBRL(v));
            if (chartClientes) {
                chartClientes.data = dadosPizza(top7Clientes);
                chartClientes.update();
            } else {
                chartClientes = new Chart(canvasClientes, {
                    type: 'pie',
                    data: dadosPizza(top7Clientes),
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
                });
            }
        }

        const baldes = construirBaldes(inicio, fim, granularidade);
        const valoresPorBalde = new Map(baldes.map((b) => [b.chave, 0]));
        filtrados.forEach((p) => {
            const data = dataDoPedido(p);
            const chave = granularidade === 'dia' ? chaveDia(data) : chaveMes(data);
            if (valoresPorBalde.has(chave)) {
                valoresPorBalde.set(chave, valoresPorBalde.get(chave) + (p.custoTotal || 0));
            }
        });

        const dadosFaturamento = {
            labels: baldes.map((b) => b.label),
            datasets: [
                {
                    label: 'Faturamento (R$)',
                    data: baldes.map((b) => valoresPorBalde.get(b.chave)),
                    backgroundColor: COR_ACCENT,
                    borderRadius: 4,
                },
            ],
        };

        const horas = new Array(24).fill(0);
        filtrados.forEach((p) => {
            if (typeof p.id === 'number') {
                horas[new Date(p.id).getHours()] += 1;
            }
        });

        const dadosHoras = {
            labels: horas.map((_, h) => `${pad2(h)}h`),
            datasets: [
                {
                    label: 'Pedidos criados',
                    data: horas,
                    backgroundColor: '#a855f7',
                    borderRadius: 4,
                },
            ],
        };

        const opcoesComuns = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: COR_TEXTO, autoSkip: true, maxRotation: 0 }, grid: { color: COR_GRID } },
                y: { ticks: { color: COR_TEXTO }, grid: { color: COR_GRID }, beginAtZero: true },
            },
        };

        if (chartFaturamento) {
            chartFaturamento.data = dadosFaturamento;
            chartFaturamento.update();
        } else {
            chartFaturamento = new Chart(canvasFaturamento, { type: 'bar', data: dadosFaturamento, options: opcoesComuns });
        }

        if (chartHoras) {
            chartHoras.data = dadosHoras;
            chartHoras.update();
        } else {
            chartHoras = new Chart(canvasHoras, { type: 'bar', data: dadosHoras, options: opcoesComuns });
        }
    }

    render();

    return { refresh: render };
}
