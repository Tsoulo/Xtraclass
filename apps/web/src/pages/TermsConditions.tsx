import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import logoImage from "@assets/xtraclass-logo-td.png";

export default function TermsConditions() {
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
            Terms and Conditions of Use
          </h1>
          <p className="text-gray-600 mb-8">Last updated: 12 October 2025</p>

          <div className="prose prose-gray max-w-none">
            <p className="text-gray-700 leading-relaxed mb-8">
              These terms and conditions apply to the use of the XtraClass service. Please read these terms and conditions carefully.
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. The XtraClass Service and Your Agreement to These Terms</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                XTRACLASS ("XTRACLASS" or "we" or "us" or "our") provides an on demand educational and learning service available in the form of various XTRACLASS Subscription Plans (the "XTRACLASS Service") which can be accessed on the website https://xtraclass.ai through which users can access educational content (the "Content") by using an electronic device which is capable of connecting to the internet.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                The XTRACLASS Service is made available by XTRACLASS under the terms and conditions contained on the website https://xtraclass.ai (these "XTRACLASS Terms"). Please note that the following are hereby incorporated into and form part of these XTRACLASS Terms:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>our privacy policy, accessible at https://xtraclass.ai/privacy ("Privacy Policy");</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                By agreeing to these XTRACLASS Terms, you also agree to be bound by the provisions of the Privacy Policy.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                When you set up your account, you are required to accept the XTRACLASS Terms. You are not entitled to make any use of the XTRACLASS Service or the Content if you do not agree to these XTRACLASS Terms.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                The governing law of the XTRACLASS Terms and your relationship with XTRACLASS shall be governed by the laws of the Republic of South Africa.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Changes to the XtraClass Terms</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may, at any time, change these XTRACLASS Terms. If you are a Subscriber, we will notify you of the changes by sending you an email, SMS or through other means, including a pop-up notice when you log into your XTRACLASS Account.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                By continuing to use the XTRACLASS Service after being notified about any changes to the XTRACLASS Terms, you agree with the amended version of the XTRACLASS Terms. If you do not agree with any changes to these XTRACLASS Terms, you must end your use of the XTRACLASS Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Who May Use the XtraClass Service?</h2>
              <p className="text-gray-700 leading-relaxed mb-4">You may only use the XTRACLASS Service if you comply with these XTRACLASS Terms and:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>you are a Subscriber; or</li>
                <li>you are allowed by a Subscriber to access or use the XTRACLASS Service through the Subscriber's XTRACLASS Account (an "Authorised User").</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                You must be 18 years of age or older to register for the XTRACLASS Service and you must not attempt to register for the XTRACLASS Service if you are not 18 years of age or older.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                If the Authorised User is younger than 18 years of age, then the Authorised User must have the permission of their parent or legal guardian to use the XTRACLASS Service and must only use the XTRACLASS Service under the supervision of the Subscriber or another Authorised User that is 18 years of age or older.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Your Information and Details</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                All information supplied to us must be truthful, accurate and complete. This includes your name and surname, as well as the e-mail address and cellular phone number that we request during the registration process.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                You must notify us if the information you supplied to us changes, or if it is incorrect or incomplete. A Subscriber will be able to edit their information by logging on to their XTRACLASS Account through the XTRACLASS Service or by contacting our customer support.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Keep Your Account, Payment Details, and Password Secure</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                After you complete the registration process, we will create your XTRACLASS Account. You will need to use your credentials to access your XTRACLASS Account and to use the XTRACLASS Service.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                You are responsible for all use of your XTRACLASS Account and your password. You must take all reasonable measures not to share, display in public, or make your password or payment details available to any person who is not authorised to have them.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                You must notify us immediately if you suspect that another person has obtained unauthorised access to your XTRACLASS Account or password, or if you are aware of any unauthorised use of your XTRACLASS Account.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Access Devices and Equipment</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You are only entitled to make lawful use of the XTRACLASS Service and access the Content through the methods permitted and intended by us.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                You, at your own cost, are responsible for obtaining and maintaining the devices, adequate internet access, and all technology needed to access the internet or to use the XTRACLASS Service.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                We are not responsible for any internet access charges, service provider charges and data usage charges. The quality of the XTRACLASS Service may be affected by various factors, such as your location, bandwidth available, your devices, internet connection speed, and other factors.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Subscription Plans and Payment</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We offer access to the XTRACLASS Service through a variety of Subscription Plans at different prices. To use the XTRACLASS Service, you must subscribe to one of our Subscription Plans and pay the applicable subscription fees.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                Payment for subscriptions is processed through secure third-party payment providers. By subscribing, you authorize us to charge the payment method you provide for the applicable subscription fees.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                Subscriptions will automatically renew at the end of each billing period unless you cancel your subscription before the renewal date.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Acceptable Use</h2>
              <p className="text-gray-700 leading-relaxed mb-2">You agree not to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>use the XTRACLASS Service for any unlawful purpose;</li>
                <li>share your account credentials with others;</li>
                <li>attempt to circumvent any security measures;</li>
                <li>copy, reproduce, or distribute the Content without authorization;</li>
                <li>interfere with or disrupt the XTRACLASS Service;</li>
                <li>use any automated means to access the XTRACLASS Service; or</li>
                <li>violate any applicable laws or regulations.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Intellectual Property</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                All content, features, and functionality of the XTRACLASS Service, including but not limited to text, graphics, logos, images, and software, are the exclusive property of XTRACLASS or its licensors and are protected by copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Termination</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We reserve the right to suspend or terminate your access to the XTRACLASS Service at any time, with or without notice, for any reason, including if we believe you have violated these XTRACLASS Terms.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                You may cancel your subscription at any time through your account settings or by contacting customer support.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Limitation of Liability</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                To the maximum extent permitted by law, XTRACLASS shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Contact Us</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have any questions about these Terms and Conditions, please contact us at:
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
