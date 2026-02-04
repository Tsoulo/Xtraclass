import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import logoImage from "@assets/xtraclass-logo-td.png";

export default function PrivacyPolicy() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <img src={logoImage} alt="XtraClass.ai" className="h-10" />
            <Button 
              variant="ghost" 
              onClick={() => setLocation('/')}
              data-testid="button-back-home"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
        <div className="bg-white rounded-lg shadow-sm p-8 md:p-12">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className="text-gray-600 mb-8">Last updated: 12 October 2025</p>

          <div className="prose prose-gray max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduction</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We are XtraClassAI (Pty) Ltd trading as XtraClass AI. Our Company registration number is 2025/790782/07 and our regular place of business is at 22 Sloane Street, Bryanston, Gauteng, 2191. The purpose of this policy is to describe the way that we collect, store, use, and protect information that can be associated with you or another specific natural or juristic person and can be used to identify you or that person.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Audience</h2>
              <p className="text-gray-700 leading-relaxed mb-2">This policy applies to you if you are:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>a visitor to our website;</li>
                <li>a user of our software applications; or</li>
                <li>a customer who has ordered or requested the services that we provide, be it through our website, our software, or any other related method.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Personal Information</h2>
              <p className="text-gray-700 leading-relaxed mb-4">Personal information includes:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>certain information that we collect automatically when you visit our website or use our software applications;</li>
                <li>certain information collected on submission; and</li>
                <li>optional information that you provide to us voluntarily;</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-2">but excludes:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>information that has been made anonymous so that it does not identify a specific person;</li>
                <li>permanently de-identified information that does not relate or cannot be traced back to you specifically;</li>
                <li>non-personal statistical information collected and compiled by us; and</li>
                <li>information that you have provided voluntarily in an open, public environment or forum.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Common Examples of Personal Information</h2>
              <p className="text-gray-700 leading-relaxed mb-2">Common examples of the types of personal information which we may collect and process include your:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>identifying information – such as your name, date of birth, or identification number of any kind;</li>
                <li>contact information – such as your phone number or email address;</li>
                <li>address information – such as your physical or postal address; or</li>
                <li>demographic information – such as your gender or marital status.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Acceptance</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Acceptance Required</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                You must accept all the terms of this policy when you visit our website, use our software or order or request our services, whichever the case may be. If you do not agree with anything in this policy, then you may be barred from access or further usage, and we will not render services to you.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">Legal Capacity</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                You may not access our website, use our software or order or request our services if you are younger than 18 years old or do not have legal capacity to conclude legally binding contracts.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you are not yet 18, you must obtain your parents' or legal guardians' advance authorisation, permission and consent to be bound by this policy prior to you using any of our services or participating in any of the activities offered.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Collection of Information</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">On Registration</h3>
              <p className="text-gray-700 leading-relaxed mb-2">Once you register on our website, you will provide us with certain personal information including:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>your name and surname;</li>
                <li>your identity document number;</li>
                <li>your email address;</li>
                <li>your telephone number;</li>
                <li>your company name and related information;</li>
                <li>your postal address or street address; and</li>
                <li>your username and password.</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">Cookies</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may place small text files called 'cookies' on your device when you visit our website. These files do not contain personal information, but they do contain a personal identifier allowing us to associate your personal information with a certain device. These files serve useful purposes including granting you access to age restricted content, tailoring our website's functionality to you personally, improving website performance, and allowing third parties to provide services to our website.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Purpose for Collection</h2>
              <p className="text-gray-700 leading-relaxed mb-2">We generally collect and process your personal information for various purposes, including:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>goods or services purposes – such as collecting orders or requests for and providing our goods or services;</li>
                <li>marketing purposes – such as pursuing lawful related marketing activities;</li>
                <li>business purposes – such as internal audit, accounting, business planning; and</li>
                <li>legal purposes – such as handling claims, complying with regulations, or pursuing good governance.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Use of Information</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may use your personal information to fulfil our obligations to you. We may send administrative messages and email updates about the website or software applications. We will not sell personal information. No personal information will be disclosed to anyone except as provided in this privacy policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Security Measures</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We take reasonable technical and organisational measures to ensure that your personal information is kept secure and is protected against unauthorised or unlawful processing and accidental loss, destruction, or damage. We use industry-standard security measures to protect your data.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Rights</h2>
              <p className="text-gray-700 leading-relaxed mb-2">You have the right to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>request access to your personal information;</li>
                <li>request correction of your personal information;</li>
                <li>request deletion of your personal information;</li>
                <li>object to processing of your personal information;</li>
                <li>request restriction of processing your personal information; and</li>
                <li>withdraw consent at any time.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have any questions about this Privacy Policy or our privacy practices, please contact us at:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700"><strong>XtraClassAI (Pty) Ltd</strong></p>
                <p className="text-gray-700">22 Sloane Street, Bryanston</p>
                <p className="text-gray-700">Gauteng, 2191</p>
                <p className="text-gray-700">South Africa</p>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-400">&copy; 2025 XtraClass.ai. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
