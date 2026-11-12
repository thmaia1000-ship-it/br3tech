# Android APK — BR3 Tech

O BR3 Tech é um app web em TypeScript/React com renderização no servidor (TanStack Start) e PWA. O APK deve abrir o site publicado como uma **Trusted Web Activity (TWA)**. Assim, as telas, autenticação Supabase e recursos do servidor continuam usando a versão publicada; o APK não é uma cópia offline/autônoma do backend.

O endereço de produção documentado pelo projeto, `https://pixel-perfect-render-7586-1.onrender.com`, respondeu com HTTP 200 em 11/11/2026. O manifesto disponível é `/manifest.webmanifest`, com identidade BR3 Tech, ícones Android, `display: standalone` e início em `/auth`. O projeto também inclui service worker e metadados de viewport para celulares. Não há projeto Android nativo no repositório.

## Gerar o APK pelo terminal

Pré-requisitos: Node.js, JDK 17 e Android SDK Command-line Tools. Os comandos usam Bubblewrap, que cria um projeto Android TWA a partir do manifesto publicado. Execute na raiz do repositório:

```sh
npm run android:validate
npm run android:init
npm run android:build
```

Na primeira execução de `android:init`, confirme os valores sugeridos e gere uma chave de assinatura. A configuração gerada requer Android 7.0 (API 24) ou superior por causa da versão atual do Android Browser Helper. O app não usa Google Play Billing, então essa dependência opcional é desativada automaticamente. Guarde com segurança o arquivo de chave e as senhas: futuras versões instaláveis por cima da atual precisam da mesma chave. Não envie a chave privada ao GitHub.

O build roda dentro da pasta `android-twa`, onde fica o `gradlew`, e pula a consulta ao PageSpeed Insights. O APK assinado é gerado como `android-twa/app-release-signed.apk`. Para instalar diretamente, copie o APK para o Android e permita a instalação pelo gerenciador de arquivos. Para testar por USB com depuração habilitada, entre em `android-twa` e rode `npx @bubblewrap/cli install --apkFile=app-release-signed.apk`.

## Tela cheia confiável e domínio

Uma TWA precisa confirmar que o app Android e o domínio do site pertencem ao mesmo responsável. O arquivo `public/.well-known/assetlinks.json` contém essa associação para o pacote e a chave usados no APK assinado atual. Ele é publicado no domínio como `/.well-known/assetlinks.json`. Sem essa associação, o Chrome pode abrir a página em uma aba personalizada e exibir a barra de endereço.

Se a chave de assinatura for substituída, atualize também a impressão SHA-256 em `assetlinks.json`. Para publicar pela Google Play, inclua a impressão do certificado de assinatura do app fornecida pelo Play Console, que pode diferir da chave local.

O endereço do servidor é um parâmetro de build em `package.json`. Se o domínio de produção mudar, atualize os três comandos `android:*` antes de gerar outro pacote. O APK depende de conexão com o serviço hospedado para carregar o sistema e seus dados.

## Alternativa visual

O [PWABuilder](https://www.pwabuilder.com/) também pode empacotar o mesmo endereço e manifesto. Use a opção Android para gerar um APK de teste ou um AAB para publicação na Play Store. A publicação na loja também requer a chave de assinatura e a associação Digital Asset Links descrita acima.
