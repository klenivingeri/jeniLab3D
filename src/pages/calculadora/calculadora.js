import calculadoraHtml from './calculadora.html?raw';
import { state, savePedidos, saveGaleria, upsertClienteDoPedido } from '../../core/state.js';
import { tempoParaHoras, formatBRL, custoPorKg, custoUnitario } from '../../core/utils.js';

const TAB_ATIVA_CLASSES = ['text-accent', 'border-accent'];
const TAB_INATIVA_CLASSES = ['text-gray-400', 'border-transparent', 'hover:text-gray-300'];
const TAB_TODAS_CLASSES = [...TAB_ATIVA_CLASSES, ...TAB_INATIVA_CLASSES];

const PAGAMENTO_ATIVO_CLASSES = ['border-accent', 'text-accent', 'bg-accent/10'];
const PAGAMENTO_INATIVO_CLASSES = ['border-gray-700', 'text-gray-400', 'hover:border-gray-600'];

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
        clienteSugestoes: container.querySelector('#calc-cliente-sugestoes'),
        clienteTelefone: container.querySelector('#calc-cliente-telefone'),
        clienteCep: container.querySelector('#calc-cliente-cep'),
        clienteRua: container.querySelector('#calc-cliente-rua'),
        clienteNumero: container.querySelector('#calc-cliente-numero'),
        clienteBairro: container.querySelector('#calc-cliente-bairro'),
        cepLoading: container.querySelector('#calc-cep-loading'),
        cepStatus: container.querySelector('#calc-cep-status'),
        pagamentoTipo: container.querySelector('#calc-pagamento-tipo'),
        desconto: container.querySelector('#calc-desconto'),
        labelDesconto: container.querySelector('#label-desconto'),
        resetBtn: container.querySelector('#calc-reset'),
        resetIcon: container.querySelector('#calc-reset-icon'),
        resetLabel: container.querySelector('#calc-reset-label'),
        addInsumoBtn: container.querySelector('#calc-add-insumo'),
        salvarBtn: container.querySelector('#calc-salvar-pedido'),
        salvarLabel: container.querySelector('#calc-salvar-label'),
        addGaleria: container.querySelector('#calc-add-galeria'),
        prontoView: container.querySelector('#calc-pronto-view'),
        resultadoView: container.querySelector('#calc-resultado-view'),
        resFilamento: container.querySelector('#res-filamento'),
        resInsumosEstoque: container.querySelector('#res-insumos-estoque'),
        resEnergia: container.querySelector('#res-energia'),
        resDepreciacao: container.querySelector('#res-depreciacao'),
        resExtras: container.querySelector('#res-extras'),
        resCustoTotal: container.querySelector('#res-custo-total'),
        resPrecoVenda: container.querySelector('#res-preco-venda'),
        resDesconto: container.querySelector('#res-desconto'),
        resLucroRs: container.querySelector('#res-lucro-rs'),
        modalCliente: container.querySelector('#calc-modal-cliente'),
        modalClienteMensagem: container.querySelector('#calc-modal-cliente-mensagem'),
        modalClienteInput: container.querySelector('#calc-modal-cliente-input'),
        modalClienteTelefoneWrap: container.querySelector('#calc-modal-cliente-telefone-wrap'),
        modalClienteTelefoneInput: container.querySelector('#calc-modal-cliente-telefone'),
        modalClienteConfirmar: container.querySelector('#calc-modal-cliente-confirmar'),
        modalClienteCancelar: container.querySelector('#calc-modal-cliente-cancelar'),
    };

    const pagamentoBtns = Array.from(container.querySelectorAll('[data-pagamento]'));

    let ultimoCalculo = null;
    let somenteLeitura = false;
    let acaoPendenteAposCliente = null;
    let modalExigeTelefone = false;
    let pedidoAtual = null; // pedido sendo visualizado (Acompanhamento/Histórico), null quando é um pedido novo
    let cepAbortController = null;

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
        els.clienteCep,
        els.clienteRua,
        els.clienteNumero,
        els.clienteBairro,
        els.desconto,
        els.addGaleria,
        ...pagamentoBtns,
    ];

    function setSomenteLeitura(valor) {
        somenteLeitura = valor;
        camposEditaveis.forEach((el) => {
            el.disabled = valor;
        });
        els.salvarBtn.classList.toggle('hidden', valor);
    }

    const RESET_BTN_CLASSE_LIMPAR =
        'text-xs font-semibold text-red-400 hover:text-red-300 flex items-center justify-center space-x-1.5 transition';
    const RESET_BTN_CLASSE_NOVO_PEDIDO =
        'text-xs font-semibold text-accent border border-accent/40 rounded-lg px-3 py-1.5 bg-accent/10 hover:bg-accent/20 flex items-center justify-center space-x-1.5 transition';

    // Alterna entre "modo edição/novo pedido" e "modo visualização de pedido salvo".
    function setModoVisualizacao(pedido) {
        if (!pedido) {
            els.resetBtn.className = RESET_BTN_CLASSE_LIMPAR;
            els.resetIcon.className = 'fa-solid fa-trash-can';
            els.resetLabel.innerText = 'Limpar';
            els.salvarLabel.innerText = 'Criar Pedido';
            setSomenteLeitura(false);
            return;
        }
        els.resetBtn.className = RESET_BTN_CLASSE_NOVO_PEDIDO;
        els.resetIcon.className = 'fa-solid fa-plus';
        els.resetLabel.innerText = 'Criar Novo Pedido';
        const editavel = pedido.status === 'Aguardando';
        els.salvarLabel.innerText = editavel ? 'Salvar Alteração' : 'Criar Pedido';
        setSomenteLeitura(!editavel);
    }

    // Abas: Pedido / Cliente / Pagamento
    function setTabCalc(tab) {
        container.querySelectorAll('[data-tab-calc]').forEach((btn) => {
            const ativo = btn.dataset.tabCalc === tab;
            btn.classList.remove(...TAB_TODAS_CLASSES);
            btn.classList.add(...(ativo ? TAB_ATIVA_CLASSES : TAB_INATIVA_CLASSES));
        });
        container.querySelectorAll('[data-tab-panel-calc]').forEach((painel) => {
            painel.classList.toggle('hidden', painel.dataset.tabPanelCalc !== tab);
        });
    }

    container.querySelectorAll('[data-tab-calc]').forEach((btn) => {
        btn.addEventListener('click', () => setTabCalc(btn.dataset.tabCalc));
    });
    setTabCalc('pedido');

    // Accordion (Detalhes Avançados)
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

    // Tipo de Pagamento
    function setPagamentoTipo(tipo) {
        els.pagamentoTipo.value = tipo;
        pagamentoBtns.forEach((btn) => {
            const ativo = btn.dataset.pagamento === tipo;
            PAGAMENTO_ATIVO_CLASSES.forEach((c) => btn.classList.toggle(c, ativo));
            PAGAMENTO_INATIVO_CLASSES.forEach((c) => btn.classList.toggle(c, !ativo));
        });
    }

    pagamentoBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            if (somenteLeitura) return;
            setPagamentoTipo(btn.dataset.pagamento);
            calcularOrcamento();
        });
    });
    setPagamentoTipo('Pix');

    // Busca de endereço por CEP (ViaCEP)
    function mostrarStatusCep(mensagem, tipo) {
        els.cepStatus.innerText = mensagem;
        els.cepStatus.className = `text-[11px] mt-1 ${tipo === 'erro' ? 'text-red-400' : 'text-green-400'}`;
        els.cepStatus.classList.remove('hidden');
    }

    async function buscarCep() {
        const cepDigits = els.clienteCep.value.replace(/\D/g, '');
        if (cepDigits.length !== 8) return;

        if (cepAbortController) cepAbortController.abort();
        cepAbortController = new AbortController();

        els.cepLoading.classList.remove('hidden');
        els.cepStatus.classList.add('hidden');

        try {
            const resp = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`, {
                signal: cepAbortController.signal,
            });
            const data = await resp.json();

            if (data.erro) {
                mostrarStatusCep('CEP não encontrado.', 'erro');
                return;
            }

            els.clienteRua.value = data.logradouro || els.clienteRua.value;
            els.clienteBairro.value = data.bairro || els.clienteBairro.value;
            calcularOrcamento();
            mostrarStatusCep('Endereço encontrado!', 'ok');
        } catch (err) {
            if (err.name === 'AbortError') return;
            mostrarStatusCep('Não foi possível buscar o CEP. Verifique sua conexão.', 'erro');
        } finally {
            els.cepLoading.classList.add('hidden');
        }
    }

    els.clienteCep.addEventListener('input', () => {
        const digits = els.clienteCep.value.replace(/\D/g, '').slice(0, 8);
        els.clienteCep.value = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
        els.cepStatus.classList.add('hidden');
        if (digits.length === 8) buscarCep();
    });

    // Autocomplete de clientes já cadastrados (via pedidos anteriores)
    function esconderSugestoesCliente() {
        els.clienteSugestoes.classList.add('hidden');
        els.clienteSugestoes.innerHTML = '';
    }

    function selecionarClienteSugerido(cliente) {
        els.clienteNome.value = cliente.nome;
        els.clienteTelefone.value = cliente.telefone || '';
        els.clienteCep.value = cliente.cep || '';
        els.clienteRua.value = cliente.rua || '';
        els.clienteNumero.value = cliente.numero || '';
        els.clienteBairro.value = cliente.bairro || '';
        esconderSugestoesCliente();
        calcularOrcamento();
    }

    els.clienteNome.addEventListener('input', () => {
        const termo = els.clienteNome.value.trim().toLowerCase();
        if (!termo) {
            esconderSugestoesCliente();
            return;
        }

        const encontrados = state.clientes.filter((c) => c.nome.toLowerCase().includes(termo)).slice(0, 6);
        if (encontrados.length === 0) {
            esconderSugestoesCliente();
            return;
        }

        els.clienteSugestoes.innerHTML = encontrados
            .map(
                (c, i) => `
                    <button type="button" data-sugestao-cliente="${i}" class="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-800 transition">
                        <span class="font-medium">${c.nome}</span>
                        ${c.telefone ? `<span class="text-xs text-gray-500 ml-2">${c.telefone}</span>` : ''}
                    </button>
                `
            )
            .join('');
        els.clienteSugestoes.classList.remove('hidden');

        els.clienteSugestoes.querySelectorAll('[data-sugestao-cliente]').forEach((btn) => {
            btn.addEventListener('mousedown', (evt) => {
                evt.preventDefault();
                selecionarClienteSugerido(encontrados[Number(btn.dataset.sugestaoCliente)]);
            });
        });
    });

    els.clienteNome.addEventListener('blur', esconderSugestoesCliente);

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

    // Calcula os valores a partir do estado atual do formulário. Separa o custo "base" (produção)
    // do custo dos "extras/acabamento" (campo Outros Custos) para que, no orçamento do cliente,
    // Subtotal + Extras/Acabamento = Total (antes do desconto) feche exatamente. O desconto (aba
    // Pagamento) é aplicado por último, sobre o valor total de venda.
    function calcularValores() {
        const nome = els.nome.value || 'Modelo Sem Nome';
        const qtd = parseInt(els.qtd.value, 10) || 1;
        const peso = parseFloat(els.peso.value) || 0;
        const tempoHoras = tempoParaHoras(els.tempo.value);
        const custoKg = Number.isNaN(parseFloat(els.custoKg.value)) ? 100 : parseFloat(els.custoKg.value);
        const tempoAcabamentoHoras = tempoParaHoras(els.tempoAcabamento.value);
        const outros = parseFloat(els.outros.value) || 0;
        const riscoPerc = parseFloat(els.risco.value) / 100;
        const lucroPerc = parseFloat(els.lucro.value) / 100;
        const descontoPerc = (parseFloat(els.desconto.value) || 0) / 100;

        const custoFilamento = (peso / 1000) * custoKg;
        const custoInsumosEstoqueTotal = state.insumosVinculados.reduce(
            (acc, curr) => acc + curr.custoUnitario * curr.qtd,
            0
        );
        const custoEnergia = (state.config.watts / 1000) * tempoHoras * state.config.kwh;
        const custoDepreciacao = (state.config.maquinaPreco / state.config.vidaUtil) * tempoHoras;
        const custoMaoDeObra = (tempoHoras + tempoAcabamentoHoras) * state.config.maoDeObra;

        const custoBaseSemExtras =
            custoFilamento + custoInsumosEstoqueTotal + custoEnergia + custoDepreciacao + custoMaoDeObra;

        const totalBaseGeral = custoBaseSemExtras * (1 + riscoPerc) * qtd;
        const totalExtrasGeral = outros * (1 + riscoPerc) * qtd;
        const totalPedidoGeral = totalBaseGeral + totalExtrasGeral;

        const precoVendaBase = totalBaseGeral * (1 + lucroPerc);
        const precoVendaExtras = totalExtrasGeral * (1 + lucroPerc);
        const precoVendaTotal = precoVendaBase + precoVendaExtras;

        const descontoValor = precoVendaTotal * descontoPerc;
        const precoVendaFinal = precoVendaTotal - descontoValor;
        const lucroFinal = precoVendaFinal - totalPedidoGeral;

        const filamentoNome = els.filamentoSelect.value
            ? els.filamentoSelect.options[els.filamentoSelect.selectedIndex].text.replace(/\s*\(R\$.*\)$/, '')
            : 'Custo Manual/Padrão';

        return {
            nome,
            qtd,
            peso,
            tempoHoras,
            custoKg,
            filamentoNome,
            custoFilamento,
            custoInsumosEstoqueTotal,
            custoEnergia,
            custoDepreciacao,
            custoMaoDeObra,
            outros,
            totalPedidoGeral,
            precoVendaBase,
            precoVendaExtras,
            precoVendaTotal,
            descontoPerc,
            descontoValor,
            precoVendaFinal,
            lucroFinal,
            pagamentoTipo: els.pagamentoTipo.value,
        };
    }

    function calcularOrcamento() {
        els.prontoView.classList.add('hidden');
        els.resultadoView.classList.remove('hidden');

        const v = calcularValores();

        els.resFilamento.innerText = formatBRL(v.custoFilamento);
        els.resInsumosEstoque.innerText = formatBRL(v.custoInsumosEstoqueTotal);
        els.resEnergia.innerText = formatBRL(v.custoEnergia);
        els.resDepreciacao.innerText = formatBRL(v.custoDepreciacao + v.custoMaoDeObra);
        els.resExtras.innerText = formatBRL(v.outros);
        els.resCustoTotal.innerText = formatBRL(v.totalPedidoGeral);
        els.resPrecoVenda.innerText = formatBRL(v.precoVendaFinal);
        els.resLucroRs.innerText = `Lucro estimado: ${formatBRL(v.lucroFinal)}`;

        if (v.descontoValor > 0.001) {
            els.resDesconto.innerText = `Desconto de ${els.desconto.value}%: -${formatBRL(v.descontoValor)}`;
            els.resDesconto.classList.remove('hidden');
        } else {
            els.resDesconto.classList.add('hidden');
        }

        ultimoCalculo = {
            nome: v.nome,
            qtd: v.qtd,
            peso: v.peso,
            tempo: els.tempo.value,
            tempoAcabamento: els.tempoAcabamento.value,
            custoKg: v.custoKg,
            filamentoNome: v.filamentoNome,
            outros: v.outros,
            risco: els.risco.value,
            lucro: els.lucro.value,
            desconto: els.desconto.value,
            pagamentoTipo: v.pagamentoTipo,
            insumosVinculados: state.insumosVinculados.map((i) => ({ ...i })),
            clienteNome: els.clienteNome.value,
            clienteTelefone: els.clienteTelefone.value,
            clienteCep: els.clienteCep.value,
            clienteRua: els.clienteRua.value,
            clienteNumero: els.clienteNumero.value,
            clienteBairro: els.clienteBairro.value,
            custoTotal: v.precoVendaFinal,
            lucroRs: v.lucroFinal,
            status: 'Aguardando',
            data: new Date().toLocaleDateString('pt-BR'),
        };
    }

    function limparErros() {
        els.nome.classList.remove('campo-erro');
        els.peso.classList.remove('campo-erro');
        els.tempo.classList.remove('campo-erro');
        els.clienteNome.classList.remove('campo-erro');
    }

    function resetCalc() {
        limparErros();
        pedidoAtual = null;
        setModoVisualizacao(null);
        setTabCalc('pedido');
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
        els.clienteCep.value = '';
        els.clienteRua.value = '';
        els.clienteNumero.value = '';
        els.clienteBairro.value = '';
        els.cepStatus.classList.add('hidden');
        setPagamentoTipo('Pix');
        els.desconto.value = '0';
        els.labelDesconto.innerText = '0%';
        els.addGaleria.checked = false;
        setAccordion('detalhes', false);
        state.insumosVinculados = [];
        renderInsumosVinculados();
        calcularOrcamento();
    }

    // Preenche o formulário com um pedido já existente (Acompanhamento/Histórico) apenas para visualização.
    function loadPedido(pedido) {
        limparErros();
        pedidoAtual = pedido;
        setModoVisualizacao(pedido);
        setTabCalc('pedido');
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
        els.clienteCep.value = pedido.clienteCep || '';
        els.clienteRua.value = pedido.clienteRua || pedido.clienteEndereco || '';
        els.clienteNumero.value = pedido.clienteNumero || '';
        els.clienteBairro.value = pedido.clienteBairro || '';
        els.cepStatus.classList.add('hidden');
        setPagamentoTipo(pedido.pagamentoTipo || 'Pix');
        els.desconto.value = pedido.desconto ?? 0;
        els.labelDesconto.innerText = `${els.desconto.value}%`;

        state.insumosVinculados = (pedido.insumosVinculados || []).map((i) => ({ ...i }));
        renderInsumosVinculados();

        const temDetalhesNaoPadrao =
            (pedido.tempoAcabamento && pedido.tempoAcabamento !== '00:00') ||
            Number(pedido.outros) > 0 ||
            (pedido.risco !== undefined && Number(pedido.risco) !== 5) ||
            (pedido.lucro !== undefined && Number(pedido.lucro) !== 100);

        setAccordion('detalhes', Boolean(temDetalhesNaoPadrao));

        calcularOrcamento();
    }

    // Carrega um modelo da Galeria (produto de saída recorrente): traz apenas os dados da aba
    // Pedido (nome, peso, tempo, filamento, insumos, detalhes avançados). Cliente e Pagamento
    // voltam ao padrão, prontos para serem preenchidos na criação deste novo pedido.
    function carregarModelo(item) {
        limparErros();
        pedidoAtual = null;
        setModoVisualizacao(null);
        setTabCalc('pedido');

        els.nome.value = item.nome || '';
        els.qtd.value = item.qtd || 1;
        els.peso.value = item.peso || 0;
        els.tempo.value = item.tempo || '00:00';
        els.tempoAcabamento.value = item.tempoAcabamento || '00:00';
        els.custoKg.value = item.custoKg ?? state.config.custoKgPadrao;
        els.outros.value = item.outros ?? 0;
        els.risco.value = item.risco ?? 5;
        els.labelRisco.innerText = `${els.risco.value}%`;
        els.lucro.value = item.lucro ?? 100;
        els.labelLucro.innerText = `${els.lucro.value}%`;

        els.clienteNome.value = '';
        els.clienteTelefone.value = '';
        els.clienteCep.value = '';
        els.clienteRua.value = '';
        els.clienteNumero.value = '';
        els.clienteBairro.value = '';
        els.cepStatus.classList.add('hidden');
        setPagamentoTipo('Pix');
        els.desconto.value = '0';
        els.labelDesconto.innerText = '0%';
        els.addGaleria.checked = false;

        state.insumosVinculados = (item.insumosVinculados || []).map((i) => ({ ...i }));
        renderInsumosVinculados();

        const temDetalhesNaoPadrao =
            (item.tempoAcabamento && item.tempoAcabamento !== '00:00') ||
            Number(item.outros) > 0 ||
            (item.risco !== undefined && Number(item.risco) !== 5) ||
            (item.lucro !== undefined && Number(item.lucro) !== 100);

        setAccordion('detalhes', Boolean(temDetalhesNaoPadrao));

        calcularOrcamento();
    }

    // Eventos
    [els.qtd, els.peso, els.tempo, els.custoKg, els.tempoAcabamento, els.outros, els.nome].forEach((input) => {
        input.addEventListener('input', calcularOrcamento);
    });

    [els.clienteNome, els.clienteTelefone, els.clienteCep, els.clienteRua, els.clienteNumero, els.clienteBairro].forEach(
        (input) => {
            input.addEventListener('input', calcularOrcamento);
        }
    );

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

    els.desconto.addEventListener('input', () => {
        els.labelDesconto.innerText = `${els.desconto.value}%`;
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

        if (!valido) setTabCalc('pedido');

        return valido;
    }

    function abrirModalCliente(acaoContinuar, exigirTelefone, mensagem) {
        acaoPendenteAposCliente = acaoContinuar;
        modalExigeTelefone = exigirTelefone;
        els.modalClienteMensagem.innerText = mensagem;
        els.modalClienteInput.value = els.clienteNome.value;
        els.modalClienteTelefoneInput.value = els.clienteTelefone.value;
        els.modalClienteTelefoneWrap.classList.toggle('hidden', !exigirTelefone);
        els.modalCliente.classList.remove('hidden');
        els.modalCliente.classList.add('flex');

        const foco = !els.modalClienteInput.value.trim() ? els.modalClienteInput : els.modalClienteTelefoneInput;
        foco.focus();
    }

    function fecharModalCliente() {
        acaoPendenteAposCliente = null;
        els.modalCliente.classList.remove('flex');
        els.modalCliente.classList.add('hidden');
    }

    function confirmarModalCliente() {
        const nome = els.modalClienteInput.value.trim();
        if (!nome) {
            piscarErro(els.modalClienteInput);
            return;
        }

        let telefone = els.modalClienteTelefoneInput.value.trim();
        if (modalExigeTelefone && !telefone) {
            piscarErro(els.modalClienteTelefoneInput);
            return;
        }

        els.clienteNome.value = nome;
        if (telefone) els.clienteTelefone.value = telefone;
        setTabCalc('cliente');
        calcularOrcamento();

        const acao = acaoPendenteAposCliente;
        fecharModalCliente();
        acao && acao();
    }

    els.modalClienteCancelar.addEventListener('click', fecharModalCliente);
    els.modalClienteConfirmar.addEventListener('click', confirmarModalCliente);
    [els.modalClienteInput, els.modalClienteTelefoneInput].forEach((input) => {
        input.addEventListener('keydown', (evt) => {
            if (evt.key === 'Enter') confirmarModalCliente();
        });
    });

    // Nome (sempre) e telefone (apenas para WhatsApp) só são exigidos na hora de EMITIR o orçamento,
    // não para salvar o pedido. Se estiver faltando algo, abre um modal para o usuário informar; ao
    // confirmar, preenche o formulário e retoma automaticamente a ação (baixar PDF ou enviar WhatsApp).
    function garantirDadosCliente(acaoContinuar, exigirTelefone) {
        const faltaNome = !els.clienteNome.value.trim();
        const faltaTelefone = exigirTelefone && !els.clienteTelefone.value.trim();
        if (!faltaNome && !faltaTelefone) return true;

        if (somenteLeitura) {
            alert(
                `Este pedido não tem ${faltaNome && faltaTelefone ? 'nome nem telefone do cliente informados' : faltaTelefone ? 'telefone do cliente informado' : 'nome do cliente informado'} e está em modo de somente leitura — não é possível editá-lo para emitir o orçamento.`
            );
            return false;
        }

        let mensagem;
        if (faltaNome && faltaTelefone) {
            mensagem = 'Para enviar pelo WhatsApp é necessário informar o nome e o telefone do cliente.';
        } else if (faltaTelefone) {
            mensagem = 'Para enviar pelo WhatsApp é necessário informar o telefone do cliente.';
        } else {
            mensagem = 'Para emitir o orçamento é necessário informar o nome do cliente.';
        }

        abrirModalCliente(acaoContinuar, exigirTelefone, mensagem);
        return false;
    }

    container.querySelector('#calc-salvar-pedido').addEventListener('click', () => {
        if (somenteLeitura) return;
        if (!validarCamposBasicos()) return;
        if (!ultimoCalculo) {
            alert('Preencha os dados do modelo antes de salvar!');
            return;
        }
        const editandoExistente = pedidoAtual && pedidoAtual.status === 'Aguardando';

        if (editandoExistente) {
            state.pedidos = state.pedidos.map((p) =>
                p.id === pedidoAtual.id ? { ...ultimoCalculo, id: p.id } : p
            );
        } else {
            state.pedidos.unshift({ id: Date.now(), ...ultimoCalculo });
        }
        savePedidos();
        upsertClienteDoPedido(ultimoCalculo);

        if (els.addGaleria.checked) {
            state.galeria.unshift({
                id: Date.now() + 1,
                nome: ultimoCalculo.nome,
                qtd: ultimoCalculo.qtd,
                peso: ultimoCalculo.peso,
                tempo: ultimoCalculo.tempo,
                tempoAcabamento: ultimoCalculo.tempoAcabamento,
                custoKg: ultimoCalculo.custoKg,
                filamentoNome: ultimoCalculo.filamentoNome,
                outros: ultimoCalculo.outros,
                risco: ultimoCalculo.risco,
                lucro: ultimoCalculo.lucro,
                insumosVinculados: ultimoCalculo.insumosVinculados,
            });
            saveGaleria();
            els.addGaleria.checked = false;
        }

        alert(editandoExistente ? 'Alterações salvas com sucesso!' : 'Projeto salvo com sucesso no Acompanhamento!');
        onPedidoSalvo();
    });

    // Monta os dados prontos para exibição no orçamento (PDF e WhatsApp), a partir do estado atual do formulário.
    function montarDadosOrcamento() {
        const v = calcularValores();
        const hoje = new Date().toLocaleDateString('pt-BR');

        const numero = String((pedidoAtual ? pedidoAtual.id : Date.now()) % 100000).padStart(5, '0');
        const data = pedidoAtual ? pedidoAtual.data : hoje;

        const ruaNumero = [els.clienteRua.value.trim(), els.clienteNumero.value.trim()].filter(Boolean).join(', ');
        const enderecoCompleto = [ruaNumero, els.clienteBairro.value.trim(), els.clienteCep.value.trim()]
            .filter(Boolean)
            .join(' - ');

        return {
            numero,
            data,
            clienteNome: els.clienteNome.value.trim(),
            clienteTelefone: els.clienteTelefone.value.trim(),
            clienteEndereco: enderecoCompleto,
            pagamentoTipo: v.pagamentoTipo,
            itemNome: v.nome,
            itemDetalhe: `Material: ${v.filamentoNome} | Tempo: ${els.tempo.value} | Peso: ${v.peso}g`,
            qtd: v.qtd,
            unitario: v.precoVendaBase / v.qtd,
            subtotal: v.precoVendaBase,
            extras: v.precoVendaExtras,
            descontoPerc: els.desconto.value,
            descontoValor: v.descontoValor,
            total: v.precoVendaFinal,
        };
    }

    function gerarPdfOrcamento() {
        if (!validarCamposBasicos()) return;
        if (!garantirDadosCliente(gerarPdfOrcamento, false)) return;
        const d = montarDadosOrcamento();

        const linhaCliente = d.clienteTelefone || d.clienteEndereco
            ? [d.clienteTelefone, d.clienteEndereco].filter(Boolean).join(' | ')
            : 'Serviços de Impressão 3D Profissional';

        const linhaDesconto =
            d.descontoValor > 0.001
                ? `<div class="linha"><span>Desconto (${d.descontoPerc}%)</span><span>-${formatBRL(d.descontoValor)}</span></div>`
                : '';

        const html = `
            <!doctype html>
            <html lang="pt-BR">
            <head>
                <meta charset="utf-8">
                <title>Orçamento ${d.numero} - ${d.itemNome}</title>
                <style>
                    * { box-sizing: border-box; }
                    body { font-family: Arial, Helvetica, sans-serif; color: #111; padding: 48px; max-width: 760px; margin: 0 auto; }
                    .cabecalho { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 24px; }
                    .logo { font-size: 22px; font-weight: 900; }
                    .logo span { color: #06b6d4; }
                    .cabecalho-direita { text-align: right; }
                    .cabecalho-direita h1 { font-size: 26px; margin: 0; letter-spacing: 0.02em; }
                    .cabecalho-direita p { margin: 4px 0 0; font-size: 12px; color: #555; }
                    h3.rotulo { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #777; margin: 0 0 8px; }
                    .caixa-cliente { border: 1px solid #ddd; border-radius: 10px; padding: 16px 20px; margin-bottom: 28px; }
                    .caixa-cliente .nome { font-size: 16px; font-weight: 700; margin: 0; }
                    .caixa-cliente .sub { font-size: 13px; color: #666; margin: 2px 0 0; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
                    thead td { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #777; padding-bottom: 8px; border-bottom: 2px solid #111; }
                    tbody td { padding: 14px 0; border-bottom: 1px solid #eee; vertical-align: top; }
                    td.col-item .item-nome { font-weight: 700; font-size: 14px; }
                    td.col-item .item-detalhe { font-size: 12px; color: #666; margin-top: 2px; }
                    td.num { text-align: right; font-family: 'Courier New', monospace; white-space: nowrap; }
                    td.num.total-item { font-weight: 700; }
                    .resumo { width: 260px; margin-left: auto; margin-top: 16px; }
                    .resumo .linha { display: flex; justify-content: space-between; font-size: 14px; padding: 6px 0; }
                    .resumo .linha.total { border-top: 2px solid #111; margin-top: 6px; padding-top: 12px; font-size: 20px; font-weight: 900; }
                    .pagamento { margin-top: 20px; font-size: 13px; color: #444; }
                    footer { margin-top: 48px; font-size: 11px; color: #888; text-align: center; line-height: 1.6; }
                    footer .marca { font-weight: 700; color: #333; margin-top: 4px; }
                </style>
            </head>
            <body>
                <div class="cabecalho">
                    <div class="logo">JENILAB <span>3D</span></div>
                    <div class="cabecalho-direita">
                        <h1>ORÇAMENTO</h1>
                        <p>Ref: #${d.numero}</p>
                        <p>Data: ${d.data}</p>
                    </div>
                </div>

                <h3 class="rotulo">Cliente</h3>
                <div class="caixa-cliente">
                    <p class="nome">${d.clienteNome || 'Cliente não informado'}</p>
                    <p class="sub">${linhaCliente}</p>
                </div>

                <h3 class="rotulo">Detalhamento do Projeto</h3>
                <table>
                    <thead>
                        <tr>
                            <td>Item / Descrição</td>
                            <td class="num">Qtd</td>
                            <td class="num">Unitário</td>
                            <td class="num">Total</td>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="col-item">
                                <div class="item-nome">${d.itemNome}</div>
                                <div class="item-detalhe">${d.itemDetalhe}</div>
                            </td>
                            <td class="num">${d.qtd}</td>
                            <td class="num">${formatBRL(d.unitario)}</td>
                            <td class="num total-item">${formatBRL(d.subtotal)}</td>
                        </tr>
                    </tbody>
                </table>

                <div class="resumo">
                    <div class="linha"><span>Subtotal</span><span>${formatBRL(d.subtotal)}</span></div>
                    <div class="linha"><span>Extras / Acabamento</span><span>${formatBRL(d.extras)}</span></div>
                    ${linhaDesconto}
                    <div class="linha total"><span>TOTAL</span><span>${formatBRL(d.total)}</span></div>
                </div>

                <p class="pagamento"><strong>Forma de Pagamento:</strong> ${d.pagamentoTipo}</p>

                <footer>
                    <p>Orçamento válido por 7 dias. Sujeito a alteração conforme disponibilidade de material.</p>
                    <p class="marca">JeniLab 3D – Tecnologia e Inovação</p>
                    <p>© 2026 JeniLab 3D. Todos os direitos reservados.</p>
                </footer>
            </body>
            </html>
        `;

        const janela = window.open('', '_blank', 'width=800,height=900');
        if (!janela) {
            alert('Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-ups.');
            return;
        }
        janela.document.open();
        janela.document.write(html);
        janela.document.close();
        janela.focus();
        setTimeout(() => janela.print(), 250);
    }

    function enviarWhatsapp() {
        if (!validarCamposBasicos()) return;
        if (!garantirDadosCliente(enviarWhatsapp, true)) return;
        const d = montarDadosOrcamento();

        const linhas = [
            '*JENILAB 3D*',
            `*ORÇAMENTO Nº ${d.numero}*`,
            `Data: ${d.data}`,
            '',
            `*Cliente:* ${d.clienteNome || 'Não informado'}`,
            '',
            `*Projeto:* ${d.itemNome}`,
            d.itemDetalhe,
            `Qtd: ${d.qtd} | Unitário: ${formatBRL(d.unitario)} | Total: ${formatBRL(d.subtotal)}`,
            '',
            `Subtotal: ${formatBRL(d.subtotal)}`,
            `Extras/Acabamento: ${formatBRL(d.extras)}`,
        ];

        if (d.descontoValor > 0.001) {
            linhas.push(`Desconto (${d.descontoPerc}%): -${formatBRL(d.descontoValor)}`);
        }

        linhas.push(
            `*TOTAL: ${formatBRL(d.total)}*`,
            `Forma de Pagamento: ${d.pagamentoTipo}`,
            '',
            '_Orçamento válido por 7 dias. Sujeito a alteração conforme disponibilidade de material._',
            'JeniLab 3D – Tecnologia e Inovação'
        );

        const telefoneDigitos = d.clienteTelefone.replace(/\D/g, '');
        const destino = telefoneDigitos.length >= 10 ? telefoneDigitos : '';

        const url = `https://wa.me/${destino}?text=${encodeURIComponent(linhas.join('\n'))}`;
        window.open(url, '_blank');
    }

    container.querySelector('#calc-baixar-orcamento').addEventListener('click', gerarPdfOrcamento);
    container.querySelector('#calc-whatsapp').addEventListener('click', enviarWhatsapp);

    // Estado inicial
    els.custoKg.value = state.config.custoKgPadrao;
    setModoVisualizacao(null);
    refreshSelects();
    renderInsumosVinculados();
    calcularOrcamento();

    return { refreshSelects, loadPedido, carregarModelo };
}
