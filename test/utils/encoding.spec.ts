import { describe, expect, it } from 'vitest';
import {
  arrayBufferToBase64,
  arrayBufferToString,
  base64ToArrayBuffer,
  stringToArrayBuffer,
} from '../../src/utils/encoding';

describe('encoding utils', () => {
  describe('arrayBufferToBase64 / base64ToArrayBuffer', () => {
    it('正确编解码空数据', () => {
      const empty = new Uint8Array([]).buffer;
      const encoded = arrayBufferToBase64(empty);
      const decoded = base64ToArrayBuffer(encoded);
      expect(new Uint8Array(decoded)).toEqual(new Uint8Array([]));
    });

    it('正确编解码二进制数据', () => {
      const data = new Uint8Array([0, 1, 127, 128, 255]).buffer;
      const encoded = arrayBufferToBase64(data);
      const decoded = base64ToArrayBuffer(encoded);
      expect(new Uint8Array(decoded)).toEqual(new Uint8Array([0, 1, 127, 128, 255]));
    });

    it('正确编解码较长数据', () => {
      const data = new Uint8Array(1000);
      for (let i = 0; i < 1000; i++) {
        data[i] = i % 256;
      }
      const encoded = arrayBufferToBase64(data.buffer);
      const decoded = base64ToArrayBuffer(encoded);
      expect(new Uint8Array(decoded)).toEqual(data);
    });
  });

  describe('stringToArrayBuffer / arrayBufferToString', () => {
    it('正确编解码空字符串', () => {
      const buffer = stringToArrayBuffer('');
      const str = arrayBufferToString(buffer);
      expect(str).toBe('');
    });

    it('正确编解码 ASCII 字符串', () => {
      const original = 'Hello, World!';
      const buffer = stringToArrayBuffer(original);
      const str = arrayBufferToString(buffer);
      expect(str).toBe(original);
    });

    it('正确编解码中文字符串', () => {
      const original = '你好，世界！';
      const buffer = stringToArrayBuffer(original);
      const str = arrayBufferToString(buffer);
      expect(str).toBe(original);
    });

    it('正确编解码 emoji', () => {
      const original = '🔐🔑🛡️';
      const buffer = stringToArrayBuffer(original);
      const str = arrayBufferToString(buffer);
      expect(str).toBe(original);
    });
  });
});
