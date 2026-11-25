import { gunzipSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { safePath } from './spec.mjs';

// Extrator restrito: não delegar extração de tar não confiável ao shell.
export function extractArchive(compressed, directory) {
  const tar = gunzipSync(compressed, { maxOutputLength: 200 * 1024 * 1024 });
  let entries = 0;
  let prefix;
  let extended = {};
  const seen = new Set();
  const string = (block, start, length) => block.subarray(start, start + length).toString('utf8').split('\0')[0];
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    if (++entries > 20000) throw new Error('Archive excede limite de entradas.');
    const checksum = parseInt(string(header, 148, 8).trim(), 8);
    const computed = header.reduce((sum, byte, index) => sum + (index >= 148 && index < 156 ? 32 : byte), 0);
    if (checksum !== computed) throw new Error('Checksum tar inválido.');
    const size = parseInt(string(header, 124, 12).trim() || '0', 8);
    if (!Number.isSafeInteger(size) || size < 0 || offset + 512 + size > tar.length) throw new Error('Tamanho tar inválido.');
    const body = tar.subarray(offset + 512, offset + 512 + size);
    offset += 512 + Math.ceil(size / 512) * 512;
    const type = string(header, 156, 1);
    if (type === 'g' || type === 'x') {
      let index = 0;
      const values = {};
      while (index < body.length) {
        const space = body.indexOf(32, index);
        const length = Number(body.subarray(index, space).toString());
        if (space < index || !Number.isSafeInteger(length) || length <= 0 || index + length > body.length) throw new Error('PAX inválido.');
        const record = body.subarray(space + 1, index + length - 1).toString('utf8');
        const equal = record.indexOf('=');
        if (equal < 1) throw new Error('PAX inválido.');
        values[record.slice(0, equal)] = record.slice(equal + 1);
        index += length;
      }
      if (type === 'x') extended = values;
      else if (values.path || values.linkpath || values.size) throw new Error('PAX global não suportado.');
      continue;
    }
    if (!['', '0', '5'].includes(type) || extended.linkpath || extended.size) throw new Error('Links e arquivos especiais não são aceitos no archive.');
    const ustarPrefix = string(header, 345, 155);
    const name = (extended.path || (ustarPrefix ? `${ustarPrefix}/` : '') + string(header, 0, 100)).replace(/\/$/, '');
    extended = {};
    safePath(name, 'archive path');
    const segments = name.split('/');
    prefix ??= segments[0];
    if (segments[0] !== prefix) throw new Error('Archive com múltiplas raízes.');
    if (segments.length === 1) { if (type !== '5') throw new Error('Archive sem diretório raiz.'); continue; }
    const path = segments.slice(1).join('/');
    if (seen.has(path)) throw new Error('Archive com entrada duplicada.');
    seen.add(path);
    const target = join(directory, path);
    if (type === '5') mkdirSync(target, { recursive: true });
    else {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, body, { flag: 'wx', mode: parseInt(string(header, 100, 8).trim() || '644', 8) & 0o755 });
    }
  }
  if (!seen.size) throw new Error('Archive vazio.');
}
