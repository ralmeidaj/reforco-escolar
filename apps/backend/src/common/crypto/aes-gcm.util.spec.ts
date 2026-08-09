import { randomBytes } from 'crypto';
import { encryptAesGcm, decryptAesGcm } from './aes-gcm.util';

describe('aes-gcm.util', () => {
  const key = randomBytes(32);

  it('faz roundtrip de uma string simples', () => {
    const ciphertext = encryptAesGcm('minha-chave-secreta', key);
    expect(decryptAesGcm(ciphertext, key)).toBe('minha-chave-secreta');
  });

  it('faz roundtrip de uma string com unicode/acentos', () => {
    const plaintext = 'chave-com-acentuação-é-ç-ã-🔐';
    const ciphertext = encryptAesGcm(plaintext, key);
    expect(decryptAesGcm(ciphertext, key)).toBe(plaintext);
  });

  it('gera ciphertexts diferentes para o mesmo plaintext (IV aleatório)', () => {
    const a = encryptAesGcm('mesma-string', key);
    const b = encryptAesGcm('mesma-string', key);
    expect(a).not.toBe(b);
  });

  it('lança ao decifrar com chave errada', () => {
    const ciphertext = encryptAesGcm('segredo', key);
    const otherKey = randomBytes(32);
    expect(() => decryptAesGcm(ciphertext, otherKey)).toThrow();
  });

  it('lança ao decifrar ciphertext adulterado (auth tag não bate)', () => {
    const ciphertext = encryptAesGcm('segredo', key);
    const raw = Buffer.from(ciphertext, 'base64');
    raw[raw.length - 1] ^= 0xff;
    const tampered = raw.toString('base64');
    expect(() => decryptAesGcm(tampered, key)).toThrow();
  });

  it('lança se a chave não tiver 32 bytes', () => {
    const shortKey = randomBytes(16);
    expect(() => encryptAesGcm('x', shortKey)).toThrow();
    expect(() => decryptAesGcm('eA==', shortKey)).toThrow();
  });
});
