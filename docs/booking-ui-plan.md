# Đề xuất UI đặt phòng và quản lý booking — The Norin Admin

Ngày khảo sát: 10/10/2026.

## 1. Mục tiêu và phạm vi

Thiết kế phần booking cho admin thay thế công việc đặt phòng, tiếp nhận khách, quản lý lưu trú và kết thúc booking đang làm trên KiotViet. Ưu tiên lễ tân thao tác nhanh trong ca, nhìn rõ phòng còn bán được và tìm đúng booking khi khách cần hỗ trợ.

Tài liệu mô tả các màn, thông tin hiển thị, thao tác và quy tắc UX. Phương án đang được triển khai trong `admin_demo_react`; chưa thay đổi backend hay các tích hợp thật. Cập nhật theo yêu cầu: booking không có đặt cọc, chỉ **Trả trước / Trả sau**. Các quyết định bỏ/gộp được áp dụng vào bản demo.

## 2. Nhận xét giao diện hiện tại

Đã đối chiếu tab `http://localhost:3010/#bookings`, giao diện demo, luồng booking trong backend và web/kiosk thuộc `front-end-monorepo`.

- **Tên và mục đích màn chưa thống nhất:** menu ghi “Bảng phòng”, tiêu đề ghi “Đặt phòng & sơ đồ phòng”, nhưng nội dung mặc định là lưới chọn thời gian. Nhân viên khó biết đây là màn xem phòng hiện tại hay quản lý đơn đặt.
- **Thiếu màn quản lý booking thực sự:** “Tra cứu booking” hiện có tìm kiếm và một số thao tác thu tiền/nhận/trả phòng, nhưng thiếu bộ lọc vận hành, quản lý trạng thái, sửa lịch, đổi phòng, hủy và xử lý khách không đến.
- **“Đặt phòng gần đây” thừa:** đặt dưới lưới, lặp các booking đã có ở nơi tra cứu, thiếu trạng thái và thao tác. Danh sách hiện cũng không thể hiện rõ tiêu chí “gần đây”. Bỏ toàn bộ khối này.
- **“Danh sách” trong Bảng phòng là danh sách phòng, không phải danh sách booking.** Không dùng nó để thay thế màn quản lý booking.
- **Lịch bị chia thành hai nơi:** lưới thời gian trong Bảng phòng và mục “Lịch phòng” riêng. Màn lịch riêng đang là lịch mẫu theo ngày, không đủ để quyết định bán phòng theo giờ. Gộp về một lịch duy nhất.
- **Bốn chế độ Lưới / Danh sách / Sơ đồ / Camera & folio làm loãng mục đích.** Camera và thông tin tiền nên gắn với phòng hoặc booking liên quan; không cần một chế độ riêng chỉ để xem lại chúng.
- **Chi tiết qua hai lớp:** bấm booking trên lưới mở bản tóm tắt, rồi phải bấm “Xem chi tiết”; đích này hiện chưa hoàn thiện. Nên mở thẳng cùng một màn chi tiết booking.
- **Form tạo booking đang ưu tiên nhập dữ liệu hơn tìm phòng:** chọn phòng trước lịch, chưa có tóm tắt giá trực tiếp, chưa có lựa chọn đặt trước/nhận ngay và hình thức trả trước/trả sau rõ ràng.
- **Mã nhận phòng và thông tin gửi khách đang chiếm nhiều chỗ:** nhân viên phải nhập mã sáu số, email, kênh gửi và số Zalo trong cùng form. Nên đưa phần gửi xác nhận xuống sau khi tạo; mã nhận phòng được cấp sẵn, không bắt lễ tân tự nghĩ mã cho mỗi lượt.
- **Quy tắc thời gian dễ bị hiểu sai:** demo thể hiện dọn 30 phút ở hai đầu booking; phần gia hạn trong backend kiểm tra khoảng dọn trước booking tiếp theo. UI cần thể hiện đúng một khoảng nghỉ giữa hai lượt theo quy tắc vận hành, tránh khiến nhân viên hiểu phải chừa 60 phút.

## 3. Cấu trúc điều hướng đề xuất

Giữ hai điểm vào chính, đặt gần nhau trong nhóm vận hành:

1. **Bảng phòng:** trả lời “Bây giờ mỗi phòng đang thế nào, cần làm gì?”. Dành cho nhận khách trực tiếp, theo dõi đang ở, trả phòng và dọn phòng.
2. **Booking:** trả lời “Có những đơn đặt nào, lịch còn chỗ không, cần sửa hoặc xử lý đơn nào?”. Có hai tab **Danh sách** và **Lịch phòng**.

Nút **Tạo booking** được dùng thống nhất ở Bảng phòng và Booking, mở cùng một luồng. Từ một phòng hoặc ô lịch, điền sẵn phòng/lịch tương ứng.

Các mục hiện có được xử lý như sau:

- “Tra cứu booking” → thay bằng **Booking**, mặc định tab Danh sách. Tìm kiếm nằm ngay trên màn này.
- “Lịch phòng” ở sidebar → bỏ mục riêng, chuyển thành tab trong Booking.
- “Bảng phòng” → chỉ phục vụ trạng thái phòng hiện tại; chuyển lưới đặt tương lai sang Booking / Lịch phòng.
- “Cần xử lý” → giữ danh sách công việc/cảnh báo liên phòng; bấm một việc mở booking liên quan, không dựng một bản chi tiết khác.
- “Thu ngân & tiền mặt” → giữ yêu cầu thu và đối soát ca. Khi thu cho một booking, dùng cùng hộp thu tiền với Chi tiết booking.
- “Hóa đơn” → giữ tra cứu chứng từ và kết quả thanh toán; liên kết về booking gốc. Không tạo thêm vòng đời nhận/trả phòng ở đây.
- “Đơn gọi thêm” → giữ theo dõi tiếp nhận/phục vụ món. Chi tiết booking chỉ hiển thị các khoản gắn với đơn đó và liên kết tới nơi xử lý.

