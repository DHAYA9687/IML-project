import { StudentDashboard } from "@/components/student-dashboard"
import { ProtectedRoute } from "@/components/protected-routes";
export default function StudentDashboardPage() {
    return (
        <ProtectedRoute allowedRoles={["student"]}>
            <StudentDashboard />
        </ProtectedRoute>
    );
}