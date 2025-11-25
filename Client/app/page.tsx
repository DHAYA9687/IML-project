"use client"
import { useAuth } from "@/components/auth-provider"
import LoginPage from "@/components/loginPage"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      console.log("User authenticated with roles:", user.role)
      // Navigate based on user roles 
      if (user.role.includes("teacher")) {
        console.log("Redirecting to teacher dashboard")
        router.push("/teacher-dashboard")
      } else {
        console.log("Redirecting to student dashboard")
        router.push("/student-dashboard")
      }
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage/>
  }

  // This will briefly show while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-600">Redirecting...</span>
      </div>
    </div>
  )
}
