# Guia de Compilação PWABuilder — BR3 Tech (.APK e .EXE)

Este guia orienta o processo de empacotamento e compilação do projeto **BR3 Tech** utilizando o **[PWABuilder](https://www.pwabuilder.com)** (ferramenta oficial da Microsoft mantida para gerar binários para Google Play, Android Sideload e Windows).

---

## 1. O que foi preparado e otimizado no projeto

O projeto está **100% auditado e aprovado** pelos padrões do PWABuilder e Google Lighthouse:

1. **Manifesto Web App (`manifest.json` e `manifest.webmanifest`)**:
   - `id`: `br3tech-app`
   - `name`: `BR3 Tech — Laboratório e Gestão de Assistência Técnica`
   - `short_name`: `BR3 Tech`
   - `start_url`: `/?source=pwa`
   - `scope`: `/`
   - `display`: `standalone`
   - `display_override`: `["window-controls-overlay", "standalone", "minimal-ui"]`
   - `theme_color` e `background_color`: `#090d16`
   - `shortcuts`: Atalhos rápidos para *Nova OS*, *Painel* e *Consultar Ordens*.

2. **Ícones PNG Nativos em Alta Resolução**:
   - `96x96`, `144x144`, `192x192`, `256x256`, `384x384`, `512x512` (propósito `any`)
   - `512x512` (propósito `maskable` para adaptação aos círculos/quadrados do Android)
   - `apple-touch-icon.png` (180x180) para iOS

3. **Screenshots Obrigatórias para Lojas e Construtor**:
   - `screenshot-desktop-wide.png`: 1280x720 (`form_factor: "wide"`) para telas de PC e Windows Store.
   - `screenshot-mobile-narrow.png`: 720x1280 (`form_factor: "narrow"`) para celulares Android e Play Store.

4. **Service Worker v3 com Modo Offline**:
   - `public/sw.js` com interceptação de requisições de navegação e cache inteligente.
   - Página de contingência `offline.html` carregada automaticamente se o dispositivo perder o sinal de internet.

---

## 2. Como gerar o aplicativo Android (.APK)

1. Acesse o PWABuilder com o link direto pré-configurado:
   👉 **[https://www.pwabuilder.com/?site=https%3A%2F%2Fbr3tech.onrender.com](https://www.pwabuilder.com/?site=https%3A%2F%2Fbr3tech.onrender.com)**
2. Aguarde a análise (o score de manifesto, service worker e segurança ficará verde/máximo).
3. Clique no botão **"Package for Stores"** ou **"Next"**.
4. Selecione a plataforma **Android**:
   - Clique em **"Generate Package"** (ou **"Package Options"** se desejar personalizar o Package ID, ex: `com.br3tech.app`).
   - Se for gerar apenas o APK para distribuição direta / bancada / WhatsApp:
     - Marque a opção de gerar **APK (Sideload / Testing)**.
     - O PWABuilder gerará um arquivo `.zip` contendo o instalador `.apk` pronto para instalar em qualquer Android!
   - Se for publicar na Google Play Store:
     - Preencha o Keystore e gere o arquivo `.aab` (Android App Bundle).

---

## 3. Como gerar o aplicativo Windows (.EXE / .MSIX)

1. No mesmo painel do PWABuilder (**"Package for Stores"**):
2. Selecione a plataforma **Windows**:
   - Clique em **"Generate Package"**.
   - O PWABuilder irá gerar o instalador do Windows (pacote `.msix` / `.exe` com instalador automático).
   - O pacote gerado permite:
     - Instalação no Windows 10 e Windows 11 com 1 clique;
     - Ícone próprio na barra de tarefas e no Menu Iniciar;
     - Janela independente sem molduras de navegador (`window-controls-overlay`);
     - Acesso direto a impressoras térmicas (recibos e ordens).

---

## 4. Teste Direto no Navegador

Tanto no celular quanto no PC, os usuários e técnicos podem instalar instantaneamente sem precisar do instalador tradicional:
- **No celular (Android)**: Abra `https://br3tech.onrender.com` no Chrome, toque no menu **(⋮)** e escolha **"Instalar aplicativo"**.
- **No PC (Windows)**: Abra no Edge ou Chrome e clique no ícone de computador/instalação na barra de endereço ou pelo menu **Downloads** no topo da página.
