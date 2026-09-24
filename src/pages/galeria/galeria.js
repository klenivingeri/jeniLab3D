import galeriaHtml from './galeria.html?raw';
import { state, saveGaleria } from '../../core/state.js';

export function mountGaleriaPage(container, { onCriarPedido } = {}) {
    container.innerHTML = galeriaHtml;

    const listaEl = container.querySelector('#lista-galeria');

    function cardGaleria(item) {
        const insumos = item.insumosVinculados || [];
        return `
            <div class="bg-darkcard border border-gray-800 rounded-2xl p-5 space-y-3 shadow">
                <div class="flex justify-between items-start">
                    <h4 class="text-white font-semibold">${item.nome}</h4>
                    <button data-remover-galeria="${item.id}" class="text-gray-500 hover:text-red-400 text-xs"><i class="fa-solid fa-trash"></i></button>
                </div>
                <div class="text-xs text-gray-400 space-y-1">
                    <p>Qtd: <span class="text-white">${item.qtd} un</span> | Peso: <span class="text-white">${item.peso}g</span> | Tempo: <span class="text-white">${item.tempo}</span></p>
                    <p>Material: <span class="text-white">${item.filamentoNome || 'Custo Manual/Padrão'}</span></p>
                    ${
                        insumos.length > 0
                            ? `<p>Insumos: <span class="text-white">${insumos.map((i) => `${i.nome} (${i.qtd}x)`).join(', ')}</span></p>`
                            : ''
                    }
                </div>
                <button data-criar-galeria="${item.id}" class="w-full px-3 py-2 bg-accent/10 border border-accent/30 text-accent rounded-lg text-xs font-semibold hover:bg-accent/20 transition flex items-center justify-center space-x-2">
                    <i class="fa-solid fa-plus"></i><span>Criar Pedido</span>
                </button>
            </div>
        `;
    }

    function render() {
        if (state.galeria.length === 0) {
            listaEl.innerHTML = `
                <div class="col-span-full text-center py-16 text-xs text-gray-600">
                    Nenhum item na galeria ainda.<br>
                    Marque "Salvar na Galeria" ao criar um pedido em Novo Pedido para adicioná-lo aqui.
                </div>
            `;
            return;
        }

        listaEl.innerHTML = state.galeria.map(cardGaleria).join('');

        listaEl.querySelectorAll('[data-remover-galeria]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const id = Number(btn.dataset.removerGaleria);
                state.galeria = state.galeria.filter((i) => i.id !== id);
                saveGaleria();
                render();
            });
        });

        listaEl.querySelectorAll('[data-criar-galeria]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const id = Number(btn.dataset.criarGaleria);
                const item = state.galeria.find((i) => i.id === id);
                if (item) onCriarPedido && onCriarPedido(item);
            });
        });
    }

    render();

    return { refresh: render };
}
