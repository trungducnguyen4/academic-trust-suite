"use client";

import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  FileClock,
  Fingerprint,
  GraduationCap,
  Laptop,
  ShieldCheck,
  Sparkles,
  WifiOff,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";

const capabilityGroups = [
  {
    icon: Fingerprint,
    title: "Đề riêng cho từng sinh viên",
    description:
      "Mỗi lượt thi có thứ tự câu hỏi và đáp án riêng, được lưu thành một phiên bản bất biến khi bắt đầu.",
    className: "md:col-span-7 md:row-span-2 bg-primary text-primary-foreground",
    iconClassName: "bg-primary-foreground/12 text-primary-foreground",
  },
  {
    icon: FileClock,
    title: "Lưu đúng lịch sử câu hỏi",
    description: "Bài thi cũ luôn tham chiếu đúng phiên bản câu hỏi đã sử dụng.",
    className: "md:col-span-5 bg-card",
  },
  {
    icon: ShieldCheck,
    title: "Tín hiệu để con người xem xét",
    description: "Hệ thống ghi nhận bất thường nhưng không tự kết luận gian lận.",
    className: "md:col-span-5 bg-accent/70",
  },
  {
    icon: Sparkles,
    title: "AI có giảng viên kiểm duyệt",
    description: "Câu hỏi do AI đề xuất phải được giảng viên xem và duyệt trước khi sử dụng.",
    className: "md:col-span-5 bg-card",
  },
  {
    icon: BarChart3,
    title: "Phân tích có thể giải thích",
    description: "Theo dõi độ khó, kết quả và chất lượng câu hỏi theo thời gian.",
    className: "md:col-span-7 bg-secondary/70",
  },
];

