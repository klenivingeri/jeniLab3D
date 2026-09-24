import modalHtml from './modal-cliente.html?raw';
import { state, saveClientes } from '../../core/state.js';

export function mountModalCliente(container, onSaved) {
    container.innerHTML = modalHtml;

    const modal = container.querySelector('#modal-cliente');
    const titulo = container.querySelector('#modal-cliente-titulo');
    const salvarLabel = container.querySelector('#modal-cliente-save-label');
    const nomeInput = container.querySelector('#mcli-nome');
    const telefoneInput = container.querySelector('#mcli-telefone');
    const cepInput = container.querySelector('#mcli-cep');
    const numeroInput = container.querySelector('#mcli-numero');
    const ruaInput = container.querySelector('#mcli-rua');
    const bairroInput = container.querySelector('#mcli-bairro');

    let editandoId = null;

    function resetForm() {
        nomeInput.value = '';
        telefoneInput.value = '';
        cepInput.value = '';
        numeroInput.value = '';
        ruaInput.value = '';
        bairroInput.value = '';
    }

    function open(cliente = null) {
        editandoId = cliente ? cliente.id : null;

        if (cliente) {
            titulo.innerText = 'Editar Cliente';
            salvarLabel.innerText = 'Salvar Alterações';
            nomeInput.value = cliente.nome;
            telefoneInput.value = cliente.telefone || '';
            cepInput.value = cliente.cep || '';
            numeroInput.value = cliente.numero || '';
            ruaInput.value = cliente.rua || '';
            bairroInput.value = cliente.bairro || '';
        } else {
            titulo.innerText = 'Novo Cliente';
            salvarLabel.innerText = 'Salvar Cliente';
            resetForm();
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    function close() {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }

    container.querySelector('#modal-cliente-close').addEventListener('click', close);
    container.querySelector('#modal-cliente-cancel').addEventListener('click', close);
    container.querySelector('#modal-cliente-save').addEventListener('click', () => {
        const nome = nomeInput.value.trim();
        if (!nome) {
            alert('Informe o nome do cliente');
            return;
        }

        const dados = {
            nome,
            telefone: telefoneInput.value.trim(),
            cep: cepInput.value.trim(),
            numero: numeroInput.value.trim(),
            rua: ruaInput.value.trim(),
            bairro: bairroInput.value.trim(),
        };

        if (editandoId !== null) {
            state.clientes = state.clientes.map((c) => (c.id === editandoId ? { ...c, ...dados } : c));
        } else {
            state.clientes.push({ id: Date.now(), ...dados });
        }

        saveClientes();
        close();
        resetForm();
        onSaved();
    });

    return { open, close };
}
