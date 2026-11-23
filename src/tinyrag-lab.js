/* TinyRAG × Ring-108 browser lab: deterministic lexical proxy, NOT the AtlasKV model. MIT. */
(function (root, factory) {
  const ring = typeof module === 'object' && module.exports ? require('./core.js') : root.RingCore;
  const api = factory(ring);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TinyRAGLab = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (ring) {
  'use strict';
  if (!ring) throw new Error('RingCore chưa được tải.');
  const encoder = new TextEncoder();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const stop = new Set(('la va cua cho voi mot nhung cac da duoc trong tren tu den tai theo khi nhu co can de ve thi se giup nao the nao hay bao nhieu').split(' '));
  const sampleCorpus = [
    'AtlasKV | AtlasKV\nTinyRAG hiện chứa mã AtlasKV. AtlasKV tăng cường mô hình ngôn ngữ bằng đồ thị tri thức và bộ nhớ Key–Value, thay vì chỉ đưa nguyên văn mọi tài liệu vào cửa sổ ngữ cảnh.\nViệc chạy mô hình thật cần Python, các checkpoint và tài nguyên tính toán riêng.',
    'KG2KV | AtlasKV\nQuy trình KG2KV chuyển các tri thức có cấu trúc thành cặp khóa–giá trị để xây dựng bộ nhớ. AtlasKV có bước mã hóa các biểu diễn tri thức và phân cụm phân cấp để phục vụ tra cứu.',
    'Đánh giá AtlasKV | AtlasKV\nRepository TinyRAG có các kịch bản đánh giá chi phí GPU, độ chính xác tri thức và độ liên quan của nội dung sinh. Những chỉ số này phải được đo trên mô hình thực; một demo HTML không tái lập được VRAM hoặc chất lượng LLM.',
    'Vòng 108 | Ring108\nKiến trúc vòng dùng nhóm Z108 tương đương Z4 × Z27 theo định lý số dư Trung Hoa. Mỗi trạng thái có phần 2 bit và phần 3 trit cân bằng; phép cộng 54 trạng thái là quay 180 độ.',
    'Base27 và trit | Ring108\nBase27 gồm 27 ký hiệu A–Z và dấu cách, mỗi ký hiệu được biểu diễn chính xác bằng ba trit cân bằng −1, 0, +1. Đây là ánh xạ ký hiệu; không chứng minh khả năng nén token hoặc nâng chất lượng ngữ nghĩa.',
    'CVNSS4.0 | CVNSS\nCVNSS4.0 là phép biến đổi cách ghi chữ tiếng Việt và có nhóm nhập nhằng khi giải mã ngược. Khi cần lưu nguồn tri thức chuẩn xác, hãy bảo toàn bản Unicode gốc và metadata; không dùng chuyển đổi nhiều-một để khẳng định hoàn nguyên tuyệt đối.',
    'Đóng gói ngữ cảnh | Retrieval\nNhồi toàn bộ tài liệu gây tốn ngân sách prompt. Có thể giới hạn token bằng truy xuất có chọn lọc, trích đoạn nguyên văn, chống trùng lặp và giữ lại định danh nguồn. Hiệu quả phụ thuộc câu hỏi và tập dữ liệu.',
    'Benchmark A/B | Retrieval\nSo sánh các chiến lược trên cùng tập tài liệu và ngân sách. Các số liệu như lượng token ước tính, số nguồn, độ phủ từ khóa và tỷ lệ qua lại Base27 chỉ mô tả demo; không phải độ chính xác trả lời hay tăng tốc GPU.',
    'Chipless RFID | IoT\nChipless RFID có thể gắn định danh trên thẻ không có chip điện tử, nhưng cần đầu đọc để thu tín hiệu và suy luận mã. Kết quả đọc có thể chuyển thành sự kiện số cung cấp cho hệ thống IoT.',
    'LoRaWAN Việt Nam | IoT\nLoRaWAN dùng làm kênh truyền sự kiện IoT đường dài. Ánh xạ vòng 108 hoặc Base27 ở tầng ứng dụng không thay thế điều chế LoRa và không tự cải thiện khả năng kháng nhiễu vô tuyến.'
  ].join('\n\n');

  function normalize(value) {
    return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
      .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function terms(value) {
    const items = normalize(value).split(/\s+/).filter(Boolean).filter(w => w.length > 1 && !stop.has(w));
    return [...new Set(items)];
  }
  function estimatedTokens(value) {
    const n = encoder.encode(String(value)).length;
    return n ? Math.ceil(n / 4) : 0;
  }
  function parseCorpus(value) {
    const text = String(value).trim();
    if (text.length > 100000) throw new Error('Tối đa 100.000 ký tự cho một phiên mô phỏng.');
    if (!text) throw new Error('Hãy nhập ít nhất một đoạn tài liệu.');
    const blocks = text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
    if (blocks.length > 100) throw new Error('Tối đa 100 đoạn, phân tách bằng dòng trống.');
    return blocks.map((block, i) => {
      const lines = block.split('\n');
      const head = lines.shift().trim().replace(/^#\s*/, '');
      const parts = head.split('|').map(s => s.trim());
      return {
        id: 'D' + String(i + 1).padStart(2, '0'),
        title: parts[0] || 'Tài liệu ' + (i + 1),
        topic: parts[1] || 'Chung',
        text: (lines.join(' ').trim() || parts[0] || '').replace(/\s+/g, ' ')
      };
    });
  }
  function scoreDocument(doc, queryTerms) {
    if (!queryTerms.length) return 0;
    const body = new Set(terms(doc.text));
    const title = new Set(terms(doc.title));
    const topic = new Set(terms(doc.topic));
    let sum = 0;
    for (const t of queryTerms) sum += (body.has(t) ? 1 : 0) + (title.has(t) ? 1.1 : 0) + (topic.has(t) ? 0.6 : 0);
    return sum / queryTerms.length;
  }
  function extractQuote(doc, queryTerms) {
    const sentences = doc.text.match(/[^.!?]+[.!?]?/g) || [doc.text];
    const ranked = sentences.map((text, i) => ({
      text: text.trim(),
      i,
      match: queryTerms.filter(t => new Set(terms(text)).has(t)).length
    })).filter(v => v.text);
    ranked.sort((a, b) => b.match - a.match || a.i - b.i);
    return ranked.length ? ranked[0].text : doc.text;
  }
  function contextLine(item) {
    return '[' + item.doc.id + '] ' + item.doc.title + ' (' + item.doc.topic + ')\n' + item.excerpt;
  }
  function result(name, selected, queryTerms, budget) {
    const context = selected.map(contextLine).join('\n\n');
    const seen = new Set(terms(context));
    const hits = queryTerms.filter(t => seen.has(t));
    return {
      name,
      selected: selected.map(item => ({
        id: item.doc.id, title: item.doc.title, topic: item.doc.topic,
        excerpt: item.excerpt, score: item.score,
        tokens: estimatedTokens(contextLine(item))
      })),
      context,
      tokens: estimatedTokens(context),
      budget,
      coverage: queryTerms.length ? hits.length / queryTerms.length : 0,
      hitTerms: hits,
      groups: [...new Set(selected.map(item => item.doc.topic))].length
    };
  }
  function tryPack(candidates, queryTerms, budget, maxDocs, name) {
    const chosen = [];
    for (const item of candidates) {
      if (chosen.length >= maxDocs) break;
      const prospective = chosen.concat(item).map(contextLine).join('\n\n');
      if (estimatedTokens(prospective) <= budget) chosen.push(item);
    }
    return result(name, chosen, queryTerms, budget);
  }
  function benchmark(docs, question, budget, maxDocs) {
    if (!Array.isArray(docs) || !docs.length) throw new Error('Kho tài liệu trống.');
    if (!Number.isInteger(budget) || budget < 40 || budget > 10000) throw new Error('Ngân sách phải từ 40 đến 10.000 đơn vị ước tính.');
    if (!Number.isInteger(maxDocs) || maxDocs < 1 || maxDocs > 100) throw new Error('Số nguồn không hợp lệ.');
    const q = terms(question);
    if (!q.length) throw new Error('Câu hỏi cần chứa ít nhất một từ khóa có nghĩa.');
    const scored = docs.map(doc => ({ doc, excerpt: doc.text, score: scoreDocument(doc, q) }));
    const matches = scored.filter(v => v.score > 0);
    const ranking = (matches.length ? matches : scored).slice().sort((a, b) => b.score - a.score || a.doc.id.localeCompare(b.doc.id));
    const full = tryPack(scored, q, budget, maxDocs, 'Nhồi theo thứ tự');
    const rag = tryPack(ranking, q, budget, maxDocs, 'Lexical RAG');
    const pool = ranking.map(item => ({ ...item, excerpt: extractQuote(item.doc, q) }));
    const chosen = [];
    while (pool.length && chosen.length < maxDocs) {
      const eligible = pool.map((item, i) => {
        const proposed = chosen.concat(item).map(contextLine).join('\n\n');
        if (estimatedTokens(proposed) > budget) return null;
        const redundancy = chosen.filter(v => v.doc.topic === item.doc.topic).length;
        const words = new Set(terms(item.excerpt));
        const overlap = chosen.reduce((m, v) => {
          const other = terms(v.excerpt);
          return Math.max(m, other.length ? other.filter(t => words.has(t)).length / other.length : 0);
        }, 0);
        const tokenCost = estimatedTokens(contextLine(item));
        return { i, utility: (item.score + 0.001) / Math.sqrt(Math.max(1, tokenCost)) - 0.08 * redundancy - 0.04 * overlap };
      }).filter(Boolean);
      if (!eligible.length) break;
      eligible.sort((a,b) => b.utility - a.utility || pool[a.i].doc.id.localeCompare(pool[b.i].doc.id));
      const best = eligible[0].i;
      chosen.push(pool.splice(best, 1)[0]);
    }
    const optimized = result('Chọn lọc + trích đoạn', chosen, q, budget);
    return {
      docs: docs.length, budget, maxDocs, queryTerms: q,
      corpusTokens: estimatedTokens(docs.map(d => contextLine({doc:d,excerpt:d.text})).join('\n\n')),
      methods: { full, rag, optimized },
      note: 'Lexical retrieval + trích câu + diversity proxy. KHÔNG chạy encoder, phân cụm hay mô hình AtlasKV thật.'
    };
  }
  function decodeBase27(symbols) {
    const value = ring.normalizeSymbols(symbols);
    if (value.length % 2) throw new RangeError('Chuỗi Base27 cho byte phải có độ dài chẵn.');
    const bytes = new Uint8Array(value.length / 2);
    for (let i = 0; i < value.length; i += 2) {
      const n = ring.charToValue(value[i]) * 27 + ring.charToValue(value[i + 1]);
      if (n > 255) throw new RangeError('Cặp Base27 vượt phạm vi byte 0..255.');
      bytes[i / 2] = n;
    }
    return decoder.decode(bytes);
  }
  function encodeBase27(text) {
    const source = String(text);
    const bytes = encoder.encode(source);
    let symbols = '';
    for (const b of bytes) symbols += ring.ALPHABET[Math.floor(b / 27)] + ring.ALPHABET[b % 27];
    const trits = ring.symbolsToTrits(symbols);
    const roundtrip = decodeBase27(symbols) === source && ring.tritsToSymbols(trits) === symbols;
    const firstIndex = symbols ? ring.charToValue(symbols[0]) : null;
    return {
      bytes: bytes.length, symbols: symbols.length, trits: trits.length * 3,
      preview: symbols.slice(0, 48), firstTrits: trits.slice(0, 8),
      ringState: firstIndex === null ? null : ring.uncrt(0, firstIndex),
      roundtrip, decoded: decodeBase27(symbols)
    };
  }
  return Object.freeze({ sampleCorpus, normalize, terms, estimatedTokens, parseCorpus, scoreDocument, extractQuote, benchmark, encodeBase27, decodeBase27 });
});
