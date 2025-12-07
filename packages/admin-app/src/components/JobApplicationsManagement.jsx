'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { getJobApplications, updateJobApplicationStatus, deleteJobApplication } from '@esim/shared/services/jobsService';
import {
  Search,
  Briefcase,
  User,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';

const JobApplicationsManagement = () => {
  const { currentUser } = useAuth();

  // State Management
  const [jobApplications, setJobApplications] = useState([]);
  const [filteredJobApplications, setFilteredJobApplications] = useState([]);
  const [jobSearchTerm, setJobSearchTerm] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  // Load data on component mount
  useEffect(() => {
    if (currentUser) {
      loadJobApplications();
    }
  }, [currentUser]);

  // Filter job applications based on search and status
  useEffect(() => {
    let filtered = jobApplications.filter(application => 
      application.name?.toLowerCase().includes(jobSearchTerm.toLowerCase()) ||
      application.email?.toLowerCase().includes(jobSearchTerm.toLowerCase()) ||
      application.position?.toLowerCase().includes(jobSearchTerm.toLowerCase()) ||
      application.status?.toLowerCase().includes(jobSearchTerm.toLowerCase())
    );
    
    if (jobStatusFilter !== 'all') {
      filtered = filtered.filter(application => application.status === jobStatusFilter);
    }
    
    setFilteredJobApplications(filtered);
  }, [jobApplications, jobSearchTerm, jobStatusFilter]);

  // Job Applications Management Functions
  const loadJobApplications = async () => {
    try {
      setLoading(true);
      const applications = await getJobApplications();
      setJobApplications(applications);
      setFilteredJobApplications(applications);
    } catch {
      toast.error('Failed to load job applications');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateJobApplicationStatus = async (applicationId, newStatus) => {
    try {
      setLoading(true);
      await updateJobApplicationStatus(applicationId, newStatus);
      toast.success(`Application status updated to ${newStatus}`);
      await loadJobApplications();
    } catch {
      toast.error('Failed to update job application status');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJobApplication = async (applicationId, applicantName) => {
    if (!window.confirm(`Delete job application from ${applicantName}? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      await deleteJobApplication(applicationId);
      toast.success('Job application deleted successfully');
      await loadJobApplications();
    } catch {
      toast.error('Failed to delete job application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Job Applications</h2>
        <p className="text-gray-600 mt-1">Manage candidate applications and hiring pipeline</p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search applications by name, email, or position..."
            value={jobSearchTerm}
            onChange={(e) => setJobSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <select
          value={jobStatusFilter}
          onChange={(e) => setJobStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="contacted">Contacted</option>
          <option value="rejected">Rejected</option>
          <option value="hired">Hired</option>
        </select>
      </div>

      {/* Applications Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600 text-sm">Loading job applications...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applicant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applied
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredJobApplications.length > 0 ? (
                  filteredJobApplications.map((application) => (
                    <tr key={application.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <User className="w-5 h-5 text-gray-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {application.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {application.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Briefcase className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{application.position}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{application.phone}</div>
                        <div className="text-sm text-gray-500">{application.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          application.status === 'pending' 
                            ? 'bg-yellow-100 text-yellow-800'
                            : application.status === 'reviewed'
                            ? 'bg-purple-100 text-purple-800'
                            : application.status === 'contacted'
                            ? 'bg-green-100 text-green-800'
                            : application.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : application.status === 'hired'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {application.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {application.createdAt ? new Date(application.createdAt).toLocaleDateString() : 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {application.resumeUrl && (
                            <a
                              href={application.resumeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded text-xs transition-colors"
                              title="View Resume"
                            >
                              <ExternalLink className="w-3 h-3 inline mr-1" />
                              Resume
                            </a>
                          )}
                          <select
                            value={application.status || 'pending'}
                            onChange={(e) => handleUpdateJobApplicationStatus(application.id, e.target.value)}
                            className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="pending">Pending</option>
                            <option value="reviewed">Reviewed</option>
                            <option value="contacted">Contacted</option>
                            <option value="rejected">Rejected</option>
                            <option value="hired">Hired</option>
                          </select>
                          <button
                            onClick={() => handleDeleteJobApplication(application.id, application.name)}
                            className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded text-xs transition-colors"
                            title="Delete application"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <Briefcase className="w-10 h-10 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No job applications found</h3>
                      <p className="text-gray-600">
                        {jobSearchTerm ? 'Try adjusting your search terms' : 'Applications will appear here when candidates apply'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobApplicationsManagement;
