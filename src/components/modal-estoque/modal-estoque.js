import modalHtml from './modal-estoque.html?raw';
import { state, saveEstoque } from '../../core/state.js';

export function mountModalEstoque(container, onSaved) {
    container.innerHTML = modalHtml;

    const modal = container.querySelector('#modal-estoque');
    const titulo = container.querySelector('#modal-estoque-titulo');
    const salvarLabel = container.querySelector('#modal-estoque-save-label');
    const nomeInput = container.querySelector('#est-nome');
    const catSelect = container.querySelector('#est-cat');
    const qtdInput = container.querySelector('#est-qtd');
    const custoInput = container.querySelector('#est-custo');

    let editandoId = null;

    function open(item = null) {
        editandoId = item ? item.id : null;

        if (item) {
            titulo.innerText = 'Editar Item do Estoque';
            salvarLabel.innerText = 'Salvar Alterações';
            nomeInput.value = item.nome;
            catSelect.value = item.categoria;
            qtdInput.value = item.qtdTotal;
            custoInput.value = item.custoTotal;
        } else {
            titulo.innerText = 'Adicionar Item ao Estoque';
            salvarLabel.innerText = 'Salvar Item';
            resetForm();
        }

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

        const dados = {
            nome,
            categoria: catSelect.value,
            qtdTotal: parseFloat(qtdInput.value) || 0,
            custoTotal: parseFloat(custoInput.value) || 0,
        };

        if (editandoId !== null) {
            state.estoque = state.estoque.map((i) => (i.id === editandoId ? { ...i, ...dados } : i));
        } else {
            state.estoque.push({ id: Date.now(), ...dados });
        }

        saveEstoque();
        close();
        resetForm();
        onSaved();
    });

    return { open, close };
}