const operatingPrinciples = [
  {
    icon: BookOpenCheck,
    title: "Chuẩn bị",
    description: "Giảng viên xây đề từ ngân hàng câu hỏi có phiên bản và cấu hình quy tắc rõ ràng.",
  },
  {
    icon: Laptop,
    title: "Tổ chức thi",
    description: "Sinh viên làm bài trong giao diện tập trung, có autosave và hỗ trợ khôi phục kết nối.",
  },
  {
    icon: BarChart3,
    title: "Xem xét",
    description: "Kết quả, sự kiện và tín hiệu toàn vẹn được trình bày để giảng viên ra quyết định.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-[100dvh] bg-background">
      <Header />

      <main id="main-content">
        <section className="page-surface overflow-hidden pb-16 pt-10 sm:pt-14 lg:pb-24 lg:pt-16">
          <div className="container grid items-center gap-10 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:gap-14">
            <div className="relative z-10 max-w-2xl">
              <p className="mb-5 text-sm font-semibold text-primary">Đánh giá học thuật có thể kiểm chứng</p>
              <h1 className="max-w-[13ch] text-4xl font-semibold leading-[1.08] tracking-[-0.055em] sm:text-5xl lg:text-6xl">
                Mỗi bài thi rõ ràng từ lúc tạo đến khi chấm
              </h1>
              <p className="mt-6 max-w-[56ch] text-base leading-7 text-muted-foreground sm:text-lg">
                Đề thi riêng, lịch sử bất biến và tín hiệu toàn vẹn để giảng viên xem xét công bằng.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button asChild size="lg" className="group">
                  <Link href="/login">
                    Đăng nhập
                    <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="#nang-luc">Khám phá nền tảng</Link>
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-8 -z-10 rounded-[2rem] bg-primary/5 blur-3xl" aria-hidden="true" />
              <div className="overflow-hidden rounded-2xl border border-border/80 bg-card p-2 shadow-heavy">
                <Image
                  src="/examtrust-hero.png"
                  alt="Hồ sơ bài thi được lưu theo từng phiên bản để phục vụ kiểm tra và đối chiếu"
                  width={1456}
                  height={1118}
                  priority
                  className="aspect-[4/3] w-full rounded-xl object-cover"
                  sizes="(max-width: 1024px) 100vw, 56vw"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="nang-luc" className="py-20 sm:py-24">
          <div className="container">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Nền tảng cho một kỳ thi đáng tin cậy</h2>
              <p className="mt-4 max-w-[60ch] text-base leading-7 text-muted-foreground">
                Mỗi khả năng đều phục vụ một mục tiêu: bảo toàn bằng chứng, giảm thao tác thủ công và hỗ trợ quyết định có trách nhiệm.
              </p>
            </div>

            <div className="mt-12 grid auto-rows-fr gap-4 md:grid-cols-12">
              {capabilityGroups.map((capability) => (
                <article
                  key={capability.title}
                  className={`flex min-h-52 flex-col justify-between rounded-2xl border border-border/70 p-6 shadow-soft sm:p-7 ${capability.className}`}
                >
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground ${capability.iconClassName ?? ""}`}>
                    <capability.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="mt-10 max-w-lg">
                    <h3 className="text-xl font-semibold tracking-[-0.025em]">{capability.title}</h3>
                    <p className={`mt-3 text-sm leading-6 ${capability.className.includes("bg-primary") ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {capability.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-border/70 bg-card py-20 sm:py-24">
          <div className="container grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-muted shadow-medium">
              <Image
                src="/examtrust-exam-experience.png"
                alt="Sinh viên tập trung làm bài thi trên máy tính trong thư viện"
                width={1536}
                height={1024}
                className="aspect-[3/2] w-full object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <div className="max-w-xl">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Tập trung vào bài làm, không bị công cụ làm phiền</h2>
              <p className="mt-5 text-base leading-7 text-muted-foreground">
                Giao diện thi ưu tiên câu hỏi, thời gian còn lại, trạng thái lưu bài và hướng dẫn khôi phục khi kết nối gián đoạn.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-secondary/70 p-5">
                  <WifiOff className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h3 className="mt-4 text-base font-semibold">Sẵn sàng khi mạng chập chờn</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Câu trả lời được lưu và đồng bộ lại theo cơ chế hiện có của hệ thống.</p>
                </div>
                <div className="rounded-xl bg-accent/70 p-5">
                  <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h3 className="mt-4 text-base font-semibold">Giám sát có giới hạn</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Sự kiện được ghi nhận minh bạch để giảng viên xem xét trong ngữ cảnh.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-24">
          <div className="container">
            <h2 className="max-w-xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Một quy trình xuyên suốt cho ba vai trò</h2>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {operatingPrinciples.map((principle, index) => (
                <article key={principle.title} className="border-t border-primary/40 pt-6">
                  <div className="flex items-center gap-3">
                    <span className="data-number text-sm font-semibold text-primary">0{index + 1}</span>
                    <principle.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold">{principle.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{principle.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-20 sm:pb-24">
          <div className="container">
            <div className="grid items-center gap-8 rounded-2xl bg-primary px-6 py-10 text-primary-foreground sm:px-10 lg:grid-cols-[1fr_auto] lg:px-14 lg:py-12">
              <div>
                <h2 className="text-3xl font-semibold text-primary-foreground tracking-[-0.04em]">Bắt đầu từ vai trò của bạn</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-primary-foreground/78 sm:text-base">
                  Truy cập dữ liệu demo hiện có để trải nghiệm luồng sinh viên, giảng viên hoặc quản trị viên.
                </p>
              </div>
              <Button asChild size="lg" variant="secondary" className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 lg:w-auto">
                <Link href="/login">Mở trang đăng nhập</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/80 py-8">
        <div className="container flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
            </span>
            ExamTrust
          </Link>
          <nav aria-label="Liên kết cuối trang" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <Link href="#nang-luc" className="hover:text-foreground">Năng lực</Link>
            <Link href="/privacy" className="hover:text-foreground">Quyền riêng tư</Link>
            <Link href="/login" className="hover:text-foreground">Đăng nhập</Link>
          </nav>
          <p className="text-sm text-muted-foreground">© 2026 ExamTrust</p>
        </div>
      </footer>
    </div>
  );
}
