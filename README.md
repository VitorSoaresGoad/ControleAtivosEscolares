# SGEE Mobile

Aplicativo Expo / React Native para consulta de carrinhos, empréstimo e devolução de notebooks, histórico de uso e gestão do inventário escolar.

## Rodar localmente

1. O `.env` atual já tem as variáveis `EXPO_PUBLIC_FIREBASE_*`. Preserve esses valores e acrescente `EXPO_PUBLIC_MICROSOFT_CLIENT_ID` com o Client ID público do app Microsoft e, se a organização usar um tenant específico, `EXPO_PUBLIC_MICROSOFT_TENANT_ID`. Em uma instalação nova, use `.env.example` como modelo. Nunca coloque o Client Secret da Microsoft no app.
2. Cadastre o provedor Microsoft em **Firebase Authentication → Sign-in method → Microsoft**. Use no Firebase o mesmo Client ID e o mesmo segredo configurados no app Microsoft Entra. Adicione o endereço de callback do Firebase (`https://<project-id>.firebaseapp.com/__/auth/handler`) aos URIs de redirecionamento Web da aplicação Microsoft.
3. Preencha `EXPO_PUBLIC_MICROSOFT_CLIENT_ID` com o Client ID público da aplicação Microsoft. Para organizações de um único tenant, substitua `common` em `EXPO_PUBLIC_MICROSOFT_TENANT_ID` pelo Tenant ID. Cadastre também o redirecionamento nativo `sgee://auth` na aplicação Entra.
4. Cadastre os usuários na coleção `usuarios_autorizados`, usando o **UID do Firebase Authentication como ID do documento**. Cada documento precisa ter `email`, `nome` e `perfil` (`admin` ou `professor`). O app valida o domínio institucional `@professor.educacao.sp.gov.br`; uma exceção temporária de conta de teste pode ser definida localmente em `EXPO_PUBLIC_TEST_ACCOUNT_EMAIL`. Essa exceção não substitui o cadastro obrigatório do UID na whitelist.
5. O `.firebaserc` vincula o diretório local ao projeto `gestao-equipamentos-fatec`; `firebase.json` aponta para `firestore.rules` e `firestore.indexes.json`. Com Firebase CLI autenticado, publique com `firebase deploy --only firestore:rules,firestore:indexes`. As regras do repositório são mais restritivas que as regras temporárias abertas no Console: revise e publique-as somente quando encerrar os testes.
6. Inicie com `npx expo start`. Para login nativo com esquema `sgee`, gere um development build (`npx expo run:android` ou `npx expo run:ios`) e configure o URI correspondente ao ambiente usado no Microsoft Entra.

## Fluxos implementados

- Autenticação Microsoft e conferência do UID em `usuarios_autorizados` antes de liberar acesso.
- Dashboard com contagens em tempo real dos carrinhos e estados dos equipamentos.
- Empréstimo individual gravado junto do histórico em uma transação Firestore.
- Devolução em lote, ocorrência por equipamento e registro de data/hora do servidor.
- Histórico paginado; professor consulta seus próprios empréstimos e administrador consulta/exporta todo o histórico.
- Gestão administrativa de carrinhos e notebooks, manutenção e devolução forçada auditada.
- Exportação CSV do inventário, equipamentos em manutenção, inventário por sala e histórico filtrado por período.

Os equipamentos guardam `id_carrinho` como `DocumentReference`, conforme o diagrama de coleções. Cada equipamento também armazena `id_historico_atual` para fechar com precisão o empréstimo aberto durante devoluções em lote. Registros antigos sem esse campo continuam aparecendo, mas não podem ter o histórico fechado automaticamente sem identificar o empréstimo correspondente.
