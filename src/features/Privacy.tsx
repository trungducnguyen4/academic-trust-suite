"use client";

import Link from "next/link";

import { Header } from "@/components/layout/Header";

export default function Privacy() {
  return (
    <div className="min-h-[100dvh] bg-background">
      <Header />
      <main id="main-content" className="container py-14 sm:py-20">
        <article className="mx-auto max-w-3xl rounded-2xl border border-border/80 bg-card p-6 shadow-soft sm:p-10">
          <h1 className="text-3xl font-semibold tracking-[-0.04em]">Quyền riêng tư và thời hạn lưu dữ liệu</h1>
          <p className="mt-5 leading-7 text-muted-foreground">
            ExamTrust chỉ ghi nhận dữ liệu giám sát cần thiết để hỗ trợ toàn vẹn kỳ thi và audit. Dữ liệu được lưu có thời hạn, sau đó được ẩn danh hoặc xóa theo chính sách của đơn vị.
          </p>

          <div className="mt-9 space-y-8">
            <section>
              <h2 className="text-xl font-semibold">Dữ liệu được ghi nhận</h2>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>Địa chỉ IP và metadata vị trí suy ra để audit hoặc kiểm tra whitelist.</li>
                <li>Thông tin trình duyệt và thiết bị.</li>
                <li>Sự kiện chuyển tab, tiêu điểm và các tín hiệu toàn vẹn trong phiên thi.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold">Thời hạn lưu</h2>
              <p className="mt-3 text-muted-foreground">Mặc định lưu trong 90 ngày. Sau thời hạn này, địa chỉ IP được ẩn danh hoặc xóa.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">Quyền của bạn</h2>
              <p className="mt-3 text-muted-foreground">Sinh viên có thể yêu cầu xóa dữ liệu hoặc gửi thắc mắc qua privacy@example.com.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">Thông tin vận hành</h2>
              <p className="mt-3 text-muted-foreground">
                Quản trị viên có thể xem chi tiết trong bảng điều khiển. Nhân sự vận hành xem{" "}
                <Link href="/admin/system-policy" className="font-medium text-primary hover:underline">chính sách hệ thống</Link>
                {" "}và tài liệu lưu trữ nội bộ của dự án.
              </p>
            </section>
          </div>

          <div className="mt-10 border-t border-border pt-6">
            <Link href="/" className="font-medium text-primary hover:underline">Quay lại trang chủ</Link>
          </div>
        </article>
      </main>
    </div>
  );
}
