# 🚀 Guia de Configuração e URL no Render.com

Este projeto está configurado para executar no **Render.com** com a URL oficial:
👉 **`https://br3tech.onrender.com`**

---

## 🔄 Como alterar o endereço para `br3tech.onrender.com`

No Render, o subdomínio `.onrender.com` é gerado diretamente a partir do **nome do serviço**.

### Método 1: Pelo Painel do Render (Recomendado — 10 segundos)

1. Acesse seu painel em [dashboard.render.com](https://dashboard.render.com).
2. Localize e clique no serviço da sua aplicação (anteriormente chamado `pixel-perfect-render-7586-1`).
3. No menu lateral esquerdo, clique em **Settings**.
4. No campo **Name**, altere o valor atual para:
   ```
   br3tech
   ```
5. Role a página até o final e clique em **Save Changes**.
6. Pronto! O Render atualizará instantaneamente a URL pública para:
   **`https://br3tech.onrender.com`**

---

### Método 2: Pela API do Render via cURL ou Script

Se você possui um **Render API Key**:

```bash
# Executando via npm script:
RENDER_API_KEY="seu_token" RENDER_SERVICE_ID="srv-xxxx" npm run render:rename

# Ou comando direto cURL:
curl -s -X PATCH "https://api.render.com/v1/services/SEU_SERVICE_ID" \
  -H "Authorization: Bearer SEU_RENDER_API_KEY" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"name": "br3tech"}'
```

---

### Método 3: Via Blueprint (`render.yaml`)

O arquivo [`render.yaml`](file:///Users/thiagomaia/.gemini/antigravity/scratch/pixel-perfect-render-7586/render.yaml) na raiz do repositório já está configurado com `name: br3tech`.
Ao conectar um novo serviço ou sincronizar o Blueprint no Render a partir do repositório `thmaia1000-ship-it/br3tech`, o Render criará ou vinculará automaticamente o serviço sob o subdomínio `br3tech.onrender.com`.
