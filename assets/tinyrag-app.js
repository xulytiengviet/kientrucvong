/* UI for the deterministic TinyRAG × Ring108 lab; no API requests or third-party scripts. */
(function () {
  'use strict';
  const lab = window.TinyRAGLab;
  const $ = id => document.getElementById(id);
  const fmt = n => new Intl.NumberFormat('vi-VN').format(n);
  const labels = {
    full: { key: 'A / NAIVE', title: 'Nhồi theo thứ tự', explanation: 'Không xếp hạng theo câu hỏi. Chọn nguyên đoạn theo thứ tự nguồn.' },
    rag: { key: 'B / RETRIEVE', title: 'Lexical RAG', explanation: 'Xếp hạng độ khớp từ khóa, giữ nguyên đoạn và nguồn.' },
    optimized: { key: 'C / PACK', title: 'Trích đoạn + diversity', explanation: 'Trích câu nguyên văn, ưu tiên chi phí/độ khớp và đa dạng chủ đề.' }
  };
  let last = null;
  function node(tag, className, content) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (content !== undefined) el.textContent = String(content);
    return el;
  }
  function setStatus(message, error) {
    $('status').textContent = message;
    $('status').classList.toggle('error', !!error);
  }
  function metricRow(label, value, accent) {
    const row = node('div', 'metric-row');
    row.append(node('span', '', label), node('strong', accent || '', value));
    return row;
  }
  function renderCards(data) {
    const holder = $('comparison');
    holder.replaceChildren();
    for (const key of ['full', 'rag', 'optimized']) {
      const m = data.methods[key];
      const detail = labels[key];
      const card = node('article', 'compare-card' + (key === 'optimized' ? ' highlight' : ''));
      card.append(node('div', 'method-key', detail.key), node('h3', '', detail.title));
      const used = node('div', 'usage-number');
      used.append(node('span', '', fmt(m.tokens) + ' '), node('small', '', '/ ' + fmt(data.budget) + ' ước tính'));
      card.append(used);
      const meter = node('div', 'meter');
      meter.setAttribute('role', 'progressbar');
      meter.setAttribute('aria-label', 'Tỷ lệ ngân sách đã dùng');
      meter.setAttribute('aria-valuenow', String(m.tokens));
      meter.setAttribute('aria-valuemin', '0');
      meter.setAttribute('aria-valuemax', String(data.budget));
      const fill = node('div', 'meter-fill');
      fill.style.width = Math.min(100, m.tokens / data.budget * 100).toFixed(1) + '%';
      meter.append(fill);
      card.append(meter);
      card.append(
        metricRow('Nguồn được chọn', String(m.selected.length)),
        metricRow('Độ phủ từ khóa', (m.coverage * 100).toFixed(0) + '%', 'aqua'),
        metricRow('Nhóm chủ đề', String(m.groups), 'orange'),
        metricRow('Sử dụng ngân sách', (100 * m.tokens / data.budget).toFixed(1) + '%')
      );
      card.append(node('p', '', detail.explanation));
      holder.append(card);
    }
  }
  function renderEvidence() {
    if (!last) return;
    const m = last.report.methods[$('inspect').value];
    const holder = $('evidenceList');
    holder.replaceChildren();
    if (!m.selected.length) holder.append(node('p', 'empty-evidence', 'Không có đoạn nào vừa ngân sách. Hãy tăng ngân sách hoặc rút ngắn tài liệu.'));
    for (const fact of m.selected) {
      const item = node('article', 'evidence-item');
      item.append(
        node('small', '', fact.id + ' / ' + fact.topic + ' / ≈' + fact.tokens + ' đơn vị'),
        node('h4', '', fact.title),
        node('p', '', fact.excerpt),
        node('div', 'evidence-score', 'ĐIỂM TỪ KHÓA: ' + fact.score.toFixed(2))
      );
      holder.append(item);
    }
    $('contextPreview').value = m.context;
    const sample = (m.context || $('query').value).slice(0, 220);
    const encoded = lab.encodeBase27(sample);
    $('byteCount').textContent = fmt(encoded.bytes);
    $('symbolCount').textContent = fmt(encoded.symbols);
    $('tritCount').textContent = fmt(encoded.trits);
    $('roundtrip').textContent = encoded.roundtrip ? 'PASS ✓' : 'FAIL';
    $('roundtrip').style.color = encoded.roundtrip ? 'var(--lime)' : 'var(--orange)';
    $('symbolPreview').textContent = encoded.preview.replace(/ /g, '␠') || '—';
    $('tritPreview').textContent = encoded.firstTrits.map(x => '[' + x.join(', ') + ']').join('  ') || '—';
    $('ringState').textContent = encoded.ringState === null ? '—' : String(encoded.ringState) + ' / 108';
  }
  function run() {
    try {
      const docs = lab.parseCorpus($('corpus').value);
      const budget = Number($('budget').value);
      const maxDocs = Number($('maxDocs').value);
      const report = lab.benchmark(docs, $('query').value, budget, maxDocs);
      last = { report, inputs: { question: $('query').value, corpus: $('corpus').value, budget, maxDocs } };
      $('statDocs').textContent = fmt(report.docs);
      $('statCorpus').textContent = fmt(report.corpusTokens);
      $('statBudget').textContent = fmt(report.budget);
      renderCards(report);
      renderEvidence();
      setStatus('Hoàn tất A/B/C: ' + report.docs + ' nguồn ứng viên · ' + report.queryTerms.length + ' từ khóa · không sử dụng API ngoài.', false);
    } catch (error) {
      setStatus('Lỗi: ' + (error && error.message ? error.message : String(error)), true);
    }
  }
  function exportReport() {
    if (!last) return setStatus('Hãy chạy benchmark trước khi xuất JSON.', true);
    const contents = JSON.stringify({
      kind: 'TinyRAG-Ring108-browser-proxy',
      method: 'deterministic lexical; bytes/4 approximate tokens; NOT AtlasKV inference',
      ...last
    }, null, 2);
    const blob = new Blob([contents], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = node('a');
    link.href = url;
    link.download = 'tinyrag-ring108-benchmark.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setStatus('Đã tạo tệp JSON cục bộ. Nội dung bao gồm văn bản nguồn để tái lập kết quả.', false);
  }
  async function copyContext() {
    const value = $('contextPreview').value;
    if (!value) return setStatus('Chưa có ngữ cảnh để sao chép.', true);
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(value);
      else {
        const field = $('contextPreview');
        field.focus(); field.select();
        if (!document.execCommand('copy')) throw new Error('Trình duyệt không cho phép sao chép tự động.');
      }
      setStatus('Đã sao chép ngữ cảnh đang xem.', false);
    } catch (_) {
      setStatus('Không thể sao chép tự động; hãy chọn văn bản trong khung ngữ cảnh để sao chép.', true);
    }
  }
  $('corpus').value = lab.sampleCorpus;
  $('budget').addEventListener('input', () => { $('budgetLabel').textContent = $('budget').value; });
  $('budget').addEventListener('change', run);
  $('maxDocs').addEventListener('change', run);
  $('query').addEventListener('change', run);
  $('run').addEventListener('click', run);
  $('inspect').addEventListener('change', renderEvidence);
  $('reset').addEventListener('click', () => { $('corpus').value = lab.sampleCorpus; run(); });
  $('export').addEventListener('click', exportReport);
  $('copyContext').addEventListener('click', copyContext);
  run();
})();
