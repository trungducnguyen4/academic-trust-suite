"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function StudentResultDetail() {
  const { examId: routeExamId } = useParams();
  const examId = Array.isArray(routeExamId) ? routeExamId[0] : routeExamId;
  const router = useRouter();

  useEffect(() => {
    if (!examId) {
      router.replace("/student/results");
      return;
    }
    router.replace(`/student/grading?examId=${encodeURIComponent(examId)}`);
  }, [examId, router]);

  return null;
}