Không thêm một dashboard booking riêng. Các tab lọc nhanh trong danh sách và trạng thái trên Bảng phòng đủ cho công việc hằng ngày.

## 4. Nguyên tắc trạng thái cần thể hiện trên mọi màn

### 4.1. Trạng thái booking

Dùng nhãn nghiệp vụ dễ hiểu:

- **Giữ chỗ:** đang chờ khách hoàn tất đặt/thanh toán, có thời điểm hết hạn rõ ràng.
- **Chờ xác nhận:** booking cần nhân viên duyệt; khác với giữ chỗ tự hết hạn.
- **Đã xác nhận:** đã nhận đặt phòng, khách chưa nhận phòng.
- **Đang ở:** đã hoàn tất nhận phòng thực tế.
- **Đã trả phòng:** đã kết thúc lưu trú thực tế.
- **Đã hủy:** đã hủy đặt phòng, vẫn xem được lịch sử và các khoản tiền liên quan.
- **Không đến:** nhân viên xác nhận khách không đến theo chính sách; không tự gán chỉ vì khách tới muộn.

Đây là các nhãn UI đích. Hiện trạng backend có trạng thái đơn, trạng thái chi tiết và dữ liệu nhận phòng riêng; không mặc định rằng các nhãn trên đều đã có sẵn đầy đủ.

“Hỗ trợ nhận phòng”, “Khách yêu cầu trả phòng”, “Quá giờ” là dấu hiệu cần xử lý đi kèm, không thay thế trạng thái booking.

### 4.2. Trạng thái thanh toán

Hiển thị độc lập với trạng thái booking: **Chưa thu / Đã thu một phần / Đã thu đủ**. Tiền hoàn có nhãn riêng **Chờ hoàn / Đã hoàn** khi phát sinh, kèm số tiền.

- Booking đã xác nhận có thể chưa thu đủ nếu chính sách cho phép.
- Thu đủ không tự nhận phòng hoặc tự trả phòng.
- Không có đặt cọc. Trả trước thu đủ tiền phòng; trả sau thu lúc quyết toán. Khoản phát sinh thêm được thu riêng và không làm mất giao dịch trả trước. Dữ liệu cũ có giao dịch chưa đủ vẫn được giữ để đối chiếu.
- Hủy booking không đồng nghĩa đã hoàn tiền.
- Sau điều chỉnh giá, nếu đã thu lớn hơn tiền phải trả thì hiện **Cần hoàn**, không hiện số “còn thu” âm.
- Booking miễn phí hoặc được voucher bao phủ toàn bộ hiển thị “Không cần thu thêm”, không ép tạo giao dịch thu tiền.

### 4.3. Trạng thái phòng

Bảng phòng phân biệt **Trống sạch / Có khách / Chờ dọn / Đang dọn / Ngừng sử dụng**. Lịch bán thể hiện riêng khoảng đã đặt, giữ chỗ, khoảng dọn dự kiến và khóa bán.

Một phòng đang có khách vẫn có thể nhận đặt cho thời gian tương lai phù hợp. Một phòng trống nhưng bẩn chưa sẵn sàng nhận khách ngay. Lịch hẹn trả phòng đã qua không đủ để tự chuyển phòng sang trống; cần khách thực sự trả và phòng được dọn.

“Có lịch sắp đến” là thông tin bổ sung trên thẻ phòng, không ghi đè trạng thái vật lý. Khóa bán trong một khoảng thời gian được hiển thị trên lịch; không mặc định biến phòng thành ngừng sử dụng cả ngày.

## 5. Màn Bảng phòng — vận hành hiện tại

### Mục đích

Là màn làm việc chính trong ca: nhận biết phòng có thể giao ngay, phòng có khách sắp trả, phòng cần dọn và booking đang cần hỗ trợ.

### Bố cục

- Thanh đầu: chi nhánh đang làm việc, tìm số phòng/tên khách/mã booking và nút **Tạo booking**.
- Bộ lọc gọn: Tất cả, Trống sạch, Có khách, Cần dọn, Ngừng sử dụng; lọc thêm tầng/hạng phòng khi cần.
- Các thẻ phòng nhóm theo tầng. Không làm thêm chế độ sơ đồ mặt bằng nếu chỉ lặp các thẻ này.
- Không thêm biểu đồ, danh sách booking gần đây hoặc danh sách giao dịch dưới bảng.

### Thông tin trên thẻ phòng

- Số phòng nổi bật, hạng phòng nhỏ hơn và trạng thái vật lý.
- Nếu có khách: tên khách, giờ trả hiệu lực, dấu quá giờ nếu có, số tiền còn phải thu.
- Nếu có lượt sắp đến: giờ nhận và mã booking kế tiếp. Nếu lượt hiện tại ảnh hưởng lượt sau, hiển thị cảnh báo cụ thể.
- Nếu đang dọn: trạng thái dọn và giờ dự kiến xong nếu có.
- Cảnh báo hỗ trợ nhận phòng/yêu cầu trả phòng chỉ hiện ở phòng liên quan.
- Camera chỉ hiện tín hiệu bất thường cần xử lý; không đưa số người và trạng thái camera lên mọi thẻ theo mặc định.

