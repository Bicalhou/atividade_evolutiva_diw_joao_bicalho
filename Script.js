'use strict';

/* ===== Constantes e estado ===== */
const CHAVE = 'explorers-catalogue:lugares';
const IMAGEM_PADRAO = 'imagens/padrao.svg';
const ROTULO_STATUS = { visitado: 'Visitado', desejo: 'Desejo visitar' };
const CONTINENTES = {
  'Europe': 'Europa', 'Asia': 'Ásia', 'Africa': 'África',
  'North America': 'América do Norte', 'South America': 'América do Sul',
  'Oceania': 'Oceania', 'Antarctica': 'Antártida'
};
const TIPOS = {
  attraction: 'Ponto turístico', monument: 'Ponto turístico', viewpoint: 'Ponto turístico',
  castle: 'Ponto turístico', ruins: 'Ponto turístico', memorial: 'Ponto turístico',
  museum: 'Museu', beach: 'Praia', park: 'Parque / Natureza', nature_reserve: 'Parque / Natureza',
  peak: 'Parque / Natureza', restaurant: 'Restaurante',
  city: 'Cidade', town: 'Cidade', village: 'Cidade', administrative: 'Cidade'
};

// Dados iniciais (usados só na primeira vez que a página abre)
const LUGARES_INICIAIS = [
  { id: 'seed-1', nome: 'Torre Eiffel', tipo: 'Ponto turístico', cidade: 'Paris', pais: 'França', continente: 'Europa',
    status: 'visitado', endereco: 'Champ de Mars, 5 Avenue Anatole France, 75007 Paris', dataVisita: '15/07/2024', avaliacao: 5,
    descricao: 'Subimos ao pôr do sol e a vista da cidade foi incrível. Vale chegar cedo para evitar filas.',
    imagem: 'https://cdn.pixabay.com/photo/2015/10/06/18/26/eiffel-tower-975004_1280.jpg', mapa: 'Torre Eiffel Paris' },
  { id: 'seed-2', nome: 'Machu Picchu', tipo: 'Ponto turístico', cidade: 'Cusco', pais: 'Peru', continente: 'América do Sul',
    status: 'desejo', endereco: 'Machu Picchu, Região de Cusco, Peru', dataVisita: '', avaliacao: null,
    descricao: 'Quero conhecer a cidade inca e fazer a trilha até as ruínas. Preciso planejar com antecedência.',
    imagem: 'https://www.karikuy.com/wp-content/uploads/2023/11/when-machu-picchu-was-built.jpg', mapa: 'Machu Picchu Peru' },
  { id: 'seed-3', nome: 'Praia de Copacabana', tipo: 'Praia', cidade: 'Rio de Janeiro', pais: 'Brasil', continente: 'América do Sul',
    status: 'visitado', endereco: 'Av. Atlântica, Copacabana, Rio de Janeiro', dataVisita: '20/01/2024', avaliacao: 4,
    descricao: 'Passeamos pelo calçadão e aproveitamos o dia de sol na areia. A praia é movimentada, mas o clima é animado.',
    imagem: 'https://tse2.mm.bing.net/th/id/OIP.GWa7GNCPUizl1-ZM7VKj-QHaE8?r=0&rs=1&pid=ImgDetMain&o=7&rm=3', mapa: 'Praia de Copacabana Rio de Janeiro' }
];

let lugares = [];
let editandoId = null;
let idParaExcluir = null;
let extrasApi = null; // dados extras vindos da API (ex.: coordenadas)

const $ = (id) => document.getElementById(id);

