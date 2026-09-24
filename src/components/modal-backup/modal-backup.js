import modalHtml from './modal-backup.html?raw';
import { state, savePedidos, saveHistorico } from '../../core/state.js';

export function mountModalBackup(container, onImportado) {
    container.innerHTML = modalHtml;

    const modal = container.querySelector('#modal-backup');
    const inputArquivo = container.querySelector('#modal-backup-input');
    const resultadoEl = container.querySelector('#modal-backup-resultado');

    function open() {
        esconderResultado();
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    function close() {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
        inputArquivo.value = '';
    }

    function esconderResultado() {
        resultadoEl.classList.add('hidden');
        resultadoEl.innerText = '';
    }

    function mostrarResultado(mensagem, erro = false) {
        resultadoEl.classList.remove('hidden');
        resultadoEl.classList.toggle('border-red-500/30', erro);
        resultadoEl.classList.toggle('text-red-400', erro);
        resultadoEl.classList.toggle('border-green-500/30', !erro);
        resultadoEl.classList.toggle('text-green-400', !erro);
        resultadoEl.innerText = mensagem;
    }

    function exportar() {
        const payload = {
            tipo: 'backup-pedidos',
            versao: 1,
            exportadoEm: new Date().toISOString(),
            pedidos: state.pedidos,
            historico: state.historico,
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const carimbo = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
        link.href = url;
        link.download = `backup-pedidos-${carimbo}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        mostrarResultado('Backup exportado com sucesso!');
    }

    // Compara pela criação (id = timestamp de quando o pedido foi criado):
    // mesmo id -> mesma data de criação (ano/mês/dia/hora/minuto) -> atualiza; id novo -> adiciona.
    function mesclar(listaAtual, listaImportada) {
        if (!Array.isArray(listaImportada)) return { lista: listaAtual, adicionados: 0, atualizados: 0 };

        const mesclada = [...listaAtual];
        let adicionados = 0;
        let atualizados = 0;

        listaImportada.forEach((itemImportado) => {
            if (!itemImportado || typeof itemImportado.id !== 'number') return;

            const indiceExistente = mesclada.findIndex((p) => p.id === itemImportado.id);

            if (indiceExistente >= 0) {
                mesclada[indiceExistente] = { ...mesclada[indiceExistente], ...itemImportado };
                atualizados += 1;
            } else {
                mesclada.push(itemImportado);
                adicionados += 1;
            }
        });

        return { lista: mesclada, adicionados, atualizados };
    }

    function importar(json) {
        const pedidosImportados = Array.isArray(json) ? json : json.pedidos;
        const historicoImportado = Array.isArray(json) ? [] : json.historico;

        if (!Array.isArray(pedidosImportados) && !Array.isArray(historicoImportado)) {
            mostrarResultado('Arquivo inválido: nenhum pedido encontrado no JSON.', true);
            return;
        }

        const resultadoPedidos = mesclar(state.pedidos, pedidosImportados);
        state.pedidos = resultadoPedidos.lista;
        savePedidos();

        const resultadoHistorico = mesclar(state.historico, historicoImportado);
        state.historico = resultadoHistorico.lista;
        saveHistorico();

        const adicionados = resultadoPedidos.adicionados + resultadoHistorico.adicionados;
        const atualizados = resultadoPedidos.atualizados + resultadoHistorico.atualizados;

        mostrarResultado(`Importação concluída: ${adicionados} novo(s), ${atualizados} atualizado(s).`);
        onImportado && onImportado();
    }

    container.querySelector('#modal-backup-exportar').addEventListener('click', exportar);

    container.querySelector('#modal-backup-importar').addEventListener('click', () => {
        inputArquivo.click();
    });

    inputArquivo.addEventListener('change', () => {
        const arquivo = inputArquivo.files[0];
        if (!arquivo) return;

        const leitor = new FileReader();
        leitor.onload = () => {
            try {
                const json = JSON.parse(leitor.result);
                importar(json);
            } catch (erro) {
                mostrarResultado('Erro ao ler o arquivo JSON. Verifique se o arquivo é válido.', true);
            } finally {
                inputArquivo.value = '';
            }
        };
        leitor.readAsText(arquivo);
    });

    container.querySelector('#modal-backup-close').addEventListener('click', close);
    container.querySelector('#modal-backup-fechar').addEventListener('click', close);

    return { open, close };
}