### Thao tác

- Trống sạch → **Nhận khách** mở tạo booking với lựa chọn nhận ngay; **Đặt trước** nằm trong thao tác phụ.
- Có khách → bấm thẻ mở Chi tiết booking; nút chính **Trả phòng** hoặc **Xử lý trả phòng** khi có yêu cầu.
- Chờ dọn → **Bắt đầu dọn**. Đang dọn → **Hoàn tất dọn**.
- Có lịch sắp đến → bấm lịch để mở đúng booking tương lai, tách rõ với booking đang ở.
- Ngừng sử dụng → xem lý do và khoảng ngừng; không hiện nút nhận khách ngay.

Khi xem toàn bộ chi nhánh, nhóm thẻ theo chi nhánh và luôn ghi rõ chi nhánh trên hành động. Trước thao tác nhận khách/đặt phòng phải xác định một chi nhánh cụ thể.

## 6. Màn Booking / Danh sách — quản lý đơn đặt

### Bố cục

- Tiêu đề **Booking**, hai tab **Danh sách / Lịch phòng**, nút chính **Tạo booking**.
- Tìm kiếm theo mã booking, tên, số điện thoại hoặc số phòng. Tìm theo mã/số điện thoại phải cho thấy đơn cũ ngoài kỳ ngày hiện tại bằng lựa chọn “Tìm trong toàn bộ thời gian”.
- Lọc ngày có nhãn rõ **Nhận phòng / Trả phòng / Thời gian lưu trú / Ngày tạo**. Mặc định “Thời gian lưu trú — Hôm nay”, gồm cả khách ở từ hôm trước.
- Lọc thêm: chi nhánh, trạng thái booking, trạng thái thanh toán, loại lưu trú, nguồn đặt; hạng phòng và người tạo nằm trong “Bộ lọc khác”.
- Giữ một bộ lọc ngày dùng chung, không tạo mỗi tab một bộ lọc khác cách hiểu.

### Các bộ lọc nhanh

**Tất cả / Sắp đến / Đang ở / Sắp trả / Đã kết thúc**. “Đã kết thúc” gồm đã trả, đã hủy, không đến và vẫn lọc được từng trạng thái.

- Sắp đến: chưa nhận phòng, đến hạn nhận trong khoảng ngày đang chọn. Hiện rõ khách đã trễ giờ nhận.
- Sắp trả: đang ở và đến hạn trả trong khoảng ngày đang chọn; bao gồm quá giờ chưa trả, có nhãn phân biệt.
- Chờ xác nhận, Giữ chỗ, Còn phải thu nằm trong bộ lọc trạng thái; không xếp thêm quá nhiều tab ngang.
- Số lượng trên bộ lọc nhanh theo chi nhánh và khoảng thời gian đang xem; bộ lọc đang bật luôn nhìn thấy và xóa được.

### Cột danh sách

1. **Mã booking:** mã bấm được, nguồn đặt ở dòng phụ.
2. **Khách:** tên và số điện thoại theo quyền xem.
3. **Phòng:** số phòng, hạng phòng; thêm chi nhánh khi xem nhiều chi nhánh.
4. **Lưu trú:** loại lưu trú, ngày giờ nhận → trả hiệu lực, có dấu “Đã điều chỉnh” nếu khác lịch ban đầu.
5. **Trạng thái:** trạng thái booking, dấu hiệu cần xử lý nếu có.
6. **Thanh toán:** tổng tiền, còn thu hoặc cần hoàn; không dùng “Giá trị” chung chung.
7. **Thao tác:** một hành động chính theo trạng thái và menu phụ.

Bấm dòng hoặc mã mở thẳng Chi tiết booking. Không mở modal tóm tắt rồi yêu cầu bấm lần nữa.

### Thao tác theo trạng thái

- Giữ chỗ → xem hạn giữ, tình trạng thanh toán; hủy giữ chỗ khi phù hợp.
- Chờ xác nhận → **Xác nhận**; từ chối/hủy nằm trong menu phụ.
- Đã xác nhận → **Nhận phòng**; sửa lịch, đổi phòng, thu tiền, hủy, xác nhận không đến nằm trong chi tiết/menu phụ.
- Đang ở → **Trả phòng**; gia hạn, đổi phòng, thêm khoản, thu tiền nằm trong chi tiết.
- Đã trả/đã hủy/không đến → **Xem chi tiết**; chỉ còn các xử lý tài chính hợp lệ theo quyền.

Không đặt cả dãy nút Nhận phòng / Trả phòng / Thu tiền / Sửa / Hủy trên mỗi dòng. Không hủy hay nhận/trả hàng loạt trong phiên bản đầu.

Mặc định sắp theo việc sắp tới: giờ nhận ở Sắp đến, giờ trả ở Sắp trả. Có phân trang và tổng kết quả. Khi quay lại từ chi tiết phải giữ tìm kiếm, bộ lọc và trang đang xem.

## 7. Màn Booking / Lịch phòng — xem khả dụng và đặt theo lịch

### Bố cục

