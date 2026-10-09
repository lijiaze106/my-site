fetch('nav.html')
  .then(r => r.text())
  .then(html => {
    document.getElementById('site-header').innerHTML = html;
  });

fetch('footer.html')
  .then(r => r.text())
  .then(html => {
    document.getElementById('site-footer').innerHTML = html;
  });