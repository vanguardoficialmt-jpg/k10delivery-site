/* =====================================================================
   K10 Delivery · Tela de pagamento online (Mercado Pago)
   Pix (QR Code + copia e cola) e cartão de crédito, com confirmação automática.

   Configuração (coloque no k10-config.js, antes deste arquivo):
     window.K10_PAGAMENTO = {
       url: 'https://SEU-PROJETO.supabase.co/functions/v1/k10-pagamentos',
       publicKey: 'APP_USR-...',            // Public Key de produção (pode ficar no site)
       titular: 'NOME DO TITULAR DA CONTA', // como aparece no app do banco no Pix
       whatsapp: '5565999999999'            // opcional: botão "Falar com a K10"
     };

   Uso:
     K10Pagamento.abrir({ pedidoId: '<uuid do pedido>', codigo: 'K00123' (opcional),
                          metodo: 'pix' | 'cartao',
                          origem: 'site' | 'entrega',
                          onPago: (pagamento) => {...}, onFechar: (situacao) => {...} });

   O navegador NUNCA decide valor nem "pago": isso vem do servidor, que confere
   no Mercado Pago. Esta tela só mostra o que o servidor responde.
   ===================================================================== */
(function () {
  'use strict';

  var SDK_MP = 'https://sdk.mercadopago.com/js/v2';
  var sdkPromessa = null;

  function cfg() {
    return Object.assign({ url: '', publicKey: '', titular: '', whatsapp: '', intervalo: 4000 }, window.K10_PAGAMENTO || {});
  }
  function dinheiro(v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function el(html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  async function api(rota, opcoes) {
    var c = cfg();
    if (!c.url) throw new Error('Pagamento online não configurado (K10_PAGAMENTO.url).');
    opcoes = opcoes || {};
    var res = await fetch(c.url.replace(/\/+$/, '') + rota, {
      method: opcoes.method || 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: opcoes.body ? JSON.stringify(opcoes.body) : undefined,
      cache: 'no-store'
    });
    var dados = null;
    try { dados = await res.json(); } catch (e) { dados = null; }
    if (!res.ok && !(dados && dados.pagamento)) {
      var erro = new Error((dados && dados.erro) || 'Não foi possível concluir agora. Tente de novo.');
      erro.status = res.status;
      erro.codigo = dados && dados.codigo;
      throw erro;
    }
    return dados || {};
  }

  function carregarSdk() {
    if (window.MercadoPago) return Promise.resolve();
    if (!sdkPromessa) {
      sdkPromessa = new Promise(function (ok, falha) {
        var s = document.createElement('script');
        s.src = SDK_MP;
        s.async = true;
        s.onload = function () { ok(); };
        s.onerror = function () { sdkPromessa = null; falha(new Error('Não carregou o formulário do cartão. Verifique a internet.')); };
        document.head.appendChild(s);
      });
    }
    return sdkPromessa;
  }

  async function copiar(texto) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch (e) {
      var ta = document.createElement('textarea');
      ta.value = texto;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
      ta.remove();
      return ok;
    }
  }

  // -------------------------------------------------------------------
  function abrir(opcoes) {
    opcoes = Object.assign({ metodo: 'pix', origem: 'site', permitirTrocar: true }, opcoes || {});
    if (!opcoes.pedidoId) throw new Error('K10Pagamento.abrir: informe pedidoId');
    var entrega = opcoes.origem === 'entrega';
    if (entrega) opcoes.metodo = 'pix';

    var estado = { aberto: true, pagamento: null, timer: null, relogio: null, brick: null, ultimoFoco: document.activeElement, avisouPago: false };

    var fundo = el(
      '<div class="k10pg-fundo" role="dialog" aria-modal="true" aria-labelledby="k10pg-titulo">' +
        '<div class="k10pg-caixa' + (entrega ? ' k10pg-entrega' : '') + '">' +
          '<button type="button" class="k10pg-x" aria-label="Fechar">×</button>' +
          '<div class="k10pg-corpo" aria-live="polite"></div>' +
        '</div>' +
      '</div>'
    );
    var corpo = fundo.querySelector('.k10pg-corpo');
    document.body.appendChild(fundo);
    document.documentElement.classList.add('k10pg-travado');
    fundo.querySelector('.k10pg-x').addEventListener('click', function () { fechar(); });
    fundo.addEventListener('click', function (e) { if (e.target === fundo && !entrega) fechar(); });
    document.addEventListener('keydown', teclado);
    document.addEventListener('visibilitychange', voltouProSite);
    fundo.querySelector('.k10pg-x').focus();

    function teclado(e) { if (e.key === 'Escape') fechar(); }
    function voltouProSite() {
      // cliente voltou do app do banco: confere na hora
      if (document.visibilityState === 'visible' && estado.pagamento && estado.pagamento.status === 'pendente') consultar(true);
    }

    function cabecalho(titulo) {
      var cod = estado.codigo || opcoes.codigo || String(opcoes.pedidoId).slice(0, 8).toUpperCase();
      return '<p class="k10pg-sobre">Pedido ' + esc(cod) + '</p>' +
             '<h2 id="k10pg-titulo" class="k10pg-titulo">' + titulo + '</h2>';
    }

    function render(html) {
      pararBrick();
      corpo.innerHTML = html;
    }

    function carregando(texto) {
      render(cabecalho('Pagamento') +
        '<div class="k10pg-carregando"><span class="k10pg-spin" aria-hidden="true"></span>' + esc(texto || 'Preparando pagamento…') + '</div>');
    }

    function telaErro(mensagem, podeTentar, semEntrega) {
      pararTudo();
      render(cabecalho('Não deu certo') +
        '<p class="k10pg-msg k10pg-msg-erro">' + esc(mensagem) + '</p>' +
        '<div class="k10pg-acoes">' +
          (podeTentar ? '<button type="button" class="k10pg-btn" data-a="tentar">Tentar de novo</button>' : '') +
          (!entrega && !semEntrega ? '<button type="button" class="k10pg-btn k10pg-sec" data-a="entrega">Vou pagar na entrega</button>' : '') +
        '</div>');
      ligar('tentar', function () { iniciar(opcoes.metodo); });
      ligar('entrega', function () { fechar('pagar_na_entrega'); });
    }

    function ligar(acao, fn) {
      var b = corpo.querySelector('[data-a="' + acao + '"]');
      if (b) b.addEventListener('click', fn);
    }

    // ---------------------------------------------------------------- Pix
    async function iniciarPix() {
      carregando('Gerando seu Pix…');
      try {
        var r = await api('/criar', { body: { pedido_id: opcoes.pedidoId, metodo: 'pix', origem: opcoes.origem } });
        if (!estado.aberto) return;
        if (r.codigo) estado.codigo = r.codigo;
        if (r.erro && (!r.pagamento || r.pagamento.status !== 'pendente')) return telaErro(r.erro, true);
        mostrar(r.pagamento);
      } catch (e) {
        if (!estado.aberto) return;
        if (e.codigo === 'pedido_ja_pago') return telaPago(null);
        telaErro(e.message, e.status !== 404 && e.status !== 409, e.status === 404 || e.codigo === 'pedido_cancelado');
      }
    }

    function telaPix(p) {
      var c = cfg();
      var qr = /^[A-Za-z0-9+/=]+$/.test(p.pix_qr_base64 || '') ? p.pix_qr_base64 : '';
      render(cabecalho(entrega ? 'Pix na entrega' : 'Pague com Pix') +
        '<div class="k10pg-valor">' + dinheiro(p.valor) + '</div>' +
        (entrega ? '<p class="k10pg-msg">Mostre este QR Code para o cliente pagar pelo app do banco.</p>' : '') +
        '<div class="k10pg-pix">' +
          (qr ? '<div class="k10pg-bloco-qr"><img class="k10pg-qr" alt="QR Code Pix de ' + esc(dinheiro(p.valor)) +
            '" src="data:image/png;base64,' + qr + '">' +
            (!entrega ? '<p class="k10pg-dica">Abra o app do banco › <b>Pix</b> › <b>Ler QR Code</b>.</p>' : '') + '</div>' : '') +
          (!entrega
            ? '<div class="k10pg-bloco-copia">' +
              '<label class="k10pg-rotulo" for="k10pg-codigo">Pix copia e cola</label>' +
              '<textarea id="k10pg-codigo" class="k10pg-codigo" readonly rows="3">' + esc(p.pix_qr_code) + '</textarea>' +
              '<button type="button" class="k10pg-btn k10pg-largo" data-a="copiar">Copiar código Pix</button>' +
              '<p class="k10pg-dica">Depois cole no app do banco, em <b>Pix Copia e Cola</b>.</p></div>'
            : '') +
        '</div>' +
        (c.titular
          ? '<p class="k10pg-recebedor">No app do banco, o recebedor aparece como <b>' + esc(c.titular) + '</b>. ' +
            'É a conta que recebe os pagamentos da K10 Delivery. Confira o valor: <b>' + dinheiro(p.valor) + '</b>.</p>'
          : '<p class="k10pg-recebedor">Antes de confirmar no app do banco, confira o valor: <b>' + dinheiro(p.valor) +
            '</b>. O pagamento é recebido pela conta da K10 Delivery no Mercado Pago.</p>') +
        '<div class="k10pg-espera"><span class="k10pg-spin" aria-hidden="true"></span>' +
          '<span>Aguardando pagamento. A confirmação é automática.</span></div>' +
        '<p class="k10pg-validade" data-validade></p>' +
        (entrega ? '<p class="k10pg-mini">Não aceite print de comprovante: espere esta tela mostrar <b>Pagamento confirmado</b>.</p>' : '') +
        '<div class="k10pg-acoes">' +
          '<button type="button" class="k10pg-btn k10pg-sec" data-a="conferir">Já paguei</button>' +
          (!entrega && opcoes.permitirTrocar ? '<button type="button" class="k10pg-btn k10pg-sec" data-a="cartao">Pagar com cartão</button>' : '') +
        '</div>');
      ligar('copiar', async function (ev) {
        var ok = await copiar(p.pix_qr_code || '');
        ev.target.textContent = ok ? 'Código copiado ✓' : 'Selecione e copie o código acima';
        setTimeout(function () { if (ev.target.isConnected) ev.target.textContent = 'Copiar código Pix'; }, 2500);
      });
      ligar('conferir', function (ev) {
        ev.target.disabled = true;
        consultar(true).then(function () {
          if (estado.pagamento && estado.pagamento.status === 'pendente') {
            var v = corpo.querySelector('[data-validade]');
            if (v) v.textContent = 'Ainda não chegou. Pode levar alguns segundos depois de pagar.';
            ev.target.disabled = false;
          }
        });
      });
      ligar('cartao', function () { pararTudo(); iniciar('cartao'); });
      iniciarRelogio(p.expira_em);
      agendar();
    }

    function iniciarRelogio(expiraEm) {
      clearInterval(estado.relogio);
      var fim = Date.parse(expiraEm || '');
      if (!Number.isFinite(fim)) return;
      function tique() {
        var alvo = corpo.querySelector('[data-validade]');
        if (!alvo) return clearInterval(estado.relogio);
        var s = Math.max(0, Math.round((fim - Date.now()) / 1000));
        alvo.textContent = s > 0
          ? 'Este Pix vale por ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')
          : 'Pix vencido. Conferindo…';
        if (s === 0) { clearInterval(estado.relogio); consultar(true); }
      }
      tique();
      estado.relogio = setInterval(tique, 1000);
    }

    // ---------------------------------------------------------------- consulta
    function agendar() {
      clearTimeout(estado.timer);
      if (!estado.aberto || !estado.pagamento || estado.pagamento.status !== 'pendente') return;
      estado.timer = setTimeout(function () { consultar(false); }, cfg().intervalo);
    }

    async function consultar(imediato) {
      if (!estado.pagamento || !estado.aberto) return;
      try {
        var r = await api('/status?id=' + encodeURIComponent(estado.pagamento.id), { method: 'GET' });
        if (!estado.aberto) return;
        var antes = estado.pagamento.status;
        if (r.pagamento.status !== antes) mostrar(r.pagamento);
        else { estado.pagamento = r.pagamento; agendar(); }
      } catch (e) {
        agendar(); // falha de rede: tenta de novo no próximo ciclo
      }
      return imediato;
    }

    function mostrar(p) {
      estado.pagamento = p;
      switch (p.status) {
        case 'pendente':
          if (p.metodo === 'pix') return telaPix(p);
          return telaAnalise(p);
        case 'pago': return telaPago(p);
        case 'expirado':
        case 'cancelado': return telaExpirado(p);
        case 'divergente':
        case 'duplicado': return telaConferir(p);
        case 'recusado': return iniciar('cartao', 'O cartão foi recusado. Confira os dados, use outro cartão ou pague com Pix.');
        default: return telaErro('Não foi possível concluir o pagamento agora.', true);
      }
    }

    function telaAnalise(p) {
      render(cabecalho('Pagamento em análise') +
        '<div class="k10pg-valor">' + dinheiro(p.valor) + '</div>' +
        '<div class="k10pg-espera"><span class="k10pg-spin" aria-hidden="true"></span>' +
        '<span>O Mercado Pago está analisando o pagamento. Esta tela atualiza sozinha.</span></div>');
      agendar();
    }

    function telaPago(p) {
      pararTudo();
      render(
        '<div class="k10pg-ok" aria-hidden="true">✓</div>' +
        cabecalho('Pagamento confirmado') +
        (p ? '<div class="k10pg-valor">' + dinheiro(p.valor_pago || p.valor) + '</div>' : '') +
        '<p class="k10pg-msg">' + (entrega
          ? 'Recebido pelo Mercado Pago. Pode entregar o pedido.'
          : 'Recebemos seu pagamento. Seu pedido já está com a K10.') + '</p>' +
        '<div class="k10pg-acoes"><button type="button" class="k10pg-btn k10pg-largo" data-a="ok">' +
        (entrega ? 'Concluir' : 'Acompanhar pedido') + '</button></div>');
      if (!estado.avisouPago && typeof opcoes.onPago === 'function') {
        estado.avisouPago = true;
        try { opcoes.onPago(p); } catch (e) { console.error(e); }
      }
      ligar('ok', function () { fechar('pago'); });
    }

    function telaExpirado() {
      pararTudo();
      render(cabecalho('Este Pix venceu') +
        '<p class="k10pg-msg">O código não vale mais. Se você ainda não pagou, gere um novo.</p>' +
        '<div class="k10pg-acoes"><button type="button" class="k10pg-btn" data-a="novo">Gerar novo Pix</button>' +
        (!entrega ? '<button type="button" class="k10pg-btn k10pg-sec" data-a="entrega">Vou pagar na entrega</button>' : '') +
        '</div>');
      ligar('novo', function () { iniciar('pix'); });
      ligar('entrega', function () { fechar('pagar_na_entrega'); });
    }

    function telaConferir() {
      pararTudo();
      var c = cfg();
      render(cabecalho('Pagamento em conferência') +
        '<p class="k10pg-msg">Recebemos um pagamento deste pedido que precisa ser conferido pela K10. ' +
        '<b>Não pague de novo.</b> Vamos resolver com você.</p>' +
        (c.whatsapp ? '<div class="k10pg-acoes"><a class="k10pg-btn" target="_blank" rel="noopener" href="https://wa.me/' +
          esc(String(c.whatsapp).replace(/\D/g, '')) + '">Falar com a K10</a></div>' : ''));
    }

    // ---------------------------------------------------------------- cartão
    async function iniciarCartao(avisoErro) {
      carregando('Abrindo pagamento com cartão…');
      try {
        var c = cfg();
        if (!c.publicKey) throw new Error('Cartão online ainda não configurado.');
        var resumo = await api('/resumo', { body: { pedido_id: opcoes.pedidoId } });
        if (!estado.aberto) return;
        if (resumo.codigo) estado.codigo = resumo.codigo;
        if (resumo.ja_pago) return telaPago(null);
        await carregarSdk();
        if (!estado.aberto) return;
        var idBrick = 'k10pg-brick-' + Math.random().toString(36).slice(2);
        render(cabecalho('Cartão de crédito') +
          '<div class="k10pg-valor">' + dinheiro(resumo.valor) + '</div>' +
          '<p class="k10pg-msg k10pg-msg-erro" data-erro' + (avisoErro ? '' : ' hidden') + '>' + esc(avisoErro || '') + '</p>' +
          '<div id="' + idBrick + '" class="k10pg-brick"></div>' +
          '<p class="k10pg-mini">Os dados do cartão vão direto para o Mercado Pago, criptografados. ' +
          'A K10 não vê nem guarda o número do cartão. Na fatura aparece <b>K10 DELIVERY</b>.</p>' +
          (opcoes.permitirTrocar ? '<div class="k10pg-acoes"><button type="button" class="k10pg-btn k10pg-sec" data-a="pix">Pagar com Pix</button></div>' : ''));
        ligar('pix', function () { iniciar('pix'); });
        var mp = new window.MercadoPago(c.publicKey, { locale: 'pt-BR' });
        estado.brick = await mp.bricks().create('cardPayment', idBrick, {
          initialization: { amount: Number(resumo.valor) },
          customization: {
            paymentMethods: { maxInstallments: Number(resumo.max_parcelas) || 1, types: { excluded: ['debit_card', 'prepaid_card'] } },
            visual: { style: { theme: 'dark' } }
          },
          callbacks: {
            onReady: function () {},
            onError: function (erro) { console.error('Card Payment Brick', erro); },
            onSubmit: function (form, extra) { return pagarComCartao(form, extra); }
          }
        });
      } catch (e) {
        if (!estado.aberto) return;
        if (e.codigo === 'pedido_ja_pago') return telaPago(null);
        telaErro(e.message, e.status !== 404 && e.status !== 409, e.status === 404 || e.codigo === 'pedido_cancelado');
      }
    }

    async function pagarComCartao(form, extra) {
      form = form || {};
      var payer = form.payer || {};
      var doc = payer.identification || {};
      try {
        var r = await api('/criar', {
          body: {
            pedido_id: opcoes.pedidoId,
            metodo: 'cartao',
            origem: 'site',
            cartao: {
              token: form.token,
              payment_method_id: form.payment_method_id,
              payment_type_id: (extra && extra.paymentTypeId) || 'credit_card',
              installments: form.installments || 1,
              email: payer.email,
              doc_tipo: doc.type,
              doc_numero: doc.number
            }
          }
        });
        var p = r.pagamento;
        estado.pagamento = p;
        // espera o formulário do Mercado Pago terminar antes de trocar a tela
        setTimeout(function () {
          if (!estado.aberto) return;
          if (p.status === 'recusado' || p.status === 'erro') iniciar('cartao', r.erro || 'O cartão foi recusado.');
          else mostrar(p);
        }, 0);
      } catch (e) {
        setTimeout(function () {
          if (!estado.aberto) return;
          if (e.codigo === 'pedido_ja_pago') telaPago(null);
          else if (e.status === 429) telaErro(e.message, false);
          else iniciar('cartao', e.message);
        }, 0);
      }
    }

    // ---------------------------------------------------------------- controle
    function iniciar(metodo, aviso) {
      pararTudo();
      opcoes.metodo = entrega ? 'pix' : metodo;
      if (opcoes.metodo === 'cartao') iniciarCartao(aviso);
      else iniciarPix();
    }

    function pararBrick() {
      if (estado.brick) {
        try { estado.brick.unmount(); } catch (e) { /* já desmontado */ }
        estado.brick = null;
      }
    }
    function pararTudo() {
      clearTimeout(estado.timer);
      clearInterval(estado.relogio);
    }

    function fechar(motivo) {
      if (!estado.aberto) return;
      estado.aberto = false;
      pararTudo();
      pararBrick();
      document.removeEventListener('keydown', teclado);
      document.removeEventListener('visibilitychange', voltouProSite);
      fundo.remove();
      document.documentElement.classList.remove('k10pg-travado');
      if (estado.ultimoFoco && estado.ultimoFoco.focus) { try { estado.ultimoFoco.focus(); } catch (e) { /* ok */ } }
      var situacao = motivo || (estado.pagamento ? estado.pagamento.status : 'fechado');
      if (typeof opcoes.onFechar === 'function') {
        try { opcoes.onFechar(situacao, estado.pagamento); } catch (e) { console.error(e); }
      }
    }

    iniciar(opcoes.metodo);
    return { fechar: function () { fechar(); } };
  }

  window.K10Pagamento = { abrir: abrir, versao: '1.0.0' };
})();