- Hàng là phòng, nhóm theo hạng/tầng; cột là thời gian.
- Chọn **Ngày / Tuần / Tháng** theo nhu cầu quan sát. Ngày phù hợp đặt theo giờ, tuần/tháng phù hợp nhìn lịch nhiều ngày.
- Loại lưu trú là lựa chọn khi tạo booking hoặc bộ lọc tùy chọn, không quyết định những loại booking nào được phép xuất hiện trên lịch. Mọi booking chiếm phòng đều phải được nhìn thấy.
- Bộ điều khiển: ngày đang xem, trước/sau, **Hôm nay**, chi nhánh, hạng/tầng. Cố định cột phòng và hàng thời gian khi cuộn.
- Mặc định đến gần giờ hiện tại ở chế độ ngày; có đường giờ hiện tại. Không bắt lễ tân cuộn từ 00:00 mỗi lần mở.
- Mặc định xem một chi nhánh để dễ đọc; khi xem nhiều chi nhánh phải nhóm rõ và tránh nhầm các phòng cùng số.

### Booking trên lịch

- Hiện mã/tên khách tùy độ rộng, kèm trạng thái bằng chữ hoặc ký hiệu có giải thích.
- Phân biệt đã xác nhận, đang ở và giữ chỗ. Booking qua nửa đêm phải nối liên tục qua ngày; có dấu tiếp diễn khi ra khỏi vùng đang xem.
- Khoảng dọn dự kiến, thời gian thực sự đang dọn và khoảng khóa bán có kiểu hiển thị khác nhau.
- Booking đã hủy/giữ chỗ hết hạn không chặn lịch; xem trong Danh sách khi cần.
- Booking đang ở quá giờ phải thể hiện phần quá giờ thực tế và cảnh báo lịch kế tiếp, không vẽ thành phòng trống chỉ vì hết giờ dự kiến.
- Chế độ tuần/tháng chỉ là mức tổng quan. Một ngày có booking theo giờ không được mô tả như đã kín cả ngày; muốn đặt chính xác thì mở ngày hoặc form kiểm tra khoảng giờ.

### Thao tác

- Bấm booking → mở Chi tiết booking.
- Bấm ô trống → mở form với phòng và giờ bắt đầu đã chọn; cho chọn giờ kết thúc/thời lượng trong form.
- Có thể chọn một khoảng trống để điền sẵn lịch. Không bắt buộc thao tác kéo thả hoặc cách bấm hai đầu khó đoán; luôn có cách nhập ngày giờ trực tiếp.
- Sau chọn khoảng thời gian, hiện tóm tắt phòng, ngày giờ, thời lượng và nút **Tạo booking**. Bỏ bước “Xác nhận” chỉ để mở tiếp form nếu chưa xác nhận điều gì với khách.
- Bản đầu không cho kéo booking để tự đổi giờ/phòng. Dùng thao tác **Sửa lịch / Đổi phòng** có xem trước giá và xung đột.
- Ô không bán được phải xem được lý do: đang có khách, đang giữ chỗ đến lúc nào, dọn phòng hoặc khóa bán. Không chỉ tô xám.

Khoảng dọn giữa hai lượt phải được minh họa một lần. Ví dụ nếu cần 30 phút: lượt A trả 14:00 thì lượt B có thể nhận từ 14:30, trừ khi còn điều kiện vận hành khác. Giá trị chính thức theo cấu hình/quy tắc được thống nhất, không tự suy ra hai khoảng dọn 30 phút độc lập.

## 8. Màn Tạo booking

### Hình thức

Dùng một màn form đủ rộng, có khu thông tin chính và khu tóm tắt giá luôn dễ nhìn. Trên màn nhỏ chuyển thành một cột. Nút cuối form cố định trong vùng nhìn thấy, không dùng modal nhỏ phải cuộn nhiều.

### Nhóm 1 — Lịch và phòng

- Hai lựa chọn đầu: **Đặt trước / Nhận ngay**. Nhận ngay mặc định thời điểm hiện tại, không làm tròn sang tương lai khiến khách phải đợi thẻ có hiệu lực.
- Chi nhánh; nếu đang làm tại một chi nhánh thì điền sẵn, không yêu cầu chọn lại.
- Theo giờ / Qua đêm / Theo ngày.
- Theo giờ: giờ bắt đầu và thời lượng theo gói đang áp dụng; hiện rõ giờ trả tính được. Không mặc định giới hạn 2–8 giờ là quy tắc vĩnh viễn chỉ vì demo đang dùng.
- Qua đêm/theo ngày: ngày nhận, ngày trả hoặc số đêm/ngày, hiện giờ nhận/trả theo quy định chi nhánh. Không tính đơn giản bằng cộng 12 hoặc 24 tiếng từ bất kỳ giờ bắt đầu nào.
- Sau khi chọn lịch, hiển thị hạng phòng còn chỗ, giá và danh sách phòng phù hợp. Chọn phòng cụ thể là mặc định cho vận hành hiện tại của Norin; chưa thêm cơ chế bán vượt số phòng hoặc đặt chưa gán phòng.
- Phòng đã chọn từ Bảng phòng/Lịch được điền sẵn nhưng vẫn có nút **Thay đổi**. Sửa lịch phải kiểm tra lại phòng và giá.
- Chỉ cho chọn phòng phù hợp với toàn bộ khoảng lưu trú. Phòng đang bẩn chặn nhận ngay; việc bán cho tương lai phụ thuộc khoảng sẵn sàng, không chặn tất cả ngày tương lai chỉ theo trạng thái hiện tại.

### Nhóm 2 — Khách và ghi chú

