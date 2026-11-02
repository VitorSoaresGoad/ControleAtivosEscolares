import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

function csvCell(value: unknown) {
  const text = String(value ?? '').replace(/\r?\n/g, ' ').replace(/"/g, '""');
  const safeText = /^[\u0000-\u0020]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText}"`;
}

export function toCsv(rows: unknown[][]) {
  return `\uFEFF${rows.map(row => row.map(csvCell).join(';')).join('\r\n')}`;
}

export async function exportCsv(filename: string, content: string) {
  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    return;
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error('O compartilhamento de arquivos não está disponível neste aparelho.');
  const file = new File(Paths.cache, filename);
  try {
    if (file.exists) file.delete();
    file.create();
    await file.write(content);
    await Sharing.shareAsync(file.uri, { dialogTitle: 'Exportar relatório', mimeType: 'text/csv' });
  } finally {
    if (file.exists) file.delete();
  }
}