/* ===== Funções auxiliares ===== */
function normalizar(texto) {
  return String(texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function el(tag, atributos = {}, ...filhos) {
  const elemento = document.createElement(tag);
  for (const [nome, valor] of Object.entries(atributos)) {
    if (nome === 'texto') elemento.textContent = valor;
    else elemento.setAttribute(nome, valor);
  }
  filhos.forEach((filho) => elemento.append(filho));
  return elemento;
}

function mostrar(idElemento, tipo, texto) {
  const caixa = $(idElemento);
  caixa.className = 'mensagem ' + tipo + (caixa.classList.contains('campo-largo') ? ' campo-largo' : '');
  caixa.textContent = texto;
  caixa.hidden = false;
}

function ocultar(idElemento) {
  $(idElemento).hidden = true;
}

function dataParaNumero(texto) {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto || '');
  return partes ? Number(partes[3] + partes[2] + partes[1]) : 0;
}

function dataValida(texto) {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  if (!partes) return false;
  const [, dia, mes, ano] = partes.map(Number);
  const data = new Date(ano, mes - 1, dia);
  return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
}

function lerStatus(texto) {
  const n = normalizar(texto);
  if (n === 'visitado' || n === 'visitada') return 'visitado';
  if (n.startsWith('desejo') || n === 'quero visitar') return 'desejo';
  return null;
}

/* ===== localStorage ===== */
function salvar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(lugares));
  } catch (erro) {
    mostrar('msg-lista', 'erro', 'Não foi possível salvar os dados neste navegador.');
  }
}

function carregar() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CHAVE));
    if (Array.isArray(guardado)) {
      lugares = guardado;
      return;
    }
  } catch (erro) {
    // dados corrompidos: usa os iniciais
  }
  lugares = LUGARES_INICIAIS.map((lugar) => ({ ...lugar }));
  salvar();
}

/* ===== Listar, pesquisar, filtrar e ordenar ===== */
function lugaresVisiveis() {
  const busca = normalizar($('pesquisa').value);
  const filtroStatus = normalizar($('filtro-status').value);
  const filtroContinente = normalizar($('filtro-continente').value);
  const livre = (valor) => valor === '' || valor === 'todos';

  const lista = lugares.filter((lugar) => {
    const texto = normalizar([lugar.nome, lugar.cidade, lugar.pais].join(' '));
    const status = normalizar(ROTULO_STATUS[lugar.status]);
    return (!busca || texto.includes(busca))
      && (livre(filtroStatus) || status.includes(filtroStatus))
      && (livre(filtroContinente) || normalizar(lugar.continente).includes(filtroContinente));
  });

  const criterio = normalizar($('ordenacao').value);
  const porTexto = (campo) => (a, b) => a[campo].localeCompare(b[campo], 'pt-BR');
  if (criterio.startsWith('pais')) lista.sort(porTexto('pais'));
  else if (criterio.startsWith('data')) lista.sort((a, b) => dataParaNumero(b.dataVisita) - dataParaNumero(a.dataVisita));
  else if (criterio.startsWith('aval')) lista.sort((a, b) => (b.avaliacao || 0) - (a.avaliacao || 0));
  else lista.sort(porTexto('nome'));
  return lista;
}

function celula(rotulo, texto) {
  return el('td', { 'data-label': rotulo, texto });
}

function botao(texto, classe, acao, id) {
  return el('button', { type: 'button', class: classe, 'data-acao': acao, 'data-id': id, texto });
}

function renderLista() {
  const corpo = $('tabela-lugares').tBodies[0];
  [...corpo.rows].slice(1).forEach((linha) => linha.remove());

  const lista = lugaresVisiveis();
  for (const lugar of lista) {
    const status = celula('Status', ROTULO_STATUS[lugar.status]);
    status.dataset.status = lugar.status;
    const acoes = el('td', { 'data-label': 'Ações' },
      botao('Ver detalhes', 'btn-detalhes', 'detalhes', lugar.id),
      botao('Editar', 'btn-editar', 'editar', lugar.id),
      botao('Excluir', 'btn-excluir', 'excluir', lugar.id));
    corpo.append(el('tr', {},
      celula('Nome', lugar.nome), celula('Tipo', lugar.tipo), celula('Cidade', lugar.cidade),
      celula('País', lugar.pais), celula('Continente', lugar.continente), status,
      celula('Avaliação', lugar.avaliacao ? String(lugar.avaliacao) : '–'), acoes));
  }

  $('contador').textContent = 'Mostrando ' + lista.length + ' de ' + lugares.length + ' lugar(es).';
  if (lista.length === 0) {
    const texto = lugares.length === 0
      ? 'Nenhum lugar cadastrado ainda. Use o formulário para adicionar o primeiro.'
      : 'Nenhum lugar encontrado para os filtros selecionados.';
    mostrar('msg-vazio', 'aviso', texto);
  } else {
    ocultar('msg-vazio');
  }
  renderDetalhe();
}

