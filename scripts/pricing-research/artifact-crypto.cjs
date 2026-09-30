// Offline public-key envelope. The GitHub runner only receives the public key.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const MAGIC = Buffer.from('FHCFENC1');
const algorithm = 'RSA-OAEP-SHA256+A256GCM';
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
function publicKey(pem) {
  if (typeof pem !== 'string' || !/^-----BEGIN PUBLIC KEY-----\r?\n/.test(pem) || /PRIVATE KEY/.test(pem)) {
    throw new Error('a public SPKI PEM key is required; never supply a private key to GitHub');
  }
  let key;
  try { key = crypto.createPublicKey(pem); } catch { throw new Error('public encryption key is malformed'); }
  if (key.asymmetricKeyType !== 'rsa' || key.asymmetricKeyDetails.modulusLength < 4096) {
    throw new Error('research evidence requires an RSA public key of at least 4096 bits');
  }
  return key;
}
function encrypt(bytes, pem) {
  const recipient = publicKey(pem);
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  try {
    const metadata = { version: 1, algorithm,
      recipientSha256: digest(recipient.export({ type: 'spki', format: 'der' })),
      wrappedKey: crypto.publicEncrypt({ key: recipient, oaepHash: 'sha256', padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, key).toString('base64'),
      iv: iv.toString('base64') };
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from(JSON.stringify(metadata)));
    const ciphertext = Buffer.concat([cipher.update(zlib.gzipSync(bytes)), cipher.final()]);
    const header = Buffer.from(JSON.stringify({ metadata, tag: cipher.getAuthTag().toString('base64') }));
    const length = Buffer.alloc(4); length.writeUInt32BE(header.length);
    return Buffer.concat([MAGIC, length, header, ciphertext]);
  } finally { key.fill(0); }
}
function decrypt(bytes, privatePem) {
  if (process.env.GITHUB_ACTIONS === 'true') throw new Error('private-key operations are laptop-only');
  if (!bytes.subarray(0, 8).equals(MAGIC) || bytes.length < 13) throw new Error('not an encrypted research envelope');
  const length = bytes.readUInt32BE(8);
  if (length > 8192 || length > bytes.length - 12) throw new Error('invalid encrypted envelope header');
  const { metadata, tag } = JSON.parse(bytes.subarray(12, 12 + length));
  if (metadata.version !== 1 || metadata.algorithm !== algorithm) throw new Error('unsupported encrypted envelope');
  const privateKey = crypto.createPrivateKey(privatePem);
  if (digest(crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'der' })) !== metadata.recipientSha256) {
    throw new Error('decryption key does not match the recipient');
  }
  const key = crypto.privateDecrypt({ key: privateKey, oaepHash: 'sha256', padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, Buffer.from(metadata.wrappedKey, 'base64'));
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(metadata.iv, 'base64'));
    decipher.setAAD(Buffer.from(JSON.stringify(metadata))); decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return zlib.gunzipSync(Buffer.concat([decipher.update(bytes.subarray(12 + length)), decipher.final()]), { maxOutputLength: 32 * 1024 * 1024 });
  } finally { key.fill(0); }
}
module.exports = { publicKey, encrypt, decrypt, digest, MAGIC };
if (require.main === module) {
  try {
    if (process.env.GITHUB_ACTIONS === 'true') throw new Error('this command is laptop-only');
    const [command, ...args] = process.argv.slice(2);
    if (command === 'decrypt' && args.length === 3) {
      const [privateFile, encryptedFile, outputFile] = args;
      fs.writeFileSync(outputFile, decrypt(fs.readFileSync(encryptedFile), fs.readFileSync(privateFile)), { mode: 0o600, flag: 'wx' });
      console.log('Evidence decrypted locally.');
    } else throw new Error('Usage: decrypt <private.pem> <evidence.fhc> <output.json> (generate keys with hosted/laptop.ts keygen)');
  } catch {
    console.error('Local key/evidence operation failed; no key material was logged. Check arguments, key type and output paths.');
    process.exitCode = 1;
  }
}
