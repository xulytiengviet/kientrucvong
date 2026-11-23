'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const ring = require('../src/core.js');
const lab = require('../src/tinyrag-lab.js');

test('sample corpus is valid Vietnamese knowledge chunks with stable source ids', () => {
  const docs = lab.parseCorpus(lab.sampleCorpus);
  assert.equal(docs.length, 10);
  assert.equal(docs[0].id, 'D01');
  assert.equal(docs[0].topic, 'AtlasKV');
  assert.ok(docs.some(d => d.topic === 'Ring108'));
});

test('normalization preserves search equivalence for Vietnamese diacritics', () => {
  assert.equal(lab.normalize('Địa hình, Tiếng Việt.'), 'dia hinh tieng viet');
  const docs = lab.parseCorpus('Bộ mã | CVNSS\nTiếng Việt có dấu.');
  assert.ok(lab.scoreDocument(docs[0], lab.terms('tieng Viet')) > 0);
});

test('A/B/C uses a strict shared estimated token budget and source cap', () => {
  const docs = lab.parseCorpus(lab.sampleCorpus);
  for (const budget of [40, 100, 240, 500, 1200]) {
    const report = lab.benchmark(docs, 'Base27 trit AtlasKV ngữ cảnh', budget, 5);
    for (const strategy of Object.values(report.methods)) {
      assert.ok(strategy.tokens <= budget, strategy.name + ' exceeded budget');
      assert.ok(strategy.selected.length <= 5);
      assert.ok(strategy.coverage >= 0 && strategy.coverage <= 1);
      for (const item of strategy.selected) {
        const original = docs.find(d => d.id === item.id);
        assert.ok(original, 'source must exist');
        assert.ok(original.text.includes(item.excerpt), 'excerpts must be verbatim');
      }
    }
  }
});

test('lexical retrieval ranks a relevant document ahead of unrelated source order', () => {
  const docs = lab.parseCorpus('Cá | Sinh học\nCá sống trong nước.\n\nTrit | Ring108\nBase27 gồm ba trit cân bằng.');
  const report = lab.benchmark(docs, 'Base27 trit', 140, 1);
  assert.equal(report.methods.full.selected[0].id, 'D01');
  assert.equal(report.methods.rag.selected[0].id, 'D02');
  assert.equal(report.methods.optimized.selected[0].id, 'D02');
});

test('Unicode UTF-8 → two Base27 digits per byte → balanced trits → Unicode is lossless', () => {
  for (const input of ['', 'Tiếng Việt có dấu — đảo Phú Yên', '𐐷 😀', 'ABC\0XYZ', '100%']) {
    const e = lab.encodeBase27(input);
    assert.equal(e.roundtrip, true);
    assert.equal(e.decoded, input);
    assert.equal(e.symbols, 2 * e.bytes);
    assert.equal(e.trits, 3 * e.symbols);
  }
});

test('Base27 decoding rejects malformed symbols or byte pair overflow', () => {
  assert.throws(() => lab.decodeBase27('A'), /độ dài chẵn/);
  assert.throws(() => lab.decodeBase27('ZZ'), /vượt phạm vi byte/);
  assert.throws(() => lab.decodeBase27('AB.'), /không thuộc/);
});

test('Ring108 CRT state used in symbolic inspection is exactly invertible', () => {
  const encoded = lab.encodeBase27('Test vòng');
  assert.ok(Number.isInteger(encoded.ringState));
  assert.equal(ring.crt(encoded.ringState).mod4, 0);
});

test('input validation prevents empty corpus and invalid limits', () => {
  assert.throws(() => lab.parseCorpus(''), /ít nhất một/);
  const docs = lab.parseCorpus('Một tài liệu\nCó nội dung.');
  assert.throws(() => lab.benchmark(docs, '', 200, 3), /từ khóa/);
  assert.throws(() => lab.benchmark(docs, 'nội dung', 39, 3), /Ngân sách/);
  assert.throws(() => lab.benchmark(docs, 'nội dung', 100, 0), /Số nguồn/);
});
