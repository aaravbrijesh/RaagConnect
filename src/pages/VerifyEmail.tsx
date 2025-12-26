import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"verifying" | "success" | "error" | "pending">("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handleEmailVerification = async () => {
      // Check for hash fragment (Supabase redirects with tokens in hash)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const type = hashParams.get("type");

      // Also check URL params
      const tokenHash = searchParams.get("token_hash");
      const urlType = searchParams.get("type");

      // If there's no token info, show pending state (user just registered)
      if (!accessToken && !tokenHash && !type && !urlType) {
        setStatus("pending");
        setMessage("Please check your email and click the verification link to activate your account.");
        return;
      }

      try {
        // If we have access token in hash, set the session
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) throw error;

          setStatus("success");
          setMessage("Your email has been verified successfully!");
          
          // Redirect to home after a short delay
          setTimeout(() => {
            navigate("/");
          }, 2000);
          return;
        }

        // If we have token_hash, verify it
        if (tokenHash && urlType === "signup") {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "signup",
          });

          if (error) throw error;

          setStatus("success");
          setMessage("Your email has been verified successfully!");
          
          setTimeout(() => {
            navigate("/");
          }, 2000);
          return;
        }

        // Recovery flow
        if (urlType === "recovery") {
          setStatus("success");
          setMessage("Password reset link verified. You can now reset your password.");
          return;
        }

        setStatus("pending");
        setMessage("Please check your email and click the verification link to activate your account.");
      } catch (error: any) {
        console.error("Verification error:", error);
        setStatus("error");
        setMessage(error.message || "Failed to verify email. The link may have expired.");
      }
    };

    handleEmailVerification();
  }, [navigate, searchParams]);

  const handleResendEmail = async () => {
    // Get the email from localStorage if stored
    const pendingEmail = localStorage.getItem("pendingVerificationEmail");
    
    if (!pendingEmail) {
      setMessage("Please register again to receive a new verification email.");
      return;
    }

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: pendingEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
        },
      });

      if (error) throw error;
      setMessage("A new verification email has been sent. Please check your inbox.");
    } catch (error: any) {
      setMessage(error.message || "Failed to resend verification email.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-card rounded-xl p-8 shadow-lg border border-border text-center">
          {status === "verifying" && (
            <>
              <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Verifying your email...</h2>
              <p className="text-muted-foreground">Please wait while we verify your email address.</p>
            </>
          )}

          {status === "pending" && (
            <>
              <Mail className="h-16 w-16 mx-auto text-primary mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Check your email</h2>
              <p className="text-muted-foreground mb-6">{message}</p>
              <div className="space-y-3">
                <Button onClick={handleResendEmail} variant="outline" className="w-full">
                  Resend verification email
                </Button>
                <Button onClick={() => navigate("/login")} variant="ghost" className="w-full">
                  Back to login
                </Button>
              </div>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Email Verified!</h2>
              <p className="text-muted-foreground mb-6">{message}</p>
              <p className="text-sm text-muted-foreground">Redirecting to home page...</p>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Verification Failed</h2>
              <p className="text-muted-foreground mb-6">{message}</p>
              <div className="space-y-3">
                <Button onClick={handleResendEmail} variant="outline" className="w-full">
                  Resend verification email
                </Button>
                <Button onClick={() => navigate("/register")} className="w-full">
                  Register again
                </Button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
