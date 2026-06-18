// Bungkus buffer gambar menjadi satu file ZIP.

import archiver from 'archiver';
import { createWriteStream } from 'node:fs';

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
