# SGEE Mobile

Sistema Mobile para Gestão de Equipamentos Escolares (SGEE). O app substitui o controle manual de empréstimos de notebooks por uma ferramenta para consultar salas, registrar empréstimos e devoluções, acompanhar ocorrências e administrar o inventário.

## Instalar a versão de teste

O link abaixo abre a build Android mais recente. Abra-o no celular Android, baixe o APK e confirme a instalação. Se o Android solicitar, permita a instalação de aplicativos pela origem usada para abrir o arquivo.

**Build preview atual — versão 1.0.0, `versionCode` 2:**

[Abrir build e instalar o SGEE Mobile](https://expo.dev/accounts/vitorgoad/projects/gestao-equipamentos/builds/dd91159b-f056-469b-98ac-3e085045da14)

Essa é uma build interna de teste distribuída pelo EAS. O login Microsoft exige conexão com a internet e uma conta cadastrada na lista autorizada do Firestore.

## Funcionalidades

- Login exclusivamente por Microsoft SSO, com autorização conferida no Firestore.
- Perfis de acesso `admin` (T.I.) e `professor`.
- Painel com salas/carrinhos e contagens de notebooks disponíveis, em uso e em manutenção.
- Empréstimo por equipamento, com nome do aluno e registro automático no histórico.
- Busca por notebook e aluno; filtros por disponibilidade, uso e manutenção.
- Devolução de empréstimos, inclusive em lote para os equipamentos do professor.
- Registro e correção de ocorrências no histórico. O autor da ocorrência e o administrador podem corrigi-la.
- Painel administrativo para cadastrar usuários autorizados, salas/carrinhos e equipamentos, gerenciar manutenção e realizar devolução forçada.
- Histórico de uso e exportação de relatórios CSV.

As ocorrências permanecem associadas ao registro histórico; não há expiração automática configurada. A ocorrência pode ser corrigida, com identificação de quem fez a alteração.

## Tecnologia e organização

- Expo SDK 58, React Native e TypeScript.
- Expo Router para navegação; as telas ficam em `src/app/`.
- Firebase Authentication com provedor Microsoft e Cloud Firestore.
- React Native Firebase no Android; o cliente Firebase para Web atende a versão Web.
- EAS Build para gerar APKs de teste e pacotes Android para loja.

Pastas principais:

- `src/app/`: login, painel, sala/carrinho, histórico, gestão e relatórios.
- `src/components/`: componentes visuais compartilhados.
- `src/contexts/`: sessão e estado de autenticação.
- `src/services/`: Firebase, autorização, inventário e relatórios.
- `assets/`: ícones, identidade visual e imagens.
- `plugins/`: configuração Android necessária para compatibilizar a versão do Firebase Android BoM com o toolchain do Expo SDK 58.

## Autenticação e lista autorizada

O Firebase Authentication valida a conta Microsoft. Após o login, o app procura um documento em `usuarios_autorizados` cujo ID seja o UID do Firebase Authentication. O e-mail autenticado também precisa corresponder ao e-mail do documento. O documento contém:

```text
usuarios_autorizados/{uid}
  email: string
  nome: string
  perfil: "admin" | "professor"
```

Para cadastrar uma pessoa, ela precisa entrar uma vez com Microsoft. Mesmo que ainda não esteja autorizada, essa primeira tentativa cria a identidade no Firebase Authentication e é negada pelo app. Um administrador então copia o UID em Firebase Console → Authentication → Usuários e cadastra UID, e-mail, nome e perfil no painel de gestão. O app não armazena senhas Microsoft.

### Primeiro administrador

Antes de existir um administrador dentro do app, o responsável pelo projeto precisa fazer esse primeiro cadastro manualmente no Firestore: após a primeira tentativa de login Microsoft, copie o UID em Authentication → Usuários e crie `usuarios_autorizados/{uid}` com o e-mail correspondente, o nome e `perfil: "admin"`. Depois desse passo, o administrador pode cadastrar as demais pessoas pelo painel.

## Estrutura do Firestore

- `usuarios_autorizados`: e-mail, nome e perfil; o ID do documento é o UID do Firebase Authentication.
- `carrinhos`: identificador, nome da sala e capacidade cadastrada.
- `equipamentos`: carrinho de referência, patrimônio, nome/número de série e status (`disponível`, `em_uso` ou `em_manutencao`).
- `historico`: equipamento de referência, professor, aluno, horários de retirada/devolução e ocorrência.

Os equipamentos usam `DocumentReference` para apontar ao carrinho e guardam o ID do registro de histórico aberto durante um empréstimo. Registros históricos antigos sem esse ID podem ser exibidos, mas não podem ser encerrados automaticamente pelo app.

## Configuração Firebase e Microsoft

### Android

O app Android usa o package name `com.vitorgoad.sgee`. O arquivo `google-services.json` da aplicação Android do Firebase fica na raiz e é referenciado em `app.json`. Se o projeto Firebase for trocado, registre uma aplicação Android com esse mesmo package name e substitua o arquivo pelo correspondente.

No Firebase Console:

1. Ative Microsoft em Authentication → provedores de login e informe o Client ID e o Client Secret fornecidos pela aplicação Microsoft Entra. Mantenha o segredo somente no Firebase Console; não o coloque no app, no `.env` ou em variáveis `EXPO_PUBLIC_*`.
2. Na aplicação Microsoft Entra, cadastre como URI de redirecionamento Web o callback indicado pelo provedor Microsoft no Firebase. Para o projeto atual: `https://gestao-equipamentos-fatec.firebaseapp.com/__/auth/handler`.
3. Registre no app Firebase as impressões digitais SHA-1 e SHA-256 da chave que assina as builds EAS. Se a chave de assinatura for substituída ou o app for publicado pela Play Store, registre também as impressões digitais dessa assinatura.

O login nativo Android é concluído pelo SDK Firebase. O esquema `sgee://` é usado para retornar à aplicação, não como URI de callback cadastrada no Entra.

### Web e variáveis de ambiente

Use `.env.example` como modelo para criar um `.env` local. Preencha as variáveis Firebase para a aplicação Web:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_MICROSOFT_TENANT_ID=common
```

As variáveis com prefixo `EXPO_PUBLIC_` são incorporadas ao cliente e não devem conter segredos. O `.env` está ignorado pelo Git. Para builds EAS, as variáveis usadas pelo projeto devem estar configuradas no ambiente EAS correspondente (`preview` ou `production`). O Client Secret Microsoft é configurado no Firebase, nunca no app.

### Regras e índices Firestore

O repositório está associado ao projeto Firebase `gestao-equipamentos-fatec`. `firebase.json` aponta para `firestore.rules` e `firestore.indexes.json`.

**Status dos testes:** as regras atualmente abertas no Console do Firestore foram mantidas abertas para a fase de testes, conforme combinado. Não use o banco com dados reais enquanto estiver assim. As regras restritivas mantidas neste repositório ainda precisam ser revisadas e publicadas ao fim dos testes:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Confirme o projeto selecionado e as regras no Console antes de publicar.

## Desenvolvimento local

Pré-requisitos: Node.js/npm, acesso ao repositório e credenciais de desenvolvimento do Firebase.

```bash
git clone https://github.com/VitorSoaresGoad/ControleAtivosEscolares.git
cd ControleAtivosEscolares
npm install
```

Crie o `.env` a partir de `.env.example` e preencha os dados Firebase da Web. O `google-services.json` Android já acompanha o projeto; para usar outro Firebase, substitua-o pelo arquivo da aplicação Android correspondente.

Para iniciar a versão Web:

```bash
npm run web
```

Expo Go não inclui os módulos nativos de autenticação e Firestore usados pelo Android. Para testar o app nativo, instale uma build EAS ou configure o ambiente Android e gere uma build de desenvolvimento.

Verificações do projeto:

```bash
npm run lint
npm run typecheck
npx expo-doctor
```

## Gerar novas builds Android

Entre na conta Expo que possui o projeto e solicite uma build:

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview
```

O perfil `preview` gera um APK para testes internos. Para gerar um Android App Bundle destinado à Play Store:

```bash
npx eas-cli@latest build --platform android --profile production
```

A build de produção é apenas o pacote; a publicação na loja é uma etapa separada. Verifique também o versionamento e as credenciais de assinatura antes de publicar.

## Situação do projeto

- Android: login Microsoft confirmado em aparelho; a build acima inclui o ícone SGEE.
- Web: usa o cliente Firebase Web e requer as variáveis do `.env`.
- iOS: ainda requer registrar a aplicação iOS no Firebase e fornecer `GoogleService-Info.plist`.
- Produção: falta encerrar os testes, revisar/publicar as regras Firestore restritivas e decidir a distribuição do app.
