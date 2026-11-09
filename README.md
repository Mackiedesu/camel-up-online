# 🐪 Camel Up Online (2nd Edition)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Mackiedesu/camel-up-online)

Bản clone online của boardgame **Camel Up (2nd Edition)**, hỗ trợ **2–8 người chơi** realtime.

## Tính năng
- **Đầy đủ luật 2nd Edition**:
  - 5 lạc đà đua (Đỏ, Vàng, Xanh dương, Xanh lá, Tím) chạy xuôi chiều kim đồng hồ.
  - 2 lạc đà điên (Đen, Trắng) chạy ngược chiều kèm quy tắc ưu tiên khi cõng lạc đà đua hoặc chồng lên nhau.
  - Kim tự tháp xúc xắc (5 viên màu + 1 viên xám, mỗi chặng lăn 5/6 viên).
  - 4 hành động mỗi lượt: Cược chặng (5/3/2/2), Đặt thẻ khán giả (Ốc đảo +1 / Ảo ảnh −1), Lắc kim tự tháp (+1 💰), Cược chung cuộc (Về nhất / Về bét).
- **Phòng chơi realtime**: Tạo phòng bằng mã 5 ký tự, copy link mời bạn bè, tự động kết nối lại khi tải lại trang.
- **Bảo mật thông tin ẩn**: Server tự động ẩn màu thẻ cược chung cuộc của người chơi khác cho đến khi kết thúc ván.
- **Giao diện 2D Responsive**: Chơi tốt trên cả máy tính và điện thoại, kèm hiệu ứng animation bằng Framer Motion.

## Cấu trúc thư mục
- `packages/shared`: Types, hằng số cấu hình luật (`RULES`), và pure game engine kèm unit test (Vitest).
- `apps/server`: Node.js + Socket.IO server, quản lý phòng (`RoomManager`) và phân phối state.
- `apps/client`: React + Vite + TypeScript + Framer Motion UI.
- `scripts/e2e-bots.mjs`: Script giả lập 8 bot tự tạo phòng và chơi hết ván để kiểm thử tự động.

## Cách chạy

### 1. Chế độ phát triển (Development)
```bash
npm install
npm run dev
```
- Client: `http://localhost:5173` (có thể mở trên điện thoại cùng mạng Wi-Fi qua địa chỉ IP LAN).
- Server: `http://localhost:3001`

### 2. Chạy kiểm thử (Tests & E2E)
```bash
# Chạy unit test cho game engine
npm test

# Kiểm tra kiểu TypeScript
npm run typecheck

# Chạy 8 bot đấu thử 1 ván hoàn chỉnh (khi server đang chạy)
node scripts/e2e-bots.mjs
```

### 3. Build & chạy bản Production
```bash
npm run build
npm start
```
Server tại `http://localhost:3001` sẽ phục vụ luôn cả giao diện đã build.
