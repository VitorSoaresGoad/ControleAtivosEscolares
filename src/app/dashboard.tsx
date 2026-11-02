import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { Screen, Header, Card, StatusPill, Button, SheetModal } from '../components/UI';
import { subscribeToCarts } from '../services/inventory';
import type { CarrinhoResumo } from '../types/domain';
import { colors } from '../theme';

export default function DashboardRoute() {
  const { session, loading, logout } = useAuth();
  const [carts, setCarts] = useState<CarrinhoResumo[]>([]);
  const [loadingCarts, setLoadingCarts] = useState(true);
  const [error, setError] = useState('');
  const [profileVisible, setProfileVisible] = useState(false);

  useEffect(() => {
    if (!session) return;
    return subscribeToCarts(items => { setCarts(items); setLoadingCarts(false); setError(''); }, err => { setError(err.message); setLoadingCarts(false); });
  }, [session]);

  const totals = useMemo(() => carts.reduce((acc, cart) => ({ total: acc.total + cart.total, available: acc.available + cart.disponiveis, inUse: acc.inUse + cart.emUso, maintenance: acc.maintenance + cart.emManutencao }), { total: 0, available: 0, inUse: 0, maintenance: 0 }), [carts]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.blue} /></View>;
  if (!session) return <Redirect href="/" />;
  const isAdmin = session.profile.perfil === 'admin';

  return <Screen>
    <Header title="Carrinhos e salas" subtitle={`Olá, ${session.profile.nome.split(' ')[0]}`} right={<Pressable accessibilityRole="button" accessibilityLabel="Abrir perfil" onPress={() => setProfileVisible(true)} style={styles.account}><Ionicons name="person-circle-outline" size={24} color={colors.blue} /></Pressable>} />

    {isAdmin ? <Card style={styles.adminBanner}><View style={styles.bannerIcon}><Ionicons name="settings-outline" size={22} color={colors.blue} /></View><View style={{ flex: 1 }}><Text style={styles.bannerTitle}>Painel de gestão</Text><Text style={styles.bannerSubtitle}>Inventário, manutenção e relatórios</Text></View><Pressable onPress={() => router.push('/admin')} accessibilityLabel="Abrir gestão"><Ionicons name="chevron-forward" size={22} color={colors.blue} /></Pressable></Card> : null}

    <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Visão geral</Text><Pressable style={styles.historyLink} onPress={() => router.push('/history')}><Ionicons name="time-outline" size={17} color={colors.blue} /><Text style={styles.linkText}>Meu histórico</Text></Pressable></View>
    <View style={styles.summaryGrid}>
      <Summary label="Total de máquinas" value={totals.total} tone="blue" icon="laptop-outline" />
      <Summary label="Disponíveis" value={totals.available} tone="green" icon="checkmark-circle-outline" />
      <Summary label="Em uso" value={totals.inUse} tone="orange" icon="time-outline" />
      <Summary label="Manutenção" value={totals.maintenance} tone="red" icon="build-outline" />
    </View>

    <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Salas cadastradas</Text>{isAdmin ? <Pressable onPress={() => router.push('/admin')}><Text style={styles.linkText}>Gerenciar</Text></Pressable> : null}</View>
    {loadingCarts ? <View style={styles.loadingRow}><ActivityIndicator color={colors.blue} /><Text style={styles.muted}>Atualizando carrinhos…</Text></View> : error ? <Card><Text style={styles.error}>{error}</Text></Card> : carts.length === 0 ? <Card style={styles.empty}><Ionicons name="file-tray-outline" size={34} color={colors.muted} /><Text style={styles.emptyTitle}>Ainda não há carrinhos cadastrados</Text>{isAdmin ? <Text style={styles.muted}>Use o painel de gestão para adicionar a primeira sala.</Text> : <Text style={styles.muted}>Peça à equipe de T.I. para configurar o inventário.</Text>}</Card> : carts.map(cart => <Pressable key={cart.documentId} onPress={() => router.push({ pathname: '/cart/[id]', params: { id: cart.documentId } })} style={({ pressed }) => [styles.cartCard, pressed && { transform: [{ scale: 0.99 }] }]}>
      <View style={styles.cartTop}><View style={styles.cartIcon}><Ionicons name="cart-outline" size={21} color={colors.blue} /></View><View style={{ flex: 1 }}><Text style={styles.cartName}>{cart.nome_sala}</Text><Text style={styles.cartCapacity}>Capacidade cadastrada: {cart.capacidade_total} notebooks</Text></View><Ionicons name="chevron-forward" size={21} color="#9AA4B2" /></View>
      <View style={styles.cartBottom}><View style={styles.availableCount}><Text style={styles.availableNumber}>{cart.disponiveis}</Text><Text style={styles.availableLabel}>disponíveis</Text></View><View style={styles.pillRow}>{cart.emUso > 0 ? <StatusPill label={`${cart.emUso} em uso`} tone="orange" /> : null}{cart.emManutencao > 0 ? <StatusPill label={`${cart.emManutencao} manutenção`} tone="red" /> : null}</View><Text style={styles.totalText}>{cart.total} no total</Text></View>
    </Pressable>)}

    <SheetModal visible={profileVisible} title="Meu perfil" onClose={() => setProfileVisible(false)}>
      <View style={styles.profileSummary}>
        <View style={styles.profileAvatar}><Ionicons name="person" size={25} color={colors.blue} /></View>
        <Text style={styles.profileName}>{session.profile.nome}</Text>
        <Text style={styles.profileRole}>{isAdmin ? 'Administrador · T.I.' : 'Professor'}</Text>
      </View>
      <Card style={styles.profileDetails}>
        <Text style={styles.profileLabel}>E-mail</Text>
        <Text selectable style={styles.profileEmail}>{session.profile.email}</Text>
        <Text style={styles.profileLabel}>Tipo de acesso</Text>
        <Text style={styles.profileValue}>{isAdmin ? 'Administrador' : 'Professor'}</Text>
      </Card>
      <Button title="Sair da conta" variant="danger" icon="log-out-outline" onPress={() => { setProfileVisible(false); void logout(); }} />
    </SheetModal>
  </Screen>;
}

