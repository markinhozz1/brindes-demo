(function () {
  "use strict";
  var root = document.documentElement;
  var banner = document.querySelector(".demo-banner");
  var header = document.querySelector(".site-header");

  /* Altura real da faixa e do cabeçalho -> scroll-padding e posição do painel */
  function syncHeights() {
    if (banner) root.style.setProperty("--banner-h", banner.offsetHeight + "px");
    if (header) root.style.setProperty("--header-h", header.offsetHeight + "px");
  }
  syncHeights();
  window.addEventListener("resize", syncHeights);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncHeights);

  var live = document.getElementById("live");
  function announce(msg) {
    if (!live) return;
    live.textContent = "";
    window.setTimeout(function () { live.textContent = msg; }, 60);
  }

  /* ---------- Filtro do catálogo ---------- */
  var chips = Array.prototype.slice.call(document.querySelectorAll("[data-filter]"));
  var cards = Array.prototype.slice.call(document.querySelectorAll(".card"));
  var filterStatus = document.getElementById("filter-status");

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var cat = chip.getAttribute("data-filter");
      var shown = 0;
      chips.forEach(function (c) { c.setAttribute("aria-pressed", c === chip ? "true" : "false"); });
      cards.forEach(function (card) {
        var match = cat === "todos" || card.getAttribute("data-cat") === cat;
        card.hidden = !match;
        if (match) shown++;
      });
      if (filterStatus) {
        filterStatus.textContent = cat === "todos"
          ? "Mostrando todos os produtos."
          : "Mostrando " + shown + (shown === 1 ? " produto" : " produtos") + " em " + chip.textContent.trim() + ".";
      }
    });
  });

  /* ---------- Lista de orçamento ---------- */
  var items = []; // [{id, name}]
  var countEl = document.getElementById("quote-count");
  var countSr = document.getElementById("quote-count-sr");
  var listEl = document.getElementById("quote-items");
  var emptyEl = document.getElementById("quote-empty");

  function nameOf(card) { return card.querySelector("h3").textContent.trim(); }
  function cardById(id) { return document.querySelector('.card[data-id="' + id + '"]'); }
  function has(id) { return items.some(function (it) { return it.id === id; }); }
  function countText(n) {
    return n === 0 ? "nenhum item na lista" : n + (n === 1 ? " item na lista" : " itens na lista");
  }

  function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

  function render() {
    var n = items.length;
    countEl.textContent = String(n);
    countSr.textContent = ", " + countText(n);
    emptyEl.hidden = n > 0;
    listEl.hidden = n === 0;
    listEl.textContent = "";
    items.forEach(function (it) {
      var li = document.createElement("li");
      var span = document.createElement("span");
      span.textContent = it.name;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-remove";
      btn.setAttribute("data-remove", it.id);
      btn.setAttribute("aria-label", "Remover " + it.name + " da lista");
      btn.textContent = "Remover";
      li.appendChild(span);
      li.appendChild(btn);
      listEl.appendChild(li);
    });
    cards.forEach(function (card) {
      var b = card.querySelector("[data-add]");
      var inList = has(card.getAttribute("data-id"));
      b.classList.toggle("in-list", inList);
      b.textContent = inList ? "Na lista de orçamento" : "Solicitar orçamento";
    });
  }

  document.querySelectorAll("[data-add]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var card = btn.closest(".card");
      var id = card.getAttribute("data-id");
      var name = nameOf(card);
      var msg;
      if (has(id)) {
        msg = name + " já está na lista. " + cap(countText(items.length)) + ".";
      } else {
        items.push({ id: id, name: name });
        msg = "Adicionado à lista: " + name + ". " + cap(countText(items.length)) + ".";
      }
      render();
      openPanel(btn);
      announce(msg);
    });
  });

  listEl.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-remove]");
    if (!btn) return;
    var id = btn.getAttribute("data-remove");
    var idx = -1;
    items.forEach(function (it, i) { if (it.id === id) idx = i; });
    if (idx < 0) return;
    var removed = items.splice(idx, 1)[0];
    render();
    // Mantém o foco num lugar lógico dentro do painel
    var rest = listEl.querySelectorAll("[data-remove]");
    if (rest.length) rest[Math.min(idx, rest.length - 1)].focus();
    else { emptyEl.setAttribute("tabindex", "-1"); emptyEl.focus(); }
    announce("Removido da lista: " + removed.name + ". " + cap(countText(items.length)) + ".");
  });

  /* ---------- Painel (modal) com foco preso via inert ---------- */
  var panel = document.getElementById("quote-panel");
  var card = panel.querySelector(".quote-card");
  var closeBtn = document.getElementById("close-quote");
  var openBtn = document.getElementById("open-quote");
  var background = Array.prototype.filter.call(document.body.children, function (el) {
    return el !== panel && el !== banner && el.tagName !== "SCRIPT" && el.id !== "live";
  });
  var opener = null;

  function focusables() {
    return Array.prototype.filter.call(
      card.querySelectorAll('button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])'),
      function (el) { return !el.disabled && el.offsetParent !== null; }
    );
  }

  function openPanel(from) {
    if (!panel.hidden) return;
    opener = from || document.activeElement;
    syncHeights();
    panel.hidden = false;
    background.forEach(function (el) { el.inert = true; });
    document.body.classList.add("panel-open");
    openBtn.setAttribute("aria-expanded", "true");
    closeBtn.focus();
  }

  function closePanel() {
    if (panel.hidden) return;
    panel.hidden = true;
    background.forEach(function (el) { el.inert = false; });
    document.body.classList.remove("panel-open");
    openBtn.setAttribute("aria-expanded", "false");
    if (opener && document.contains(opener)) opener.focus();
    opener = null;
  }

  openBtn.setAttribute("aria-expanded", "false");
  openBtn.addEventListener("click", function () { openPanel(openBtn); });
  closeBtn.addEventListener("click", closePanel);
  panel.querySelector("[data-close]").addEventListener("click", closePanel);

  document.addEventListener("keydown", function (e) {
    if (panel.hidden) return;
    if (e.key === "Escape") { e.preventDefault(); closePanel(); return; }
    if (e.key === "Tab") {
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || !card.contains(document.activeElement))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
  });

  /* ---------- Formulário apenas visual ---------- */
  var form = document.getElementById("quote-form");
  var result = document.getElementById("form-result");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    result.textContent = "Demonstração: este formulário não envia dados. Nada saiu do seu navegador" +
      (items.length ? " (" + countText(items.length) + ")." : ".");
  });

  render();
})();
