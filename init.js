window.AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID

if (window.location.pathname === '/') {
  window.location.href = '/lobby.html'
}