# ◎ KIẾN TRÚC VÒNG — CVNSS4.0 × Base27 × Ternary × Audio 27-FSK

Bản nghiên cứu nguồn mở (MIT) về **vòng cyclic 108 trạng thái**, **2 bit + 3 trit cân bằng**, phép quay **180°**, ánh xạ vector trên **360°**, và đường truyền âm thanh **ký hiệu ↔ WAV**.

**Demo:** https://xulytiengviet.github.io/kientrucvong/ *(cần bật GitHub Pages: branch `main`, thư mục `/ (root)`).*  
**Preprint:** [PDF](paper/preprint.pdf) · [Markdown](paper/preprint.md) — bản thảo chưa bình duyệt.

## Ứng dụng mới: Chipless RFID × LoRaWAN Việt Nam

[**Vietnam Field Lab: A/B chống nhiễu, chi phí/năng lượng, AS923-2 và Ring-108**](https://xulytiengviet.github.io/LoRaWAN-Chipless/vn-lab.html) · [Hướng dẫn tích hợp](applications/chipless-lorawan-vn.md)

Đây là ứng dụng riêng ở lớp **mã sự kiện**, không dùng vòng như một bằng chứng cải thiện tính năng RF. Không đánh đồng 27-FSK âm thanh với PHY LoRaWAN.

## TinyRAG / AtlasKV × Ring108 — Context Packing Lab

**[Mở trang demo tương tác](https://xulytiengviet.github.io/kientrucvong/tinyrag.html)** · [Nguồn TinyRAG](https://github.com/xulytiengviet/TinyRAG) · [Mã mô phỏng](src/tinyrag-lab.js)

Demo chạy hoàn toàn trong trình duyệt, không cần backend, API key hoặc GPU. Đổi câu hỏi, sửa kho tri thức, điều chỉnh **ngân sách context** và **số nguồn** để chạy đồng thời 3 phương pháp:

1. **A — Full-stuff order:** lấy các đoạn đầy đủ theo thứ tự nguồn cho tới khi hết ngân sách ước tính.
2. **B — Lexical RAG:** chấm điểm trùng từ khóa không dấu ở nội dung/tiêu đề/chủ đề rồi chọn đoạn đầy đủ.
3. **C — Extractive packing:** trích 1 câu nguyên văn có độ khớp cao từ từng nguồn, giảm lặp chủ đề và tối ưu điểm/chi phí trong hạn mức.

Bảng so sánh hiển thị số đoạn, token **ước tính** (`ceil(UTF-8 bytes / 4)`), độ phủ từ khóa truy vấn và số nhóm chủ đề. Có thể xem trích dẫn nguồn, sao chép context thực và xuất JSON để tái lập.

**Cầu nối Ring108 thật:** lấy trích đoạn đã chọn → UTF-8 → mỗi byte thành **2 chữ số Base27** → `RingCore.symbolsToTrits()` (3 trit cân bằng/ký hiệu), rồi giải ngược và xác minh toàn vẹn Unicode. Phép CRT `RingCore.uncrt(0, symbolIndex)` cho trạng thái vòng minh họa.

**Giới hạn bắt buộc:** repo TinyRAG hiện là AtlasKV dùng Python, encoder và checkpoint; HTML **không** triển khai attention/KV injection, KG2KV training, học embedding, hierarchical retrieval hoặc benchmark GPU của AtlasKV. Đây chỉ là baseline truy xuất từ khóa được **lấy cảm hứng** từ tổ chức kiến thức AtlasKV. Base27/trit/CRT là biểu diễn ký hiệu, không có bằng chứng tự làm giảm token trong LLM. CVNSS4.0 không được dùng để khẳng định Unicode roundtrip khi tồn tại nhập nhằng.

Kiểm thử tích hợp nằm ở `tests/tinyrag.test.js`, chạy qua `npm test` trong CI hiện hữu.

## Chạy nhanh

```bash
npm test
node experiments/benchmark.js
python -m http.server 8000
# Truy cập http://localhost:8000
```

Không cần `npm install`. Node.js >=18; trang web sử dụng HTML/CSS/JS thuần và Web Audio của trình duyệt để nghe WAV.

## Kiến trúc

```text
Unicode tiếng Việt
    │ converter v5 audit-safe
    ▼
CVNSS4.0 (A-Z + SPACE) --- cán cân 56 nhóm nhập nhằng nếu giải về Unicode
    │ ánh xạ mỗi ký hiệu j ∈ [0,26]
    ▼
Base27 ↔ 3 trit cân bằng
    │ tạo preamble + length + CRC16
    ▼
27-FSK @ 24kHz, 100ms/symbol, 600..2680Hz
    │ WAV PCM16 mono
    ▼
Bộ dò Goertzel → CRC check → Base27 → CVNSS ASCII → Unicode canonical

Nhánh toán học độc lập:
Lưới 6 × 3 × 6 = 108 ô → Z108 ≅ Z4 × Z27 → 2 bit + 3 trit
                            └→ exp(i·2πn/108) → 360°, n+54 → 180°
```

## Các tệp

- `index.html`: giao diện thử nghiệm có thể chạy tại GitHub Pages.
- `assets/style.css`, `assets/app.js`: thiết kế giao diện, đồ họa Canvas, nút phát/tải/giải mã WAV.
- `src/core.js`: CRT, vector vòng, miền 72 ô, Base27/trit, vector 27 ký hiệu ↔ ký hiệu.
- `src/audio.js`: giao thức 27-FSK, PCM WAV, Goertzel, CRC-16, AWGN.
- `vendor/cvnss4_0_converter.v5.js`: converter audit-safe **nguyên bản** do người dùng cung cấp.
- `tests/core.test.js`: kiểm thử đơn vị và tính chất.
- `experiments/benchmark.js`, `experiments/results.json`: mô phỏng Monte Carlo có seed cố định.
- `paper/preprint.md`: toán học, thuật toán, giả định, hạn chế và bảng benchmark.

## Điều đã xác nhận / điều chưa xác nhận

| Khẳng định | Mức độ bằng chứng |
|---|---|
| CRT bijection Z108 ↔ Z4×Z27 | Định lý + kiểm thử đủ 108 trạng thái |
| Vòng quay 180° n+54, 360° n+108 | Đại số chính xác |
| Base27 ↔ 3 trit | Song ánh 27 phần tử |
| Ký hiệu ASCII ↔ WAV do chính hệ thống sinh | Kiểm thử thực thi + CRC |
| CVNSS Unicode bất kỳ luôn khôi phục hoàn toàn | **Không:** converter có many-to-one |
| Loa → microphone luôn nhận đúng 100% | **Chưa kiểm thử** |
| Base108/27-FSK là phương án tối ưu | **Không có bằng chứng** |
| RoPE cyclic đơn tần ≡ RoPE cổ điển | **Sai:** chỉ chia sẻ bất biến dịch chuyển |

**Lưu ý an toàn học thuật:** `108 = 4×27 = 2²×3³` có **2 bit + 3 trit**, không phải 5 trit. `72/108` chỉ là thống kê cho bảng trừu tượng 6×3×6. Nghiên cứu không phát biểu một ô = một âm tiết độc nhất hoặc góc 180° = đối nghĩa ngữ nghĩa.

## Hạn chế truyền dẫn

Demo tải/giải WAV **PCM 16-bit mono 24 kHz** theo giao thức đặc thù, căn ô bắt đầu tại mẫu 0. Không hỗ trợ WAV thu từ micro tùy ý, lệch giờ, resampling, nhiễu môi trường hay đồng bộ real-time. CRC phát hiện nhiều lỗi nhưng không phải bằng chứng toàn vẹn tuyệt đối. Ký tự khác `A–Z` và dấu cách bị chặn, không bị xóa âm thầm; giải mã Unicode theo `canonical policy` của converter.

## Ghi công

Kiến trúc và mã nghiên cứu mẫu: **Long Ngo, 2026**. Converter CVNSS4.0 v5 là tệp đính kèm gốc, được tái sử dụng nguyên văn để kiểm tra tích hợp; quyền tác giả và lịch sử của CVNSS4.0 thuộc các tác giả đóng góp tương ứng. Giấy phép MIT áp dụng cho các phần mã mới do dự án phát triển; hãy xác minh giấy phép tệp converter gốc trước khi phân phối thương mại.
