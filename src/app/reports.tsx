import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, orderBy, query } from '../services/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Button, Card, Field, Header, Screen } from '../components/UI';
import { db } from '../services/firebase';
import { exportCsv, toCsv } from '../services/reports';
import { subscribeToCarts } from '../services/inventory';
import type { CarrinhoResumo } from '../types/domain';
import { colors } from '../theme';

type ReportType = 'history' | 'inventory' | 'maintenance' | 'room';
const options: { id: ReportType; title: string; description: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'history', title: 'Histórico de empréstimos', description: 'Retiradas, devoluções e ocorrências', icon: 'time-outline' },
  { id: 'inventory', title: 'Inventário completo', description: 'Todos os equipamentos cadastrados', icon: 'laptop-outline' },
  { id: 'maintenance', title: 'Equipamentos em manutenção', description: 'Itens bloqueados para empréstimo', icon: 'build-outline' },
  { id: 'room', title: 'Inventário por sala / carrinho', description: 'Equipamentos de uma sala selecionada', icon: 'cart-outline' },
];

export default function ReportsRoute() {
  const { session, loading } = useAuth();
  const [type, setType] = useState<ReportType>('inventory');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cartId, setCartId] = useState('');
  const [carts, setCarts] = useState<CarrinhoResumo[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!session || session.profile.perfil !== 'admin') return;
    return subscribeToCarts(setCarts, error => Alert.alert('Erro ao carregar salas', error.message));
  }, [session]);

  const selectedCart = carts.find(cart => cart.documentId === cartId);
  const report = options.find(option => option.id === type)!;

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.blue} /></View>;
  if (!session) return <Redirect href="/" />;
  if (session.profile.perfil !== 'admin') return <Redirect href="/dashboard" />;

  function parseDate(value: string, isEnd = false) {
    if (!value.trim()) return null;
    const parts = value.trim().split('/').map(Number);
    if (parts.length !== 3 || parts.some(part => !Number.isFinite(part))) return NaN;
    const [day, month, year] = parts;
    const date = new Date(year, month - 1, day, isEnd ? 23 : 0, isEnd ? 59 : 0, isEnd ? 59 : 0, isEnd ? 999 : 0);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return NaN;
    return date.getTime();
  }

  async function generate() {
    const from = parseDate(startDate);
    const through = parseDate(endDate, true);
    if (type === 'room' && !cartId) { Alert.alert('Selecione uma sala', 'Escolha o carrinho para exportar o inventário.'); return; }
    if (type === 'history' && (Number.isNaN(from) || Number.isNaN(through))) { Alert.alert('Confira as datas', 'Use o formato DD/MM/AAAA.'); return; }
    if (typeof from === 'number' && typeof through === 'number' && from > through) { Alert.alert('Período inválido', 'A data inicial precisa ser anterior à data final.'); return; }
    setExporting(true);
    try {
      if (type === 'history') {
        const snapshot = await getDocs(query(collection(db, 'historico'), orderBy('data_hora_retirada', 'desc')));
        const records = snapshot.docs.map(item => item.data()).filter(data => {
          const time = data.data_hora_retirada?.toDate?.().getTime?.();
          return typeof time === 'number' && (typeof from !== 'number' || time >= from) && (typeof through !== 'number' || time <= through);
        });
        const rows: unknown[][] = [['Data retirada', 'Data devolução', 'Sala', 'Equipamento', 'Patrimônio', 'Professor', 'E-mail do professor', 'Aluno', 'Ocorrência']];
        records.forEach(data => rows.push([data.data_hora_retirada?.toDate?.().toLocaleString('pt-BR') ?? '', data.data_hora_devolucao?.toDate?.().toLocaleString('pt-BR') ?? 'Em aberto', data.nome_sala ?? '', data.nome_equipamento ?? '', data.numero_patrimonio ?? '', data.nome_professor ?? '', data.email_professor ?? '', data.nome_aluno ?? '', data.ocorrencia ?? '']));
        await exportCsv('historico-sgee.csv', toCsv(rows));
      } else {
        const [cartSnapshot, equipmentSnapshot] = await Promise.all([getDocs(collection(db, 'carrinhos')), getDocs(collection(db, 'equipamentos'))]);
        const names = new Map(cartSnapshot.docs.map(item => [item.ref.path, String(item.data().nome_sala ?? '')]));
        const records = equipmentSnapshot.docs.map(item => ({ data: item.data(), path: item.data().id_carrinho?.path ?? '' })).filter(({ data, path }) => {
          if (type === 'maintenance' && data.status !== 'em_manutencao') return false;
          if (type === 'room' && path !== cartSnapshot.docs.find(cart => cart.id === cartId)?.ref.path) return false;
          return true;
        });
        const rows: unknown[][] = [['Sala', 'Nome', 'Patrimônio', 'Número de série', 'Status', 'Aluno atual', 'Retirada', 'Professor atual']];
        records.forEach(({ data, path }) => rows.push([names.get(path) ?? '', data.nome ?? '', data.numero_patrimonio ?? '', data.numero_serie ?? '', data.status ?? '', data.aluno_atual ?? '', data.hora_retirada?.toDate?.().toLocaleString('pt-BR') ?? '', data.nome_professor_atual ?? '']));
        const filename = type === 'maintenance' ? 'equipamentos-em-manutencao.csv' : type === 'room' ? `inventario-${(selectedCart?.nome_sala ?? 'sala').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv` : 'inventario-sgee.csv';
        await exportCsv(filename, toCsv(rows));
      }
    } catch (error) { Alert.alert('Exportação não concluída', error instanceof Error ? error.message : 'Tente novamente.'); }
    finally { setExporting(false); }
  }

  return <Screen>
    <Header title="Exportar relatórios" subtitle="Escolha o conteúdo e gere um arquivo CSV" onBack={() => router.back()} />
    <Text style={styles.sectionTitle}>Tipo de relatório</Text>
    <View style={styles.options}>{options.map(option => <Pressable key={option.id} onPress={() => setType(option.id)} style={[styles.option, type === option.id && styles.optionSelected]}>
      <View style={[styles.optionIcon, type === option.id && styles.optionIconSelected]}><Ionicons name={option.icon} size={19} color={type === option.id ? colors.blue : colors.muted} /></View>
      <View style={{ flex: 1 }}><Text style={styles.optionTitle}>{option.title}</Text><Text style={styles.optionDescription}>{option.description}</Text></View>
      <Ionicons name={type === option.id ? 'radio-button-on' : 'radio-button-off'} size={20} color={type === option.id ? colors.blue : '#B3BBC6'} />
    </Pressable>)}</View>
    {type === 'history' ? <Card style={styles.filtersCard}><Text style={styles.filtersTitle}>Período do histórico</Text><Text style={styles.filtersHint}>Deixe uma data vazia para incluir todo o período nessa direção.</Text><View style={styles.dates}><View style={{ flex: 1 }}><Field label="Data inicial" placeholder="DD/MM/AAAA" value={startDate} onChangeText={setStartDate} keyboardType="numbers-and-punctuation" /></View><View style={{ flex: 1 }}><Field label="Data final" placeholder="DD/MM/AAAA" value={endDate} onChangeText={setEndDate} keyboardType="numbers-and-punctuation" /></View></View></Card> : null}
    {type === 'room' ? <Card style={styles.filtersCard}><Text style={styles.filtersTitle}>Selecione a sala</Text>{carts.length === 0 ? <Text style={styles.filtersHint}>Nenhuma sala cadastrada.</Text> : <View style={styles.roomChoices}>{carts.map(cart => <Pressable key={cart.documentId} onPress={() => setCartId(cart.documentId)} style={[styles.roomChoice, cartId === cart.documentId && styles.roomChoiceSelected]}><Text style={[styles.roomChoiceText, cartId === cart.documentId && styles.roomChoiceTextSelected]}>{cart.nome_sala}</Text></Pressable>)}</View>}</Card> : null}
    <Card style={styles.preview}><Ionicons name="document-text-outline" size={21} color={colors.blue} /><View style={{ flex: 1 }}><Text style={styles.previewTitle}>{report.title}</Text><Text style={styles.previewText}>{type === 'history' ? 'Arquivo CSV com as movimentações no período.' : type === 'room' ? selectedCart?.nome_sala ?? 'Selecione uma sala para continuar.' : type === 'maintenance' ? 'Arquivo CSV somente com equipamentos em manutenção.' : 'Arquivo CSV com os equipamentos do inventário atual.'}</Text></View></Card>
    <Button title="Gerar CSV" icon="download-outline" loading={exporting} onPress={() => void generate()} />
  </Screen>;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.canvas }, sectionTitle: { color: colors.ink, fontWeight: '800', fontSize: 15 }, options: { gap: 9 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 13, padding: 12 }, optionSelected: { borderColor: colors.blue, backgroundColor: '#F7FAFF' }, optionIcon: { width: 37, height: 37, borderRadius: 12, backgroundColor: '#F0F2F5', alignItems: 'center', justifyContent: 'center' }, optionIconSelected: { backgroundColor: colors.blueSoft }, optionTitle: { color: colors.ink, fontWeight: '800', fontSize: 12 }, optionDescription: { color: colors.muted, fontSize: 10, marginTop: 3 },
  filtersCard: { gap: 11 }, filtersTitle: { color: colors.ink, fontWeight: '800', fontSize: 13 }, filtersHint: { color: colors.muted, fontSize: 11 }, dates: { flexDirection: 'row', gap: 9 }, roomChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, roomChoice: { paddingHorizontal: 11, paddingVertical: 9, borderWidth: 1, borderColor: colors.line, borderRadius: 99, backgroundColor: colors.white }, roomChoiceSelected: { backgroundColor: colors.blue, borderColor: colors.blue }, roomChoiceText: { color: colors.muted, fontWeight: '700', fontSize: 11 }, roomChoiceTextSelected: { color: colors.white },
  preview: { flexDirection: 'row', alignItems: 'center' }, previewTitle: { color: colors.ink, fontWeight: '800', fontSize: 13 }, previewText: { color: colors.muted, fontSize: 11, marginTop: 3 },
});