function imagemDoLugar(lugar) {
  const imagem = el('img', { src: lugar.imagem || IMAGEM_PADRAO, alt: 'Imagem ilustrativa de ' + lugar.nome, width: '400', height: '220' });
  // se a foto da internet não carregar, usa a imagem padrão
  imagem.addEventListener('error', () => {
    if (!imagem.src.endsWith(IMAGEM_PADRAO)) imagem.src = IMAGEM_PADRAO;
  }, { once: true });
  return imagem;
}

/* ===== Detalhes ===== */
function criarCartao(lugar) {
  const linhas = [
    'Tipo de lugar: ' + lugar.tipo, 'Cidade: ' + lugar.cidade, 'País: ' + lugar.pais,
    'Continente: ' + lugar.continente, 'Endereço: ' + (lugar.endereco || '–'),
    'Status: ' + ROTULO_STATUS[lugar.status], 'Data da visita: ' + (lugar.dataVisita || '–'),
    'Avaliação: ' + (lugar.avaliacao ? lugar.avaliacao + ' de 5' : '–')
  ];
  const lista = el('ul');
  linhas.forEach((linha) => lista.append(el('li', { texto: linha })));

  const mapa = 'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent(lugar.mapa || [lugar.nome, lugar.cidade, lugar.pais].join(' '));

  return el('article', { id: 'detalhe-' + lugar.id, 'data-status': lugar.status, tabindex: '-1' },
    el('h3', { texto: lugar.nome }),
    imagemDoLugar(lugar),
    lista,
    el('p', { texto: 'Descrição: ' + (lugar.descricao || 'Sem descrição.') }),
    el('p', { class: 'links' },
      el('a', { href: '#lugares', texto: 'Voltar para a lista' }),
      el('a', { href: mapa, target: '_blank', rel: 'noopener', texto: 'Ver no Google Maps' })),
    el('p', { class: 'acoes' },
      botao('Editar', 'btn-editar', 'editar', lugar.id),
      botao('Excluir', 'btn-excluir', 'excluir', lugar.id)));
}

// Mostra um cartão de detalhes para cada lugar da lista (respeitando pesquisa, filtros e ordem)
function renderDetalhe() {
  const secao = $('detalhes');
  secao.querySelectorAll('article').forEach((cartao) => cartao.remove());
  const lista = lugaresVisiveis();
  if (lista.length === 0) {
    mostrar('msg-detalhes', 'aviso', 'Nenhum lugar para mostrar os detalhes.');
    return;
  }
  ocultar('msg-detalhes');
  lista.forEach((lugar) => secao.append(criarCartao(lugar)));
}

function renderTudo() {
  renderLista();
}

/* ===== Cadastro, validação e edição ===== */
function lerFormulario() {
  const valor = (id) => $(id).value.trim();
  return {
    nome: valor('nome'), tipo: valor('tipo'), cidade: valor('cidade'), pais: valor('pais'),
    continente: valor('continente'), status: valor('status'), endereco: valor('endereco'),
    data: valor('data-visita'), avaliacao: valor('avaliacao'), descricao: valor('descricao')
  };
}

function validar(dados) {
  const erros = [];
  const obrigatorios = { nome: 'nome', tipo: 'tipo', cidade: 'cidade', pais: 'país', continente: 'continente', status: 'status' };
  for (const campo in obrigatorios) {
    if (!dados[campo]) erros.push('Informe o ' + obrigatorios[campo] + '.');
  }
  if (dados.status && !lerStatus(dados.status)) erros.push('O status deve ser "Visitado" ou "Desejo visitar".');
  if (lerStatus(dados.status) === 'visitado') {
    if (dados.data && !dataValida(dados.data)) erros.push('A data deve estar no formato dd/mm/aaaa e ser válida.');
    if (dados.avaliacao && !/^[1-5]$/.test(dados.avaliacao)) erros.push('A avaliação deve ser um número de 1 a 5.');
  }
  return erros;
}

