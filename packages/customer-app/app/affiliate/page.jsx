'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Users, 
  DollarSign, 
  Share2, 
  TrendingUp,
  ArrowRight,
  Zap,
  Shield,
  Globe,
  Gift,
  Smartphone,
  FileText
} from 'lucide-react';


const AffiliatePage = () => {
  const features = [
    {
      icon: DollarSign,
      title: "Earn $1 Per Referral",
      description: "Get $1 instantly for every successful referral who joins Simnetiq and makes their first purchase"
    },
    {
      icon: Users,
      title: "Unlimited Referrals",
      description: "No caps, no limits - refer as many people as you want and earn from each one"
    },
    {
      icon: Share2,
      title: "Easy Sharing",
      description: "Share your unique referral code via social media, email, or direct messaging"
    },
    {
      icon: TrendingUp,
      title: "Real-time Tracking",
      description: "Monitor your referral stats and earnings with live updates in your dashboard"
    }
  ];

  const benefits = [
    {
      icon: Zap,
      title: "Instant Payouts",
      description: "Get paid immediately when your referrals complete their first purchase"
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Built on trusted payment systems with full transparency and security"
    },
    {
      icon: Globe,
      title: "Global Reach",
      description: "Refer customers from 200+ countries where Simnetiq operates worldwide"
    }
  ];

  const howItWorksSteps = [
    {
      step: "1",
      title: "Sign Up & Get Your Code",
      description: "Create your account and receive your unique referral code instantly",
      icon: Smartphone
    },
    {
      step: "2", 
      title: "Share With Your Network",
      description: "Share your code with friends, family, and social media followers",
      icon: Share2
    },
    {
      step: "3",
      title: "Earn Money Instantly",
      description: "Get $1 for every person who signs up and makes their first purchase",
      icon: DollarSign
    }
  ];

  const faqs = [
    {
      question: "How much do I earn per referral?",
      answer: "You earn $1 for every successful referral who joins Simnetiq and makes their first purchase. There are no caps or limits on your earnings."
    },
    {
      question: "When do I get paid?",
      answer: "Earnings are tracked in real-time and can be withdrawn once you reach the minimum threshold of $50. Payments are processed within 24-48 hours."
    },
    {
      question: "Is there a limit on referrals?",
      answer: "Absolutely not! You can refer unlimited people and earn from each successful referral. The more you refer, the more you earn."
    },
    {
      question: "How do I track my referrals?",
      answer: "You can monitor all your referral activity, earnings, and statistics in your personal dashboard with real-time updates and detailed analytics."
    },
    {
      question: "Can I refer family and friends?",
      answer: "Yes! You can refer anyone you know - family, friends, colleagues, or social media followers. Just make sure they're not already registered users."
    },
    {
      question: "What countries can I refer people from?",
      answer: "You can refer people from any of the 200+ countries where Simnetiq operates. Our global reach means unlimited earning potential worldwide."
    }
  ];

  return (
    <>
      <div className="min-h-screen bg-white">
        {/* Header Section */}
        <section className="bg-white">
        <div className="mx-auto max-w-2xl px-6 lg:max-w-7xl lg:px-8">
          <div className="text-center">
            <h2 className="text-center text-xl font-semibold text-tufts-blue">
              <span>{'{ '}</span>
              Earn with Simnetiq
              <span>{' }'}</span>
            </h2>
            <p className="mx-auto mt-12 max-w-4xl text-center text-4xl font-semibold tracking-tight text-eerie-black sm:text-5xl">
              Turn Your Network Into Passive Income
            </p>
            <p className="mx-auto mt-6 max-w-2xl text-center text-lg text-cool-black">
              Join our affiliate program and earn $1 for every friend you refer to Simnetiq&apos;s eSIM platform. 
              No limits, no fees, just pure earning potential.
            </p>
            <div className="flex items-center justify-center mt-8">
              <Gift className="w-8 h-8 text-tufts-blue mr-2" />
              <p className="text-sm text-cool-black">
                Start earning today | No investment required
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="bg-white">
        <div className="mx-auto max-w-2xl px-6 lg:max-w-7xl lg:px-8 mt-6">
          
          {/* Introduction */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">Program Overview</h2>
                <p className="text-cool-black leading-relaxed mb-4">
                  The Simnetiq Affiliate Program allows you to earn money by referring friends, family, and followers 
                  to our eSIM services. For every successful referral who creates an account and makes a purchase, 
                  you earn $1 instantly.
                </p>
                <p className="text-cool-black leading-relaxed mb-4">
                  Our program is designed to be simple, transparent, and rewarding. There are no complicated 
                  commission structures, no minimum quotas, and no limits on how much you can earn. 
                  The more people you refer, the more you earn.
                </p>
                <p className="text-cool-black leading-relaxed">
                  Join thousands of affiliates worldwide who are already earning passive income by sharing 
                  Simnetiq&apos;s innovative eSIM solutions with their networks.
                </p>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Main Features */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div
                  key={index}
                  className="relative"
                >
                  <div className="absolute inset-px rounded-xl bg-white"></div>
                  <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
                    <div className="px-8 pt-8 pb-8">
                      <div className="flex items-center mb-6">
                        <div className="w-12 h-12 bg-tufts-blue/10 rounded-xl flex items-center justify-center mr-4">
                          <IconComponent className="w-6 h-6 text-tufts-blue" />
                        </div>
                        <h2 className="text-xl font-medium tracking-tight text-eerie-black">{feature.title}</h2>
                      </div>
                      <p className="text-cool-black leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                  <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
                </div>
              );
            })}
          </div>

          {/* Additional Benefits */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">Additional Benefits</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {benefits.map((benefit, index) => {
                    const IconComponent = benefit.icon;
                    return (
                      <div key={index} className="text-center">
                        <div className="w-16 h-16 bg-tufts-blue/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                          <IconComponent className="w-8 h-8 text-tufts-blue" />
                        </div>
                        <h3 className="text-lg font-medium text-eerie-black mb-2">{benefit.title}</h3>
                        <p className="text-cool-black text-sm">{benefit.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* How It Works */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">How It Works</h2>
                <p className="text-cool-black leading-relaxed mb-6">
                  Getting started with our affiliate program is simple. Follow these three easy steps to begin earning:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {howItWorksSteps.map((step, index) => {
                    const IconComponent = step.icon;
                    return (
                      <div key={index} className="text-center">
                        <div className="relative mb-4">
                          <div className="w-16 h-16 bg-tufts-blue/10 rounded-xl flex items-center justify-center mx-auto">
                            <IconComponent className="w-8 h-8 text-tufts-blue" />
                          </div>
                          <div className="absolute -top-2 -right-2 w-8 h-8 bg-tufts-blue text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {step.step}
                          </div>
                        </div>
                        <h3 className="text-lg font-medium text-eerie-black mb-2">{step.title}</h3>
                        <p className="text-cool-black text-sm">{step.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Call to Action */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8 text-center">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">Ready to Start Earning?</h2>
                <p className="text-cool-black leading-relaxed mb-6 max-w-2xl mx-auto">
                  Join thousands of affiliates already earning passive income with Simnetiq. 
                  Start your journey today and turn your network into revenue.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/register"
                    className="inline-flex items-center px-8 py-3 bg-tufts-blue text-white rounded-xl font-semibold hover:bg-cobalt-blue transition-colors duration-200 shadow-lg hover:shadow-xl"
                  >
                    Get Started Now
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center px-8 py-3 bg-white text-tufts-blue rounded-xl font-semibold hover:bg-gray-50 transition-colors duration-200 border-2 border-tufts-blue"
                  >
                    Already a Member?
                  </Link>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* FAQ Section */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <div className="flex items-center mb-6">
                  <FileText className="w-8 h-8 text-tufts-blue mr-3" />
                  <h2 className="text-2xl font-medium tracking-tight text-eerie-black">Frequently Asked Questions</h2>
                </div>
                <div className="space-y-6">
                  {faqs.map((faq, index) => (
                    <div key={index} className="border-b border-gray-100 pb-4 last:border-b-0">
                      <h3 className="text-lg font-medium text-eerie-black mb-2">
                        {faq.question}
                      </h3>
                      <p className="text-cool-black leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Related Information */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">Related Information</h2>
                <div className="space-y-4 text-cool-black">
                  <p>
                    By participating in our affiliate program, you agree to promote Simnetiq&apos;s services in an ethical 
                    and professional manner. Please review our terms and policies before getting started.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                    <Link 
                      href="/terms-of-service"
                      className="flex items-center space-x-3 px-4 py-3 bg-tufts-blue text-white rounded-lg hover:bg-cobalt-blue transition-colors"
                    >
                      <Shield className="w-5 h-5" />
                      <span>Terms of Service</span>
                    </Link>
                    <Link 
                      href="/privacy-policy"
                      className="flex items-center space-x-3 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <FileText className="w-5 h-5" />
                      <span>Privacy Policy</span>
                    </Link>
                    <Link 
                      href="/contact"
                      className="flex items-center space-x-3 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Users className="w-5 h-5" />
                      <span>Contact Support</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

        </div>
      </section>
    </div>
  </>
  );
};

export default AffiliatePage;