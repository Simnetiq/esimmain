import React from 'react';
import { ArrowLeft, Clock, Shield, AlertTriangle, FileText } from 'lucide-react';
import Link from 'next/link';

const ReturnPolicy = () => {
  const sections = [
    {
      icon: AlertTriangle,
      title: "No Returns or Exchanges Policy",
      content: [
        "All eSIM products and services are final sale with no returns or exchanges accepted",
        "Due to the digital nature of eSIM products, all purchases are considered final once completed",
        "This policy applies to all countries and regions where our services are available",
        "We do not accept returns or exchanges for any reason, including but not limited to:",
        "• Device incompatibility (customers must verify compatibility before purchase)",
        "• Change of travel plans or cancellation of trips",
        "• Activation issues or connectivity problems",
        "• Dissatisfaction with service quality or coverage",
        "• Accidental purchases or duplicate orders"
      ]
    },
    {
      icon: Shield,
      title: "Why No Returns Policy",
      content: [
        "eSIM products are digital goods that cannot be physically returned once purchased",
        "Once an eSIM is activated, it becomes tied to a specific device and cannot be transferred",
        "Data plans have immediate value and cannot be recovered once consumed",
        "Digital products are exempt from traditional return policies under consumer law in many jurisdictions",
        "Preventing abuse and ensuring fair pricing for all customers",
        "Maintaining service quality and preventing system manipulation"
      ]
    },
    {
      icon: FileText,
      title: "Customer Responsibilities",
      content: [
        "Verify device compatibility before making any purchase",
        "Confirm travel dates and destinations before purchasing eSIM plans",
        "Read all product descriptions and terms before completing purchase",
        "Ensure you understand the data allowances and validity periods",
        "Test eSIM activation in a timely manner after purchase",
        "Contact customer support immediately if you encounter technical issues during activation"
      ]
    },
    {
      icon: Clock,
      title: "Technical Support & Service Issues",
      content: [
        "While returns and exchanges are not accepted, we provide technical support for service issues",
        "Contact our customer support team if you experience activation problems",
        "We will investigate and resolve technical issues that prevent proper service activation",
        "Service credits may be provided at our discretion for genuine technical problems",
        "Support is available during business hours for all customers",
        "We are committed to ensuring your eSIM works as described"
      ]
    },
    {
      icon: FileText,
      title: "Legal Compliance",
      content: [
        "This policy complies with applicable consumer protection laws for digital goods",
        "Customers have the right to dispute charges with their payment provider if applicable",
        "This policy is subject to local laws and regulations in your jurisdiction",
        "For questions about legal rights, customers should consult local consumer protection agencies",
        "We reserve the right to modify this policy with appropriate notice",
        "Continued use of our services constitutes acceptance of this policy"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-4">
            <Link 
              href="/"
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back to Home</span>
            </Link>
          </div>
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-gray-900">Return Policy</h1>
            <p className="text-gray-600 mt-2">
              Information about returns, refunds, and exchanges for eSIM services
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Introduction */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Policy Overview</h2>
          </div>
          <p className="text-gray-700 leading-relaxed">
            This Return Policy clearly states that we do not accept returns or exchanges for our eSIM services. 
            Please read this policy carefully before making a purchase. 
            By purchasing our eSIM products, you agree to the terms outlined in this policy.
          </p>
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">
              <strong>Important:</strong> All eSIM purchases are final sale with no returns or exchanges accepted. 
              Please ensure your device is compatible and your travel plans are confirmed before purchasing.
            </p>
          </div>
        </div>

        {/* Policy Sections */}
        <div className="space-y-6">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <div key={index} className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">{section.title}</h3>
                </div>
                <ul className="space-y-3">
                  {section.content.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-xl shadow-lg p-6 mt-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Need Help?</h3>
          </div>
          <p className="text-gray-700 mb-4">
            If you have questions about our policy or need technical support with your eSIM, 
            please contact our customer support team. Note that we do not accept returns or exchanges.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Customer Support</h4>
              <p className="text-gray-600">Email: support@simnetiq.store</p>
              <p className="text-gray-600">Response Time: Within 24 hours</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Business Hours</h4>
              <p className="text-gray-600">Monday - Friday: 9 AM - 6 PM (CET)</p>
              <p className="text-gray-600">Weekend: 10 AM - 4 PM (CET)</p>
            </div>
          </div>
        </div>

        {/* Last Updated */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">
            Last updated: December 30, 2025
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReturnPolicy;