function sairDoModoEdicao() {
  editandoId = null;
  extrasApi = null;
  $('btn-salvar').textContent = 'Salvar lugar';
}

function aoEnviarFormulario(evento) {
  evento.preventDefault();
  const dados = lerFormulario();
  const erros = validar(dados);
  if (erros.length > 0) {
    mostrar('feedback', 'erro', erros.join(' '));
    return;
  }

  const status = lerStatus(dados.status);
  const visitado = status === 'visitado';
  const anterior = lugares.find((item) => item.id === editandoId);
  const lugar = {
    id: anterior ? anterior.id : String(Date.now()) + Math.floor(Math.random() * 1000),
    nome: dados.nome, tipo: dados.tipo, cidade: dados.cidade, pais: dados.pais, continente: dados.continente,
    status, endereco: dados.endereco, descricao: dados.descricao,
    dataVisita: visitado ? dados.data : '',
    avaliacao: visitado && dados.avaliacao ? Number(dados.avaliacao) : null,
    imagem: anterior ? anterior.imagem : IMAGEM_PADRAO,
    mapa: anterior ? anterior.mapa : (extrasApi ? extrasApi.mapa : '')
  };

  if (anterior) lugares[lugares.indexOf(anterior)] = lugar;
  else lugares.push(lugar);

  salvar();
  renderTudo();
  $('form-lugar').reset(); // também sai do modo edição
  mostrar('feedback', 'sucesso', anterior ? 'Lugar atualizado com sucesso!' : 'Lugar cadastrado com sucesso!');
}

function preencherFormulario(lugar) {
  $('nome').value = lugar.nome;
  $('tipo').value = lugar.tipo;
  $('cidade').value = lugar.cidade;
  $('pais').value = lugar.pais;
  $('continente').value = lugar.continente;
  $('status').value = ROTULO_STATUS[lugar.status];
  $('endereco').value = lugar.endereco || '';
  $('data-visita').value = lugar.dataVisita || '';
  $('avaliacao').value = lugar.avaliacao || '';
  $('descricao').value = lugar.descricao || '';
}

function iniciarEdicao(id) {
  const lugar = lugares.find((item) => item.id === id);
  if (!lugar) return;
  editandoId = id;
  preencherFormulario(lugar);
  $('btn-salvar').textContent = 'Atualizar lugar';
  mostrar('feedback', 'info', 'Editando "' + lugar.nome + '". Altere os dados e clique em Atualizar lugar, ou em Limpar para cancelar.');
  $('cadastro').scrollIntoView({ behavior: 'smooth' });
  $('nome').focus({ preventScroll: true });
}

/* ===== Exclusão ===== */
function pedirExclusao(id) {
  const lugar = lugares.find((item) => item.id === id);
  if (!lugar) return;
  idParaExcluir = id;
  $('texto-confirmacao').textContent = 'Tem certeza de que deseja excluir "' + lugar.nome + '"? Essa ação não pode ser desfeita.';
  $('confirmacao').hidden = false;
  $('confirmacao').scrollIntoView({ behavior: 'smooth', block: 'center' });
  $('btn-cancelar').focus({ preventScroll: true });
}

function confirmarExclusao() {
  const lugar = lugares.find((item) => item.id === idParaExcluir);
  lugares = lugares.filter((item) => item.id !== idParaExcluir);
  if (editandoId === idParaExcluir) $('form-lugar').reset();
  idParaExcluir = null;
  $('confirmacao').hidden = true;
  salvar();
  renderTudo();
  mostrar('msg-lista', 'sucesso', 'Lugar "' + (lugar ? lugar.nome : '') + '" excluído com sucesso.');
}

function cancelarExclusao() {
  idParaExcluir = null;
  $('confirmacao').hidden = true;
}

