# SGEE Mobile

Aplicativo Expo / React Native para empréstimo e devolução de notebooks, consulta de histórico e gestão do inventário escolar.

## Configuração Firebase e Microsoft

### Android nativo

1. No Firebase Console do projeto `gestao-equipamentos-fatec`, registre um aplicativo Android com o package name `com.vitorgoad.sgee`.
2. Adicione à aplicação Android as impressões digitais SHA-1 e SHA-256 do certificado que assina o APK do EAS. Use as credenciais do perfil `preview`; se trocar a keystore ou publicar pela Play Store, cadastre também as impressões digitais correspondentes à nova assinatura.
3. Baixe o `google-services.json` da aplicação Android e coloque-o na raiz deste projeto. O caminho está configurado em `app.json`. Esse arquivo contém identificadores de configuração do app, não o segredo OAuth da Microsoft.
4. Em Firebase Authentication, habilite o provedor Microsoft e informe o Client ID e o Client Secret da aplicação Microsoft Entra. O segredo fica somente no Firebase Console; não o coloque no app, no `.env` ou no EAS como variável pública.
5. Em Microsoft Entra → aplicativo → Authentication, registre como URI de redirecionamento Web o callback mostrado na configuração do provedor Microsoft no Firebase. Para este projeto, ele deve ser `https://gestao-equipamentos-fatec.firebaseapp.com/__/auth/handler`. O fluxo nativo usa o SDK Firebase para concluir o OAuth; não usa `sgee://auth` como callback OAuth.
6. Se a aplicação Entra for de um único tenant, configure `EXPO_PUBLIC_MICROSOFT_TENANT_ID` com o Tenant ID. Use `common` se contas pessoais e de múltiplos tenants precisarem ser aceitas.

O login só libera acesso depois que o UID do Firebase Authentication é encontrado como ID de documento em `usuarios_autorizados`, e o e-mail do documento corresponde ao e-mail autenticado. O documento precisa conter `email`, `nome` e `perfil` (`admin` ou `professor`).

Para gerar uma build iOS, também será necessário registrar a aplicação iOS no Firebase e colocar o `GoogleService-Info.plist` correspondente na raiz do projeto. Essa configuração não é necessária para o APK Android.

### Web

O site continua usando o Firebase JavaScript SDK. Para rodá-lo localmente, preencha no `.env` as variáveis `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`, `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` e `EXPO_PUBLIC_FIREBASE_APP_ID`. Use `.env.example` como modelo. O Client ID e o segredo do provedor Microsoft são configurados no Firebase Console, não no cliente web.

### Regras e índices Firestore

O `.firebaserc` vincula o diretório local ao projeto `gestao-equipamentos-fatec`; `firebase.json` aponta para `firestore.rules` e `firestore.indexes.json`. As regras locais são mais restritivas que as regras temporárias abertas no Console. Revise-as e publique-as somente quando encerrar os testes. Com Firebase CLI autenticado, a publicação é feita com `firebase deploy --only firestore:rules,firestore:indexes`.

## Rodar localmente

1. Instale as dependências com `npm install`.
2. Confirme que `google-services.json` está na raiz do projeto e que as variáveis de `.env` estão preenchidas para a plataforma usada.
3. Execute `npx expo start` para Web ou gere uma build nativa de desenvolvimento para Android. Expo Go não inclui os módulos nativos do Firebase usados pelo app.

## Gerar aplicativo Android

O perfil `preview` gera um APK para testes e o perfil `production` gera um AAB para publicação na Google Play.

1. Entre na conta Expo com `npx eas-cli@latest login`.
2. Verifique se `google-services.json` está no projeto antes de iniciar o build; o arquivo é necessário para o Firebase Android nativo.
3. Para gerar o APK, execute `npx eas-cli@latest build --platform android --profile preview`.
4. Para gerar o pacote da Play Store, execute `npx eas-cli@latest build --platform android --profile production`. A publicação na loja é uma etapa separada.

## Fluxos implementados

- Login Microsoft e validação da whitelist por UID do Firebase Authentication.
- Dashboard com contagens em tempo real dos carrinhos e estados dos equipamentos.
- Empréstimo individual salvo junto do histórico em uma transação Firestore.
- Devolução em lote, ocorrência por equipamento e data/hora do servidor.
- Histórico paginado; professor consulta os próprios empréstimos e administrador consulta/exporta todo o histórico.
- Gestão administrativa de carrinhos e notebooks, manutenção e devolução forçada auditada.
- Exportação CSV do inventário, equipamentos em manutenção, inventário por sala e histórico filtrado por período.

Os equipamentos guardam `id_carrinho` como `DocumentReference`. Cada equipamento também armazena `id_historico_atual` para fechar o empréstimo aberto durante devoluções em lote. Registros antigos sem esse campo aparecem no histórico, mas não podem ter o empréstimo encerrado automaticamente sem identificar o registro correspondente.
