"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Toaster } from "react-hot-toast"
import { Label } from "@/components/ui/label"
import { useAuth } from "./auth-provider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Brain, GraduationCap, Users, TrendingUp, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  // const [currentUser, setCurrentUser] = useState<any>(null)
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const { user, login, logout, showErrorToast, showSuccessToast, showWarningToast } = useAuth()
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({
    name: "",
    email: "",
    password: "",
    department: "",
    age: "",
    rollNo: "",
  })
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    rollNo: "",
    department: "",
    age: "",
  })

  const backendURL = `${process.env.NEXT_PUBLIC_API_URL}/auth` // Replace with your backend URL

  const validateField = (name: string, value: string) => {
    let error = ""

    switch (name) {
      case "email":
        if (!value.trim()) {
          error = "Email is required"
        } else {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(value)) {
            error = "Please enter a valid email address"
          }
        }
        break
      case "password":
        if (!value) {
          error = "Password is required"
        } else if (value.length < 6) {
          error = "Password must be at least 6 characters long"
        }
        break
      case "department":
        if (!value) {
          error = "Please select a department"
        }
        break
      case "name":
        if (!isLogin) {
          if (!value.trim()) {
            error = "Name is required"
          } else if (value.trim().length < 2) {
            error = "Name must be at least 2 characters long"
          }
        }
        break
      case "age":
        if (value) {
          const age = parseInt(value)
          if (isNaN(age) || age < 10 || age > 100) {
            error = "Age must be between 10 and 100"
          }
        }
        break
      case "rollNo":
        if (value && value.trim().length < 3) {
          error = "Roll number must be at least 3 characters long"
        }
        break
    }

    setValidationErrors(prev => ({ ...prev, [name]: error }))
    return error === ""
  }

  const handleInputChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value })
    validateField(name, value)
  }

  const validateForm = () => {
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      showErrorToast("Please enter a valid email address")
      return false
    }

    // Password validation
    if (formData.password.length < 6) {
      showErrorToast("Password must be at least 6 characters long")
      return false
    }

    // Department validation
    if (!formData.department) {
      showErrorToast("Please select a department")
      return false
    }

    // Signup-specific validations
    if (!isLogin) {
      // Name validation
      if (!formData.name.trim()) {
        showErrorToast("Please enter your full name")
        return false
      }
      if (formData.name.trim().length < 2) {
        showErrorToast("Name must be at least 2 characters long")
        return false
      }

      // Age validation (if provided)
      if (formData.age) {
        const age = parseInt(formData.age)
        if (isNaN(age) || age < 10 || age > 100) {
          showErrorToast("Please enter a valid age between 10 and 100")
          return false
        }
      }

      // Roll number validation (if provided)
      if (formData.rollNo && formData.rollNo.trim().length < 3) {
        showErrorToast("Roll number must be at least 3 characters long")
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form before submission
    if (!validateForm()) {
      return
    }

    setIsLoading(true);

    try {
      const endpoint = isLogin ? "/login" : "/signup"
      const payload: any = {
        email: formData.email,
        password: formData.password
      }

      if (formData.department) payload.department = formData.department

      if (!isLogin) {
        payload.name = formData.name
        if (formData.rollNo) payload.rollNo = formData.rollNo
        if (formData.age) payload.age = parseInt(formData.age)
      }

      const res = await fetch(`${backendURL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json()
        showErrorToast(errorData.detail || "Something went wrong")
        // alert(errorData.detail || "Something went wrong")
        return
      }

      const data = await res.json()

      // localStorage.setItem("auth_token", data.access_token);
      showSuccessToast(isLogin ? "Login successful !!!" : "Signup successful !!! Please log in.");
      if (isLogin) {
        await login(data.access_token)
        setFormData({
          name: "",
          email: "",
          password: "",
          rollNo: "",
          department: "",
          age: "",
        })
        return;
      } else {
        setIsLogin(true);
        setFormData({
          name: "",
          email: "",
          password: "",
          rollNo: "",
          department: "",
          age: "",
        })
      }
      // setCurrentUser(data.user);
    } catch (err) {
      showErrorToast("Network error, please try again")
      console.error(err)
    }
    finally {
      setIsLoading(false)
    }
  }


  const handleLogout = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      rollNo: "",
      department: "",
      age: "",
    })
  }

  // if (currentUser) {
  //   return currentUser.role === "student" ? (
  //     <StudentDashboard user={currentUser} onLogout={handleLogout} />
  //   ) : (
  //     <TeacherDashboard user={currentUser} onLogout={handleLogout} />
  //   )
  // }

  return (
    <div className="max-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container mx-auto px-4 py-8">
        <div className={`grid lg:grid-cols-2 gap-8 items-center ${isLogin ? 'min-h-[calc(100vh-4rem)]' : 'max-h-[calc(100vh-4rem)]'}`}>
          {/* Left Side - Content */}
          <div className="space-y-8 pl-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Brain className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold text-balance">Interpretable ML for Special Education</h1>
              </div>
              <p className="text-xl text-muted-foreground max-w-lg">
                AI-driven insights that explain learning outcomes and suggest personalized improvements.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-card rounded-lg border">
                <GraduationCap className="h-6 w-6 text-primary" />
                <div>
                  <h3 className="font-semibold">Student Insights</h3>
                  <p className="text-sm text-muted-foreground">Personalized learning analytics</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-card rounded-lg border">
                <Users className="h-6 w-6 text-accent" />
                <div>
                  <h3 className="font-semibold">Teacher Tools</h3>
                  <p className="text-sm text-muted-foreground">Comprehensive class management</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-card rounded-lg border">
                <TrendingUp className="h-6 w-6 text-primary" />
                <div>
                  <h3 className="font-semibold">Progress Tracking</h3>
                  <p className="text-sm text-muted-foreground">Visual performance metrics</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-card rounded-lg border">
                <Brain className="h-6 w-6 text-accent" />
                <div>
                  <h3 className="font-semibold">AI Explanations</h3>
                  <p className="text-sm text-muted-foreground">Transparent recommendations</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="flex justify-center">
            <Card className="w-full max-w-md shadow-xl">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{isLogin ? "Welcome Back" : "Join the Platform"}</CardTitle>
                <CardDescription>
                  {isLogin ? "Sign in to access your dashboard" : "Empowering teachers & students with transparent, human-centered AI"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        onBlur={(e) => validateField("name", e.target.value)}
                        required
                      />
                      {validationErrors.name && <p className="text-xs text-red-500">{validationErrors.name}</p>}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">College Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      onBlur={(e) => validateField("email", e.target.value)}
                      required
                    />
                    {validationErrors.email && <p className="text-xs text-red-500">{validationErrors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Select value={formData.department} onValueChange={(value) => handleInputChange("department", value)}>
                      <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CSE">Computer Science</SelectItem>
                        <SelectItem value="ECE">Electronics & Communication</SelectItem>
                        <SelectItem value="EEE">Electrical & Electronics</SelectItem>
                        <SelectItem value="MECH">Mechanical</SelectItem>
                        <SelectItem value="CIVIL">Civil</SelectItem>
                        <SelectItem value="IT">Information Technology</SelectItem>
                      </SelectContent>
                    </Select>
                    {validationErrors.department && <p className="text-xs text-red-500">{validationErrors.department}</p>}
                  </div>

                  {!isLogin && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="age">Age</Label>
                        <Input id="age" type="number" value={formData.age} onChange={(e) => handleInputChange("age", e.target.value)} />
                        {validationErrors.age && <p className="text-xs text-red-500">{validationErrors.age}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="rollNo">Roll Number</Label>
                        <Input id="rollNo" value={formData.rollNo} onChange={(e) => handleInputChange("rollNo", e.target.value)} />
                        {validationErrors.rollNo && <p className="text-xs text-red-500">{validationErrors.rollNo}</p>}
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        onBlur={(e) => validateField("password", e.target.value)}
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {validationErrors.password && <p className="text-xs text-red-500">{validationErrors.password}</p>}
                  </div>

                  {isLogin ?
                    <Button type="submit" className="w-full">{!isLoading ? "Sign In" : "Signing..."}</Button>
                    : <Button type="submit" className="w-full">{!isLoading ? "Sign Up" : "Signing Up..."}
                    </Button>
                  }
                  {isLogin && <Button type="button" variant="ghost" className="w-full text-sm">Forgot Password?</Button>}
                </form>

                <div className="mt-6 text-center">
                  <button type="button" onClick={() => {
                    setIsLogin(!isLogin);
                    setIsLoading(false);
                    setFormData({
                      name: "",
                      email: "",
                      password: "",
                      rollNo: "",
                      department: "",
                      age: "",
                    });
                    setValidationErrors({
                      name: "",
                      email: "",
                      password: "",
                      department: "",
                      age: "",
                      rollNo: "",
                    });
                    setShowPassword(false);
                  }
                  } className="text-sm text-primary hover:underline cursor-pointer">
                    {isLogin ? "Don't have an account? Sign Up →" : "Already have an account? Login →"}
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  )
}
