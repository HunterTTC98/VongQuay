# Kế Hoạch Nâng Cấp Bách Khoa Events: Vòng Quay 3D & Trải Nghiệm Tương Tác Không Gian

Kế hoạch này vạch ra kiến trúc và lộ trình nâng cấp website Bách Khoa Events lên tầm cao mới với công nghệ đồ họa không gian 3D (Three.js), mang lại cảm giác hồi hộp chân thực khi quay thưởng, kết hợp hiệu ứng tương tác 3D sinh động cho Trạm Confession và bảo đảm tốc độ mượt mà trên mọi dòng điện thoại học sinh.

## User Review & Critical Decisions

> [!IMPORTANT]
> Dựa trên các phản hồi lựa chọn của bạn ở Bước 1, kế hoạch này đã chốt 3 quyết định chiến lược:

- **Vòng quay may mắn 3D chân thực**: Xây dựng mô hình bánh xe 3D đa chi tiết với vật liệu phản chiếu kim loại vàng (PBR Brushed Gold/Chrome), trục cơ khí nổi khối, kim chỉ hướng vật lý và hiệu ứng đổ bóng chuẩn studio.
- **Tối ưu hóa đa tầng theo thiết bị**: Tự động phát hiện GPU/phần cứng thiết bị của học sinh. Nếu phát hiện máy yếu (hoặc người dùng bật chế độ tiết kiệm pin), hệ thống tự động hạ độ phân giải pixel, tắt đổ bóng nặng và duy trì tùy chọn chuyển đổi tức thì sang chế độ 2D mượt mà 60 FPS.
- **Tương tác mừng thưởng & Confession 3D**: Bổ sung hiệu ứng thả tim bay 3D đa hướng khi tương tác trên bảng tin Confession và chùm pháo hoa chúc mừng giải thưởng rực rỡ.

---

## 1. Overview & Core Concept

- **Mục tiêu chính**: Biến trang quay thưởng 20/10 & 20/11 của Trường Trung cấp Công nghiệp Bách Khoa Sầm Sơn thành một không gian lễ hội số đẳng cấp, sống động, tạo cảm giác gay cấn tột đỉnh ở từng góc quay.
- **Đối tượng sử dụng**: Học sinh, sinh viên, giáo viên sử dụng đa dạng các thiết bị từ iPhone, Android tầm trung đến laptop/máy tính để bàn.
- **Giá trị cốt lõi**:
  - Tăng tỷ lệ tham gia và mức độ hào hứng của học sinh.
  - Trực quan hóa 8 ô giải thưởng dưới góc nhìn 3D sang trọng, rõ nét.
  - Vẫn giữ nguyên 100% tính toàn vẹn và an toàn của hệ thống backend: Mọi kết quả quay thưởng vẫn được định đoạt bởi Firestore ACID Transaction ở phía máy chủ, ngăn chặn tuyệt đối gian lận client-side.

---

## 2. User Experience & Visual Design

### 2.1. Hành Trình Người Dùng (Key User Flows)

1. **Khám phá sảnh lễ hội**:
   - Khi vào trang chủ, vòng quay 3D nổi bật ở vị trí trung tâm với góc nghiêng phối cảnh 15 độ, ánh kim loại lấp lánh phản chiếu ánh sáng môi trường phòng thu (Studio Environment Map).
   - Nút gạt chuyển đổi nhanh `[3D / 2D]` cho phép người dùng chủ động lựa chọn chế độ hiển thị ưa thích.
2. **Kích hoạt lượt quay (Interactive Spin Sequence)**:
   - Khi bấm **"Quay Thưởng"**, cần gạt hoặc nút bấm kích hoạt phản hồi âm thanh cơ học.
   - Vòng quay 3D tăng tốc mạnh mẽ với quán tính vật lý (Angular Momentum & Damping), tạo cảm giác kim cọ xát vào từng chốt định vị.
   - Khi bánh xe giảm tốc về đúng ô kết quả do máy chủ trả về, góc camera phóng nhẹ vào ô trúng thưởng (Dynamic FOV Zoom), tạo khoảnh khắc thót tim trước khi bùng nổ hiệu ứng chúc mừng.
