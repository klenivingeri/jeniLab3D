import modalHtml from './modal-estoque.html?raw';
import { state, saveEstoque } from '../../core/state.js';

export function mountModalEstoque(container, onSaved) {
    container.innerHTML = modalHtml;

    const modal = container.querySelector('#modal-estoque');
    const nomeInput = container.querySelector('#est-nome');
    const catSelect = container.querySelector('#est-cat');
    const qtdInput = container.querySelector('#est-qtd');
    const custoInput = container.querySelector('#est-custo');

    function open() {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    function close() {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }

    function resetForm() {
        nomeInput.value = '';
        catSelect.value = 'Filamento';
        qtdInput.value = '1000';
        custoInput.value = '100';
    }

    container.querySelector('#modal-estoque-close').addEventListener('click', close);
    container.querySelector('#modal-estoque-cancel').addEventListener('click', close);
    container.querySelector('#modal-estoque-save').addEventListener('click', () => {
        const nome = nomeInput.value;
        if (!nome) {
            alert('Informe o nome do item');
            return;
        }

        state.estoque.push({
            id: Date.now(),
            nome,
            categoria: catSelect.value,
            qtdTotal: parseFloat(qtdInput.value) || 0,
            custoTotal: parseFloat(custoInput.value) || 0,
        });

        saveEstoque();
        close();
        resetForm();
        onSaved();
    });

    return { open, close };
}
