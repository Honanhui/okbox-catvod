#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function fail(message) {
  throw new Error(message);
}

function readInteger(buffer, offset, width) {
  if (offset + width > buffer.length) fail(`offset ${offset} is outside the file`);
  if (width === 2) return buffer.readUInt16LE(offset);
  if (width === 4) return buffer.readUInt32LE(offset);
  if (width === 8) return Number(buffer.readBigUInt64LE(offset));
  fail(`unsupported integer width: ${width}`);
}

function cString(buffer, offset) {
  if (offset >= buffer.length) return '';
  const end = buffer.indexOf(0, offset);
  return buffer.toString('utf8', offset, end === -1 ? buffer.length : end);
}

function inspectElf(buffer) {
  if (!buffer.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46]))) return null;
  const elfClass = buffer[4];
  if (buffer[5] !== 1 || ![1, 2].includes(elfClass)) fail('only little-endian ELF32/ELF64 files are supported');

  const is64 = elfClass === 2;
  const sectionHeaderOffset = readInteger(buffer, is64 ? 0x28 : 0x20, is64 ? 8 : 4);
  const sectionEntrySize = readInteger(buffer, is64 ? 0x3a : 0x2e, 2);
  const sectionCount = readInteger(buffer, is64 ? 0x3c : 0x30, 2);
  const nameSectionIndex = readInteger(buffer, is64 ? 0x3e : 0x32, 2);
  const section = (index) => {
    if (index >= sectionCount) fail(`invalid ELF section index ${index}`);
    const offset = sectionHeaderOffset + index * sectionEntrySize;
    return {
      nameOffset: readInteger(buffer, offset, 4),
      type: readInteger(buffer, offset + 4, 4),
      offset: readInteger(buffer, offset + (is64 ? 24 : 16), is64 ? 8 : 4),
      size: readInteger(buffer, offset + (is64 ? 32 : 20), is64 ? 8 : 4),
      link: readInteger(buffer, offset + (is64 ? 40 : 24), 4),
      entrySize: readInteger(buffer, offset + (is64 ? 56 : 36), is64 ? 8 : 4),
    };
  };
  const names = section(nameSectionIndex);
  const nameTable = buffer.subarray(names.offset, names.offset + names.size);
  const sections = Array.from({ length: sectionCount }, (_, index) => {
    const value = section(index);
    return { ...value, name: cString(nameTable, value.nameOffset) };
  });
  const dynamicSymbols = [];
  for (const symbolSection of sections.filter((item) => item.type === 11)) {
    const stringSection = sections[symbolSection.link];
    if (!stringSection || !symbolSection.entrySize) continue;
    const strings = buffer.subarray(stringSection.offset, stringSection.offset + stringSection.size);
    const count = Math.floor(symbolSection.size / symbolSection.entrySize);
    for (let index = 0; index < count; index += 1) {
      const offset = symbolSection.offset + index * symbolSection.entrySize;
      const name = cString(strings, readInteger(buffer, offset, 4));
      if (name) dynamicSymbols.push(name);
    }
  }
  return {
    kind: is64 ? 'ELF64' : 'ELF32',
    architecture: is64 ? 'AArch64/64-bit' : 'ARM/32-bit',
    dynamicSymbols: [...new Set(dynamicSymbols)].sort(),
    sections: sections.map(({ name, size }) => ({ name, size })),
  };
}

function inspectZipLike(buffer) {
  if (!buffer.subarray(0, 4).equals(Buffer.from('PK\x03\x04'))) return null;
  const flags = readInteger(buffer, 6, 2);
  const method = readInteger(buffer, 8, 2);
  const compressedSize = readInteger(buffer, 18, 4);
  const uncompressedSize = readInteger(buffer, 22, 4);
  const nameLength = readInteger(buffer, 26, 2);
  const extraLength = readInteger(buffer, 28, 2);
  const dataOffset = 30 + nameLength + extraLength;
  const fileName = buffer.toString('utf8', 30, 30 + nameLength);
  let inflation = 'not attempted';
  if (method === 8) {
    try {
      zlib.inflateRawSync(buffer.subarray(dataOffset, dataOffset + compressedSize));
      inflation = 'success';
    } catch (error) {
      inflation = `failed: ${error.message}`;
    }
  }
  return { kind: 'ZIP-like local header', flags, method, fileName, compressedSize, uncompressedSize, inflation };
}

function inspect(file) {
  const buffer = fs.readFileSync(file);
  return {
    file: path.resolve(file),
    bytes: buffer.length,
    elf: inspectElf(buffer),
    zipLike: inspectZipLike(buffer),
  };
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Usage: node scripts/inspect-guard.mjs <guard-or-so> [...]');
  process.exit(1);
}
console.log(JSON.stringify(files.map(inspect), null, 2));
