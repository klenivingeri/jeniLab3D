import clientesHtml from './clientes.html?raw';
import { state, saveClientes } from '../../core/state.js';

function formatBRL(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function mountClientesPage(container, { onAbrirModal, onEditarCliente }) {
    container.innerHTML = clientesHtml;

    const tabelaContainer = container.querySelector('#tabela-clientes-container');
    const modalExcluir = container.querySelector('#clientes-modal-excluir');
    const confirmaInput = container.querySelector('#clientes-confirma-input');
    const confirmaBtn = container.querySelector('#clientes-modal-confirmar');

    let idPendenteExclusao = null;

    function abrirModalExclusao(id) {
        idPendenteExclusao = id;
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

    confirmaInput.addEventListener('keydown', (evt) => {
        if (evt.key === 'Enter' && confirmaInput.value.trim() === 'DELETAR') confirmaBtn.click();
    });

    container.querySelector('#clientes-modal-cancelar').addEventListener('click', fecharModalExclusao);

    confirmaBtn.addEventListener('click', () => {
        if (confirmaInput.value.trim() !== 'DELETAR' || idPendenteExclusao === null) return;
        state.clientes = state.clientes.filter((c) => c.id !== idPendenteExclusao);
        saveClientes();
        fecharModalExclusao();
        render();
    });

    function estatisticasCliente(cliente) {
        const chave = cliente.nome.trim().toLowerCase();
        const pedidosDoCliente = state.historico.filter((p) => (p.clienteNome || '').trim().toLowerCase() === chave);
        return {
            qtdPedidos: pedidosDoCliente.length,
            totalGasto: pedidosDoCliente.reduce((soma, p) => soma + (p.custoTotal || 0), 0),
        };
    }

    function render() {
        if (state.clientes.length === 0) {
            tabelaContainer.innerHTML = `
                <div class="text-center py-16 space-y-3">
                    <div class="text-gray-600 text-3xl"><i class="fa-solid fa-address-book"></i></div>
                    <p class="text-sm text-gray-400">Nenhum cliente cadastrado ainda.</p>
                    <p class="text-xs text-gray-500">Clientes são criados automaticamente ao salvar um pedido com nome preenchido.</p>
                </div>
            `;
            return;
        }

        tabelaContainer.innerHTML = `
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse text-sm min-w-[720px]">
                    <thead>
                        <tr class="border-b border-gray-800 bg-darkbg/50 text-gray-400 text-xs uppercase">
                            <th class="p-4">Nome</th>
                            <th class="p-4">Telefone</th>
                            <th class="p-4">Endereço</th>
                            <th class="p-4">Pedidos</th>
                            <th class="p-4">Total Comprado</th>
                            <th class="p-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-800">
                        ${state.clientes
                            .map((cliente) => {
                                const stats = estatisticasCliente(cliente);
                                const endereco = [cliente.rua, cliente.numero, cliente.bairro].filter(Boolean).join(', ');
                                return `
                                    <tr class="hover:bg-darkbg/30 transition">
                                        <td class="p-4 font-medium text-white">${cliente.nome}</td>
                                        <td class="p-4 text-gray-300">${cliente.telefone || '-'}</td>
                                        <td class="p-4 text-gray-400">${endereco || '-'}</td>
                                        <td class="p-4 text-gray-300">${stats.qtdPedidos}</td>
                                        <td class="p-4 text-accent font-mono">${formatBRL(stats.totalGasto)}</td>
                                        <td class="p-4 text-right space-x-6 whitespace-nowrap">
                                            <button data-editar-cliente="${cliente.id}" class="text-gray-500 hover:text-accent transition"><i class="fa-solid fa-pen"></i></button>
                                            <button data-remover-cliente="${cliente.id}" class="text-gray-500 hover:text-red-400 transition"><i class="fa-solid fa-trash"></i></button>
                                        </td>
                                    </tr>
                                `;
                            })
                            .join('')}
                    </tbody>
                </table>
            </div>
        `;

        tabelaContainer.querySelectorAll('[data-remover-cliente]').forEach((btn) => {
            btn.addEventListener('click', () => {
                abrirModalExclusao(Number(btn.dataset.removerCliente));
            });
        });

        tabelaContainer.querySelectorAll('[data-editar-cliente]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const id = Number(btn.dataset.editarCliente);
                const cliente = state.clientes.find((c) => c.id === id);
                if (cliente) onEditarCliente && onEditarCliente(cliente);
            });
        });
    }

    container.querySelector('#clientes-novo').addEventListener('click', onAbrirModal);

    render();

    return { refresh: render };
}
