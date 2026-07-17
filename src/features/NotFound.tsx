"use client";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Không tìm thấy trang bạn cần</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Quay lại trang chủ
        </a>
      </div>
    </div>
  );
};

export default NotFound;

