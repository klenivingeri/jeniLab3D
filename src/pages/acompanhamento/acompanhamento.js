import acompanhamentoHtml from './acompanhamento.html?raw';
import { state, savePedidos, saveHistorico, clearPedidos } from '../../core/state.js';

const COLUNAS = [
    { id: 'Aguardando', titulo: 'Aguardando', cor: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10' },
    { id: 'Finalizado', titulo: 'Finalizado', cor: 'border-blue-500/30 text-blue-400 bg-blue-500/10' },
    { id: 'Enviado', titulo: 'Enviado', cor: 'border-green-500/30 text-green-400 bg-green-500/10' },
];

export function mountAcompanhamentoPage(container, { onSalvoHistorico, onAbrirPedido } = {}) {
    container.innerHTML = acompanhamentoHtml;

    const listaEl = container.querySelector('#lista-acompanhamento');

    let idArrastando = null;

    function cardPedido(p) {
        return `
            <div data-abrir-pedido="${p.id}" draggable="true" class="bg-darkbg border border-gray-700/60 rounded-xl p-3.5 space-y-2 shadow cursor-grab active:cursor-grabbing hover:border-accent/50 transition">
                <div class="flex justify-between items-start">
                    <h4 class="text-white font-semibold text-sm">${p.nome}</h4>
                    <button data-remover-pedido="${p.id}" draggable="false" class="text-gray-500 hover:text-red-400 text-xs"><i class="fa-solid fa-trash"></i></button>
                </div>
                <div class="text-xs text-gray-400 space-y-1">
                    <p>Qtd: <span class="text-white">${p.qtd} un</span> | Peso: <span class="text-white">${p.peso}g</span></p>
                    <p class="text-accent font-bold">Total: R$ ${p.custoTotal.toFixed(2)}</p>
                </div>
                <div class="flex justify-between items-center pt-2 border-t border-gray-800 text-xs">
                    <span class="text-gray-500">${p.data}</span>
                    <select data-status-pedido="${p.id}" draggable="false" class="bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-xs focus:outline-none">
                        <option value="Aguardando" ${p.status === 'Aguardando' ? 'selected' : ''}>Aguardando</option>
                        <option value="Finalizado" ${p.status === 'Finalizado' ? 'selected' : ''}>Finalizado</option>
                        <option value="Enviado" ${p.status === 'Enviado' ? 'selected' : ''}>Enviado</option>
                    </select>
                </div>
                ${
                    p.status === 'Enviado'
                        ? `<button data-salvar-pedido="${p.id}" draggable="false" class="w-full px-3 py-1.5 bg-accent/10 border border-accent/30 text-accent rounded-lg text-xs font-semibold hover:bg-accent/20 transition flex items-center justify-center space-x-2"><i class="fa-solid fa-floppy-disk"></i><span>Salvar no Histórico</span></button>`
                        : ''
                }
            </div>
        `;
    }

    function render() {
        listaEl.innerHTML = COLUNAS.map((col) => {
            const pedidosCol = state.pedidos.filter((p) => p.status === col.id);
            return `
                <div class="bg-darkcard border border-gray-800 rounded-2xl p-4 flex flex-col h-[600px]">
                    <div class="flex items-center justify-between pb-3 border-b border-gray-800 mb-3 gap-2">
                        <span class="text-xs font-bold uppercase px-3 py-1 rounded-lg border ${col.cor}">${col.titulo}</span>
                        ${
                            col.id === 'Enviado' && pedidosCol.length > 0
                                ? `<button id="acomp-enviar-todos" class="text-xs px-2.5 py-1 bg-accent/10 border border-accent/30 text-accent rounded-lg font-semibold hover:bg-accent/20 transition flex items-center space-x-1.5"><i class="fa-solid fa-floppy-disk"></i><span>Salvar Todos no Histórico</span></button>`
                                : ''
                        }
                        <span class="text-xs text-gray-500 font-mono">${pedidosCol.length}</span>
                    </div>
                    <div data-coluna-lista="${col.id}" class="overflow-y-auto flex-grow space-y-3 pr-1 rounded-xl transition-colors">
                        ${
                            pedidosCol.length === 0
                                ? '<div data-coluna-vazia class="text-center py-12 text-xs text-gray-600 pointer-events-none">Nenhum pedido</div>'
                                : pedidosCol.map(cardPedido).join('')
                        }
                    </div>
                </div>
            `;
        }).join('');

        listaEl.querySelectorAll('[data-remover-pedido]').forEach((btn) => {
            btn.addEventListener('click', (evt) => {
                evt.stopPropagation();
                const id = Number(btn.dataset.removerPedido);
                state.pedidos = state.pedidos.filter((p) => p.id !== id);
                savePedidos();
                render();
            });
        });

        listaEl.querySelectorAll('[data-status-pedido]').forEach((select) => {
            select.addEventListener('click', (evt) => evt.stopPropagation());
            select.addEventListener('change', (evt) => {
                evt.stopPropagation();
                const id = Number(select.dataset.statusPedido);
                state.pedidos = state.pedidos.map((p) => (p.id === id ? { ...p, status: select.value } : p));
                savePedidos();
                render();
            });
        });

        listaEl.querySelectorAll('[data-salvar-pedido]').forEach((btn) => {
            btn.addEventListener('click', (evt) => {
                evt.stopPropagation();
                const id = Number(btn.dataset.salvarPedido);
                const pedido = state.pedidos.find((p) => p.id === id);
                if (!pedido) return;

                state.historico.unshift({ ...pedido, dataEnvio: new Date().toLocaleDateString('pt-BR') });
                saveHistorico();

                state.pedidos = state.pedidos.filter((p) => p.id !== id);
                savePedidos();

                render();
                onSalvoHistorico && onSalvoHistorico();
            });
        });

        const btnEnviarTodos = listaEl.querySelector('#acomp-enviar-todos');
        if (btnEnviarTodos) {
            btnEnviarTodos.addEventListener('click', (evt) => {
                evt.stopPropagation();
                const enviados = state.pedidos.filter((p) => p.status === 'Enviado');
                if (enviados.length === 0) return;

                const agora = new Date().toLocaleDateString('pt-BR');
                state.historico.unshift(...enviados.map((p) => ({ ...p, dataEnvio: agora })));
                saveHistorico();

                state.pedidos = state.pedidos.filter((p) => p.status !== 'Enviado');
                savePedidos();

                render();
            });
        }

        listaEl.querySelectorAll('[data-abrir-pedido]').forEach((card) => {
            card.addEventListener('click', () => {
                const id = Number(card.dataset.abrirPedido);
                const pedido = state.pedidos.find((p) => p.id === id);
                if (pedido) onAbrirPedido && onAbrirPedido(pedido);
            });

            card.addEventListener('dragstart', (evt) => {
                idArrastando = Number(card.dataset.abrirPedido);
                evt.dataTransfer.effectAllowed = 'move';
                evt.dataTransfer.setData('text/plain', String(idArrastando));
                requestAnimationFrame(() => card.classList.add('opacity-40'));
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('opacity-40');
                idArrastando = null;
                listaEl.querySelectorAll('[data-coluna-lista]').forEach((col) => {
                    col.classList.remove('bg-accent/5', 'ring-2', 'ring-accent/40');
                });
            });
        });

        listaEl.querySelectorAll('[data-coluna-lista]').forEach((colunaEl) => {
            colunaEl.addEventListener('dragover', (evt) => {
                evt.preventDefault();
                evt.dataTransfer.dropEffect = 'move';
                colunaEl.classList.add('bg-accent/5', 'ring-2', 'ring-accent/40');
            });

            colunaEl.addEventListener('dragleave', (evt) => {
                if (!colunaEl.contains(evt.relatedTarget)) {
                    colunaEl.classList.remove('bg-accent/5', 'ring-2', 'ring-accent/40');
                }
            });

            colunaEl.addEventListener('drop', (evt) => {
                evt.preventDefault();
                colunaEl.classList.remove('bg-accent/5', 'ring-2', 'ring-accent/40');

                const id = idArrastando ?? Number(evt.dataTransfer.getData('text/plain'));
                const novoStatus = colunaEl.dataset.colunaLista;
                const pedido = state.pedidos.find((p) => p.id === id);
                if (!pedido || pedido.status === novoStatus) return;

                state.pedidos = state.pedidos.map((p) => (p.id === id ? { ...p, status: novoStatus } : p));
                savePedidos();
                render();
            });
        });
    }

    container.querySelector('#acomp-limpar').addEventListener('click', () => {
        if (confirm('Deseja limpar todos os pedidos de acompanhamento?')) {
            clearPedidos();
            render();
        }
    });

    render();

    return { refresh: render };
}
