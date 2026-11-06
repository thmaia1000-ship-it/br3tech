export function renderErrorPage(detail?: string): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Esta página não carregou</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #0b0f19; color: #f1f5f9; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 36rem; width: 100%; text-align: center; padding: 2rem; background: #131b2e; border: 1px solid #1e293b; border-radius: 1rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
      h1 { font-size: 1.5rem; margin: 0 0 0.5rem; font-weight: 700; color: #38bdf8; }
      p { color: #94a3b8; margin: 0 0 1.5rem; }
      .error-box { text-align: left; background: #1e1b2e; border: 1px solid #f43f5e55; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem; font-family: monospace; font-size: 12px; color: #fda4af; overflow-x: auto; max-height: 250px; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.6rem 1.25rem; border-radius: 0.5rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; font-weight: 600; }
      .primary { background: #38bdf8; color: #0b0f19; }
      .secondary { background: transparent; color: #cbd5e1; border-color: #334155; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Esta página não carregou</h1>
      <p>Ocorreu um problema no servidor SSR. Você pode tentar atualizar ou voltar para o início.</p>
      ${detail ? `<div class="error-box"><pre>${detail.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre></div>` : ""}
      <div class="actions">
        <button class="primary" onclick="location.reload()">Recarregar página</button>
        <a class="secondary" href="/">Página inicial</a>
      </div>
    </div>
  </body>
</html>`;
}