- Tên khách, số điện thoại; nhập điện thoại có thể chọn khách đã có, không ép tạo bản ghi khách trùng.
- Nhận khách vãng lai có lối **Chưa có số điện thoại** nếu quy định cho phép; hỗ trợ số quốc tế thay vì chỉ nhận số di động Việt Nam.
- Ghi chú/yêu cầu đặc biệt là tùy chọn.
- Email nằm trong phần liên hệ mở rộng. Giấy tờ và khách đi cùng được bổ sung tại bước nhận phòng, không bắt nhập tất cả khi đặt trước.
- Nguồn đặt: tại quầy, điện thoại/Zalo hoặc kênh khác thực sự sử dụng; mặc định tại quầy. Phân biệt nguồn đặt với kênh gửi xác nhận.

### Nhóm 3 — Giá và khoản thu

- Tóm tắt phòng/lịch, tiền phòng, dịch vụ đặt kèm nếu chọn, giảm giá/voucher, phụ thu, tổng tiền.
- Dịch vụ đặt kèm mở khi bấm **Thêm dịch vụ**; không chiếm toàn bộ form mặc định.
- Giá thay đổi khi đổi lịch/phòng được làm nổi bật. Sửa giá/giảm giá thủ công yêu cầu quyền và lý do.
- Chọn **Trả trước / Trả sau**. Trả trước ghi nhận đủ tiền phòng với phương thức đã nhận; trả sau chưa ghi nhận giao dịch khi tạo. Không có ô nhập đặt cọc hay thu một phần trong luồng tạo.
- Chuyển khoản/POS đang chờ phải hiện đúng “Chờ thanh toán”; giao dịch tự động chỉ ghi nhận khi có kết quả xác nhận. Không có nút khiến nhân viên vô tình đánh dấu QR vừa tạo là đã thu.
- Nếu tạo booking thành công nhưng thu tiền chưa thành công, giữ booking đã tạo và cho thu lại từ chi tiết; không yêu cầu tạo đơn thứ hai.

### Hoàn tất

- Đặt trước: nút chính **Tạo booking**. Booking được xác nhận hay chờ duyệt theo chính sách và quyền đang áp dụng, không ép mọi đơn tại quầy đi qua một bước duyệt thừa.
- Nhận ngay: **Tạo và nhận phòng**, mở bước kiểm tra nhận phòng với dữ liệu vừa nhập; chỉ chuyển sang Đang ở khi hoàn tất bước này.
- Sau tạo, mở Chi tiết booking và hiển thị xác nhận ngay trên màn. Tại đây có **Gửi xác nhận / Sao chép thông tin / In phiếu** theo kênh thực tế được hỗ trợ.
- Mã nhận phòng được cấp sẵn, che mặc định; không bắt nhân viên tự nhập. Chỉ người có quyền mới được xem/cấp lại. Không đưa mã này lên bảng danh sách.
- Nếu gửi xác nhận thất bại, booking vẫn tồn tại; hiện lỗi gửi và cho gửi lại. Không báo thất bại toàn bộ thao tác tạo.
- Không làm màn “Đặt thành công” riêng khiến lễ tân phải chuyển thêm một bước mới tiếp tục quản lý đơn.

## 9. Màn Chi tiết booking — một điểm xử lý thống nhất

### Hình thức và đầu màn

Một trang chi tiết đầy đủ, mở được từ Danh sách, Lịch phòng, Bảng phòng, Cần xử lý và Hóa đơn. Có nút quay về đúng màn/bộ lọc trước đó.

Đầu trang gồm mã booking, trạng thái, nguồn, chi nhánh/phòng và hành động chính theo giai đoạn. Số tiền còn thu/cần hoàn luôn nhìn thấy. Cảnh báo quan trọng đặt ngay dưới đầu trang và liên kết đến thao tác giải quyết.

### Tab Tổng quan

- Khách liên hệ, phòng/hạng, loại lưu trú, ghi chú và yêu cầu đặc biệt.
- Lịch đặt ban đầu và lịch hiệu lực; chỉ hiển thị hai bộ lịch khi có thay đổi. Giờ nhận/trả thực tế là thông tin riêng, không ghi đè lịch ban đầu.
- Tình trạng nhận phòng, tình trạng cấp thẻ/quyền vào phòng và yêu cầu hỗ trợ từ kiosk nếu có.
- Lịch phòng kế tiếp khi ảnh hưởng sửa lịch/gia hạn/trả muộn.
- Các nút phù hợp: **Nhận phòng, Sửa lịch, Đổi phòng, Gia hạn, Trả phòng**. Hủy/không đến nằm trong menu phụ trước nhận phòng.
- Sau khi đã nhận phòng, dùng đổi phòng/rút ngắn lưu trú/trả sớm thay vì sửa tùy ý lịch ban đầu.

### Tab Chi phí & thanh toán

- Các dòng tiền phòng, dịch vụ đặt kèm, gọi thêm, phụ thu, giảm giá/voucher; nêu rõ số lượng, đơn giá, thành tiền.
- Tổng phải trả, đã thu, đã hoàn, còn phải thu hoặc cần hoàn.
- Lịch sử các lần thu/hoàn: thời gian, số tiền, phương thức, người xử lý và trạng thái giao dịch.
- **Thu tiền, Thêm khoản, Điều chỉnh khoản, Hoàn tiền, Xem/In chứng từ** theo quyền và trạng thái.
- Khoản chờ phục vụ chưa được tính tiền phải được phân biệt với khoản đã ghi nhận. Không cộng cả đơn gọi thêm và dòng chi phí tương ứng thành hai lần.
- Chứng từ tham chiếu booking này; không tạo một bộ tổng tiền khác có cách tính riêng trên màn Hóa đơn.

