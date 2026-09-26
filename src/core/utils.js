export function tempoParaHoras(tempoStr) {
    if (!tempoStr || !tempoStr.includes(':')) return parseFloat(tempoStr) || 0;
    const [horas, minutos] = tempoStr.split(':');
    return (parseFloat(horas) || 0) + ((parseFloat(minutos) || 0) / 60);
}

// Liga um <input> de texto a uma máscara de horário HH:MM por "segmentos", como um campo de
// data/hora nativo: clicar posiciona qual dígito (HH-dezena, HH-unidade, MM-dezena ou MM-unidade)
// vai ser sobrescrito, e cada tecla digitada sobrescreve aquele dígito e avança para o próximo —
// sem embaralhar os outros dígitos e sem forçar o cursor pro fim ao clicar. Horas ficam entre
// 00-24 e minutos entre 00-59 (24:00 força minutos a 00).
export function bindTempoMask(inputEl, aoAlterar) {
    // Posição (índice na string "HH:MM") de cada um dos 4 dígitos editáveis.
    const POSICAO_DIGITO = [0, 1, 3, 4];
    let digitos = ['0', '0', '0', '0'];

    function pad2(n) {
        return String(n).padStart(2, '0');
    }

    function clampDigitos() {
        let horas = Math.min(parseInt(digitos[0] + digitos[1], 10), 24);
        let minutos = parseInt(digitos[2] + digitos[3], 10);
        if (horas >= 24) minutos = 0;
        else if (minutos > 59) minutos = 59;
        const h = pad2(horas);
        const m = pad2(minutos);
        digitos = [h[0], h[1], m[0], m[1]];
    }

    function render() {
        clampDigitos();
        inputEl.value = `${digitos[0]}${digitos[1]}:${digitos[2]}${digitos[3]}`;
    }

    // Dado a posição do cursor (gap entre caracteres), qual dígito seria sobrescrito a seguir.
    function digitoNaPosicaoCursor(gap) {
        if (gap <= 1) return gap;
        if (gap <= 3) return 2;
        return 3;
    }

    // Dado a posição do cursor, qual dígito já digitado fica imediatamente antes (para Backspace).
    function digitoAntesDoCursor(gap) {
        for (let i = 3; i >= 0; i -= 1) {
            if (POSICAO_DIGITO[i] < gap) return i;
        }
        return null;
    }

    function moverCursorApos(indiceDigito) {
        const pos = POSICAO_DIGITO[indiceDigito] + 1;
        inputEl.setSelectionRange(pos, pos);
    }

    // Seleciona o segmento inteiro (as duas horas ou os dois minutos), como um campo de
    // data/hora nativo: destaca o par de dígitos para que a próxima tecla já sobrescreva os dois.
    function selecionarSegmento(indiceInicial) {
        inputEl.setSelectionRange(POSICAO_DIGITO[indiceInicial], POSICAO_DIGITO[indiceInicial + 1] + 1);
    }

    inputEl.addEventListener('focus', () => selecionarSegmento(0));

    inputEl.addEventListener('mouseup', (evt) => {
        // Evita que o mouseup padrão desfaça a seleção do segmento que acabamos de aplicar.
        evt.preventDefault();
        const gap = digitoNaPosicaoCursor(inputEl.selectionStart) < 2 ? 0 : 2;
        selecionarSegmento(gap);
    });

    inputEl.addEventListener('keydown', (evt) => {
        if (evt.ctrlKey || evt.metaKey || evt.altKey) return;

        if (/^[0-9]$/.test(evt.key)) {
            evt.preventDefault();
            const indice = digitoNaPosicaoCursor(inputEl.selectionStart);
            digitos[indice] = evt.key;
            render();
            if (indice === 1) selecionarSegmento(2);
            else moverCursorApos(indice);
            aoAlterar();
            return;
        }

        if (evt.key === 'Backspace' || evt.key === 'Delete') {
            evt.preventDefault();
            if (inputEl.selectionStart === POSICAO_DIGITO[2] && inputEl.selectionStart === inputEl.selectionEnd) {
                selecionarSegmento(0);
                return;
            }
            const indice = digitoAntesDoCursor(inputEl.selectionStart);
            if (indice === null) return;
            digitos[indice] = '0';
            render();
            inputEl.setSelectionRange(POSICAO_DIGITO[indice], POSICAO_DIGITO[indice]);
            aoAlterar();
            return;
        }

        const teclasPermitidas = ['Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Shift'];
        if (!teclasPermitidas.includes(evt.key)) evt.preventDefault();
    });

    inputEl.addEventListener('paste', (evt) => {
        evt.preventDefault();
        const texto = (evt.clipboardData || window.clipboardData).getData('text');
        const novosDigitos = texto.replace(/\D/g, '');
        if (!novosDigitos) return;

        let gap = inputEl.selectionStart;
        let ultimoIndice = null;
        for (const digito of novosDigitos) {
            const indice = digitoNaPosicaoCursor(gap);
            digitos[indice] = digito;
            ultimoIndice = indice;
            gap = POSICAO_DIGITO[indice] + 1;
        }
        render();
        if (ultimoIndice !== null) moverCursorApos(ultimoIndice);
        aoAlterar();
    });

    return {
        setValue(valor) {
            const brutos = (valor || '').replace(/\D/g, '').padEnd(4, '0').slice(0, 4);
            digitos = brutos.split('');
            render();
        },
    };
}