3. **Hiệu ứng chúc mừng & Thả tim Confession 3D**:
   - Khi trúng lì xì MoMo: Xuất hiện hộp quà 3D bung mở cùng pháo hoa hạt lấp lánh.
   - Khi thả tim lời chúc tri ân tại **Trạm Confession**: Tim 3D phát sáng bay bổng theo quỹ đạo cong ngẫu nhiên và tan biến nhẹ nhàng.

### 2.2. Nhận Diện Thị Giác & Bố Cục (Visual Identity & Theme)

- **Bảng màu chủ đạo**: Đỏ nhung hoàng gia kết hợp vàng kim quý phái (`#E11D48`, `#FB7185`, `#F59E0B`, `#FDE047`) trên nền đêm lễ hội Bách Khoa (`#180518` / `#240822`).
- **Chất liệu 3D (PBR Physical Materials)**:
  - *Mặt đĩa xoay*: Sơn bóng cao cấp (`roughness: 0.2`, `metalness: 0.15`).
  - *Viền chốt & Trục xoay*: Kim loại đồng thau và mạ vàng sáng bóng (`roughness: 0.12`, `metalness: 0.9`).
  - *Mũi tên chỉ ô*: Nhựa đúc đỏ ruby viền ánh kim với phản quang bề mặt.
- **Bố cục giao diện (Zero Occlusion Dock)**: Toàn bộ nút điều khiển góc nhìn và âm thanh được neo gọn gàng dưới chân khung 3D, không che khuất mặt đĩa quay.

---

## 3. Key Product Decisions & Trade-Offs

| Vấn đề cân nhắc | Giải pháp được chọn | Lý do & Ưu điểm | Giải pháp thay thế (Đã bác bỏ) |
| :--- | :--- | :--- | :--- |
| **Công nghệ 3D** | **Three.js Core (r160+)** độc lập bọc trong React `useRef` | Nhẹ, tải nhanh, không phụ thuộc thư viện nặng, tương thích tốt với React 19 | Dùng React Three Fiber (R3F) do xung đột phiên bản React 19 và kích thước bundle lớn |
| **Tối ưu máy yếu** | **Adaptive Device Tiering & Fallback** | Tự động đo thời gian render frame đầu tiên; nếu FPS < 30 hoặc phát hiện GPU phần mềm, tự động hạ pixelRatio và tắt shadow; có nút chuyển về 2D tức thì | Ép buộc 3D chất lượng cao (gây nóng máy và giật lag trên máy học sinh) |
| **Tạo hình 3D** | **Procedural Parametric Geometry** (Vẽ đĩa, nan hoa, chốt số bằng code toán học) | **0KB file tải ngoài**, không sợ lỗi 404 hình ảnh/model 3D, tải trang ngay lập tức | Tải file `.glb` hoặc `.gltf` 3D (dễ lỗi mạng, dung lượng file từ 5MB - 15MB) |
| **Độ chân thực ánh sáng** | **PMREMGenerator + RoomEnvironment** kết hợp 3-point Studio Light | Bề mặt kim loại phản chiếu ánh sáng tự nhiên rực rỡ mà không cần ảnh panorama HDR ngoài | Ánh sáng Ambient đơn sắc (khiến 3D bị bẹt và xỉn màu) |

---

## 4. Technical Architecture & Data Strategy

### 4.1. Sơ Đồ Kiến Trúc Hệ Thống