### Tab Khách lưu trú

- Người liên hệ và danh sách người thực sự lưu trú, giấy tờ cần thiết, trạng thái đủ/thiếu hồ sơ.
- Thông tin kiosk đã gửi được hiển thị để kiểm tra/bổ sung, không bắt nhập lại.
- Ảnh giấy tờ, khuôn mặt và thông tin nhận phòng nhạy cảm chỉ xem theo quyền, không đưa lên màn danh sách hoặc thẻ phòng.

### Tab Lịch sử

Dòng thời gian tạo/xác nhận booking, thay đổi phòng/lịch/giá, nhận/trả phòng, thu/hoàn tiền, cấp thẻ và gửi thông báo. Mỗi mục có thời gian, người thực hiện, nội dung trước → sau và lý do nếu là điều chỉnh.

Không đưa toàn bộ log thiết bị lên mặc định; sự cố cần hỗ trợ có liên kết xem thêm.

Nếu có booking nhiều phòng từ dữ liệu hiện hữu, hiển thị các phòng/thời gian và trạng thái riêng trong cùng booking, tài chính tổng theo đơn. Không nhân bản booking thành nhiều đơn có cùng tổng tiền. Luồng tạo mới mặc định một phòng; tạo nhiều phòng cùng đơn là phần mở rộng sau khi chốt nhu cầu, nhưng màn xem không được làm mất dữ liệu nhiều phòng hiện có.

## 10. Các hộp thao tác từ Chi tiết booking

Đây là các tác vụ ngắn mở trên trang chi tiết, không thêm mục sidebar.

### 10.1. Nhận phòng

- Kiểm tra đúng khách/phòng, hồ sơ khách, phòng sẵn sàng và điều kiện thanh toán.
- Hiện lịch đặt và lịch hiệu lực sau đánh giá đến sớm/muộn; giải thích bằng ngôn ngữ nghiệp vụ, không hiển thị mã trạng thái kỹ thuật.
- Với theo giờ, nói rõ có dời khung giờ, rút ngắn hay giữ lịch, và giờ trả sau thao tác. Với qua đêm/theo ngày, giữ giờ cố định theo chính sách hiện hành; không mặc định cho bù nguyên thời lượng nếu tới muộn.
- Nếu phòng còn dọn hoặc có xung đột lượt kế tiếp, nêu lý do và các lựa chọn hợp lệ: chờ, đổi phòng, giữ lịch hoặc liên hệ người có quyền xử lý.
- Nút **Xác nhận nhận phòng**; khi cần cấp thẻ, hiện kết quả cấp riêng. Lỗi cấp thẻ không khiến nhân viên tạo lại booking hoặc vô tình nhận phòng hai lần.

### 10.2. Sửa lịch / Đổi phòng

- Cho chọn lịch/phòng mới còn phù hợp. Xem trước lịch/phòng cũ → mới và chênh lệch tiền.
- Sửa lịch trước nhận phòng; gia hạn hoặc trả sớm khi đang ở có tác vụ riêng để rõ ý nghĩa.
- Đổi phòng khi đang ở giữ được lịch sử phòng cũ, thời điểm chuyển và các chi phí đã phát sinh; nêu tác động tới thẻ/quyền phòng và việc dọn phòng cũ.
- Không đổi chi nhánh như một chỉnh sửa phòng thông thường. Nếu phải chuyển cơ sở, cần quy trình riêng sau khi chốt nghiệp vụ.
- Lý do khi thay đổi đơn đã xác nhận; nút **Lưu thay đổi**. Không cho lưu nếu phòng mới xung đột.

### 10.3. Gia hạn

- Hiện giờ trả hiện tại, giờ nhận lượt kế tiếp và mốc tối đa có thể gia hạn sau khi chừa khoảng dọn.
- Chọn thời gian/gói bổ sung, hiện giờ trả mới, tiền tăng thêm và còn phải thu.
- Nếu không gia hạn được, hiện lý do cùng lựa chọn xem phòng khác; không có nút ép gia hạn đè lịch khách sau.
- Quy tắc gia hạn ngày/đêm cần được chốt riêng; không mặc định áp dụng cách cộng giờ đang có cho mọi loại lưu trú.

### 10.4. Thu tiền / Hoàn tiền

- Dùng cùng hộp thao tác từ Chi tiết booking và Thu ngân.
- Thu đủ khoản còn phải thu tại lần quyết toán; chọn tiền mặt/chuyển khoản/thẻ theo phương thức đang hỗ trợ. Không có luồng đặt cọc.
- Tiền mặt có “Khách đưa” và “Tiền trả lại”. Người thu lấy từ tài khoản đang đăng nhập, không bắt nhập tên người thu tự do mỗi lần.
- Hoàn tiền hiện số còn được hoàn, phương thức, lý do và điều kiện duyệt. Phân biệt đang chờ với đã hoàn; không tự coi là đã chuyển tiền chỉ vì bấm tạo yêu cầu.
- Giao dịch đã chốt có lịch sử điều chỉnh/hủy theo quyền, không sửa đè hoặc xóa mất dấu vết.

### 10.5. Trả phòng

