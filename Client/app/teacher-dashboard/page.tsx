import { TeacherDashboard } from "@/components/teacher-dashboard";
import { ProtectedRoute } from "@/components/protected-routes";
export default function TeacherDashboardPage() {
    return (
        <ProtectedRoute allowedRoles={["teacher"]}>
            <TeacherDashboard />
        </ProtectedRoute>
    );
}