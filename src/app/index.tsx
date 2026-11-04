import React from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BrasaoSP from '../../assets/brasao-sp.svg';
import { useAuth } from '../contexts/AuthContext';
import { signInWithMicrosoft } from '../services/auth';
import { colors } from '../theme';

export default function LoginRoute() {
  const { session, loading } = useAuth();
  const { width } = useWindowDimensions();
  const showWebSplitLayout = Platform.OS === 'web' && width >= 960;

  async function login() {
    let stage = 'microsoft_sign_in';
    try {
      await signInWithMicrosoft();
    } catch (error) {
      const code = typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
        ? error.code
        : error instanceof Error ? error.name : 'unknown';
      console.error('Falha no login Microsoft. Etapa:', stage, 'Código:', code);
      Alert.alert('Não foi possível entrar', `Falha na autenticação Microsoft. Código técnico: ${code}.`);
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
      <Pressable accessibilityRole="button" onPress={login} style={({ pressed }) => [styles.loginButton, pressed && { opacity: 0.82 }]}>
        <View style={styles.loginCopy}><Text style={styles.loginTitle}>Acesso Microsoft</Text><Text style={styles.loginSubtitle}>Use uma conta Microsoft autorizada</Text></View><Ionicons name="arrow-forward-circle-outline" size={34} color={colors.ink} />
      </Pressable>
      <View style={styles.help}><Text style={styles.helpTitle}>Acesso protegido</Text><Text style={styles.helpText}>Somente contas cadastradas pela equipe de T.I. na lista autorizada podem utilizar o sistema.</Text></View>
      <View style={styles.footer}><BrasaoSP width={60} height={48} /><Text style={styles.footerText}>Governo do Estado de São Paulo</Text></View>
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
