# Ứng dụng đại số vòng 108 trong Chipless RFID × LoRaWAN Việt Nam

Dự án tích hợp đang thực thi: [Vietnam Field Lab](https://xulytiengviet.github.io/LoRaWAN-Chipless/vn-lab.html) · [Source](https://github.com/xulytiengviet/LoRaWAN-Chipless) · [Research protocol](https://github.com/xulytiengviet/LoRaWAN-Chipless/blob/main/docs/VIETNAM-RESEARCH.md).

## Ranh giới khoa học

- `kientrucvong` chứng minh song ánh CRT `Z108 ↔ Z4×Z27`, biểu diễn 2 bit + 3 trit, phép quay trên vòng và chuyển ký hiệu ASCII ↔ âm thanh **27-FSK**. Các kiểm chứng này thuộc đại số và âm thanh mô phỏng.
- Trong Chipless RFID, nguồn vật lý là cộng hưởng của thẻ (notch) và đầu đọc RF. **Đại số vòng không làm rẻ SDR, không tăng cự ly, không giảm BER RF** một cách mặc định.
- Hệ thống dùng vòng làm một **lớp kiểm toán các sự kiện** sau khi giải mã RFID, không đưa 27-FSK vào lớp LoRaWAN PHY và không dùng bộ chuyển CVNSS4.0 many-to-one cho ID nhị phân.
- Biểu diễn 96 trạng thái ứng dụng: `n = tagID + 16×quality + 48×flag`, với 16 ID, 3 mức quality, 2 cờ; còn 12 trạng thái dự phòng. `n % 4` và `n % 27` cho tọa độ CRT, có thể truyền trong 1 byte LoRaWAN nhị phân. Một bitfield 7-bit thông thường cũng đủ, vì vậy **không chứng minh ưu thế nén**.

## Điều kiện vô tuyến tại Việt Nam

Theo Văn bản hợp nhất 01/VBHN-BKHCN (04/06/2025), Phụ lục 19, LPWAN miễn giấy phép *theo điều kiện* ở **920–923 MHz**, **ERP ≤25 mW**, duty cycle đầu cuối **≤1%**, gateway **≤10%**. Trong công nghệ LoRaWAN, nghiên cứu định hướng **AS923 Group 2** với kênh và thiết bị tương thích; không nhầm với AS923-925 ≥923 MHz. Băng RF dùng để **đọc chipless RFID** khác với băng truyền LoRaWAN; phát khảo sát chipless phải đáp ứng quy định riêng. [Văn bản chính thức](https://datafiles.chinhphu.vn/cpp/files/vbpq/2025/6/01-vbhn-bkhcn.pdf).

## Bốn giả thuyết phải thí nghiệm

1. Giảm chi phí reader/BOM **trên cùng năng lực ID**;
2. Giảm thể tích đầu đọc/anten **trên cùng tầm đọc và độ chính xác**;
3. Giảm Joules/ID thành công, tính cả ngủ, đọc lại và uplink;
4. Giảm nhầm ID dưới nhiễu thật, báo cáo cả rejected-read coverage.

Mô phỏng có đối chứng trên GitHub Pages đang so **đầu đọc notch 1-bit** với thuật toán thống kê (mean vs median+abstain), không tuyên bố tương đương thẻ 4-bit IEEE và chưa phải phần cứng. Mọi kết quả số do seed sinh ra cần gắn nhãn *synthetic*.

## Lộ trình

Mô phỏng → mô phỏng EM tag (openEMS/CST/HFSS) → phòng đo RF kín + hiệu chuẩn IQ → BOM/đồng hồ điện → thí nghiệm miền núi, nông thôn, hải đảo → LoRaWAN OTAA, PDR, gateway, nhật ký mạng và độ tin cậy.

Lưu ý **đường LoRaWAN xa không phải cự ly đọc chipless xa**.
