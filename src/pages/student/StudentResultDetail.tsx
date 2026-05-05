import { Navigate, useParams } from "react-router-dom";

export default function StudentResultDetail() {
  const { examId } = useParams();

  if (!examId) {
    return <Navigate to="/student/results" replace />;
  }

  return <Navigate to={`/student/grading?examId=${encodeURIComponent(examId)}`} replace />;
}
