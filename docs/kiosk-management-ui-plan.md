# Đề xuất quản lý kiosk và hỗ trợ nhận phòng — The Norin Admin

Ngày cập nhật: 11/10/2026. Đã triển khai trong `admin_demo_react` (`src/kiosk/`, `pages/system/Kiosks.tsx`, `pages/workflow/WorkQueue.tsx`).

### Căn theo kiosk-agent và backend thực tế

| Bước | Nguồn sự kiện |
|---|---|
| Hồ sơ khách | `agent.scan.start` → `agent.scan.result` (`success`, `guests[]`, `reason`) |
| Thanh toán | VNPay SmartPOS (`terminal` của kiosk) |
| Kích hoạt thẻ | `agent.card.issue` (`eject: false`, giữ thẻ ở đầu đọc) → `agent.card.result` (UID) → TTLock `identityCard/add`; booking `CARD_ISSUING` / `CARD_FAILED` |
| Nhả thẻ | `agent.card.release` → `agent.card.release.result` |
| Kết nối | `KIOSK_AGENT_CONNECTED` / `DISCONNECTED` theo token |

Hệ quả cho UI:

- K750 chỉ báo cảm biến **hết thẻ / sắp hết / hộp thu hồi đầy / kẹt thẻ**, không đếm số thẻ, agent không báo giấy in. Vật tư hiển thị theo mức (Đủ / Sắp hết / Hết) và form chỉ ghi nhận số thẻ đã nạp + đã dọn hộp thu hồi.
- Kích hoạt thẻ và nhả thẻ là hai bước riêng vì backend giữ thẻ ở đầu đọc rồi mới gửi lệnh nhả.
- Lỗi phần cứng (`0x0020` kẹt thẻ, `0x8000` hộp thu hồi đầy…) hiện ở mục Thiết bị của máy.

## 1. Mục tiêu

Lễ tân nhìn một màn là biết: **máy nào đang phục vụ khách nào, mắc ở bước nào, tiền và thẻ đã xong chưa, cần làm gì tiếp.**

Nguyên tắc:

- Quản lý theo chi nhánh; superadmin chỉ xem và cấu hình.
- Phiên kiosk tách khỏi trạng thái booking. Máy đang phục vụ không có nghĩa booking đã nhận phòng.
- Bước đã thành công (hồ sơ, thanh toán, thẻ) được giữ lại khi xử lý tiếp, kể cả khi chuyển sang quầy. Không tạo đơn mới, không thu lại.
- **Tiếp nhận** và **xử lý xong** là hai thao tác riêng.
- Không làm dashboard riêng; xử lý booking dùng màn Chi tiết booking hiện có.

## 2. Màn Thiết bị kiosk

### Danh sách máy

| Cột | Nội dung |
|---|---|
| Kiosk | Tên máy, vị trí |
| Trạng thái | Một nhãn duy nhất: **Sẵn sàng / Đang phục vụ / Cần hỗ trợ / Mất kết nối / Tạm ngừng**, kèm lý do ngắn và thời điểm cập nhật cuối |
| Phiên hiện tại | Mã booking · phòng · bước đang làm · đã chờ bao lâu |
| Vật tư | Chỉ hiện khi sắp hết: “Thẻ còn 8”, “Giấy sắp hết”, “Khay thu đầy” |
| Thao tác | **Xem** (mở bảng chi tiết). Menu phụ: Cập nhật vật tư, Tạm ngừng, Sửa, Cấp token mới |

Thứ tự hiển thị: Cần hỗ trợ → Mất kết nối → Đang phục vụ → còn lại.

Mất kết nối: giữ phiên và kết quả cuối, ghi “cập nhật lần cuối lúc …”. Không tự coi giao dịch hay lệnh thẻ là thất bại.

### Bảng chi tiết máy (mở bên cạnh)

1. **Phiên hiện tại** (xem mục 3) và yêu cầu hỗ trợ đang mở.
2. Thiết bị: bộ thẻ, máy quét, POS, máy in — chỉ hiện thiết bị lỗi và lý do.
3. Vật tư và lần bổ sung gần nhất.
4. Cấu hình máy (tên, mã SmartPOS, token) ở cuối, chỉ người có quyền thấy.

## 3. Phiên nhận phòng — lễ tân thấy gì

Năm bước, mỗi bước có trạng thái **Chưa làm / Đang làm / Xong / Lỗi** và lý do lỗi:

1. **Tra cứu & kiểm tra lịch:** booking, phòng, lịch hiệu lực; lý do bị chặn nếu có.
2. **Hồ sơ khách:** số khách đã hợp lệ / cần kiểm tra.
3. **Thanh toán:** cần thu, đã thu, mã giao dịch gần nhất. Có thêm trạng thái **Chưa rõ** khi POS chưa trả kết quả.
4. **Thẻ phòng:** kích hoạt (UID, hạn) và nhả thẻ, hiển thị riêng hai kết quả. Có trạng thái **Chưa rõ** khi đã gửi lệnh nhưng chưa có phản hồi.
5. **Hoàn tất:** booking chỉ chuyển Đang ở khi thẻ đã nhả thành công.

