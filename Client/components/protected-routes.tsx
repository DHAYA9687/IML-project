"use client"

import type React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./auth-provider"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, LogIn } from "lucide-react"

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading, logout } = useAuth()
  const router = useRouter()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">Verifying access...</span>
        </div>
      </div>
    )
  }

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/")
    }
  }, [user, loading, router])

  if (!user) {
    return null
  }

  // Check role permissions if allowedRoles is specified
  if (allowedRoles && allowedRoles.length > 0) {
    const rolesArray = Array.isArray(user.role) ? user.role : [user.role];
    const hasPermission = rolesArray.some((role) => allowedRoles.includes(role));

    if (!hasPermission) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-yellow-600" />
              </div>
              <h2 className="text-xl font-semibold">Access Denied</h2>
              <p className="text-gray-600">You don't have permission to access this page.</p>
              <p className="text-sm text-gray-500 font-bold">Contact Administration</p>
              {/* <p className="text-sm text-gray-500">
                Your roles: {Array.isArray(user.roles) ? user.roles.join(", ") : String(user.roles || "No roles")}
              </p> */}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.history.back()}>
                  Go Back
                </Button>
                <Button onClick={logout}>Logout</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }
  }

  return <>{children}</>
}
