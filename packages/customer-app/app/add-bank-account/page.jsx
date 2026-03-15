'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, Building2, User, Phone } from 'lucide-react';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { getSupabase } from '@esim/shared/lib/supabase';
import toast from 'react-hot-toast';

const AddBankAccountPage = () => {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    accountHolderName: '',
    accountNumber: '',
    routingNumber: '',
    branchNumber: '',
    bankName: '',
    phoneNumber: '',
    country: 'US'
  });

  // Fetch current bank account data
  useEffect(() => {
    const fetchBankAccount = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const supabase = getSupabase();
        const { data: userData } = await supabase
          .from('users')
          .select('bank_account')
          .eq('id', currentUser.id)
          .single();
        
        if (userData?.bank_account) {
          const ba = userData.bank_account;
          setFormData({
            accountHolderName: ba.accountHolderName || '',
            accountNumber: ba.accountNumber || '',
            routingNumber: ba.routingNumber || '',
            branchNumber: ba.branchNumber || '',
            bankName: ba.bankName || '',
            phoneNumber: ba.phoneNumber || '',
            country: ba.country || 'US'
          });
        }
      } catch (error) {
        console.error('Error fetching bank account:', error);
        toast.error('Failed to load bank account data');
      } finally {
        setLoading(false);
      }
    };

    fetchBankAccount();
  }, [currentUser]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast.error('Please log in to add bank account');
      return;
    }

    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.accountHolderName || !formData.accountNumber || !formData.routingNumber || !formData.branchNumber || !formData.bankName || !formData.phoneNumber || !formData.country) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Save bank account to user profile
      const supabase = getSupabase();
      await supabase
        .from('users')
        .update({
          bank_account: {
            ...formData,
            addedAt: new Date().toISOString(),
            isVerified: false
          }
        })
        .eq('id', currentUser.id);

      toast.success('Bank account added successfully!');
      router.back(); // Go back to previous page
    } catch (error) {
      console.error('Error adding bank account:', error);
      toast.error('Failed to add bank account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="bg-[var(--bg-primary)] shadow-sm border-b border-[var(--card-border)]">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-[var(--hover-bg)] rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-cool-black" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-cool-black">Add Bank Account</h1>
              <p className="text-sm text-cool-black">Add your bank details for withdrawals</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--bg-primary)] rounded-xl shadow-lg p-6"
        >
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tufts-blue"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
            {/* Account Holder Name */}
            <div>
              <label className="block text-sm font-medium text-cool-black mb-2">
                Account Holder Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cool-black" />
                <input
                  type="text"
                  name="accountHolderName"
                  value={formData.accountHolderName}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-[var(--card-border)] rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  placeholder="Enter full name as it appears on bank account"
                  required
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-cool-black mb-2">
                Phone Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cool-black" />
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-[var(--card-border)] rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  placeholder="Enter phone number"
                  required
                />
              </div>
            </div>

            {/* Bank Name */}
            <div>
              <label className="block text-sm font-medium text-cool-black mb-2">
                Bank Name *
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cool-black" />
                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-[var(--card-border)] rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  placeholder="Enter bank name"
                  required
                />
              </div>
            </div>

            {/* Account Number, Routing Number, and Branch Number */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-cool-black mb-2">
                  Account Number *
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cool-black" />
                  <input
                    type="text"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-[var(--card-border)] rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="Enter account number"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-cool-black mb-2">
                  Routing Number *
                </label>
                <input
                  type="text"
                  name="routingNumber"
                  value={formData.routingNumber}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-[var(--card-border)] rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  placeholder="Enter routing number"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-cool-black mb-2">
                  Branch Number *
                </label>
                <input
                  type="text"
                  name="branchNumber"
                  value={formData.branchNumber}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-[var(--card-border)] rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  placeholder="Enter branch number"
                  required
                />
              </div>
            </div>


            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-cool-black mb-2">
                Country *
              </label>
              <select
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-[var(--card-border)] rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                required
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
                <option value="ES">Spain</option>
                <option value="IT">Italy</option>
                <option value="NL">Netherlands</option>
                <option value="SE">Sweden</option>
                <option value="NO">Norway</option>
                <option value="DK">Denmark</option>
                <option value="FI">Finland</option>
                <option value="CH">Switzerland</option>
                <option value="AT">Austria</option>
                <option value="BE">Belgium</option>
                <option value="IE">Ireland</option>
                <option value="PT">Portugal</option>
                <option value="PL">Poland</option>
                <option value="CZ">Czech Republic</option>
                <option value="HU">Hungary</option>
                <option value="SK">Slovakia</option>
                <option value="SI">Slovenia</option>
                <option value="HR">Croatia</option>
                <option value="RO">Romania</option>
                <option value="BG">Bulgaria</option>
                <option value="GR">Greece</option>
                <option value="CY">Cyprus</option>
                <option value="MT">Malta</option>
                <option value="LU">Luxembourg</option>
                <option value="EE">Estonia</option>
                <option value="LV">Latvia</option>
                <option value="LT">Lithuania</option>
                <option value="JP">Japan</option>
                <option value="KR">South Korea</option>
                <option value="SG">Singapore</option>
                <option value="HK">Hong Kong</option>
                <option value="TW">Taiwan</option>
                <option value="NZ">New Zealand</option>
                <option value="BR">Brazil</option>
                <option value="MX">Mexico</option>
                <option value="AR">Argentina</option>
                <option value="CL">Chile</option>
                <option value="CO">Colombia</option>
                <option value="PE">Peru</option>
                <option value="VE">Venezuela</option>
                <option value="UY">Uruguay</option>
                <option value="PY">Paraguay</option>
                <option value="BO">Bolivia</option>
                <option value="EC">Ecuador</option>
                <option value="GY">Guyana</option>
                <option value="SR">Suriname</option>
                <option value="IN">India</option>
                <option value="CN">China</option>
                <option value="TH">Thailand</option>
                <option value="MY">Malaysia</option>
                <option value="ID">Indonesia</option>
                <option value="PH">Philippines</option>
                <option value="VN">Vietnam</option>
                <option value="MM">Myanmar</option>
                <option value="KH">Cambodia</option>
                <option value="LA">Laos</option>
                <option value="BD">Bangladesh</option>
                <option value="PK">Pakistan</option>
                <option value="LK">Sri Lanka</option>
                <option value="NP">Nepal</option>
                <option value="BT">Bhutan</option>
                <option value="MV">Maldives</option>
                <option value="AF">Afghanistan</option>
                <option value="IR">Iran</option>
                <option value="IQ">Iraq</option>
                <option value="SA">Saudi Arabia</option>
                <option value="AE">United Arab Emirates</option>
                <option value="QA">Qatar</option>
                <option value="KW">Kuwait</option>
                <option value="BH">Bahrain</option>
                <option value="OM">Oman</option>
                <option value="YE">Yemen</option>
                <option value="JO">Jordan</option>
                <option value="LB">Lebanon</option>
                <option value="SY">Syria</option>
                <option value="IL">Israel</option>
                <option value="PS">Palestine</option>
                <option value="TR">Turkey</option>
                <option value="EG">Egypt</option>
                <option value="LY">Libya</option>
                <option value="TN">Tunisia</option>
                <option value="DZ">Algeria</option>
                <option value="MA">Morocco</option>
                <option value="SD">Sudan</option>
                <option value="ET">Ethiopia</option>
                <option value="KE">Kenya</option>
                <option value="UG">Uganda</option>
                <option value="TZ">Tanzania</option>
                <option value="RW">Rwanda</option>
                <option value="BI">Burundi</option>
                <option value="SS">South Sudan</option>
                <option value="ER">Eritrea</option>
                <option value="DJ">Djibouti</option>
                <option value="SO">Somalia</option>
                <option value="GH">Ghana</option>
                <option value="NG">Nigeria</option>
                <option value="CI">Ivory Coast</option>
                <option value="SN">Senegal</option>
                <option value="ML">Mali</option>
                <option value="BF">Burkina Faso</option>
                <option value="NE">Niger</option>
                <option value="TD">Chad</option>
                <option value="CM">Cameroon</option>
                <option value="CF">Central African Republic</option>
                <option value="CG">Republic of the Congo</option>
                <option value="CD">Democratic Republic of the Congo</option>
                <option value="GA">Gabon</option>
                <option value="GQ">Equatorial Guinea</option>
                <option value="ST">São Tomé and Príncipe</option>
                <option value="AO">Angola</option>
                <option value="ZM">Zambia</option>
                <option value="ZW">Zimbabwe</option>
                <option value="BW">Botswana</option>
                <option value="NA">Namibia</option>
                <option value="ZA">South Africa</option>
                <option value="LS">Lesotho</option>
                <option value="SZ">Eswatini</option>
                <option value="MG">Madagascar</option>
                <option value="MU">Mauritius</option>
                <option value="SC">Seychelles</option>
                <option value="KM">Comoros</option>
                <option value="MZ">Mozambique</option>
                <option value="MW">Malawi</option>
                <option value="ZW">Zimbabwe</option>
                <option value="RU">Russia</option>
                <option value="KZ">Kazakhstan</option>
                <option value="UZ">Uzbekistan</option>
                <option value="TM">Turkmenistan</option>
                <option value="TJ">Tajikistan</option>
                <option value="KG">Kyrgyzstan</option>
                <option value="MN">Mongolia</option>
                <option value="AM">Armenia</option>
                <option value="AZ">Azerbaijan</option>
                <option value="GE">Georgia</option>
                <option value="BY">Belarus</option>
                <option value="MD">Moldova</option>
                <option value="UA">Ukraine</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-[var(--card-border)]">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 text-cool-black bg-[var(--subtle-bg)] hover:bg-[var(--hover-bg)] rounded-full font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-tufts-blue hover:bg-cobalt-blue disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full font-medium transition-colors flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Adding...</span>
                  </>
                ) : (
                  <span>Add Bank Account</span>
                )}
              </button>
            </div>
          </form>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AddBankAccountPage;
