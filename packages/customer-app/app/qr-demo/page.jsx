'use client';

import { useState } from 'react';
import SimpleQRGenerator from '../../src/components/SimpleQRGenerator';

export default function QRDemoPage() {
  const [qrData, setQrData] = useState('https://example.com/esim-activation');
  const [customData, setCustomData] = useState('');

  // Example eSIM activation data
  const esimActivationData = {
    type: 'esim_activation',
    orderId: 'ORDER_12345',
    planName: 'Global 5GB Plan',
    activationCode: 'ACT_67890',
    expiryDate: '2024-12-31',
    instructions: 'Scan this QR code to activate your eSIM'
  };

  const handleGenerateCustom = () => {
    if (customData.trim()) {
      setQrData(customData.trim());
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            QR Code Generator Demo
          </h1>
          <p className="text-gray-600">
            Generate QR codes directly on the website without Cloud Functions
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Example 1: Simple URL */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Example 1: Simple URL
            </h2>
            <SimpleQRGenerator
              data="https://example.com/esim-activation"
              title="eSIM Activation URL"
              size={200}
            />
          </div>

          {/* Example 2: eSIM Activation Data */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Example 2: eSIM Activation Data
            </h2>
            <SimpleQRGenerator
              data={JSON.stringify(esimActivationData, null, 2)}
              title="eSIM Activation Data"
              size={200}
            />
          </div>

          {/* Example 3: Custom Data Input */}
          <div className="md:col-span-2">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Example 3: Custom Data Input
            </h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter custom data for QR code:
                </label>
                <textarea
                  value={customData}
                  onChange={(e) => setCustomData(e.target.value)}
                  placeholder="Enter any text, URL, or JSON data..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              <button
                onClick={handleGenerateCustom}
                disabled={!customData.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Generate QR Code
              </button>
            </div>
            
            {qrData && (
              <div className="mt-6">
                <SimpleQRGenerator
                  data={qrData}
                  title="Custom QR Code"
                  size={250}
                />
              </div>
            )}
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="mt-12 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            How to Use in Your App
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">1. Import the Component:</h3>
              <pre className="bg-gray-100 p-3 rounded-lg text-sm overflow-x-auto">
{`import SimpleQRGenerator from '../components/SimpleQRGenerator';`}
              </pre>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">2. Use in Your Component:</h3>
              <pre className="bg-gray-100 p-3 rounded-lg text-sm overflow-x-auto">
{`<SimpleQRGenerator
  data="your-qr-code-data"
  title="Your QR Code Title"
  size={200}
  showActions={true}
/>`}
              </pre>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">3. For Payment Success Page:</h3>
              <pre className="bg-gray-100 p-3 rounded-lg text-sm overflow-x-auto">
{`// After payment completion
const qrData = {
  orderId: order.id,
  activationCode: generateActivationCode(),
  planName: order.planName,
  expiryDate: calculateExpiryDate()
};

<SimpleQRGenerator
  data={JSON.stringify(qrData)}
  title="Your eSIM QR Code"
  size={250}
/>`}
              </pre>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">
            Features
          </h2>
          <ul className="space-y-2 text-blue-800">
            <li>✅ Generate QR codes directly in the browser</li>
            <li>✅ No server-side processing required</li>
            <li>✅ Download QR codes as PNG images</li>
            <li>✅ Copy QR code data to clipboard</li>
            <li>✅ Share QR codes using native sharing</li>
            <li>✅ Customizable size and styling</li>
            <li>✅ Works with any text, URL, or JSON data</li>
            <li>✅ Error handling and loading states</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
