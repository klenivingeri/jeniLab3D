import estoqueHtml from './estoque.html?raw';
import { state, saveEstoque } from '../../core/state.js';

export function mountEstoquePage(container, { onAbrirModal }) {
    container.innerHTML = estoqueHtml;

    const tabelaContainer = container.querySelector('#tabela-estoque-container');

    function render() {
        if (state.estoque.length === 0) {
            tabelaContainer.innerHTML = `
                <div class="text-center py-16 space-y-3">
                    <div class="text-gray-600 text-3xl"><i class="fa-solid fa-box-open"></i></div>
                    <p class="text-sm text-gray-400">Seu estoque está vazio.</p>
                    <button id="estoque-add-primeiro" class="text-xs text-accent font-semibold hover:underline">Adicionar Primeiro Item</button>
                </div>
            `;
            tabelaContainer.querySelector('#estoque-add-primeiro').addEventListener('click', onAbrirModal);
            return;
        }

        tabelaContainer.innerHTML = `
            <table class="w-full text-left border-collapse text-sm">
                <thead>
                    <tr class="border-b border-gray-800 bg-darkbg/50 text-gray-400 text-xs uppercase">
                        <th class="p-4">Item / Material</th>
                        <th class="p-4">Categoria</th>
                        <th class="p-4">Qtd Total</th>
                        <th class="p-4">Custo Total Pago</th>
                        <th class="p-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-800">
                    ${state.estoque
                        .map(
                            (item) => `
                        <tr class="hover:bg-darkbg/30 transition">
                            <td class="p-4 font-medium text-white">${item.nome}</td>
                            <td class="p-4"><span class="px-2.5 py-1 rounded-full text-xs bg-gray-800 text-gray-300 border border-gray-700">${item.categoria}</span></td>
                            <td class="p-4 text-gray-300">${item.qtdTotal}${item.categoria === 'Filamento' ? 'g' : 'unidades'}</td>
                            <td class="p-4 text-accent font-mono">R$ ${item.custoTotal.toFixed(2)}</td>
                            <td class="p-4 text-right">
                                <button data-remover-estoque="${item.id}" class="text-gray-500 hover:text-red-400 transition"><i class="fa-solid fa-trash"></i></button>
                            </td>
                        </tr>
                    `
                        )
                        .join('')}
                </tbody>
            </table>
        `;

        tabelaContainer.querySelectorAll('[data-remover-estoque]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const id = Number(btn.dataset.removerEstoque);
                state.estoque = state.estoque.filter((i) => i.id !== id);
                saveEstoque();
                render();
            });
        });
    }

    container.querySelector('#estoque-novo-item').addEventListener('click', onAbrirModal);

    render();

    return { refresh: render };
}
