import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/app-components/AuthContext";
import PageLayout from "./PageLayout";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if(isSignup){
      if (username === "") {
        setError("Please enter your username");
        return;
      }
    }
    
    if (email === "") {
      setError("Please enter your email");
      return;
    }
    if (!email.includes("@")) {
      setError("Email missing required components");
      return;
    }
    if (password.length < 8) {
      setError("Password must contain at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      //const endpoint = isSignup ? "/api/auth/signup" : "/api/auth/login";
      let res = "";

      if(isSignup){
        res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password }),
        });
      } else {
        res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({email, password }),
        });
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      login({ token: data.token, email: data.email });
      navigate("/");
    } catch {
      setError("Could not connect to server");
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setIsSignup(!isSignup);
    setError("");
  }

  return (
    <PageLayout>
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="w-full max-w-sm rounded-xl border border-border/70 bg-card/80 p-8 shadow-sm shadow-black/20">
          <h2 className="mb-6 text-2xl font-bold text-card-foreground">
            {isSignup ? "Create Account" : "Sign In"}
          </h2>

          {error && (
            <p className="mb-4 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isSignup && ( 
            <div className="space-y-2">
              <label
                htmlFor="auth-username"
                className="text-sm font-medium text-foreground"
              >
                Username
              </label>
              <Input
                id="auth-username"
                type="string"
                placeholder="Username"
                className="h-12"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div> 
            )}

            <div className="space-y-2">
              <label
                htmlFor="auth-email"
                className="text-sm font-medium text-foreground"
              >
                Email
              </label>
              <Input
                id="auth-email"
                type="email"
                placeholder="Email"
                className="h-12"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="auth-password"
                className="text-sm font-medium text-foreground"
              >
                Password
              </label>
              <Input
                id="auth-password"
                type="password"
                placeholder="Password"
                className="h-12"
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Please wait..." : isSignup ? "Sign Up" : "Log In"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={switchMode}
              className="text-primary hover:underline"
            >
              {isSignup ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>
      </div>
    </PageLayout>
  );
}

export default Login;
