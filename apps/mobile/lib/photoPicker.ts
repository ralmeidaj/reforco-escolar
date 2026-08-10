import { File, Paths } from 'expo-file-system';
import type { ImagePickerAsset } from 'expo-image-picker';

export interface LocalPhoto {
  uri: string;
  type: string;
  name: string;
}

/**
 * No Android, o picker às vezes devolve um `content://` (Photo Picker do sistema)
 * em vez de `file://` — o componente Image e o upload via FormData podem falhar
 * silenciosamente (preview em branco) com esse tipo de URI. Copiar pro cache do
 * app garante um `file://` estável para os dois usos.
 */
export async function toLocalPhoto(asset: ImagePickerAsset): Promise<LocalPhoto> {
  const name = asset.fileName ?? `foto-${Date.now()}.jpg`;
  const type = asset.mimeType ?? 'image/jpeg';

  try {
    const source = new File(asset.uri);
    const dest = new File(Paths.cache, `${Date.now()}-${name}`);
    await source.copy(dest);
    return { uri: dest.uri, type, name };
  } catch {
    return { uri: asset.uri, type, name };
  }
}