- Kiểm tra giờ trả thực tế, dịch vụ chưa xử lý, phụ thu phát sinh và số tiền còn thu/cần hoàn.
- Cảnh báo camera chỉ là tín hiệu hỗ trợ, không tự kết luận khách đã rời phòng hoặc tự thêm khoản phạt.
- Có thể thu tiền tại đây rồi **Hoàn tất trả phòng**. Nếu còn nợ, áp dụng chính sách đã được cấu hình; ngoại lệ ghi nợ chỉ dành cho người có quyền và phải có lý do.
- Sau hoàn tất: booking Đã trả phòng, phòng Chờ dọn, quyền phòng được xử lý tương ứng. Nếu xử lý thiết bị lỗi, hiện phần cần khắc phục riêng.
- Yêu cầu trả phòng từ tablet/kiosk chỉ đánh dấu cần xử lý. Không đóng booking và không cho bán phòng ngay từ yêu cầu đó.

### 10.6. Hủy booking / Xác nhận không đến

- Trước nhận phòng: hiện phòng/lịch sẽ giải phóng, đã thu, phí giữ lại theo chính sách và số tiền cần hoàn nếu có.
- Bắt buộc lý do và xác nhận bằng nút **Hủy booking** hoặc **Xác nhận không đến**, tránh nút “Đồng ý” chung chung.
- Sau hủy vẫn giữ chi tiết và lịch sử; hoàn tiền là bước tài chính riêng có trạng thái theo dõi.
- Khách không đến không được suy ra tự động chỉ vì quá giờ nhận. Booking đang ở không có thao tác Hủy; dùng trả phòng/điều chỉnh hợp lệ.
- Giữ chỗ tạm hết hạn được giải phóng theo thời hạn; không xếp chung thành booking khách đã được xác nhận rồi hủy.

## 11. Thành phần bỏ hoặc gộp khi triển khai

- **Bỏ hoàn toàn “Đặt phòng gần đây”** ở cuối màn hiện tại. Tra cứu và lịch sử nằm ở Booking / Danh sách.
- **Bỏ menu Lịch phòng độc lập**, gộp vào Booking / Lịch phòng.
- **Bỏ trang Tra cứu booking độc lập**, thay bằng Booking có tìm kiếm và quản lý đầy đủ.
- **Bỏ bốn chế độ Lưới / Danh sách / Sơ đồ / Camera & folio trên cùng màn.** Chỉ còn Bảng phòng hiện tại và Booking có hai tab phục vụ hai công việc rõ ràng.
- **Bỏ modal xem nhanh có nút “Xem chi tiết” thêm lần nữa.** Mọi điểm vào dùng một trang chi tiết chung.
- **Bỏ Room ID và trường định danh kỹ thuật khỏi danh sách/thẻ vận hành.** Giữ trong khu cấu hình thiết bị khi cần.
- **Bỏ mã bí mật hiển thị công khai và yêu cầu nhập mã thủ công mặc định.** Chuyển thành thông tin nhạy cảm có quyền xem trong chi tiết.
- **Gộp form gửi thông tin khách vào tác vụ Gửi xác nhận sau tạo**, mặc định dùng số/email đã có; chỉ nhập địa chỉ khác khi cần.
- **Bỏ số đếm “tổng lượt đặt” không theo ngày/bộ lọc** trên Bảng phòng. Số đếm phải có nghĩa với ngữ cảnh đang xem.
- **Gộp hướng dẫn chọn ô đang lặp ở đầu màn và trên lưới.** Chỉ giữ một hướng dẫn ngắn tại vị trí thao tác; phần giải thích dài mở khi cần.
- **Bỏ các bảng phụ không có hành động** chỉ để lấp khoảng trống. Không thêm báo cáo doanh thu/công suất vào module booking khi đã có Tổng quan và Báo cáo.

## 12. Quy tắc UX chung

- Giữ phong cách admin hiện tại, ưu tiên bảng/thẻ gọn, chữ rõ và tương phản tốt. Không cần đổi bộ màu, font hoặc thêm hiệu ứng trang trí để giải quyết bài toán này.
- Màu trạng thái luôn đi kèm chữ/ký hiệu; không dùng màu đơn độc để quyết định nhận khách hoặc bán phòng.
- Thời gian theo múi giờ chi nhánh, định dạng 24 giờ; mọi lượt qua nửa đêm đều hiển thị cả ngày nhận và ngày trả.
- Thay đổi khoảng ngày, phòng hoặc chi nhánh phải làm rõ ảnh hưởng tới lựa chọn đang có, không âm thầm chuyển sang phòng đầu tiên.
- Trước khi lưu tạo/sửa/gia hạn, nếu phòng vừa được người khác đặt thì báo xung đột cụ thể, giữ dữ liệu khách đã nhập và cho chọn phương án khác. Không chỉ thông báo “Có lỗi”.
- Trong lúc lưu/thu tiền, khóa thao tác gửi lặp và có phản hồi đang xử lý. Khi dữ liệu từ kiosk/tablet thay đổi, cập nhật trạng thái mà không đóng mất form đang nhập.
- Có trạng thái đang tải, không có kết quả, không có booking và tải lỗi riêng; lỗi tải không được hiển thị như không có khách/phòng trống.
- Trên desktop tối ưu bàn phím và thao tác một tay chuột. Trên tablet, nút đủ lớn và không phụ thuộc rê chuột. Trên điện thoại, ưu tiên Danh sách/Chi tiết; lưới thời gian có vùng cuộn riêng.
- Quyền chi nhánh và quyền nghiệp vụ phải rõ: lễ tân thao tác trong phạm vi được giao; sửa giá, hoàn tiền, hủy, ghi nợ và xem thông tin nhạy cảm theo quyền. Nút không được phép không xuất hiện hoặc có lý do rõ khi cần biết.

