export function tempoParaHoras(tempoStr) {
    if (!tempoStr || !tempoStr.includes(':')) return parseFloat(tempoStr) || 0;
    const [horas, minutos] = tempoStr.split(':');
    return (parseFloat(horas) || 0) + ((parseFloat(minutos) || 0) / 60);
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
