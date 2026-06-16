export function showToast(text: string): void {
  const el = document.createElement('div');
  el.textContent = text;
  el.style.cssText =
    'position:fixed;bottom:24px;right:24px;padding:10px 20px;' +
    'background:var(--card-bg);border:1px solid var(--border-color);' +
    'border-radius:8px;color:var(--text-primary);font-size:0.85rem;' +
    'box-shadow:0 2px 8px rgba(0,0,0,0.12);z-index:300;' +
    'animation:toastFadeIn 0.2s ease;font-family:inherit;';
  document.body.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 2000);
}
