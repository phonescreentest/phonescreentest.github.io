/* Phone Screen Test — site glue (loaded BEFORE screen-test-assets/app.js).
   The plugin app.js is used byte-identical. This file only:
   1. Seeds the saved test selection WITHOUT "white-screen", so the
      standalone White Screen test is never a default-selected test.
      White still runs as the FIRST colour of the Solid Color group
      (white, black, red, green, blue, gray) — exactly as Usman asked.
   2. Removes the "White Screen" row from the plugin's individual-test
      picker, so it never appears as a standalone entry.
   3. Re-implements "Select all" in the picker without white-screen.
   4. Wires the homepage's own buttons: the all-tests list below the
      tool (each button runs that one test) and the Solid Color group
      button (runs the whole colour cycle, white first). */
(function () {
  "use strict";
  var WHITE_ID = "white-screen";
  var STORAGE_KEY = "screenTestSelection.v1";
  // Default-selected tests in the plugin (def:true), minus white-screen.
  var DEFAULT_SELECTED = ["dead-pixel", "stuck-pixel", "black-screen",
    "red-screen", "green-screen", "blue-screen", "gray-screen",
    "color-test", "contrast-test", "brightness-test", "screen-uniformity",
    "backlight-bleed", "touch-coverage", "touch-test", "refresh-rate",
    "burn-in"];

  function seedSelection() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.indexOf(WHITE_ID) !== -1) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(
            arr.filter(function (id) { return id !== WHITE_ID; })));
        }
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SELECTED));
      }
    } catch (e) { /* storage unavailable — the row removal below still applies */ }
  }
  seedSelection(); // runs at parse time, before app.js boots and reads storage

  function removeWhiteRow() {
    var row = document.querySelector(
      '#categories-container .test-row[data-id="' + WHITE_ID + '"]');
    if (row) row.remove();
  }

  function runSingle(id) {
    var cat = document.getElementById("category-screen");
    var sel = document.getElementById("selection-screen");
    var noneBtn = document.getElementById("select-none-btn");
    var row = document.querySelector(
      '#categories-container .test-row[data-id="' + id + '"]');
    var startBtn = document.getElementById("start-test-btn");
    if (!row || !noneBtn || !startBtn) return;
    if (cat) cat.classList.add("hidden");
    if (sel) sel.classList.remove("hidden");
    noneBtn.click();   // clear the saved selection
    row.click();       // select only this one test
    startBtn.click();  // start the runner with just this test
  }

  function runGroupByLabel(label) {
    var cards = document.querySelectorAll("#category-grid > *");
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].textContent.indexOf(label) !== -1) {
        cards[i].click();
        return;
      }
    }
  }

  function wire() {
    // All-tests list below the tool.
    var list = document.getElementById("all-tests");
    if (list) {
      list.addEventListener("click", function (e) {
        var b = e.target.closest
          ? e.target.closest("[data-test-id],[data-group-label]") : null;
        if (!b) return;
        if (b.hasAttribute("data-group-label")) {
          runGroupByLabel(b.getAttribute("data-group-label"));
        } else {
          runSingle(b.getAttribute("data-test-id"));
        }
      });
    }
    // "Select Individual Tests" button beside Start.
    var selBtn = document.getElementById("pstSelectBtn");
    if (selBtn) {
      selBtn.addEventListener("click", function () {
        var link = document.getElementById("show-individual-tests-link");
        if (link) link.click();
        var app = document.getElementById("screen-test-app");
        if (app && app.scrollIntoView) app.scrollIntoView({ behavior: "smooth" });
      });
    }
    // "Select all" in the plugin picker: re-implement without white-screen.
    // Capture-phase listener on document runs before the plugin's own
    // button listener, so stopPropagation keeps white out of the selection.
    document.addEventListener("click", function (e) {
      var btn = e.target && e.target.closest
        ? e.target.closest("#select-all-btn") : null;
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      var rows = document.querySelectorAll(
        "#categories-container .test-row");
      rows.forEach(function (row) {
        if (row.dataset.id === WHITE_ID) return;
        if (!row.classList.contains("selected")) row.click();
      });
    }, true);
    // Remove the White Screen row after the plugin builds the picker,
    // and keep watching in case it is rebuilt.
    var container = document.getElementById("categories-container");
    if (container && window.MutationObserver) {
      new MutationObserver(removeWhiteRow).observe(container,
        { childList: true, subtree: true });
    }
    setTimeout(removeWhiteRow, 0);
    removeWhiteRow();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(wire, 0); // after the plugin boot (registered after us)
    });
  } else {
    setTimeout(wire, 0);
  }
})();
