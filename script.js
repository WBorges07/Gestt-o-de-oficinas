(function(){
  "use strict";

  var LS_ORDENS = "oficina_ordens";
  var LS_CONFIG = "oficina_dados";

  // ---------- Persistência ----------
  function carregarOrdens(){
    try{
      var raw = localStorage.getItem(LS_ORDENS);
      return raw ? JSON.parse(raw) : [];
    }catch(e){ return []; }
  }
  function salvarOrdens(lista){
    localStorage.setItem(LS_ORDENS, JSON.stringify(lista));
  }
  function carregarConfig(){
    try{
      var raw = localStorage.getItem(LS_CONFIG);
      return raw ? JSON.parse(raw) : { nome:"", telefone:"" };
    }catch(e){ return { nome:"", telefone:"" }; }
  }
  function salvarConfig(cfg){
    localStorage.setItem(LS_CONFIG, JSON.stringify(cfg));
  }

  // ---------- Utilidades ----------
  function formatarMoeda(valor){
    return valor.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
  }
  function gerarId(){
    return 'os_' + Date.now() + '_' + Math.floor(Math.random()*1000);
  }
  function escapeHtml(str){
    return String(str == null ? "" : str).replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  // ---------- Config (dados da oficina) ----------
  var cfgNomeInput = document.getElementById('cfg-nome');
  var cfgTelInput = document.getElementById('cfg-tel');
  var painelConfig = document.getElementById('painel-config');
  var btnToggleConfig = document.getElementById('btn-toggle-config');

  (function initConfig(){
    var cfg = carregarConfig();
    cfgNomeInput.value = cfg.nome || "";
    cfgTelInput.value = cfg.telefone || "";
  })();

  btnToggleConfig.addEventListener('click', function(){
    painelConfig.classList.toggle('open');
  });
  [cfgNomeInput, cfgTelInput].forEach(function(el){
    el.addEventListener('input', function(){
      salvarConfig({ nome: cfgNomeInput.value.trim(), telefone: cfgTelInput.value.trim() });
    });
  });

  // ---------- Navegação por abas ----------
  var tabButtons = document.querySelectorAll('.tab-btn');
  var views = {
    nova: document.getElementById('view-nova'),
    historico: document.getElementById('view-historico')
  };
  tabButtons.forEach(function(btn){
    btn.addEventListener('click', function(){
      tabButtons.forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      Object.keys(views).forEach(function(k){ views[k].classList.remove('active'); });
      views[btn.dataset.view].classList.add('active');
      if(btn.dataset.view === 'historico'){ renderHistorico(); }
    });
  });

  // ---------- Itens do atendimento ----------
  var itensBody = document.getElementById('itens-body');
  var totalValorEl = document.getElementById('total-valor');

  function novaLinhaItem(descricao, tipo, valor){
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td><input type="text" class="item-descricao" placeholder="Ex: Troca de óleo, pastilha de freio..." value="'+escapeHtml(descricao||'')+'"></td>' +
      '<td class="col-tipo">' +
        '<select class="item-tipo">' +
          '<option value="Serviço"'+(tipo==='Serviço'?' selected':'')+'>Serviço</option>' +
          '<option value="Peça"'+(tipo==='Peça'?' selected':'')+'>Peça</option>' +
        '</select>' +
      '</td>' +
      '<td class="col-valor"><input type="number" class="item-valor" min="0" step="0.01" placeholder="0,00" value="'+(valor!=null?valor:'')+'"></td>' +
      '<td class="col-acao"><button type="button" class="remove-item" title="Remover item">&times;</button></td>';
    itensBody.appendChild(tr);
  }

  function adicionarItemVazio(){
    novaLinhaItem('', 'Serviço', '');
  }

  itensBody.addEventListener('click', function(e){
    if(e.target.classList.contains('remove-item')){
      var tr = e.target.closest('tr');
      tr.parentNode.removeChild(tr);
      atualizarTotal();
    }
  });
  itensBody.addEventListener('input', function(e){
    if(e.target.classList.contains('item-valor')){
      atualizarTotal();
    }
  });

  document.getElementById('btn-add-item').addEventListener('click', function(){
    adicionarItemVazio();
  });

  function coletarItens(){
    var linhas = itensBody.querySelectorAll('tr');
    var itens = [];
    linhas.forEach(function(tr){
      var descricao = tr.querySelector('.item-descricao').value.trim();
      var tipo = tr.querySelector('.item-tipo').value;
      var valor = parseFloat(tr.querySelector('.item-valor').value);
      if(isNaN(valor)) valor = 0;
      if(descricao !== ''){
        itens.push({ descricao: descricao, tipo: tipo, valor: valor });
      }
    });
    return itens;
  }

  function atualizarTotal(){
    var itens = coletarItens();
    var total = itens.reduce(function(acc, it){ return acc + it.valor; }, 0);
    totalValorEl.textContent = formatarMoeda(total);
    return total;
  }

  // linha inicial ao carregar a página
  adicionarItemVazio();

  // ---------- Salvar atendimento ----------
  var formMsg = document.getElementById('form-msg');

  function limparFormulario(){
    document.getElementById('f-proprietario').value = '';
    document.getElementById('f-modelo').value = '';
    document.getElementById('f-placa').value = '';
    document.getElementById('f-cor').value = '';
    document.getElementById('f-ano').value = '';
    document.getElementById('f-versao').value = '';
    document.getElementById('f-obs').value = '';
    itensBody.innerHTML = '';
    adicionarItemVazio();
    atualizarTotal();
    formMsg.innerHTML = '';
  }

  document.getElementById('btn-limpar').addEventListener('click', limparFormulario);

  document.getElementById('btn-salvar').addEventListener('click', function(){
    var proprietario = document.getElementById('f-proprietario').value.trim();
    var modelo = document.getElementById('f-modelo').value.trim();
    var placa = document.getElementById('f-placa').value.trim().toUpperCase();
    var cor = document.getElementById('f-cor').value.trim();
    var ano = document.getElementById('f-ano').value.trim();
    var versao = document.getElementById('f-versao').value.trim();
    var obs = document.getElementById('f-obs').value.trim();
    var itens = coletarItens();
    var total = atualizarTotal();

    if(!proprietario || !placa){
      formMsg.innerHTML = '<div class="msg-erro">Preencha ao menos o nome do proprietário e a placa antes de salvar.</div>';
      return;
    }
    if(itens.length === 0){
      formMsg.innerHTML = '<div class="msg-erro">Adicione ao menos uma peça ou serviço realizado.</div>';
      return;
    }

    var agora = new Date();
    var ordem = {
      id: gerarId(),
      dataISO: agora.toISOString(),
      dataFormatada: agora.toLocaleDateString('pt-BR'),
      proprietario: proprietario,
      modelo: modelo,
      placa: placa,
      cor: cor,
      ano: ano,
      versao: versao,
      itens: itens,
      total: total,
      observacoes: obs
    };

    var lista = carregarOrdens();
    lista.unshift(ordem);
    salvarOrdens(lista);

    formMsg.innerHTML = '<div class="msg-ok">Atendimento salvo com sucesso.</div>';
    abrirResumo(ordem);
    limparFormulario();
  });

  // ---------- Resumo / impressão ----------
  var modalResumo = document.getElementById('modal-resumo');
  var resumoConteudo = document.getElementById('resumo-conteudo');

  function abrirResumo(ordem){
    var cfg = carregarConfig();
    var nomeOficina = cfg.nome ? cfg.nome : 'Oficina Mecânica';
    var telOficina = cfg.telefone ? cfg.telefone : '';

    var linhasItens = ordem.itens.map(function(it){
      return '<tr><td>'+escapeHtml(it.descricao)+' <span class="tipo-tag">('+escapeHtml(it.tipo)+')</span></td>' +
             '<td style="text-align:right;">'+formatarMoeda(it.valor)+'</td></tr>';
    }).join('');

    resumoConteudo.innerHTML =
      '<div class="oficina-nome">'+escapeHtml(nomeOficina)+'</div>' +
      (telOficina ? '<div class="oficina-tel">'+escapeHtml(telOficina)+'</div>' : '') +
      '<hr>' +
      '<div class="os-titulo"><h3>Resumo do atendimento</h3><span class="data">'+ordem.dataFormatada+'</span></div>' +
      '<div class="resumo-dados">' +
        '<div><span>Proprietário</span>'+escapeHtml(ordem.proprietario)+'</div>' +
        '<div><span>Placa</span>'+escapeHtml(ordem.placa)+'</div>' +
        '<div><span>Modelo</span>'+escapeHtml(ordem.modelo)+'</div>' +
        '<div><span>Cor</span>'+escapeHtml(ordem.cor)+'</div>' +
        '<div><span>Ano</span>'+escapeHtml(ordem.ano)+'</div>' +
        '<div><span>Versão</span>'+escapeHtml(ordem.versao)+'</div>' +
      '</div>' +
      '<table>' +
        '<thead><tr><th>Peças e serviços</th><th style="text-align:right;">Valor</th></tr></thead>' +
        '<tbody>'+linhasItens+'</tbody>' +
      '</table>' +
      '<div class="total-final"><span>Total</span><span class="valor">'+formatarMoeda(ordem.total)+'</span></div>' +
      (ordem.observacoes ? '<div class="obs"><strong>Observações:</strong> '+escapeHtml(ordem.observacoes)+'</div>' : '') +
      '<div class="assinatura">' +
        '<div>Assinatura da oficina</div>' +
        '<div>Assinatura do cliente</div>' +
      '</div>';

    modalResumo.classList.add('open');
  }

  document.getElementById('btn-fechar-modal').addEventListener('click', function(){
    modalResumo.classList.remove('open');
  });
  document.getElementById('btn-imprimir').addEventListener('click', function(){
    window.print();
  });
  modalResumo.addEventListener('click', function(e){
    if(e.target === modalResumo){ modalResumo.classList.remove('open'); }
  });

  // ---------- Histórico ----------
  var historicoBody = document.getElementById('historico-body');
  var historicoVazio = document.getElementById('historico-vazio');
  var buscaInput = document.getElementById('busca-input');

  function renderHistorico(){
    var termo = buscaInput.value.trim().toLowerCase();
    var lista = carregarOrdens();

    if(termo !== ''){
      lista = lista.filter(function(o){
        return o.proprietario.toLowerCase().indexOf(termo) !== -1 ||
               o.placa.toLowerCase().indexOf(termo) !== -1;
      });
    }

    historicoBody.innerHTML = '';

    if(lista.length === 0){
      historicoVazio.style.display = 'block';
      return;
    }
    historicoVazio.style.display = 'none';

    lista.forEach(function(ordem){
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>'+ordem.dataFormatada+'</td>' +
        '<td>'+escapeHtml(ordem.proprietario)+'</td>' +
        '<td>'+escapeHtml(ordem.modelo)+(ordem.versao ? ' — '+escapeHtml(ordem.versao) : '')+'</td>' +
        '<td><span class="placa-chip">'+escapeHtml(ordem.placa)+'</span></td>' +
        '<td>'+formatarMoeda(ordem.total)+'</td>' +
        '<td><div class="row-actions">' +
          '<button type="button" class="btn btn-ghost btn-ver" data-id="'+ordem.id+'">Ver / imprimir</button>' +
          '<button type="button" class="btn btn-danger-ghost btn-excluir" data-id="'+ordem.id+'">Excluir</button>' +
        '</div></td>';
      historicoBody.appendChild(tr);
    });
  }

  buscaInput.addEventListener('input', renderHistorico);
  document.getElementById('btn-limpar-busca').addEventListener('click', function(){
    buscaInput.value = '';
    renderHistorico();
  });

  historicoBody.addEventListener('click', function(e){
    var id = e.target.dataset.id;
    if(!id) return;

    if(e.target.classList.contains('btn-ver')){
      var lista = carregarOrdens();
      var ordem = lista.find(function(o){ return o.id === id; });
      if(ordem){ abrirResumo(ordem); }
    }

    if(e.target.classList.contains('btn-excluir')){
      if(confirm('Excluir este atendimento do histórico? Esta ação não pode ser desfeita.')){
        var lista2 = carregarOrdens().filter(function(o){ return o.id !== id; });
        salvarOrdens(lista2);
        renderHistorico();
      }
    }
  });

  atualizarTotal();
})();