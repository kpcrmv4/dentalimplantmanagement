# DentalStock Management System

ระบบจัดการสต็อกวัสดุและรากเทียมสำหรับคลินิกทันตกรรม พัฒนาด้วย Next.js, Tailwind CSS และ Supabase

## คุณสมบัติหลัก

### 📊 Dashboard
- ภาพรวมการผ่าตัดและสต็อก
- ปฏิทินเคสผ่าตัด
- แจ้งเตือนสต็อกต่ำและสินค้าใกล้หมดอายุ
- สรุปเคสที่วัสดุยังไม่พร้อม

### 📋 จัดการเคสผ่าตัดรากเทียม
- สร้างและติดตามเคสผ่าตัด
- ระบบสถานะ 3 สี (เทา/เหลือง/เขียว)
- เลือกตำแหน่งฟัน
- บันทึก Pre-op และ Post-op notes

### 👥 จัดการคนไข้
- บันทึกข้อมูลคนไข้
- ประวัติการรักษา
- ประวัติแพ้ยา

### 📦 จัดการสต็อก
- ติดตามสต็อกวัสดุและรากเทียม
- แจ้งเตือนสต็อกต่ำ
- ติดตามวันหมดอายุ
- จัดการ Lot Number

### 🛒 ระบบจองวัสดุสำหรับเคส
- จองวัสดุล่วงหน้า
- ติดตามสถานะการเตรียมของ
- บันทึกการใช้งานจริง

### 📝 ใบสั่งซื้อ
- สร้างใบสั่งซื้อ
- ติดตามสถานะการสั่งซื้อ
- รับของเข้าสต็อก

### 🔄 ยืม-คืน/แลกเปลี่ยน
- บันทึกการยืมจากบริษัท
- บันทึกการให้บริษัทยืม
- แลกเปลี่ยนวัสดุ

### 📈 รายงาน
- รายงานเคส
- รายงานสต็อก
- รายงานการสั่งซื้อ
- รายงานการใช้วัสดุ

### ⚙️ ตั้งค่าระบบ
- ข้อมูลคลินิก
- จัดการซัพพลายเออร์
- จัดการหมวดหมู่สินค้า
- จัดการผู้ใช้งาน
- ตั้งค่าการแจ้งเตือน

## เทคโนโลยีที่ใช้

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **State Management**: Zustand
- **Data Fetching**: SWR
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## การติดตั้ง

### 1. Clone Repository

```bash
git clone https://github.com/kpcrmv4/dentalimplantmanagement.git
cd dentalimplantmanagement
```

### 2. ติดตั้ง Dependencies

```bash
npm install
```

### 3. ตั้งค่า Supabase

1. สร้างโปรเจกต์ใหม่ที่ [Supabase](https://supabase.com)
2. ไปที่ SQL Editor และรันไฟล์ `supabase/schema.sql`
3. (Optional) รันไฟล์ `supabase/seed.sql` เพื่อเพิ่มข้อมูลตัวอย่าง

### 4. ตั้งค่า Environment Variables

คัดลอกไฟล์ `.env.example` เป็น `.env.local`:

```bash
cp .env.example .env.local
```

แก้ไขค่าใน `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 5. รันโปรเจกต์

```bash
npm run dev
```

เปิดเบราว์เซอร์ที่ [http://localhost:3000](http://localhost:3000)

## โครงสร้างโปรเจกต์

```
dentalimplantmanagement/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/        # Dashboard routes
│   │   │   ├── dashboard/      # หน้า Dashboard
│   │   │   ├── cases/          # จัดการเคส
│   │   │   ├── patients/       # จัดการคนไข้
│   │   │   ├── inventory/      # จัดการสต็อก
│   │   │   ├── reservations/   # จองวัสดุ
│   │   │   ├── orders/         # ใบสั่งซื้อ
│   │   │   ├── exchanges/      # ยืม-คืน
│   │   │   ├── reports/        # รายงาน
│   │   │   └── settings/       # ตั้งค่า
│   │   ├── layout.tsx          # Root Layout
│   │   └── page.tsx            # Home (redirect)
│   ├── components/
│   │   ├── ui/                 # UI Components
│   │   ├── layout/             # Layout Components
│   │   ├── dashboard/          # Dashboard Components
│   │   └── calendar/           # Calendar Components
│   ├── hooks/                  # Custom Hooks
│   ├── lib/                    # Utilities
│   ├── stores/                 # Zustand Stores
│   └── types/                  # TypeScript Types
├── supabase/
│   ├── schema.sql              # Database Schema
│   └── seed.sql                # Sample Data
├── public/                     # Static Files
└── ...
```

## Database Schema

ดูรายละเอียดเต็มได้ที่ `supabase/schema.sql`

### ตารางหลัก

| ตาราง | คำอธิบาย |
|-------|----------|
| `users` | ผู้ใช้งานระบบ (ทันตแพทย์, ผู้ช่วย, พนักงาน) |
| `patients` | ข้อมูลคนไข้ |
| `cases` | เคสผ่าตัดรากเทียม |
| `categories` | หมวดหมู่สินค้า |
| `products` | สินค้า (รากเทียม, วัสดุ) |
| `suppliers` | ซัพพลายเออร์ |
| `inventory` | สต็อกสินค้า |
| `case_reservations` | การจองวัสดุสำหรับเคส |
| `purchase_orders` | ใบสั่งซื้อ |
| `purchase_order_items` | รายการในใบสั่งซื้อ |
| `exchanges` | การยืม-คืน/แลกเปลี่ยน |

## การ Deploy

### Vercel (แนะนำ)

1. Push โค้ดขึ้น GitHub
2. เชื่อมต่อ Repository กับ [Vercel](https://vercel.com)
3. ตั้งค่า Environment Variables ใน Vercel Dashboard
4. Deploy

### Docker

```bash
docker build -t dentalstock .
docker run -p 3000:3000 dentalstock
```

## การพัฒนาเพิ่มเติม

### เพิ่ม Component ใหม่

```bash
# สร้างไฟล์ใน src/components/
touch src/components/ui/NewComponent.tsx
```

### เพิ่ม API Route

```bash
# สร้างไฟล์ใน src/app/api/
mkdir -p src/app/api/new-endpoint
touch src/app/api/new-endpoint/route.ts
```

## License

MIT License - ดูรายละเอียดที่ [LICENSE](LICENSE)

## ผู้พัฒนา

พัฒนาโดย KPCRMV4

---

หากพบปัญหาหรือมีข้อเสนอแนะ กรุณาสร้าง [Issue](https://github.com/kpcrmv4/dentalimplantmanagement/issues) ใหม่
