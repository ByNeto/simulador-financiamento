const TAXA_JUROS_ANUAL = 10.5;
const TAXA_SEGURO_ANUAL = 0.6;

function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function limparMoeda(str) {
  return parseFloat(str.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
}

function idadeValida(data) {
  const nascimento = new Date(data);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) idade--;
  return idade >= 18 && idade <= 70;
}

function aplicarMascara(input) {
  input.addEventListener('input', () => {
    let v = input.value.replace(/\D/g, '');
    v = (parseInt(v) / 100).toFixed(2) + '';
    v = v.replace('.', ',');
    v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    input.value = 'R$ ' + v;
  });
}

window.addEventListener('DOMContentLoaded', () => {
  aplicarMascara(document.getElementById('valorImovel'));
  aplicarMascara(document.getElementById('valorEntrada'));

  document.getElementById('valorImovel').addEventListener('input', validarValores);
  document.getElementById('valorEntrada').addEventListener('input', validarValores);
});

function validarValores() {
  const vi = limparMoeda(document.getElementById('valorImovel').value);
  const ve = limparMoeda(document.getElementById('valorEntrada').value);

  const campoImovel = document.getElementById('valorImovel');
  const campoEntrada = document.getElementById('valorEntrada');

  if (vi < 200000 || vi > 10000000) {
    campoImovel.classList.add('is-invalid');
  } else {
    campoImovel.classList.remove('is-invalid');
  }

  if (ve < vi * 0.1 || ve >= vi) {
    campoEntrada.classList.add('is-invalid');
  } else {
    campoEntrada.classList.remove('is-invalid');
  }
}

