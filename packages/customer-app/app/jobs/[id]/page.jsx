'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Clock, 
  ArrowLeft,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const JobDetailsPage = () => {
  const params = useParams();
  const jobId = params.id;

  // Job position data (same as in jobs page)
  const jobPosition = {
    id: 1,
    title: 'Sales Development Representative',
    location: 'Remote',
    type: 'Part-time',
    description: 'We are looking for a motivated Sales Development Representative to join our team and help us expand our global reach. Earn 17% commission on every transaction based on your skills. Be your own boss with a 1-year contract.',
    requirements: [
      '1 year sales experience',
      '17% revenue commission structure',
      '1 year contract commitment',
      'Excellent communication skills',
      'Self-motivated and results-driven'
    ]
  };

  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <Link 
            href="/jobs"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Jobs
          </Link>
        </motion.div>

        {/* Job Details */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-white border border-gray-200 rounded-2xl shadow-lg p-8"
        >
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {jobPosition.title}
            </h1>
            <div className="flex items-center space-x-6 text-gray-600">
              <div className="flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                <span>{jobPosition.location}</span>
              </div>
              <div className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                <span>{jobPosition.type}</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Job Description</h2>
              <p className="text-gray-600 leading-relaxed">{jobPosition.description}</p>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Requirements</h2>
              <ul className="space-y-3">
                {jobPosition.requirements.map((req, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="flex space-x-4">
              <Link
                href="/jobs"
                className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-300 transition-colors duration-200 text-center"
              >
                Back to Jobs
              </Link>
              <Link
                href={`/jobs/${jobId}/apply`}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 text-center"
              >
                Apply for this Position
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default JobDetailsPage;
