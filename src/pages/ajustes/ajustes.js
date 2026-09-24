import ajustesHtml from './ajustes.html?raw';
import { state, saveConfig } from '../../core/state.js';

export function mountAjustesPage(container) {
    container.innerHTML = ajustesHtml;

    const els = {
        watts: container.querySelector('#cfg-watts'),
        kwh: container.querySelector('#cfg-kwh'),
        maquinaPreco: container.querySelector('#cfg-maquina-preco'),
        vidaUtil: container.querySelector('#cfg-vida-util'),
        custoKgPadrao: container.querySelector('#cfg-custo-kg-padrao'),
        maoDeObra: container.querySelector('#cfg-mao-de-obra'),
    };

    function preencherFormulario() {
        els.watts.value = state.config.watts;
        els.kwh.value = state.config.kwh;
        els.maquinaPreco.value = state.config.maquinaPreco;
        els.vidaUtil.value = state.config.vidaUtil;
        els.custoKgPadrao.value = state.config.custoKgPadrao;
        els.maoDeObra.value = state.config.maoDeObra;
    }

    function parseNum(value, fallback) {
        const n = parseFloat(value);
        return Number.isNaN(n) ? fallback : n;
    }

    container.querySelector('#cfg-salvar').addEventListener('click', () => {
        state.config.watts = parseNum(els.watts.value, 150);
        state.config.kwh = parseNum(els.kwh.value, 1.25);
        state.config.maquinaPreco = parseNum(els.maquinaPreco.value, 3500);
        state.config.vidaUtil = parseNum(els.vidaUtil.value, 5000);
        state.config.custoKgPadrao = parseNum(els.custoKgPadrao.value, 100);
        state.config.maoDeObra = parseNum(els.maoDeObra.value, 15);

        saveConfig();
        alert('Configurações salvas com sucesso!');
    });

    preencherFormulario();

    return { refresh: preencherFormulario };
}
