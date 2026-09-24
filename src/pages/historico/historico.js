import historicoHtml from './historico.html?raw';
import { state, saveHistorico } from '../../core/state.js';

export function mountHistoricoPage(container, { onAbrirPedido } = {}) {
    container.innerHTML = historicoHtml;

    const listaEl = container.querySelector('#lista-historico');
    const buscaEl = container.querySelector('#hist-busca-data');
    const modalExcluir = container.querySelector('#hist-modal-excluir');
    const modalTexto = container.querySelector('#hist-modal-texto');
    const confirmaInput = container.querySelector('#hist-confirma-input');
    const confirmaBtn = container.querySelector('#hist-modal-confirmar');

    let idPendenteExclusao = null;

    function abrirModalExclusao(id) {
        idPendenteExclusao = id;
        modalTexto.innerHTML =
            id === 'ALL'
                ? 'Essa ação vai apagar <strong class="text-red-400">todo</strong> o histórico de vendas permanentemente e pode afetar as métricas usadas para popular os gráficos de vendas. Para confirmar, digite <strong class="text-red-400">DELETAR</strong> no campo abaixo.'
                : 'Essa ação é permanente e pode afetar as métricas usadas para popular os gráficos de vendas. Para confirmar, digite <strong class="text-red-400">DELETAR</strong> no campo abaixo.';
        confirmaInput.value = '';
        confirmaBtn.disabled = true;
        confirmaBtn.classList.add('cursor-not-allowed');
        modalExcluir.classList.remove('hidden');
        modalExcluir.classList.add('flex');
        confirmaInput.focus();
    }

    function fecharModalExclusao() {
        idPendenteExclusao = null;
        modalExcluir.classList.remove('flex');
        modalExcluir.classList.add('hidden');
    }

    confirmaInput.addEventListener('input', () => {
        const habilitado = confirmaInput.value.trim() === 'DELETAR';
        confirmaBtn.disabled = !habilitado;
        confirmaBtn.classList.toggle('cursor-not-allowed', !habilitado);
        confirmaBtn.classList.toggle('bg-red-500/30', !habilitado);
        confirmaBtn.classList.toggle('text-red-300', !habilitado);
        confirmaBtn.classList.toggle('bg-red-500', habilitado);
        confirmaBtn.classList.toggle('text-white', habilitado);
    });

    container.querySelector('#hist-modal-cancelar').addEventListener('click', fecharModalExclusao);

    confirmaBtn.addEventListener('click', () => {
        if (confirmaInput.value.trim() !== 'DELETAR' || idPendenteExclusao === null) return;

        if (idPendenteExclusao === 'ALL') {
            state.historico = [];
        } else {
            state.historico = state.historico.filter((p) => p.id !== idPendenteExclusao);
        }

        saveHistorico();
        fecharModalExclusao();
        render();
    });

    function cardHistorico(p) {
        return `
            <div data-abrir-historico="${p.id}" class="bg-darkcard border border-gray-800 rounded-xl p-4 space-y-2 shadow cursor-pointer hover:border-accent/50 transition">
                <div class="flex justify-between items-start">
                    <h4 class="text-white font-semibold text-sm">${p.nome}</h4>
                    <button data-remover-historico="${p.id}" class="text-gray-500 hover:text-red-400 text-xs"><i class="fa-solid fa-trash"></i></button>
                </div>
                <div class="text-xs text-gray-400 space-y-1">
                    <p>Qtd: <span class="text-white">${p.qtd} un</span> | Peso: <span class="text-white">${p.peso}g</span></p>
                    <p class="text-accent font-bold">Total: R$ ${p.custoTotal.toFixed(2)}</p>
                </div>
                <div class="flex justify-between items-center pt-2 border-t border-gray-800 text-xs text-gray-500">
                    <span>Criado em: ${p.data}</span>
                    <span>Enviado em: ${p.dataEnvio || '-'}</span>
                </div>
            </div>
        `;
    }

    function render() {
        const termo = buscaEl.value.trim();
        const filtrados = termo ? state.historico.filter((p) => p.data.includes(termo)) : state.historico;

        if (filtrados.length === 0) {
            listaEl.innerHTML = `<div class="col-span-full text-center py-12 text-xs text-gray-600">${
                state.historico.length === 0
                    ? 'Nenhuma venda salva ainda.'
                    : 'Nenhum pedido encontrado para essa data.'
            }</div>`;
            return;
        }

        listaEl.innerHTML = filtrados.map(cardHistorico).join('');

        listaEl.querySelectorAll('[data-remover-historico]').forEach((btn) => {
            btn.addEventListener('click', (evt) => {
                evt.stopPropagation();
                abrirModalExclusao(Number(btn.dataset.removerHistorico));
            });
        });

        listaEl.querySelectorAll('[data-abrir-historico]').forEach((card) => {
            card.addEventListener('click', () => {
                const id = Number(card.dataset.abrirHistorico);
                const pedido = state.historico.find((p) => p.id === id);
                if (pedido) onAbrirPedido && onAbrirPedido(pedido);
            });
        });
    }

    buscaEl.addEventListener('input', render);

    container.querySelector('#hist-limpar').addEventListener('click', () => {
        if (state.historico.length === 0) return;
        abrirModalExclusao('ALL');
    });

    render();

    return { refresh: render };
}
