import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, MessageCircle, Brain, Sliders } from "lucide-react";

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-900">Chatbot Helpdesk</span>
          </div>
          <div className="flex gap-3">
            <Link href="/login">
              <Button variant="outline">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-block mb-6 px-4 py-2 rounded-full bg-blue-100 border border-blue-200">
            <span className="text-sm font-semibold text-blue-700">
              🚀 AI-Powered Bot Platform
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            Create Intelligent Chatbots in Minutes
          </h1>

          <p className="text-lg md:text-xl text-slate-600 mb-8 leading-relaxed">
            Empower your business with AI-driven conversational bots. No coding required. Connect any AI model. Manage everything from one powerful dashboard.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/register">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
                Start Free Trial
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline">
              Watch Demo
            </Button>
          </div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-2 gap-8 mt-16">
            <div className="p-6 rounded-lg bg-white border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all">
              <MessageCircle className="w-8 h-8 text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Multi-AI Integration
              </h3>
              <p className="text-slate-600">
                Connect GPT-4, Claude, Gemini, and more models in one place
              </p>
            </div>

            <div className="p-6 rounded-lg bg-white border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all">
              <Brain className="w-8 h-8 text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Knowledge Base
              </h3>
              <p className="text-slate-600">
                Upload files or connect websites to train your bot
              </p>
            </div>

            <div className="p-6 rounded-lg bg-white border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all">
              <Sliders className="w-8 h-8 text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Full Control
              </h3>
              <p className="text-slate-600">
                Test, fine-tune, and deploy with real-time adjustments
              </p>
            </div>

            <div className="p-6 rounded-lg bg-white border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all">
              <Zap className="w-8 h-8 text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Easy Embed
              </h3>
              <p className="text-slate-600">
                Embed bots on your website with a single snippet
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">10K+</div>
              <p className="text-blue-100">Bots Created</p>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">500K+</div>
              <p className="text-blue-100">Conversations Daily</p>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">99.9%</div>
              <p className="text-blue-100">Uptime SLA</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Your Customer Support?
          </h2>
          <p className="text-slate-300 mb-8 max-w-2xl mx-auto">
            Join thousands of businesses using BotForge to automate customer interactions
          </p>
          <Link href="/register">
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              Start Your Free Trial Today
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-slate-900">Chatbot Helpdesk</span>
              </div>
              <p className="text-slate-600 text-sm">
                Build intelligent chatbots for your business
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#" className="hover:text-slate-900">Features</a></li>
                <li><a href="#" className="hover:text-slate-900">Pricing</a></li>
                <li><a href="#" className="hover:text-slate-900">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#" className="hover:text-slate-900">About</a></li>
                <li><a href="#" className="hover:text-slate-900">Blog</a></li>
                <li><a href="#" className="hover:text-slate-900">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#" className="hover:text-slate-900">Privacy</a></li>
                <li><a href="#" className="hover:text-slate-900">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-8 flex justify-between items-center text-sm text-slate-600">
            <p>&copy; 2024 Chatbot Helpdesk. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
