import calculadoraHtml from './calculadora.html?raw';
import { state, savePedidos } from '../../core/state.js';
import { tempoParaHoras, formatBRL, custoPorKg, custoUnitario } from '../../core/utils.js';

export function mountCalculadoraPage(container, { onGotoEstoque, onPedidoSalvo }) {
    container.innerHTML = calculadoraHtml;

    const els = {
        nome: container.querySelector('#calc-nome'),
        qtd: container.querySelector('#calc-qtd'),
        peso: container.querySelector('#calc-peso'),
        tempo: container.querySelector('#calc-tempo'),
        filamentoSelect: container.querySelector('#calc-filamento-select'),
        custoKg: container.querySelector('#calc-custo-kg'),
        insumoSelect: container.querySelector('#calc-insumo-select'),
        insumoQtd: container.querySelector('#calc-insumo-qtd'),
        listaInsumos: container.querySelector('#lista-insumos-vinculados'),
        tempoAcabamento: container.querySelector('#calc-tempo-acabamento'),
        outros: container.querySelector('#calc-outros'),
        risco: container.querySelector('#calc-risco'),
        labelRisco: container.querySelector('#label-risco'),
        lucro: container.querySelector('#calc-lucro'),
        labelLucro: container.querySelector('#label-lucro'),
        clienteNome: container.querySelector('#calc-cliente-nome'),
        clienteTelefone: container.querySelector('#calc-cliente-telefone'),
        clienteEndereco: container.querySelector('#calc-cliente-endereco'),
        resetBtn: container.querySelector('#calc-reset'),
        resetIcon: container.querySelector('#calc-reset-icon'),
        resetLabel: container.querySelector('#calc-reset-label'),
        addInsumoBtn: container.querySelector('#calc-add-insumo'),
        salvarBtn: container.querySelector('#calc-salvar-pedido'),
        prontoView: container.querySelector('#calc-pronto-view'),
        resultadoView: container.querySelector('#calc-resultado-view'),
        resFilamento: container.querySelector('#res-filamento'),
        resInsumosEstoque: container.querySelector('#res-insumos-estoque'),
        resEnergia: container.querySelector('#res-energia'),
        resDepreciacao: container.querySelector('#res-depreciacao'),
        resExtras: container.querySelector('#res-extras'),
        resCustoTotal: container.querySelector('#res-custo-total'),
        resPrecoVenda: container.querySelector('#res-preco-venda'),
        resLucroRs: container.querySelector('#res-lucro-rs'),
    };

    let ultimoCalculo = null;
    let somenteLeitura = false;

    const camposEditaveis = [
        els.nome,
        els.qtd,
        els.peso,
        els.tempo,
        els.filamentoSelect,
        els.custoKg,
        els.insumoSelect,
        els.insumoQtd,
        els.addInsumoBtn,
        els.tempoAcabamento,
        els.outros,
        els.risco,
        els.lucro,
        els.clienteNome,
        els.clienteTelefone,
        els.clienteEndereco,
    ];

    function setSomenteLeitura(valor) {
        somenteLeitura = valor;
        camposEditaveis.forEach((el) => {
            el.disabled = valor;
        });
        els.salvarBtn.classList.toggle('hidden', valor);
    }

    // Alterna entre "modo edição/novo pedido" e "modo visualização de pedido salvo".
    function setModoVisualizacao(pedido) {
        if (!pedido) {
            els.resetIcon.className = 'fa-solid fa-trash-can';
            els.resetLabel.innerText = 'Limpar';
            setSomenteLeitura(false);
            return;
        }
        els.resetIcon.className = 'fa-solid fa-plus';
        els.resetLabel.innerText = 'Criar Novo Pedido';
        setSomenteLeitura(pedido.status !== 'Aguardando');
    }

    // Accordion (Detalhes Avançados / Dados do Cliente)
    function setAccordion(key, aberto) {
        const painel = container.querySelector(`[data-accordion-panel="${key}"]`);
        const icone = container.querySelector(`[data-accordion-icon="${key}"]`);
        if (!painel || !icone) return;
        painel.classList.toggle('hidden', !aberto);
        icone.classList.toggle('rotate-180', aberto);
    }

    container.querySelectorAll('[data-accordion-toggle]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const key = btn.dataset.accordionToggle;
            const painel = container.querySelector(`[data-accordion-panel="${key}"]`);
            setAccordion(key, painel.classList.contains('hidden'));
        });
    });

    function refreshSelects() {
        const filamentos = state.estoque.filter((i) => i.categoria === 'Filamento');
        const insumos = state.estoque.filter((i) => i.categoria === 'Insumo');

        els.filamentoSelect.innerHTML =
            '<option value="">-- Usar Custo Manual / Padrão --</option>' +
            filamentos
                .map((f) => `<option value="${f.id}">${f.nome} (R$ ${custoPorKg(f).toFixed(2)}/kg)</option>`)
                .join('');

        els.insumoSelect.innerHTML =
            '<option value="">-- Selecionar Insumo/Chaveiro/Embalagem --</option>' +
            insumos
                .map((i) => `<option value="${i.id}">${i.nome} (R$ ${custoUnitario(i).toFixed(2)} un)</option>`)
                .join('');
    }

    function renderInsumosVinculados() {
        if (state.insumosVinculados.length === 0) {
            els.listaInsumos.innerHTML = '<p class="text-xs text-gray-500 italic">Nenhum insumo extra vinculado.</p>';
            return;
        }
        els.listaInsumos.innerHTML = state.insumosVinculados
            .map(
                (i) => `
                <div class="flex justify-between items-center bg-darkbg border border-gray-700/50 px-3 py-1.5 rounded-xl text-xs">
                    <span class="text-white">${i.nome} (<strong class="text-accent">${i.qtd}x</strong>) - R$ ${(i.custoUnitario * i.qtd).toFixed(2)}</span>
                    <button data-remove-insumo="${i.id}" ${somenteLeitura ? 'disabled' : ''} class="text-red-400 hover:text-red-300 disabled:opacity-40 disabled:cursor-not-allowed"><i class="fa-solid fa-xmark"></i></button>
                </div>
            `
            )
            .join('');

        els.listaInsumos.querySelectorAll('[data-remove-insumo]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const id = Number(btn.dataset.removeInsumo);
                state.insumosVinculados = state.insumosVinculados.filter((i) => i.id !== id);
                renderInsumosVinculados();
                calcularOrcamento();
            });
        });
    }

    function calcularOrcamento() {
        const nome = els.nome.value || 'Modelo Sem Nome';
        const qtd = parseInt(els.qtd.value, 10) || 1;
        const peso = parseFloat(els.peso.value) || 0;
        const tempoHoras = tempoParaHoras(els.tempo.value);
        const custoKg = Number.isNaN(parseFloat(els.custoKg.value)) ? 100 : parseFloat(els.custoKg.value);
        const tempoAcabamentoHoras = tempoParaHoras(els.tempoAcabamento.value);
        const outros = parseFloat(els.outros.value) || 0;
        const riscoPerc = parseFloat(els.risco.value) / 100;
        const lucroPerc = parseFloat(els.lucro.value) / 100;

        els.prontoView.classList.add('hidden');
        els.resultadoView.classList.remove('hidden');

        const custoFilamento = (peso / 1000) * custoKg;
        const custoInsumosEstoqueTotal = state.insumosVinculados.reduce(
            (acc, curr) => acc + curr.custoUnitario * curr.qtd,
            0
        );

        const custoEnergia = (state.config.watts / 1000) * tempoHoras * state.config.kwh;
        const custoDepreciacao = (state.config.maquinaPreco / state.config.vidaUtil) * tempoHoras;
        const custoMaoDeObra = (tempoHoras + tempoAcabamentoHoras) * state.config.maoDeObra;

        const custoTotalPedido =
            custoFilamento + custoInsumosEstoqueTotal + custoEnergia + custoDepreciacao + custoMaoDeObra + outros;

        const custoComRisco = custoTotalPedido + custoTotalPedido * riscoPerc;
        const totalPedidoGeral = custoComRisco * qtd;

        const precoVendaTotal = totalPedidoGeral * (1 + lucroPerc);
        const lucroTotalRs = precoVendaTotal - totalPedidoGeral;

        els.resFilamento.innerText = formatBRL(custoFilamento);
        els.resInsumosEstoque.innerText = formatBRL(custoInsumosEstoqueTotal);
        els.resEnergia.innerText = formatBRL(custoEnergia);
        els.resDepreciacao.innerText = formatBRL(custoDepreciacao + custoMaoDeObra);
        els.resExtras.innerText = formatBRL(outros);
        els.resCustoTotal.innerText = formatBRL(totalPedidoGeral);
        els.resPrecoVenda.innerText = formatBRL(precoVendaTotal);
        els.resLucroRs.innerText = `Lucro estimado: ${formatBRL(lucroTotalRs)}`;

        ultimoCalculo = {
            nome,
            qtd,
            peso,
            tempo: els.tempo.value,
            tempoAcabamento: els.tempoAcabamento.value,
            custoKg,
            outros,
            risco: els.risco.value,
            lucro: els.lucro.value,
            insumosVinculados: state.insumosVinculados.map((i) => ({ ...i })),
            clienteNome: els.clienteNome.value,
            clienteTelefone: els.clienteTelefone.value,
            clienteEndereco: els.clienteEndereco.value,
            custoTotal: precoVendaTotal,
            lucroRs: lucroTotalRs,
            status: 'Aguardando',
            data: new Date().toLocaleDateString('pt-BR'),
        };
    }

    function limparErros() {
        els.nome.classList.remove('campo-erro');
        els.peso.classList.remove('campo-erro');
        els.tempo.classList.remove('campo-erro');
    }

    function resetCalc() {
        limparErros();
        setModoVisualizacao(null);
        els.nome.value = '';
        els.qtd.value = '1';
        els.peso.value = '0';
        els.tempo.value = '00:00';
        els.tempoAcabamento.value = '00:00';
        els.outros.value = '0';
        els.risco.value = '5';
        els.labelRisco.innerText = '5%';
        els.lucro.value = '100';
        els.labelLucro.innerText = '100%';
        els.clienteNome.value = '';
        els.clienteTelefone.value = '';
        els.clienteEndereco.value = '';
        setAccordion('detalhes', false);
        setAccordion('cliente', false);
        state.insumosVinculados = [];
        renderInsumosVinculados();
        calcularOrcamento();
    }

    // Preenche o formulário com um pedido já existente (Acompanhamento/Histórico) apenas para visualização.
    function loadPedido(pedido) {
        limparErros();
        setModoVisualizacao(pedido);
        els.nome.value = pedido.nome || '';
        els.qtd.value = pedido.qtd || 1;
        els.peso.value = pedido.peso || 0;
        els.tempo.value = pedido.tempo || '00:00';
        els.tempoAcabamento.value = pedido.tempoAcabamento || '00:00';
        els.custoKg.value = pedido.custoKg ?? state.config.custoKgPadrao;
        els.outros.value = pedido.outros ?? 0;
        els.risco.value = pedido.risco ?? 5;
        els.labelRisco.innerText = `${els.risco.value}%`;
        els.lucro.value = pedido.lucro ?? 100;
        els.labelLucro.innerText = `${els.lucro.value}%`;
        els.clienteNome.value = pedido.clienteNome || '';
        els.clienteTelefone.value = pedido.clienteTelefone || '';
        els.clienteEndereco.value = pedido.clienteEndereco || '';

        state.insumosVinculados = (pedido.insumosVinculados || []).map((i) => ({ ...i }));
        renderInsumosVinculados();

        const temDetalhesNaoPadrao =
            (pedido.tempoAcabamento && pedido.tempoAcabamento !== '00:00') ||
            Number(pedido.outros) > 0 ||
            (pedido.risco !== undefined && Number(pedido.risco) !== 5) ||
            (pedido.lucro !== undefined && Number(pedido.lucro) !== 100);

        setAccordion('detalhes', Boolean(temDetalhesNaoPadrao));
        setAccordion('cliente', Boolean(pedido.clienteNome || pedido.clienteTelefone || pedido.clienteEndereco));

        calcularOrcamento();
    }

    // Eventos
    [els.qtd, els.peso, els.tempo, els.custoKg, els.tempoAcabamento, els.outros, els.nome].forEach((input) => {
        input.addEventListener('input', calcularOrcamento);
    });

    [els.clienteNome, els.clienteTelefone, els.clienteEndereco].forEach((input) => {
        input.addEventListener('input', calcularOrcamento);
    });

    els.filamentoSelect.addEventListener('change', () => {
        const id = els.filamentoSelect.value;
        if (!id) return;
        const item = state.estoque.find((i) => i.id == id);
        if (item) {
            els.custoKg.value = custoPorKg(item).toFixed(2);
            calcularOrcamento();
        }
    });

    els.risco.addEventListener('input', () => {
        els.labelRisco.innerText = `${els.risco.value}%`;
        calcularOrcamento();
    });

    els.lucro.addEventListener('input', () => {
        els.labelLucro.innerText = `${els.lucro.value}%`;
        calcularOrcamento();
    });

    container.querySelector('#calc-add-insumo').addEventListener('click', () => {
        const id = els.insumoSelect.value;
        const qtd = parseInt(els.insumoQtd.value, 10) || 1;
        if (!id) {
            alert('Selecione um insumo do estoque!');
            return;
        }

        const itemEstoque = state.estoque.find((i) => i.id == id);
        if (!itemEstoque) return;

        const unitario = custoUnitario(itemEstoque);
        const existente = state.insumosVinculados.find((i) => i.id == id);
        if (existente) {
            existente.qtd += qtd;
        } else {
            state.insumosVinculados.push({
                id: itemEstoque.id,
                nome: itemEstoque.nome,
                qtd,
                custoUnitario: unitario,
            });
        }

        renderInsumosVinculados();
        calcularOrcamento();
    });

    container.querySelector('#calc-reset').addEventListener('click', resetCalc);
    container.querySelector('#calc-goto-estoque').addEventListener('click', onGotoEstoque);

    function piscarErro(el) {
        el.classList.remove('campo-erro');
        // eslint-disable-next-line no-unused-expressions
        void el.offsetWidth; // reinicia a animação caso já esteja marcado
        el.classList.add('campo-erro');
        el.addEventListener(
            'animationend',
            () => el.classList.remove('campo-erro'),
            { once: true }
        );
    }

    function validarCamposBasicos() {
        let valido = true;

        if (!els.nome.value.trim()) {
            piscarErro(els.nome);
            valido = false;
        }
        if (!(parseFloat(els.peso.value) > 0)) {
            piscarErro(els.peso);
            valido = false;
        }
        if (!(tempoParaHoras(els.tempo.value) > 0)) {
            piscarErro(els.tempo);
            valido = false;
        }

        return valido;
    }

    container.querySelector('#calc-salvar-pedido').addEventListener('click', () => {
        if (somenteLeitura) return;
        if (!validarCamposBasicos()) return;
        if (!ultimoCalculo) {
            alert('Preencha os dados do modelo antes de salvar!');
            return;
        }
        state.pedidos.unshift({ id: Date.now(), ...ultimoCalculo });
        savePedidos();
        alert('Projeto salvo com sucesso no Acompanhamento!');
        onPedidoSalvo();
    });

    // Estado inicial
    els.custoKg.value = state.config.custoKgPadrao;
    setModoVisualizacao(null);
    refreshSelects();
    renderInsumosVinculados();
    calcularOrcamento();

    return { refreshSelects, loadPedido };
}
