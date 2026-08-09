import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { encryptAesGcm, decryptAesGcm } from './aes-gcm.util';

@Injectable()
export class TenantSecretsCipherService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const hex = config.getOrThrow<string>('TENANT_SECRETS_KEY');
    const key = Buffer.from(hex, 'hex');
    if (key.length !== 32) {
      throw new Error('TENANT_SECRETS_KEY deve ser uma string hexadecimal de 32 bytes (64 caracteres)');
    }
    this.key = key;
  }

  encrypt(plaintext: string): string {
    return encryptAesGcm(plaintext, this.key);
  }

  decrypt(ciphertext: string): string {
    return decryptAesGcm(ciphertext, this.key);
  }
}
