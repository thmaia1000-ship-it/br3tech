#!/usr/bin/env bash
# Script para atualizar o nome do serviço e a URL no Render.com para br3tech.onrender.com
# Uso:
#   RENDER_API_KEY="seu_token" RENDER_SERVICE_ID="srv-xxxx" bash scripts/update-render-url.sh
# ou simplesmente:
#   npm run render:rename

set -e

NEW_NAME="br3tech"
TARGET_URL="https://br3tech.onrender.com"

echo "=========================================================="
echo "  Atualização de URL do Projeto no Render.com"
echo "  Nova URL desejada: $TARGET_URL"
echo "=========================================================="

if [ -z "$RENDER_API_KEY" ]; then
  echo ""
  echo "ℹ️ Nenhuma variável RENDER_API_KEY foi detectada no ambiente."
  echo ""
  echo "Para atualizar a URL automaticamente via API do Render, execute:"
  echo "  RENDER_API_KEY=\"<SEU_TOKEN_RENDER>\" RENDER_SERVICE_ID=\"<ID_DO_SERVICO>\" bash scripts/update-render-url.sh"
  echo ""
  echo "Ou execute o comando direto via cURL:"
  echo "  curl -s -X PATCH https://api.render.com/v1/services/<SERVICE_ID> \\"
  echo "    -H \"Authorization: Bearer <SEU_RENDER_API_KEY>\" \\"
  echo "    -H \"Accept: application/json\" \\"
  echo "    -H \"Content-Type: application/json\" \\"
  echo "    -d '{\"name\":\"br3tech\"}'"
  echo ""
  echo "----------------------------------------------------------"
  echo "Como trocar em 10 segundos pelo painel web do Render:"
  echo "1. Acesse https://dashboard.render.com"
  echo "2. Clique no serviço da sua aplicação (ex: pixel-perfect-render-7586-1)"
  echo "3. No menu lateral esquerdo, clique em 'Settings'"
  echo "4. No primeiro campo ('Name'), altere para: br3tech"
  echo "5. Role até o final ou clique em 'Save Changes'"
  echo "O Render atualizará o endereço imediatamente para: https://br3tech.onrender.com"
  echo "=========================================================="
  exit 0
fi

# Se houver RENDER_API_KEY mas não houver RENDER_SERVICE_ID, tenta listar os serviços
if [ -z "$RENDER_SERVICE_ID" ]; then
  echo "🔍 Buscando ID do serviço no Render via API..."
  SERVICES_JSON=$(curl -s -X GET "https://api.render.com/v1/services?limit=20" \
    -H "Authorization: Bearer $RENDER_API_KEY" \
    -H "Accept: application/json")

  # Tenta localizar o serviço pelo nome antigo ou atual
  RENDER_SERVICE_ID=$(echo "$SERVICES_JSON" | grep -B 2 -E '"name":\s*"(pixel-perfect|br3tech)' | grep '"id":' | head -n 1 | sed -E 's/.*"id":\s*"([^"]+)".*/\1/')

  if [ -z "$RENDER_SERVICE_ID" ]; then
    echo "⚠️ Não foi possível identificar o SERVICE_ID automaticamente."
    echo "Por favor, defina a variável RENDER_SERVICE_ID=\"srv-...\" e tente novamente."
    exit 1
  fi
  echo "✓ Serviço localizado: $RENDER_SERVICE_ID"
fi

echo "🚀 Enviando comando de atualização de nome para '$NEW_NAME'..."
RESPONSE=$(curl -s -X PATCH "https://api.render.com/v1/services/$RENDER_SERVICE_ID" \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"$NEW_NAME\"}")

echo "✓ Resposta da API Render:"
echo "$RESPONSE" | grep -E '"name"|"slug"|"service"' || echo "$RESPONSE"

echo ""
echo "🎉 Sucesso! A URL do projeto no Render agora é: $TARGET_URL"
