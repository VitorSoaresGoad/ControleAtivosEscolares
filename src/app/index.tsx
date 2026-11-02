import React from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Redirect } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { signInWithPopup } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { auth, microsoftProvider } from '../services/firebase';
import { signInWithMicrosoftAccessToken } from '../services/auth';
import { colors } from '../theme';

WebBrowser.maybeCompleteAuthSession();

const tenant = process.env.EXPO_PUBLIC_MICROSOFT_TENANT_ID || 'common';
const clientId = process.env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID || '';

export default function LoginRoute() {
  const { session, loading } = useAuth();
  const { width } = useWindowDimensions();
  const showWebSplitLayout = Platform.OS === 'web' && width >= 960;
  const discovery = AuthSession.useAutoDiscovery(`https://login.microsoftonline.com/${tenant}/v2.0`);
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'sgee', path: 'auth' });
  const [request, , promptAsync] = AuthSession.useAuthRequest({
    clientId,
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    scopes: ['openid', 'profile', 'email', 'User.Read'],
    extraParams: { prompt: 'select_account' },
  }, discovery);

  async function login() {
    try {
      if (Platform.OS === 'web') {
        await signInWithPopup(auth, microsoftProvider);
        return;
      }
      if (!clientId) {
        Alert.alert('Configuração necessária', 'Adicione EXPO_PUBLIC_MICROSOFT_CLIENT_ID ao ambiente e configure o URI de redirecionamento no Microsoft Entra.');
        return;
      }
      if (!request || !discovery) return;
      const result = await promptAsync();
      if (result.type !== 'success') return;
      let token = result.authentication?.accessToken;
      if (!token && result.params.code && discovery) {
        const exchanged = await AuthSession.exchangeCodeAsync({
          clientId,
          code: result.params.code,
          redirectUri,
          extraParams: { code_verifier: request.codeVerifier ?? '' },
          scopes: ['openid', 'profile', 'email', 'User.Read'],
        }, discovery);
        token = exchanged.accessToken;
      }
      if (!token) throw new Error('A Microsoft não retornou o token de acesso.');
      await signInWithMicrosoftAccessToken(token);
    } catch (error) {
      console.error('Erro de login Microsoft:', error);
      const message = error instanceof Error ? error.message : 'Tente novamente em instantes.';
      Alert.alert('Não foi possível entrar', message);
    }
  }

  if (session) return <Redirect href="/dashboard" />;
  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={colors.blue} /></View>;

  return <View style={[styles.page, showWebSplitLayout && styles.pageWide]}>
    <ScrollView
      style={[styles.loginColumn, showWebSplitLayout ? styles.loginColumnWide : styles.loginColumnCompact]}
      contentContainerStyle={[styles.loginContent, showWebSplitLayout && styles.loginContentWide]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.brandRow}><Image source={require('../../assets/SGEE-removebg-preview.webp')} style={styles.logo} resizeMode="contain" /><View style={styles.brandCopy}><Text style={styles.brand}>SGEE Mobile</Text><Text style={styles.brandCaption}>Gestão escolar de equipamentos</Text></View></View>
      <View style={styles.welcome}><Text style={styles.greeting}>Olá, novamente!</Text><Text style={styles.subGreeting}>Empréstimos organizados. Aula pronta para começar.</Text></View>
      <Pressable accessibilityRole="button" onPress={login} disabled={Platform.OS !== 'web' && !request} style={({ pressed }) => [styles.loginButton, pressed && { opacity: 0.82 }]}>
        <View style={styles.loginCopy}><Text style={styles.loginTitle}>Acesso Microsoft</Text><Text style={styles.loginSubtitle}>Use uma conta Microsoft autorizada</Text></View><Ionicons name="arrow-forward-circle-outline" size={34} color={colors.ink} />
      </Pressable>
      <View style={styles.help}><Text style={styles.helpTitle}>Acesso protegido</Text><Text style={styles.helpText}>Somente contas cadastradas pela equipe de T.I. na lista autorizada podem utilizar o sistema.</Text></View>
      <View style={styles.footer}><Image source={require('../../assets/brasao-sp.svg')} style={styles.crest} resizeMode="contain" /><Text style={styles.footerText}>Governo do Estado de São Paulo</Text></View>
    </ScrollView>
    {showWebSplitLayout && <View style={styles.side}><View style={styles.sideIcon}><Ionicons name="laptop-outline" size={44} color={colors.blue} /></View><Text style={styles.sideTitle}>Tecnologia pronta para a aula.</Text><Text style={styles.sideText}>Consulte carrinhos, registre empréstimos e acompanhe cada equipamento em tempo real.</Text></View>}
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white }, pageWide: { flexDirection: 'row' },
  loginColumn: { flex: 1, width: '100%' }, loginColumnWide: { maxWidth: 560 }, loginColumnCompact: { maxWidth: 520, alignSelf: 'center' },
  loginContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 }, loginContentWide: { paddingHorizontal: 56, paddingVertical: 40 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 11 }, brandCopy: { flex: 1, flexShrink: 1 }, logo: { width: 49, height: 49 }, brand: { color: colors.blue, fontWeight: '900', fontSize: 18 }, brandCaption: { color: colors.muted, fontSize: 11, marginTop: 2 },
  welcome: { gap: 8, marginTop: 48 }, greeting: { color: colors.ink, fontWeight: '900', fontSize: 32 }, subGreeting: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  loginButton: { marginTop: 28, borderWidth: 1, borderColor: colors.line, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFC' }, loginCopy: { flex: 1, gap: 5 }, loginTitle: { fontWeight: '800', fontSize: 16, color: colors.ink }, loginSubtitle: { color: colors.blue, fontSize: 12 },
  help: { borderLeftWidth: 3, borderLeftColor: colors.blue, paddingLeft: 13, marginTop: 24 }, helpTitle: { color: colors.ink, fontWeight: '700', fontSize: 13, marginBottom: 4 }, helpText: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  footer: { alignItems: 'center', gap: 4, marginTop: 42 }, crest: { width: 60, height: 48 }, footerText: { color: colors.muted, fontSize: 10, textTransform: 'uppercase' },
  side: { flex: 1, minWidth: 0, backgroundColor: '#F4F7FC', justifyContent: 'center', alignItems: 'center', padding: 56, gap: 18 }, sideIcon: { width: 90, height: 90, borderRadius: 28, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white }, sideTitle: { width: '100%', maxWidth: 390, textAlign: 'center', color: colors.ink, fontSize: 31, fontWeight: '900' }, sideText: { width: '100%', maxWidth: 400, textAlign: 'center', color: colors.muted, fontSize: 16, lineHeight: 24 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
});