// Liga um <input> de texto a uma máscara decimal estilo "valor monetário": os dígitos digitados
// entram sempre pela direita, os 2 últimos são a parte decimal (depois da vírgula) e o resto é a
// parte inteira com separador de milhar (ponto) — igual ao campo de valor de qualquer banco/loja.
// Clicar no campo seleciona o valor todo, pronto pra sobrescrever digitando (00 → 0,00 → 00,00 →
// 000,00 → 1.000,00 ...).
export function bindDecimalMask(inputEl, aoAlterar) {
    let centesimos = 0;

    function formatar(valor) {
        const inteiro = Math.floor(valor / 100);
        const decimal = String(valor % 100).padStart(2, '0');
        return `${inteiro.toLocaleString('pt-BR')},${decimal}`;
    }

    function render() {
        inputEl.value = formatar(centesimos);
    }

    inputEl.addEventListener('focus', () => inputEl.select());

    inputEl.addEventListener('mouseup', (evt) => {
        // Evita que o mouseup padrão desfaça a seleção total que acabamos de aplicar no focus.
        evt.preventDefault();
        inputEl.select();
    });

    inputEl.addEventListener('keydown', (evt) => {
        if (evt.ctrlKey || evt.metaKey || evt.altKey) return;

        if (/^[0-9]$/.test(evt.key)) {
            evt.preventDefault();
            centesimos = Math.min(centesimos * 10 + Number(evt.key), Number.MAX_SAFE_INTEGER);
            render();
            aoAlterar();
            return;
        }

        if (evt.key === 'Backspace' || evt.key === 'Delete') {
            evt.preventDefault();
            centesimos = Math.floor(centesimos / 10);
            render();
            aoAlterar();
            return;
        }

        const teclasPermitidas = ['Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Shift'];
        if (!teclasPermitidas.includes(evt.key)) evt.preventDefault();
    });

    inputEl.addEventListener('paste', (evt) => {
        evt.preventDefault();
        const texto = (evt.clipboardData || window.clipboardData).getData('text');
        const digitos = texto.replace(/\D/g, '');
        if (!digitos) return;
        centesimos = Number(digitos);
        render();
        aoAlterar();
    });

    render();

    return {
        getValue() {
            return centesimos / 100;
        },
        setValue(valor) {
            centesimos = Math.round((Number(valor) || 0) * 100);
            render();
        },
    };
}

export function formatBRL(value) {
    return `R$ ${value.toFixed(2)}`;
}

export function custoPorKg(item) {
    return (item.custoTotal / item.qtdTotal) * 1000;
}

export function custoUnitario(item) {
    return item.custoTotal / item.qtdTotal;
}
