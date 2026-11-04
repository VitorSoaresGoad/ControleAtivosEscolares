import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { initializeAuth, type Persistence } from 'firebase/auth';
import { app } from './firebaseApp';

const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
const MAX_SECURE_CHUNK_CODEPOINTS = 450;
let persistenceWriteSequence = 0;
type SecureManifest = { version: string; count: number };

function secureKey(firebaseKey: string) {
  const encoded = Array.from(firebaseKey, character => character.codePointAt(0)?.toString(16) ?? '0').join('-');
  return `sgee-firebase-auth-${encoded}`;
}

function splitIntoChunks(value: string) {
  const codepoints = Array.from(value);
  const chunks: string[] = [];
  for (let index = 0; index < codepoints.length; index += MAX_SECURE_CHUNK_CODEPOINTS) {
    chunks.push(codepoints.slice(index, index + MAX_SECURE_CHUNK_CODEPOINTS).join(''));
  }
  return chunks;
}

function parseManifest(value: string | null): SecureManifest | null {
  if (!value) return null;
  try {
    const manifest = JSON.parse(value) as Partial<SecureManifest>;
    const version = manifest.version;
    const count = manifest.count;
    if (typeof version !== 'string' || !version || typeof count !== 'number' || !Number.isInteger(count) || count < 1 || count > 100) return null;
    return { version, count };
  } catch {
    return null;
  }
}

async function readSecureValue(key: string) {
  const baseKey = secureKey(key);
  const manifest = parseManifest(await SecureStore.getItemAsync(`${baseKey}-manifest`, secureStoreOptions));
  if (!manifest) return null;
  const chunks = await Promise.all(Array.from({ length: manifest.count }, (_, index) =>
    SecureStore.getItemAsync(`${baseKey}-${manifest.version}-${index}`, secureStoreOptions)));
  if (chunks.some(chunk => chunk === null)) return null;
  return chunks.join('');
}

async function writeSecureValue(key: string, value: string) {
  const baseKey = secureKey(key);
  const manifestKey = `${baseKey}-manifest`;
  const previousManifest = parseManifest(await SecureStore.getItemAsync(manifestKey, secureStoreOptions));
  const version = `${Date.now().toString(36)}-${(++persistenceWriteSequence).toString(36)}`;
  const chunks = splitIntoChunks(value);

  for (const [index, chunk] of chunks.entries()) {
    await SecureStore.setItemAsync(`${baseKey}-${version}-${index}`, chunk, secureStoreOptions);
  }
  await SecureStore.setItemAsync(manifestKey, JSON.stringify({ version, count: chunks.length }), secureStoreOptions);

  if (previousManifest) {
    await Promise.all(Array.from({ length: previousManifest.count }, (_, index) =>
      SecureStore.deleteItemAsync(`${baseKey}-${previousManifest.version}-${index}`, secureStoreOptions))).catch(() => undefined);
  }
}

async function deleteSecureValue(key: string) {
  const baseKey = secureKey(key);
  const manifest = parseManifest(await SecureStore.getItemAsync(`${baseKey}-manifest`, secureStoreOptions));
  const removals = [SecureStore.deleteItemAsync(`${baseKey}-manifest`, secureStoreOptions), AsyncStorage.removeItem(key)];
  if (manifest) {
    removals.push(...Array.from({ length: manifest.count }, (_, index) =>
      SecureStore.deleteItemAsync(`${baseKey}-${manifest.version}-${index}`, secureStoreOptions)));
  }
  await Promise.all(removals);
}

const secureStorePersistence = class {
  readonly type = 'LOCAL' as const;

  _isAvailable() {
    return SecureStore.isAvailableAsync();
  }

  async _set(key: string, value: unknown) {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) throw new Error('Não foi possível serializar a sessão de autenticação.');
    await writeSecureValue(key, serialized);
    await AsyncStorage.removeItem(key);
  }

  async _get<T,>(key: string): Promise<T | null> {
    let value = await readSecureValue(key);
    if (value === null) {
      // Move existing Firebase sessions out of the previous unencrypted store.
      value = await AsyncStorage.getItem(key);
      if (value !== null) {
        await writeSecureValue(key, value);
        await AsyncStorage.removeItem(key);
      }
    }
    if (value === null) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      await deleteSecureValue(key);
      return null;
    }
  }

  _remove(key: string) {
    return deleteSecureValue(key);
  }

  _addListener() {}

  _removeListener() {}

  readonly _shouldAllowMigration = true;
} as unknown as Persistence;

export const auth = initializeAuth(app, {
  persistence: secureStorePersistence,
});