## 13. Thứ tự triển khai và điều kiện dùng thay KiotViet

### Đợt 1 — Nền quản lý booking

Làm Booking / Danh sách, Chi tiết booking, Tạo booking và luồng nhận phòng/thu tiền cơ bản. Thay Tra cứu booking bằng màn quản lý; bỏ “Đặt phòng gần đây” và lớp xem nhanh trung gian.

### Đợt 2 — Lịch và vận hành phòng

Gộp lịch về Booking / Lịch phòng; tinh gọn Bảng phòng. Hoàn thiện sửa lịch, đổi phòng, gia hạn, trả phòng, hủy/không đến và liên kết với Cần xử lý/Thu ngân/Đơn gọi thêm.

### Đợt 3 — Hoàn tất vòng đời và ngoại lệ

Hoàn thiện trả trước/trả sau, quyết toán khoản phát sinh, điều chỉnh chi phí, hoàn tiền, quyền thao tác, lịch sử và xử lý các lỗi thiết bị/thanh toán. Đối chiếu booking tạo từ web, kiosk và admin để toàn bộ các màn cùng phản ánh một lượt đặt.

Ba đợt là thứ tự làm UI, không phải khuyến nghị bỏ KiotViet ngay sau đợt 1. Backend hiện vẫn có luồng tạo và đồng bộ booking gắn với KiotViet; việc có đủ màn không đồng nghĩa hệ thống đã vận hành độc lập. Chỉ chuyển vận hành khi các tác vụ cần thiết thực sự hoạt động xuyên suốt và số tiền/phòng nhất quán giữa các kênh.

Các quy tắc cần chốt trước khi hoàn thiện màn tương ứng: giữ chỗ/chờ duyệt có chiếm phòng hay không và trong bao lâu; điều kiện nhận phòng khi chưa thu đủ; phí hủy/không đến; phí sớm/muộn/gia hạn; quyền sửa giá, hoàn tiền và ghi nợ. UI hiển thị theo quy tắc đã chốt, không tự đặt chính sách mới.

## 14. Các tình huống cần nhìn thấy đúng trên UI

- Khách gọi đặt trước → chọn trả trước thì thấy Đã thu đủ tiền phòng; chọn trả sau thì còn phải thu. Cả hai chưa thành Đang ở cho đến khi nhận phòng.
- Khách walk-in → chọn được phòng sạch nhận ngay, kiểm tra thông tin và thanh toán, hoàn tất nhận phòng trong cùng luồng.
- Booking từ web/kiosk → xuất hiện trên Danh sách và Lịch, mở được cùng Chi tiết booking, không cần nhập lại.
- Khách đến sớm/muộn → nhìn thấy lịch hiệu lực và tác động tới giờ trả trước khi xác nhận.
- Gia hạn có lượt sau → biết mốc có thể gia hạn, số tiền tăng và lý do bị chặn.
- Khách chuyển phòng → giữ lịch sử phòng/chi phí, xử lý thẻ và đưa phòng cũ vào quy trình dọn phù hợp.
- Khách yêu cầu checkout từ tablet → xuất hiện cần xử lý; chỉ sau hoàn tất trả và dọn mới giao phòng cho khách tiếp.
- Hủy booking trả trước → giải phóng lịch nhưng vẫn thấy tiền đã thu và tiền cần hoàn; hoàn tiền được ghi nhận riêng.
- Hai nhân viên cùng chọn một phòng → người lưu sau thấy xung đột và giữ nguyên thông tin khách để chọn lại.
- Lượt theo giờ qua 00:00, lượt nhiều ngày, phòng cùng số ở hai chi nhánh → lịch và danh sách không gây nhầm.
- Tạo booking xong nhưng gửi xác nhận/thu tiền/cấp thẻ lỗi → thấy booking đã tồn tại và đúng bước cần xử lý tiếp.

## 15. Căn cứ khảo sát trong dự án

Các nguồn dưới đây để đối chiếu hiện trạng, không phải thiết kế code:

- [Bảng phòng hiện tại](../src/pages/rooms/Bookings.tsx), [lưới đặt phòng](../src/pages/rooms/RoomTimeline.tsx) và [Lịch phòng riêng](../src/pages/Calendar.tsx).
- [Tra cứu booking](../src/booking/BookingLookup.tsx), [Bảng phòng đang ở](../src/pages/workflow/RoomBoard.tsx) và [thu tiền hiện tại](../src/booking/payment.tsx).
- [Form tạo booking](../src/booking/BookingModal.tsx), [xem nhanh booking](../src/pages/rooms/BookingDetailModal.tsx) và [điều hướng](../src/nav.ts).
- [Booking backend](../../backend/src/modules/booking/booking.controller.ts), [thông tin booking](../../backend/src/modules/booking/entities/booking.entity.ts), [chi tiết phòng/dịch vụ](../../backend/src/modules/booking/entities/booking-order-detail.entity.ts) và [quy tắc nhận phòng](../../backend/src/modules/booking/domain/checkin-time-policy.service.ts).
- [Luồng booking dùng chung frontend](../../front-end-monorepo/packages/api/src/services/booking.ts) và [form đặt phòng web](../../front-end-monorepo/apps/web/src/components/booking-now/BookingNowForm.tsx).
