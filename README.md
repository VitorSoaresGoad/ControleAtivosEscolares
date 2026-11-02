# SGEE Mobile

Aplicativo Expo / React Native para consulta de carrinhos, empréstimo e devolução de notebooks, histórico de uso e gestão do inventário escolar.

## Rodar localmente

1. O `.env` atual já tem as variáveis `EXPO_PUBLIC_FIREBASE_*`. Preserve esses valores e acrescente `EXPO_PUBLIC_MICROSOFT_CLIENT_ID` com o Client ID público do app Microsoft e, se a organização usar um tenant específico, `EXPO_PUBLIC_MICROSOFT_TENANT_ID`. Em uma instalação nova, use `.env.example` como modelo. Nunca coloque o Client Secret da Microsoft no app.
2. Cadastre o provedor Microsoft em **Firebase Authentication → Sign-in method → Microsoft**. Use no Firebase o mesmo Client ID e o mesmo segredo configurados no app Microsoft Entra. Adicione o endereço de callback do Firebase (`https://<project-id>.firebaseapp.com/__/auth/handler`) aos URIs de redirecionamento Web da aplicação Microsoft.
3. Preencha `EXPO_PUBLIC_MICROSOFT_CLIENT_ID` com o Client ID público da aplicação Microsoft. Para organizações de um único tenant, substitua `common` em `EXPO_PUBLIC_MICROSOFT_TENANT_ID` pelo Tenant ID. Cadastre também o redirecionamento nativo `sgee://auth` na aplicação Entra.
4. Cadastre os usuários na coleção `usuarios_autorizados`, usando o **UID do Firebase Authentication como ID do documento**. Cada documento precisa ter `email`, `nome` e `perfil` (`admin` ou `professor`). São aceitos e-mails de qualquer domínio, desde que a conta possa autenticar pelo provedor Microsoft configurado e esteja cadastrada na whitelist. O e-mail do documento deve corresponder ao e-mail retornado pelo login Microsoft.
5. O `.firebaserc` vincula o diretório local ao projeto `gestao-equipamentos-fatec`; `firebase.json` aponta para `firestore.rules` e `firestore.indexes.json`. Com Firebase CLI autenticado, publique com `firebase deploy --only firestore:rules,firestore:indexes`. As regras do repositório são mais restritivas que as regras temporárias abertas no Console: revise e publique-as somente quando encerrar os testes.
6. Inicie com `npx expo start`. Para login nativo com esquema `sgee`, gere um development build (`npx expo run:android` ou `npx expo run:ios`) e configure o URI correspondente ao ambiente usado no Microsoft Entra.

## Gerar aplicativo Android

O perfil `preview` gera um APK instalável para testes. O perfil `production` gera um AAB para publicação na Google Play.

1. Entre ou crie uma conta Expo e execute `npx eas-cli@latest login`.
2. No projeto, execute `npx eas-cli@latest build:configure` para vincular este app a um projeto EAS. Na primeira build, defina um identificador Android definitivo (`android.package`); trocá-lo depois faz o Android tratar a build como outro aplicativo.
3. No ambiente `preview` e também em `production` no EAS, configure as variáveis `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`, `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `EXPO_PUBLIC_FIREBASE_APP_ID` e `EXPO_PUBLIC_MICROSOFT_CLIENT_ID`. Configure `EXPO_PUBLIC_MICROSOFT_TENANT_ID` com o tenant institucional, ou `common` se esse for o valor usado no Microsoft Entra. O `.env` local está ignorado pelo Git e não é enviado automaticamente para builds remotas. Não cadastre o Client Secret como variável `EXPO_PUBLIC_*`.
4. Para gerar o APK de testes, execute `npx eas-cli@latest build --platform android --profile preview`. Ao concluir, use o link do artefato para baixar e instalar no dispositivo Android.
5. Para gerar o pacote da Google Play, execute `npx eas-cli@latest build --platform android --profile production`. Esse comando só gera o AAB; a publicação na loja é uma etapa separada.

Antes da primeira build mobile, confirme que o Client ID público da aplicação Microsoft está preenchido no ambiente EAS. Sem ele, o login no app nativo não consegue iniciar.

## Fluxos implementados

- Autenticação Microsoft e conferência do UID em `usuarios_autorizados` antes de liberar acesso.
- Dashboard com contagens em tempo real dos carrinhos e estados dos equipamentos.
- Empréstimo individual gravado junto do histórico em uma transação Firestore.
- Devolução em lote, ocorrência por equipamento e registro de data/hora do servidor.
- Histórico paginado; professor consulta seus próprios empréstimos e administrador consulta/exporta todo o histórico.
- Gestão administrativa de carrinhos e notebooks, manutenção e devolução forçada auditada.
- Exportação CSV do inventário, equipamentos em manutenção, inventário por sala e histórico filtrado por período.

Os equipamentos guardam `id_carrinho` como `DocumentReference`, conforme o diagrama de coleções. Cada equipamento também armazena `id_historico_atual` para fechar com precisão o empréstimo aberto durante devoluções em lote. Registros antigos sem esse campo continuam aparecendo, mas não podem ter o histórico fechado automaticamente sem identificar o empréstimo correspondente.
