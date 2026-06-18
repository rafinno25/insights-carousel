// Bungkus buffer gambar menjadi satu file ZIP.

import archiver from 'archiver';
import { createWriteStream } from 'node:fs';
import { PassThrough } from 'node:stream';

/** files: [{ name, buffer }]. Mengembalikan jumlah byte ZIP yang ditulis. */
export function createZip(zipPath, files) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', () => resolve(archive.pointer()));
    output.on('error', reject);
    archive.on('error', reject);
    archive.pipe(output);
    for (const f of files) archive.append(f.buffer, { name: f.name });
    archive.finalize();
  });
}

/** files: [{ name, buffer }]. Mengembalikan Buffer ZIP (tanpa menulis ke disk). */
export function createZipBuffer(files) {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks = [];
    const sink = new PassThrough();
    sink.on('data', (c) => chunks.push(c));
    sink.on('end', () => resolve(Buffer.concat(chunks)));
    sink.on('error', reject);
    archive.on('error', reject);
    archive.pipe(sink);
    for (const f of files) archive.append(f.buffer, { name: f.name });
    archive.finalize();
  });
}
