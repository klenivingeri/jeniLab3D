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

    inputEl.addEventListener('keydown', (evt) => {
        if (evt.ctrlKey || evt.metaKey || evt.altKey) return;

        if (/^[0-9]$/.test(evt.key)) {
            evt.preventDefault();
            const indice = digitoNaPosicaoCursor(inputEl.selectionStart);
            digitos[indice] = evt.key;
            render();
            moverCursorApos(indice);
            aoAlterar();
            return;
        }

        if (evt.key === 'Backspace' || evt.key === 'Delete') {
            evt.preventDefault();
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

export function formatBRL(value) {
    return `R$ ${value.toFixed(2)}`;
}

export function custoPorKg(item) {
    return (item.custoTotal / item.qtdTotal) * 1000;
}

export function custoUnitario(item) {
    return item.custoTotal / item.qtdTotal;
}
