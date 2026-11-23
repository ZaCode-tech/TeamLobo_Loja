/* Tema claro/escuro: respeita o sistema, lembra a escolha e troca com revelação circular */
(function () {
  var root = document.documentElement;
  var btn = document.querySelector(".theme");
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function apply(t) {
    root.dataset.theme = t;
    try { localStorage.setItem("tl-theme", t); } catch (e) {}
    btn.setAttribute("aria-label", t === "dark" ? "Mudar para o modo claro" : "Mudar para o modo escuro");
  }
  apply(root.dataset.theme || "dark");
  btn.addEventListener("click", function (e) {
    var next = root.dataset.theme === "dark" ? "light" : "dark";
    if (!document.startViewTransition || reduce) return apply(next);
    var x = e.clientX, y = e.clientY;
    var r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(function () { apply(next); }).ready.then(function () {
      root.animate({ clipPath: ["circle(0 at " + x + "px " + y + "px)", "circle(" + r + "px at " + x + "px " + y + "px)"] },
        { duration: 600, easing: "ease-in", pseudoElement: "::view-transition-new(root)" });
    });
  });
})();
