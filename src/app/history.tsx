import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, limit, orderBy, query, startAfter, where, type DocumentData, type QueryDocumentSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Button, Card, Header, Screen, StatusPill } from '../components/UI';
import { db } from '../services/firebase';
import { exportCsv, toCsv } from '../services/reports';
import type { RegistroHistorico } from '../types/domain';
import { colors } from '../theme';

const PAGE_SIZE = 20;
type HistoryItem = RegistroHistorico & { documentId: string; nome_equipamento?: string; numero_patrimonio?: string; nome_sala?: string; tipo?: string };

export default function HistoryRoute() {
  const { session, loading } = useAuth();
  const [records, setRecords] = useState<HistoryItem[]>([]);
  const cursor = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const loadPage = useCallback(async (reset = false) => {
    if (loadingRef.current || (!reset && !hasMoreRef.current)) return;
    loadingRef.current = true;
    setLoadingRows(true); setError('');
    try {
      const constraints = session?.profile.perfil === 'admin' ? [] : [where('email_professor', '==', session?.profile.email ?? '')];
      const currentCursor = reset ? null : cursor.current;
      const pageQuery = !currentCursor
        ? query(collection(db, 'historico'), ...constraints, orderBy('data_hora_retirada', 'desc'), limit(PAGE_SIZE))
        : query(collection(db, 'historico'), ...constraints, orderBy('data_hora_retirada', 'desc'), startAfter(currentCursor), limit(PAGE_SIZE));
      const snapshot = await getDocs(pageQuery);
      const items = snapshot.docs.map(item => ({ ...item.data(), documentId: item.id } as HistoryItem));
      setRecords(current => reset ? items : [...current, ...items]);
      cursor.current = snapshot.docs.at(-1) ?? null;
      hasMoreRef.current = snapshot.docs.length === PAGE_SIZE;
      setHasMore(hasMoreRef.current);
    } catch (reason) {
      const code = typeof reason === 'object' && reason !== null && 'code' in reason
        ? String(reason.code)
        : '';
      setError(code === 'failed-precondition'
        ? 'O histórico está aguardando a criação do índice no Firebase. Tente novamente em alguns minutos.'
        : 'Não foi possível carregar o histórico. Verifique sua conexão e tente novamente.');
    }
    finally { loadingRef.current = false; setLoadingRows(false); }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(() => void loadPage(true), 0);
    return () => clearTimeout(timer);
  }, [session, loadPage]);

  const filtered = useMemo(() => records.filter(record => !search || `${record.nome_equipamento ?? ''} ${record.numero_patrimonio ?? ''} ${record.nome_aluno ?? ''} ${record.nome_professor ?? ''} ${record.nome_sala ?? ''}`.toLowerCase().includes(search.toLowerCase())), [records, search]);
  const isAdmin = session?.profile.perfil === 'admin';

  async function exportHistory() {
    setExporting(true);
    try {
      const snapshot = await getDocs(query(collection(db, 'historico'), orderBy('data_hora_retirada', 'desc')));
      const rows: unknown[][] = [['Data retirada', 'Data devolução', 'Sala', 'Equipamento', 'Patrimônio', 'Professor', 'E-mail do professor', 'Aluno', 'Ocorrência']];
      for (const item of snapshot.docs) {
        const data = item.data();
        rows.push([data.data_hora_retirada?.toDate?.().toLocaleString('pt-BR') ?? '', data.data_hora_devolucao?.toDate?.().toLocaleString('pt-BR') ?? 'Em aberto', data.nome_sala ?? '', data.nome_equipamento ?? '', data.numero_patrimonio ?? '', data.nome_professor ?? '', data.email_professor ?? '', data.nome_aluno ?? '', data.ocorrencia ?? '']);
      }
      await exportCsv('historico-sgee.csv', toCsv(rows));
    } catch (reason) { Alert.alert('Exportação não concluída', reason instanceof Error ? reason.message : 'Tente novamente.'); }
    finally { setExporting(false); }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.blue} /></View>;
  if (!session) return <Redirect href="/" />;

  return <Screen>
    <Header title={isAdmin ? 'Histórico de uso' : 'Meu histórico'} subtitle="Empréstimos e devoluções recentes" onBack={() => router.back()} />
    {isAdmin ? <Button title="Exportar histórico CSV" icon="download-outline" variant="secondary" loading={exporting} onPress={() => void exportHistory()} /> : null}
    <View style={styles.search}><Ionicons name="search" size={17} color={colors.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="Buscar notebook, aluno ou professor…" placeholderTextColor="#98A2B3" style={styles.searchInput} /></View>
    {!error && filtered.length === 0 && !loadingRows ? <Card style={styles.empty}><Ionicons name="time-outline" size={32} color={colors.muted} /><Text style={styles.emptyTitle}>{records.length === 0 ? 'Nenhum registro de uso ainda' : 'Nenhum registro encontrado'}</Text><Text style={styles.muted}>As movimentações ficam registradas aqui automaticamente.</Text></Card> : filtered.map(record => <HistoryCard key={record.documentId} record={record} />)}
    {error ? <Card><Text style={styles.error}>{error}</Text><Button title="Tentar novamente" variant="secondary" onPress={() => void loadPage(records.length === 0)} /></Card> : null}
    {hasMore && records.length > 0 ? <Button title="Carregar mais registros" variant="secondary" loading={loadingRows} onPress={() => void loadPage()} /> : null}
    {loadingRows && records.length === 0 ? <View style={styles.centerInline}><ActivityIndicator color={colors.blue} /></View> : null}
  </Screen>;
}

function HistoryCard({ record }: { record: HistoryItem }) {
  const withdrawn = record.data_hora_retirada?.toDate?.();
  const returned = record.data_hora_devolucao?.toDate?.();
  const open = !record.data_hora_devolucao;
  return <Card style={styles.recordCard}>
    <View style={styles.recordTop}><View style={styles.timelineDot}><View style={[styles.dot, { backgroundColor: open ? colors.orange : colors.blue }]} /></View><View style={{ flex: 1 }}><View style={styles.nameRow}><Text style={styles.recordName}>{record.nome_equipamento ?? `Notebook ${record.numero_patrimonio ?? ''}`}</Text><StatusPill label={open ? 'Em uso' : 'Devolvido'} tone={open ? 'orange' : 'green'} /></View><Text style={styles.date}>{withdrawn ? withdrawn.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Data indisponível'} · {withdrawn?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) ?? '--:--'}{returned ? ` – ${returned.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}</Text></View></View>
    <View style={styles.details}><Text style={styles.detailLine}><Text style={styles.detailStrong}>Aluno: </Text>{record.nome_aluno}</Text><Text style={styles.detailLine}><Text style={styles.detailStrong}>Professor: </Text>{record.nome_professor ?? record.email_professor}</Text>{record.nome_sala ? <Text style={styles.detailLine}><Text style={styles.detailStrong}>Local: </Text>{record.nome_sala}</Text> : null}{record.ocorrencia ? <View style={styles.occurrence}><Ionicons name="alert-circle-outline" size={15} color={colors.red} /><Text style={styles.occurrenceText}>{record.ocorrencia}</Text></View> : null}</View>
  </Card>;
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.canvas, justifyContent: 'center', alignItems: 'center' }, centerInline: { padding: 28, alignItems: 'center' }, search: { minHeight: 46, borderRadius: 12, backgroundColor: '#E9EDF2', paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9 }, searchInput: { flex: 1, color: colors.ink, fontSize: 13 },
  recordCard: { padding: 14, gap: 11 }, recordTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' }, timelineDot: { height: 31, width: 31, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: colors.blueSoft }, dot: { width: 9, height: 9, borderRadius: 5 }, nameRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }, recordName: { fontSize: 13, color: colors.ink, fontWeight: '800' }, date: { marginTop: 5, fontSize: 10, color: colors.muted }, details: { paddingLeft: 41, gap: 4 }, detailLine: { color: colors.muted, fontSize: 11 }, detailStrong: { color: colors.ink, fontWeight: '700' }, occurrence: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', backgroundColor: colors.redSoft, padding: 8, borderRadius: 8, marginTop: 3 }, occurrenceText: { flex: 1, color: colors.red, fontSize: 11 },
  empty: { alignItems: 'center', paddingVertical: 26 }, emptyTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' }, muted: { color: colors.muted, fontSize: 12, textAlign: 'center' }, error: { color: colors.red },
});