function Summary({ label, value, tone, icon }: { label: string; value: number; tone: 'blue' | 'green' | 'orange' | 'red'; icon: keyof typeof Ionicons.glyphMap }) {
  const background = tone === 'blue' ? colors.blueSoft : tone === 'green' ? colors.greenSoft : tone === 'orange' ? colors.orangeSoft : colors.redSoft;
  const foreground = tone === 'blue' ? colors.blue : tone === 'green' ? colors.green : tone === 'orange' ? colors.orange : colors.red;
  return <Card style={styles.summary}><View style={[styles.summaryIcon, { backgroundColor: background }]}><Ionicons name={icon} size={17} color={foreground} /></View><Text style={[styles.summaryValue, { color: foreground }]}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></Card>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas }, account: { width: 42, height: 42, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  profileSummary: { alignItems: 'center', gap: 7, paddingVertical: 6 }, profileAvatar: { height: 58, width: 58, borderRadius: 29, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' }, profileName: { color: colors.ink, fontWeight: '800', fontSize: 17, textAlign: 'center' }, profileRole: { color: colors.muted, fontSize: 12 }, profileDetails: { gap: 5 }, profileLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 5 }, profileEmail: { color: colors.ink, fontSize: 14 }, profileValue: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  adminBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.blueSoft, borderColor: '#D9E5FF' }, bannerIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white }, bannerTitle: { color: colors.ink, fontWeight: '800', fontSize: 14 }, bannerSubtitle: { color: colors.muted, fontSize: 11, marginTop: 3 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }, sectionTitle: { color: colors.ink, fontWeight: '800', fontSize: 16 }, historyLink: { flexDirection: 'row', alignItems: 'center', gap: 5 }, linkText: { color: colors.blue, fontWeight: '700', fontSize: 12 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, summary: { width: '48%', flexGrow: 1, minHeight: 116, justifyContent: 'space-between', padding: 13, gap: 3 }, summaryIcon: { height: 30, width: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, summaryValue: { fontSize: 25, fontWeight: '900', lineHeight: 28 }, summaryLabel: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  cartCard: { padding: 15, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, gap: 14 }, cartTop: { flexDirection: 'row', alignItems: 'center', gap: 11 }, cartIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueSoft }, cartName: { fontSize: 15, fontWeight: '800', color: colors.ink }, cartCapacity: { fontSize: 11, color: colors.muted, marginTop: 3 }, cartBottom: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderColor: colors.line, paddingTop: 12 }, availableCount: { flexDirection: 'row', alignItems: 'baseline', gap: 4 }, availableNumber: { color: colors.green, fontWeight: '900', fontSize: 19 }, availableLabel: { color: colors.green, fontSize: 11, fontWeight: '700' }, pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, flex: 1 }, totalText: { color: colors.muted, fontSize: 10 },
  loadingRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 32 }, muted: { color: colors.muted, fontSize: 13 }, empty: { alignItems: 'center', paddingVertical: 28 }, emptyTitle: { color: colors.ink, fontWeight: '800', fontSize: 14 }, error: { color: colors.red },
});