function simular() {
    
  const vi = limparMoeda(document.getElementById('valorImovel').value);
  const ve = limparMoeda(document.getElementById('valorEntrada').value);
  const prazo = parseInt(document.getElementById('prazo').value);
  const nasc = document.getElementById('dataNascimento').value;

  validarValores();
  document.getElementById('erroIdade').style.display = idadeValida(nasc) ? 'none' : 'block';

  if (vi < 200000 || vi > 10000000 || ve < vi * 0.1 || ve >= vi || !idadeValida(nasc) || prazo < 12 || prazo > 360) {
    return;
  }

  const vf = vi - ve;
  const tm = TAXA_JUROS_ANUAL / 12 / 100;
  const ts = TAXA_SEGURO_ANUAL / 12 / 100;

  function calcular(tipo) {
    let parcelas = [], jurosTotal = 0, totalPago = 0, totalSeguro = 0, saldo = vf;
    const amort = tipo === 'SAC' ? vf / prazo : null;
    const parcelaFixa = tipo === 'PRICE' ? vf * (tm * Math.pow(1 + tm, prazo)) / (Math.pow(1 + tm, prazo) - 1) : null;

    for (let i = 1; i <= prazo; i++) {
      let juros = saldo * tm;
      let seguro = saldo * ts;
      let amortizacao = tipo === 'SAC' ? amort : parcelaFixa - juros;
      let total = tipo === 'SAC' ? amort + juros + seguro : parcelaFixa + seguro;
      saldo -= amortizacao;
      parcelas.push({ parcela: i, amortizacao, juros, seguro, total });
      jurosTotal += juros;
      totalSeguro += seguro;
      totalPago += total;
    }
    return { parcelas, primeira: parcelas[0].total, ultima: parcelas[parcelas.length - 1].total, jurosTotal, totalPago, totalSeguro };
  }

  const sac = calcular('SAC');
  const price = calcular('PRICE');
  const tmPct = (tm * 100).toFixed(4).replace('.', ',');
  const tsPct = (ts * 100).toFixed(4).replace('.', ',');

  const resumo = tipo => `
    <div class="card simulacao-card">
      <div class="card-body">
        <h5 class="card-title">Resumo (${tipo})</h5>
        <p>Valor Financiado: <strong>${formatarMoeda(vf)}</strong></p>
        <p>Juros ao ano: <strong>${TAXA_JUROS_ANUAL}%</strong> | ao mês: <strong>${tmPct}%</strong><br>
        Seguros MIP/DFI: <strong>${TAXA_SEGURO_ANUAL}%</strong> ao ano | <strong>${tsPct}%</strong> ao mês</p>
        <p>1ª Parcela: ${formatarMoeda(eval(tipo.toLowerCase()).primeira)}<br>
           Última: ${formatarMoeda(eval(tipo.toLowerCase()).ultima)}</p>
        <p>Total Juros: ${formatarMoeda(eval(tipo.toLowerCase()).jurosTotal)}<br>
           Total Seguros: ${formatarMoeda(eval(tipo.toLowerCase()).totalSeguro)}<br>
           Total Pago: ${formatarMoeda(eval(tipo.toLowerCase()).totalPago)}</p>
        <button class="btn btn-outline-secondary mt-2" type="button" onclick="toggleTabela('${tipo}')">
          Ver Tabela de Parcelas
        </button>
      </div>
    </div>`;

  const tabela = (tipo, dados) => `
    <div class="collapse mt-3" id="tabela${tipo}">
      <div class="card card-body">
        <h6>Tabela de Parcelas (${tipo})</h6>
        <table class="table table-sm table-bordered">
          <thead><tr><th>#</th><th>Amortização</th><th>Juros</th><th>Seguro</th><th>Total</th></tr></thead>
          <tbody>
            ${dados.parcelas.map(p => `
              <tr><td>${p.parcela}</td>
                  <td>${formatarMoeda(p.amortizacao)}</td>
                  <td>${formatarMoeda(p.juros)}</td>
                  <td>${formatarMoeda(p.seguro)}</td>
                  <td>${formatarMoeda(p.total)}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  const comparativo = `
    <div class="card mt-4 border-default">
      <div class="card-header bg-default">Comparativo Final</div>
      <div class="card-body">
        <table class="table table-bordered text-center">
          <thead><tr><th>Sistema</th><th>1ª Parcela</th><th>Última</th><th>Juros Totais</th><th>Seguros Totais</th><th>Total Pago</th></tr></thead>
          <tbody>
            <tr><td>SAC</td><td>${formatarMoeda(sac.primeira)}</td><td>${formatarMoeda(sac.ultima)}</td><td>${formatarMoeda(sac.jurosTotal)}</td><td>${formatarMoeda(sac.totalSeguro)}</td><td>${formatarMoeda(sac.totalPago)}</td></tr>
            <tr><td>PRICE</td><td>${formatarMoeda(price.primeira)}</td><td>${formatarMoeda(price.ultima)}</td><td>${formatarMoeda(price.jurosTotal)}</td><td>${formatarMoeda(price.totalSeguro)}</td><td>${formatarMoeda(price.totalPago)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;

  document.getElementById('resultado').innerHTML = `
    <div class="d-flex flex-wrap gap-4 justify-content-between">
      ${resumo('SAC')}
      ${resumo('PRICE')}
    </div>
    ${tabela('SAC', sac)}
    ${tabela('PRICE', price)}
    ${comparativo}`;
}

function toggleTabela(tipo) {
  const sac = document.getElementById('tabelaSAC');
  const price = document.getElementById('tabelaPRICE');

  if (tipo === 'SAC') {
    new bootstrap.Collapse(price, { toggle: false }).hide();
    new bootstrap.Collapse(sac, { toggle: false }).toggle();
  } else {
    new bootstrap.Collapse(sac, { toggle: false }).hide();
    new bootstrap.Collapse(price, { toggle: false }).toggle();
  }
}

const inputs = document.querySelectorAll('#valorImovel, #valorEntrada, #prazo, #dataNascimento');

inputs.forEach(input => {
  input.addEventListener('input', () => {
    const vi = limparMoeda(document.getElementById('valorImovel').value);
    const ve = limparMoeda(document.getElementById('valorEntrada').value);
    const prazo = parseInt(document.getElementById('prazo').value);
    const nasc = document.getElementById('dataNascimento').value;

    const validVi = vi >= 200000 && vi <= 10000000;
    const validVe = ve >= vi * 0.1 && ve < vi;
    const validPrazo = prazo >= 12 && prazo <= 360;
    const validIdade = idadeValida(nasc);

    document.getElementById('valorImovel').classList.toggle('is-invalid', !validVi);
    document.getElementById('valorEntrada').classList.toggle('is-invalid', !validVe);
    document.getElementById('prazo').classList.toggle('is-invalid', !validPrazo);
    document.getElementById('erroIdade').style.display = validIdade ? 'none' : 'block';

    document.getElementById('btnSimular').disabled = !(validVi && validVe && validPrazo && validIdade);
  });
});