// -----------------------------------------------------------------------------
// Theme Management (Operatory Light / Dark)
// -----------------------------------------------------------------------------
function initTheme() {
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const isDark = localStorage.getItem('molaris_theme') === 'dark';
  if (isDark) {
    document.documentElement.classList.add('dark');
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const willBeDark = !document.documentElement.classList.contains('dark');
      document.documentElement.classList.toggle('dark', willBeDark);
      localStorage.setItem('molaris_theme', willBeDark ? 'dark' : 'light');
    });
  }
}
