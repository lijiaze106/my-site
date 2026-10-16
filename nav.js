const themeStorageKey = 'jiaze-li-theme';
const savedTheme = localStorage.getItem(themeStorageKey);

document.documentElement.dataset.theme = savedTheme === 'dark' ? 'dark' : 'light';

function updateTheme(theme, savePreference) {
  document.documentElement.dataset.theme = theme;

  const themeToggle = document.querySelector('.theme-toggle');
  const themeToggleLabel = document.querySelector('.theme-toggle-label');
  const themeToggleIcon = document.querySelector('.theme-toggle-icon');

  if (themeToggle && themeToggleLabel && themeToggleIcon) {
    const isDark = theme === 'dark';
    themeToggle.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
    themeToggle.setAttribute('aria-pressed', String(isDark));
    themeToggleLabel.textContent = isDark ? 'Light mode' : 'Dark mode';
    themeToggleIcon.textContent = isDark ? '☀' : '☾';
  }

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    themeColor.setAttribute('content', theme === 'dark' ? '#171a20' : '#f7f6f2');
  }

  if (savePreference) {
    localStorage.setItem(themeStorageKey, theme);
  }
}

fetch('nav.html')
  .then(r => r.text())
  .then(html => {
    document.getElementById('site-header').innerHTML = html;
    updateTheme(document.documentElement.dataset.theme, false);
    document.querySelector('.theme-toggle').addEventListener('click', () => {
      const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      updateTheme(nextTheme, true);
    });
  });

fetch('footer.html')
  .then(r => r.text())
  .then(html => {
    document.getElementById('site-footer').innerHTML = html;
  });