```
┌────────────────────────────────────────────────────────────────────────┐
│                          BÁCH KHOA EVENTS APP                          │
├──────────────────────────────────┬─────────────────────────────────────┤
│     CLIENT UI & 3D VIEWPORT      │          BACKEND & PERSISTENCE      │
│                                  │                                     │
│  ┌────────────────────────────┐  │  ┌───────────────────────────────┐  │
│  │     LuckyWheel3D.tsx       │  │  │         Express Server        │  │
│  │ ┌────────────────────────┐ │  │  │  POST /api/spin               │  │
│  │ │ Scene, Camera, Light   │ │  │  │  - Xác thực sinh viên         │  │
│  │ │ Procedural Wheel Mesh  │ │  │  │  - Trừ lượt quay / mã vé      │  │
│  │ │ Spring-Damped Physics  │ │  │  │  - Quyết định ô trúng thưởng  │  │
│  │ └────────────────────────┘ │  │  └──────────────┬────────────────┘  │
│  │ Controls Dock: [3D/2D, Sound]│                  │                   │
│  └─────────────┬──────────────┘  │                 ▼                   │
│                │                 │  ┌───────────────────────────────┐  │
│                ▼                 │  │       Firebase Firestore      │  │
│  ┌────────────────────────────┐  │  │  - event_config (ngân sách)   │  │
│  │   Confession3DReactions    │  │  │  - prize_tiers (8 ô quà)      │  │
│  │   Particle Floating Hearts │  │  │  - claims & users              │  │
│  └────────────────────────────┘  │  └───────────────────────────────┘  │
└──────────────────────────────────┴─────────────────────────────────────┘
```

### 4.2. Danh Sách Các Module Cần Xây Dựng

1. **`src/components/3d/LuckyWheel3D.tsx`**:
   - Khởi tạo Canvas Three.js độc lập, quản lý vòng đời bộ nhớ (`dispose`).
   - Lắp ráp đĩa quay 3D từ 8 khối hình học hình quạt (`CylinderGeometry` / `ShapeGeometry`), viền vành đai và các đinh tán kim loại.
   - Cơ chế xoay vật lý với gia tốc, hãm phanh mượt mà bằng `MathUtils.damp`.
   - Cơ chế fallback 2D nguyên bản khi người dùng chuyển chế độ.
2. **`src/components/3d/deviceTier.ts`**:
   - Nhận diện phần cứng (số lõi CPU, bộ nhớ, GPU String) để tự động chọn cấu hình đồ họa (Cao / Vừa / Tiết kiệm).
3. **`src/components/3d/Confession3DHearts.tsx`**:
   - Hệ thống hạt trái tim 3D phản hồi khi bấm nút thả tim trên tường Confession.
4. **Tích hợp giao diện**:
   - Gắn component 3D vào sảnh chính `App.tsx` thay thế mượt mà cho vòng quay 2D hiện tại, đồng thời bổ sung nút gạt linh hoạt để học sinh tùy chọn.

---

## 5. Verification & Acceptance Criteria

- [x] **Hiệu năng**: Đạt 60 FPS ổn định trên thiết bị tiêu chuẩn; thời gian tải trang không tăng quá 1.5 giây.
- [x] **Độ mượt mà**: Chuyển đổi qua lại giữa chế độ 3D và 2D tức thời với ResizeObserver và clean container replacement, không còn hiện tượng đen màn hình.
- [x] **Độ chính xác kết quả**: Kim chỉ ô 3D và toàn bộ vành ngoài hiển thị trọn vẹn 100% trong khung nhìn, không bị cắt viền trên mobile nhờ tính toán camera z động (camera.position.z >= 5.2 - 5.4, y = 0.05).
- [x] **An toàn bộ nhớ**: Khi chuyển trang hoặc đóng tab, WebGL context, geometry và texture giải phóng sạch sẽ không rò rỉ RAM.
- [x] **Trải nghiệm di động (Mobile-first Responsive)**:
  - Thanh Navbar co giãn gọn gàng, ẩn các nút phụ trên màn hình nhỏ và tích hợp vào Dropdown menu "Khám Phá" (chống tràn ngang).
  - Modal Hồ sơ cá nhân (Profile) thu gọn header, chia 3 thẻ thống kê thành grid 3 cột tiết kiệm 60% chiều dọc, dùng `max-h-[90dvh]` với touch scrolling.
  - Vòng quay 3D responsive toàn diện trên mọi kích thước màn hình từ 320px trở lên.
