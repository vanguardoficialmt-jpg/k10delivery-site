/* K10 Delivery · Pausar loja (27/11/2026)
   - Portal da equipe (só ADM): cartão no topo com o botão "Pausar loja" / "Reabrir loja".
   - Site dos clientes: aviso "Estamos fechados agora, voltamos já" com o WhatsApp da K10,
     e o pedido não é enviado enquanto a loja estiver pausada.
   - A trava de verdade fica no banco: tabela k10_loja + gatilho k10_trava_loja_pausada
     na tabela k10_pedidos (ver supabase/k10_loja.sql no GitHub).
   Este arquivo é carregado depois do app.js nas duas páginas. */
(function () {
  'use strict';
  var CFG = window.K10_SB || {};
  if (!window.K10_ONLINE || !CFG.url || !CFG.key) return;

  var BASE = String(CFG.url).replace(/\/+$/, '');
  var EQUIPE = (window.K10_MODE || document.documentElement.getAttribute('data-k10-mode')) === 'equipe';
  var MSG = 'A K10 está fechada agora. Voltamos já!';
  var estado = { pausada: false, em: null, por: null, lido: false };
  var ocupado = false;
  window.K10_LOJA = estado;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function aviso(txt, erro) {
    try { toast(txt, !!erro); } catch (e) { console.warn(txt); }
  }
  function souAdm() {
    try { return !!admin(); } catch (e) { return false; }
  }
  function meuNome() {
    try { var u = user(); return (u && u.name) || null; } catch (e) { return null; }
  }
  function hora(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return '';
    var h = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    var hoje = new Date().toDateString() === d.toDateString();
    return hoje ? 'às ' + h : 'em ' + d.toLocaleDateString('pt-BR') + ' às ' + h;
  }
  function linkWhats() {
    var d = '';
    try { d = String((DB && DB.settings && DB.settings.whatsapp) || ''); } catch (e) {}
    d = d.replace(/\D/g, '') || '65993585136';
    if (d.length <= 11) d = '55' + d;
    return 'https://wa.me/' + d + '?text=' + encodeURIComponent('Oi, K10! Vocês já voltaram a atender?');
  }

  /* ---------- leitura do estado (qualquer um pode ler) ---------- */
  function ler() {
    return fetch(BASE + '/rest/v1/k10_loja?select=pausada,atualizado_em,atualizado_por&id=eq.1', {
      headers: { apikey: CFG.key }, cache: 'no-store'
    }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      var row = Array.isArray(j) && j[0];
      if (!row) return;
      var mudou = !estado.lido || estado.pausada !== !!row.pausada || estado.em !== row.atualizado_em;
      estado.pausada = !!row.pausada;
      estado.em = row.atualizado_em || null;
      estado.por = row.atualizado_por || null;
      estado.lido = true;
      if (mudou) aplicar();
    }).catch(function () {});
  }

  function aplicar() {
    if (EQUIPE) atualizarCartao(); else aplicarCliente();
  }

  /* ---------- site dos clientes ---------- */
  function aplicarCliente() {
    document.documentElement.classList.toggle('k10-pausada', estado.pausada);
    var el = document.getElementById('k10-pausa');
    if (!estado.pausada) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('div');
      el.id = 'k10-pausa';
      el.setAttribute('role', 'status');
      var main = document.getElementById('app');
      if (main && main.parentNode) main.parentNode.insertBefore(el, main);
      else document.body.insertBefore(el, document.body.firstChild);
    }
    el.innerHTML =
      '<div class="wrap k10-pausa-in">' +
        '<div class="k10-pausa-txt"><b>🔴 Estamos fechados agora, voltamos já!</b>' +
        '<span>Os pedidos pelo site estão pausados no momento. Fale com a K10 no WhatsApp.</span></div>' +
        '<a class="k10-pausa-wa" href="' + esc(linkWhats()) + '" target="_blank" rel="noopener">💬 WhatsApp da K10</a>' +
      '</div>';
  }

  function barrar(e) {
    if (EQUIPE || !estado.pausada) return false;
    e.preventDefault();
    e.stopImmediatePropagation();
    aviso('🔴 ' + MSG + ' Os pedidos pelo site estão pausados. Chame a K10 no WhatsApp.', true);
    return true;
  }

  if (!EQUIPE) {
    // antes de qualquer outro código do site: não deixa ir para o pagamento nem enviar o pedido
    window.addEventListener('click', function (e) {
      var b = e.target && e.target.closest && e.target.closest('[data-action="checkout"],[data-go="checkout"]');
      if (b) barrar(e);
    }, true);
    window.addEventListener('submit', function (e) {
      var f = e.target;
      if (f && f.id === 'checkoutForm') barrar(e);
    }, true);
  }

  /* ---------- portal da equipe (só ADM) ---------- */
  function cartao() {
    if (!EQUIPE || !souAdm()) return '';
    var p = estado.pausada;
    var info;
    if (!estado.lido) info = 'Conferindo a situação da loja…';
    else if (p) info = 'Pausada' + (estado.por ? ' por ' + esc(estado.por) : '') + (estado.em ? ' ' + hora(estado.em) : '') +
      '. Os clientes veem “Estamos fechados agora, voltamos já” e não conseguem fazer pedido pelo site.';
    else info = 'Os clientes estão fazendo pedidos pelo site normalmente.';
    var txt = ocupado ? 'Aguarde…' : (p ? '▶️ Reabrir loja' : '⏸️ Pausar loja');
    return '<section id="k10-loja-card" class="panel k10-loja ' + (p ? 'k10-loja-off' : 'k10-loja-on') + '">' +
      '<div class="k10-loja-txt"><b>' + (p ? '🔴 LOJA PAUSADA' : '🟢 LOJA ABERTA') + '</b><p>' + info + '</p></div>' +
      '<button type="button" class="button k10-loja-btn" data-k10-loja="' + (p ? 'abrir' : 'pausar') + '"' +
      (estado.lido && !ocupado ? '' : ' disabled') + '>' + txt + '</button></section>';
  }

  function atualizarCartao() {
    var el = document.getElementById('k10-loja-card');
    if (!el) return;
    var h = cartao();
    if (h) el.outerHTML = h; else el.remove();
  }

  function alternar(acao) {
    if (ocupado) return;
    var api = window.K10_SB_API;
    if (!api || !api.rest) { aviso('Saia e entre de novo no portal para usar este botão.', true); return; }
    if (!souAdm()) { aviso('Só o ADM pode pausar a loja.', true); return; }
    var pausar = acao === 'pausar';
    ocupado = true; atualizarCartao();
    api.rest('k10_loja?id=eq.1', {
      method: 'PATCH',
      body: { pausada: pausar, atualizado_em: new Date().toISOString(), atualizado_por: meuNome() },
      prefer: 'return=representation'
    }).then(function (rows) {
      var row = Array.isArray(rows) && rows[0];
      if (!row) throw Error('o banco não deixou mudar (só o ADM pode)');
      estado.pausada = !!row.pausada;
      estado.em = row.atualizado_em || null;
      estado.por = row.atualizado_por || null;
      estado.lido = true;
      aviso(estado.pausada
        ? '⏸️ Loja pausada. Os clientes não conseguem mais fazer pedido pelo site.'
        : '▶️ Loja reaberta. Os pedidos pelo site voltaram.');
    }).catch(function (e) {
      aviso('Não deu para mudar a loja: ' + ((e && e.message) || 'erro'), true);
    }).then(function () {
      ocupado = false; atualizarCartao();
    });
  }

  if (EQUIPE) {
    // coloca o cartão no topo do portal, logo acima das abas
    if (typeof staff === 'function') {
      var _staff = staff;
      staff = function () {
        var h = _staff.apply(this, arguments);
        var c = cartao();
        if (!c || typeof h !== 'string') return h;
        var i = h.indexOf('<div class="tab-bar">');
        return i < 0 ? h : h.slice(0, i) + c + h.slice(i);
      };
    }
    window.addEventListener('click', function (e) {
      var b = e.target && e.target.closest && e.target.closest('[data-k10-loja]');
      if (!b) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      alternar(b.getAttribute('data-k10-loja'));
    }, true);
  }

  /* ---------- atualização automática ---------- */
  ler();
  setInterval(function () { if (document.visibilityState === 'visible') ler(); }, EQUIPE ? 20000 : 30000);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') ler(); });
})();