Nút trên phiên: **Mở booking**, **Tiếp nhận hỗ trợ** (nếu có yêu cầu), **Chuyển sang quầy**.

## 4. Yêu cầu hỗ trợ

### Khi nào tạo

- Khách bấm gọi hỗ trợ (kể cả khi chưa tìm thấy booking).
- Bước 1–4 lỗi mà khách không tự tiếp tục được.
- Thanh toán hoặc thẻ ở trạng thái **Chưa rõ** quá thời gian chờ.

Một phiên chỉ có một yêu cầu đang mở; lỗi mới trong cùng phiên cập nhật vào yêu cầu đó. Lỗi thiết bị khi máy rảnh là cảnh báo máy, không phải yêu cầu hỗ trợ.

### Trên hàng Cần xử lý

Mỗi dòng: **lý do** · kiosk · booking/phòng · chờ bao lâu · tóm tắt tiền/thẻ · người phụ trách.

Ví dụ: *Đã thu 450.000đ, lỗi nhả thẻ · Kiosk Sơn Trà 01 · NR-24103/303 · 3 phút · Chưa ai nhận.*

Ưu tiên lên đầu: đã thu tiền nhưng chưa giao thẻ, và trạng thái Chưa rõ. Bấm dòng mở bảng chi tiết máy, không còn nút “Đã hỗ trợ” đóng ngay.

### Vòng đời

**Chờ tiếp nhận → Đang xử lý → Đã xong**

- **Tiếp nhận:** ghi người phụ trách; kiosk hiện “Nhân viên đang tới”. Người khác vẫn thấy ai đang xử lý.
- **Đã xong:** chọn một kết quả:
  - **Tiếp tục tại kiosk** — đã khắc phục, khách làm tiếp bước còn thiếu.
  - **Nhận phòng tại quầy** — đã bàn giao phòng cho khách.
  - **Khách không nhận phòng** — bắt buộc ghi chú; nếu cần hoàn tiền thì tạo việc hoàn tiền trong booking.

Không cho chọn Đã xong khi thanh toán hoặc thẻ còn **Chưa rõ**.

## 5. Chuyển sang quầy

1. Bấm **Chuyển sang quầy**: kiosk báo khách tới quầy và không nhận thao tác mới cho phiên này.
2. Mở booking: hồ sơ, tiền và thẻ đã có được giữ nguyên.
3. Lễ tân bổ sung phần thiếu, thu đúng số còn thiếu, phát thẻ tại quầy.
4. Nhận phòng xong → yêu cầu tự đóng với kết quả “Nhận phòng tại quầy”.

Chưa tìm thấy booking: tra cứu và gắn đúng booking trước khi xử lý.

## 6. Tình huống chính

| Tình huống | Lễ tân thấy | Cách xử lý |
|---|---|---|
| Đã thu tiền, kích hoạt thẻ lỗi | Thanh toán Xong, Thẻ Lỗi | Thử lại tại kiosk hoặc chuyển quầy; không thu lại |
| Đã kích hoạt, không nhả được thẻ | Thẻ: kích hoạt Xong, nhả Lỗi | Lấy thẻ trong máy hoặc thu hồi thẻ cũ rồi phát thẻ mới tại quầy |
| POS chưa trả kết quả | Thanh toán Chưa rõ + mã giao dịch | Đối chiếu giao dịch trước; chỉ thu lại khi xác định thất bại |
| Mất kết nối giữa chừng | Mất kết nối + bước cuối đã biết | Chờ kết nối lại để đối chiếu, hoặc chuyển quầy |
| Đến muộn vướng lượt sau | Bước 1 Lỗi + lịch lượt sau | Mở booking để đổi lịch/phòng, sau đó tiếp tục |

## 7. Vật tư và quyền

- **Cập nhật vật tư:** form nhỏ nhập số thẻ nạp thêm và đánh dấu đã dọn hộp thu hồi. Không tự đặt về mức đầy.
- **Tạm ngừng:** máy không nhận phiên mới; phiên đang chạy phải xử lý xong hoặc chuyển quầy.
- **Cấp token mới:** chỉ admin chi nhánh; không cho làm khi máy đang có phiên chưa xong.
- Lễ tân: xem phiên, tiếp nhận/xử lý hỗ trợ, mở booking.

## 8. Thứ tự làm demo

1. Danh sách máy với trạng thái gộp và phiên hiện tại; bảng chi tiết phiên 5 bước.
2. Hàng hỗ trợ đủ thông tin, Tiếp nhận / Đã xong có kết quả.
3. Chuyển sang quầy giữ kết quả cũ; seed các tình huống ở mục 6.
4. Cập nhật vật tư thực tế và tạm ngừng máy.

Tiêu chí đạt:

- Nhìn danh sách biết máy nào đang xử lý đơn nào và mắc ở đâu.
- Tiếp nhận không đóng yêu cầu; người khác thấy ai đang xử lý.
- Đã thu tiền nhưng lỗi thẻ → chuyển quầy không thu lại, không tạo đơn mới.
- Thẻ chưa nhả thì booking chưa là Đang ở.
- Mất kết nối không làm mất phiên hay tự coi là thất bại.
