"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Zap, Check } from "lucide-react";
import * as z from "zod";
import { toast } from "@/lib/hooks/use-toast";

type RegistrationStep = "basic" | "package" | "payment";
type PackageType = "individual" | "business" | null;

const User = z.object({
    email: z.email("Invalid email."),
    password: z.string()
              .min(8, "Password must be at least 8 characters long.")
              .max(32, "Password must not be longer than 32 characters."),
});

export default function Register() {
  const [step, setStep] = useState<RegistrationStep>("basic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [packageType, setPackageType] = useState<PackageType>(null);
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardCVC, setCardCVC] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [cardCVCError, setCardCVCError] = useState("");
  const router = useRouter();

  const handleBasicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      const parseResult = User.safeParse({ email, password });
      if (!parseResult.success) {
        for (const iss of parseResult.error.issues) {
          for (const field of iss.path) {
            if (field === "email") {
              setEmailError(iss.message);
              setPasswordError("");
              return;
            }
            else if (field === "password") {
              setEmailError("");
              setPasswordError(iss.message);
              return;
            }
          }
        }
      }

      try {
        const response = await fetch('/api/register/check-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify({
              email,
          })
        });
        
        const data = await response.json();
        if (response.ok) {
          setStep('package');
        }
        else {
          setEmailError(data.message);
          return;
        }
      } catch (error) {
        toast({
          title: "Registration Failed",
          description: "An unknown error occurred",
        });
      }
    }
  };

  const handlePackageSelect = (type: PackageType) => {
    setPackageType(type);
    setStep("payment");
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !cardHolder || !cardCVC) {
      return;
    }

    if (cardCVC.length !== 4) {
      setCardCVCError("Verification code must be 4 digit long.");
      return;
    }

    let isError = false;
    try {
      const response = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json'},
          body: JSON.stringify({
            email,
            password,
            packageType,
          })
      }); 
      
      const data = await response.json();
      if (response.ok) {
        try {
          const response = await fetch("/api/subscription", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify({
              userId: data.userId,
              botId: -1,
              amount: (packageType === "individual") ? 200_000 : 500_000
            })
          });
          if (response.ok) {
            router.push("/login");
          }
          else {
            isError = true;
          }
        } catch (error) {
          console.log(error)
          isError = true;
        }
      } else {
        isError = true;
      }
    } catch (error) {
      isError = true;
    }

    if (isError) {
      toast({
          title: "Registration Failed",
          description: "An unknown error occurred",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-slate-900">Chatbot Helpdesk</span>
        </Link>

        {/* Form Container */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          {/* Step 1: Basic Info */}
          {step === "basic" && (
            <>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Create Account</h1>
              <p className="text-slate-600 mb-8">Get started with Chatbot Helpdesk</p>

              <form onSubmit={handleBasicSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                  {emailError && (
                    <p className="mt-1 text-sm text-red-600 font-medium">
                      {emailError}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    required
                  />

                  {passwordError && (
                    <p className="mt-1 text-sm text-red-600 font-medium">
                      {passwordError}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  Continue
                </Button>
              </form>
            </>
          )}

          {/* Step 2: Package Selection */}
          {step === "package" && (
            <>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Choose Your Plan</h1>
              <p className="text-slate-600 mb-8">Select the plan that fits your needs</p>

              <div className="space-y-4">
                <button
                  onClick={() => handlePackageSelect("individual")}
                  className="w-full p-6 rounded-lg border-2 border-slate-300 hover:border-blue-500 transition-all text-left hover:bg-blue-50"
                >
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Individual</h3>
                  <p className="text-slate-600 text-sm mb-4">
                    Perfect for personal projects and small tasks
                  </p>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Unlimited bots</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>1 AI model connection</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Basic analytics</span>
                    </div>
                  </div>
                  <div className="mt-4 text-2xl font-bold text-slate-900">
                    200,000
                    <span className="text-base text-slate-600 font-normal"> VND/month</span>
                  </div>
                </button>

                <button
                  onClick={() => handlePackageSelect("business")}
                  className="w-full p-6 rounded-lg border-2 border-blue-500 bg-blue-50 transition-all text-left"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-bold text-slate-900">Business</h3>
                    <span className="px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-semibold">
                      Popular
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm mb-4">
                    Ideal for growing businesses and teams
                  </p>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Unlimited bots</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>All AI models</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Team collaboration</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Advanced analytics</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Priority support</span>
                    </div>
                  </div>
                  <div className="mt-4 text-2xl font-bold text-slate-900">
                    500,000
                    <span className="text-base text-slate-600 font-normal"> VND/month</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">+ 100 VND per token</p>
                </button>
              </div>
            </>
          )}

          {/* Step 3: Payment */}
          {step === "payment" && (
            <>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Method</h1>
              <p className="text-slate-600 mb-8">
                Choose your payment method {packageType === "business" ? "for your subscription" : "(optional)"}
              </p>

              <div className="space-y-4">
                {/* Bank Account Option */}
                <label className="flex items-start gap-4 p-4 rounded-lg border-2 border-slate-300 cursor-pointer hover:border-blue-300 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="bank"
                    defaultChecked
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1">Bank Account</h3>
                    <p className="text-sm text-slate-600">
                      Transfer directly from your bank account
                    </p>
                  </div>
                </label>

                {/* E-Wallet Option */}
                <label className="flex items-start gap-4 p-4 rounded-lg border-2 border-slate-300 cursor-pointer hover:border-blue-300 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="ewallet"
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1">E-Wallet</h3>
                    <p className="text-sm text-slate-600">
                      Pay using popular e-wallet services (GCash, PayMaya, etc.)
                    </p>
                  </div>
                </label>
              </div>

              <form onSubmit={handlePaymentSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    {packageType === "business" ? "Bank/E-Wallet Details" : "Bank/E-Wallet Details (optional)"}
                  </label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="Enter account number or e-wallet ID"
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    placeholder="Your full name"
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    value={cardCVC}
                    onChange={(e) => setCardCVC(e.target.value)}
                    placeholder="4-digit code"
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                  {cardCVCError && (
                    <p className="mt-1 text-sm text-red-600 font-medium">
                      {cardCVCError}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >Create Account & Subscribe
                </Button>
              </form>

              <button
                onClick={() => setStep("package")}
                className="w-full mt-4 text-slate-600 hover:text-slate-900 text-sm font-medium"
              >
                Back
              </button>
            </>
          )}

          {step === "basic" && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-slate-600 text-center">
                Already have an account?{" "}
                <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          By signing up, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