/* ===== API pública: OpenStreetMap (Nominatim) + REST Countries ===== */
async function buscarNaApi(termo) {
  $('resultados-api').replaceChildren();
  mostrar('status-api', 'info', 'Buscando "' + termo + '"...');
  const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&accept-language=pt-BR&q=' + encodeURIComponent(termo);
  try {
    const resposta = await fetch(url);
    if (!resposta.ok) throw new Error('Erro ' + resposta.status);
    const resultados = await resposta.json();
    if (resultados.length === 0) {
      mostrar('status-api', 'aviso', 'Nenhum resultado encontrado para "' + termo + '".');
      return;
    }
    ocultar('status-api');
    resultados.forEach((item) => {
      $('resultados-api').append(el('li', {},
        el('p', { texto: item.display_name }),
        el('button', { type: 'button', texto: 'Usar este lugar' })));
      $('resultados-api').lastElementChild.querySelector('button').addEventListener('click', () => usarResultado(item));
    });
  } catch (erro) {
    mostrar('status-api', 'erro', 'Não foi possível consultar a API. Verifique sua conexão e tente novamente.');
  }
}

async function descobrirContinente(codigoPais) {
  try {
    const resposta = await fetch('https://restcountries.com/v3.1/alpha/' + encodeURIComponent(codigoPais) + '?fields=continents');
    if (!resposta.ok) return '';
    const json = await resposta.json();
    const pais = Array.isArray(json) ? json[0] : json;
    const continente = pais && pais.continents ? pais.continents[0] : '';
    return CONTINENTES[continente] || '';
  } catch (erro) {
    return '';
  }
}

async function usarResultado(item) {
  const endereco = item.address || {};
  $('nome').value = item.name || item.display_name.split(',')[0];
  $('tipo').value = TIPOS[item.type] || TIPOS[item.addresstype] || 'Outro';
  $('cidade').value = endereco.city || endereco.town || endereco.village || endereco.municipality || endereco.county || endereco.state || '';
  $('pais').value = endereco.country || '';
  $('endereco').value = item.display_name;
  $('continente').value = '';
  extrasApi = { mapa: item.lat + ',' + item.lon };
  mostrar('feedback', 'info', 'Dados importados da API. Complete o status e salve o lugar.');
  $('cadastro').scrollIntoView({ behavior: 'smooth' });

  if (endereco.country_code) {
    const continente = await descobrirContinente(endereco.country_code);
    if ($('continente').value === '') $('continente').value = continente;
  }
  $('status').focus({ preventScroll: true });
}

/* ===== Eventos ===== */
document.addEventListener('click', (evento) => {
  const botaoAcao = evento.target.closest('[data-acao]');
  if (!botaoAcao) return;
  const id = botaoAcao.dataset.id;
  switch (botaoAcao.dataset.acao) {
    case 'detalhes': {
      const cartao = $('detalhe-' + id);
      if (cartao) {
        cartao.scrollIntoView({ behavior: 'smooth', block: 'center' });
        cartao.focus({ preventScroll: true });
        cartao.classList.add('em-foco');
        setTimeout(() => cartao.classList.remove('em-foco'), 1800);
      }
      break;
    }
    case 'editar': iniciarEdicao(id); break;
    case 'excluir': pedirExclusao(id); break;
  }
});

$('form-lugar').addEventListener('submit', aoEnviarFormulario);
$('form-lugar').addEventListener('reset', () => {
  sairDoModoEdicao();
  ocultar('feedback');
});

$('form-api').addEventListener('submit', (evento) => {
  evento.preventDefault();
  const termo = $('busca-api').value.trim();
  if (!termo) {
    mostrar('status-api', 'erro', 'Digite o nome de um lugar para buscar.');
    return;
  }
  buscarNaApi(termo);
});

$('form-busca').addEventListener('submit', (evento) => {
  evento.preventDefault();
  renderLista();
});
$('form-busca').addEventListener('input', renderLista);
$('form-busca').addEventListener('reset', () => setTimeout(renderLista, 0));

$('btn-confirmar').addEventListener('click', confirmarExclusao);
$('btn-cancelar').addEventListener('click', cancelarExclusao);

/* ===== Início ===== */
carregar();
renderTudo();