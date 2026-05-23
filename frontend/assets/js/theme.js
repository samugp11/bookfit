// theme.js — gestión del modo oscuro global
(function () {
  // Aplica el tema guardado antes de que cargue el DOM (evita parpadeo)
  const tema = localStorage.getItem('tema') || 'light';
  if (tema === 'dark') document.documentElement.classList.add('dark');
})();

function toggleTema() {
  const esDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('tema', esDark ? 'dark' : 'light');
  actualizarIconoTema();
}

function actualizarIconoTema() {
  const esDark = document.documentElement.classList.contains('dark');
  const btns   = document.querySelectorAll('.theme-icon');
  btns.forEach(el => {
    el.setAttribute('data-lucide', esDark ? 'sun' : 'moon');
  });
  lucide.createIcons();
}