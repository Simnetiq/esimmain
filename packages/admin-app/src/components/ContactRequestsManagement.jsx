'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { getContactRequests, updateContactRequestStatus, deleteContactRequest } from '@esim/shared/services/contactService';
import {
  Search,
  MessageSquare,
  Eye,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

const ContactRequestsManagement = () => {
  const { currentUser } = useAuth();

  // State Management
  const [contactRequests, setContactRequests] = useState([]);
  const [filteredContactRequests, setFilteredContactRequests] = useState([]);
  const [contactRequestSearchTerm, setContactRequestSearchTerm] = useState('');
  const [contactRequestStatusFilter, setContactRequestStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedContactRequest, setSelectedContactRequest] = useState(null);

  // Load data on component mount
  useEffect(() => {
    if (currentUser) {
      loadContactRequests();
    }
  }, [currentUser]);

  // Filter contact requests based on search and status
  useEffect(() => {
    let filtered = contactRequests.filter(request => 
      request.name?.toLowerCase().includes(contactRequestSearchTerm.toLowerCase()) ||
      request.email?.toLowerCase().includes(contactRequestSearchTerm.toLowerCase()) ||
      request.message?.toLowerCase().includes(contactRequestSearchTerm.toLowerCase())
    );
    
    if (contactRequestStatusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === contactRequestStatusFilter);
    }
    
    setFilteredContactRequests(filtered);
  }, [contactRequests, contactRequestSearchTerm, contactRequestStatusFilter]);

  // Contact Requests Management Functions
  const loadContactRequests = async () => {
    try {
      setLoading(true);
      const requests = await getContactRequests();
      setContactRequests(requests);
      setFilteredContactRequests(requests);
    } catch {
      toast.error('Failed to load contact requests');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRequestStatus = async (requestId, newStatus) => {
    try {
      setLoading(true);
      await updateContactRequestStatus(requestId, newStatus);
      toast.success(`Request status updated to ${newStatus}`);
      await loadContactRequests();
    } catch {
      toast.error('Failed to update request status');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContactRequest = async (requestId, requestName) => {
    if (!window.confirm(`Are you sure you want to delete the contact request from ${requestName || 'this user'}?`)) {
      return;
    }

    try {
      setLoading(true);
      await deleteContactRequest(requestId);
      toast.success('Contact request deleted successfully');
      await loadContactRequests();
    } catch (error) {
      console.error('❌  Error deleting contact request:', error);
      toast.error(`Error deleting contact request: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle opening contact request modal
  const handleViewContactRequest = (request) => {
    setSelectedContactRequest(request);
    setShowContactModal(true);
  };

  // Handle closing contact request modal
  const handleCloseContactModal = () => {
    setShowContactModal(false);
    setSelectedContactRequest(null);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Contact Requests</h2>
        <p className="text-gray-600 mt-1">Manage customer inquiries and support requests</p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search requests by name, email, or message..."
            value={contactRequestSearchTerm}
            onChange={(e) => setContactRequestSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <select
          value={contactRequestStatusFilter}
          onChange={(e) => setContactRequestStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
        >
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Requests Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600 text-sm">Loading contact requests...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContactRequests.length > 0 ? (
                  filteredContactRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleViewContactRequest(request)}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {request.name?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {request.name || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {request.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {request.message}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          request.status === 'new' 
                            ? 'bg-blue-100 text-blue-800'
                            : request.status === 'in_progress'
                            ? 'bg-yellow-100 text-yellow-800'
                            : request.status === 'resolved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {request.status?.replace('_', ' ') || 'unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {request.createdAt ? new Date(request.createdAt.toDate()).toLocaleDateString() : 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewContactRequest(request);
                            }}
                            className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded text-xs transition-colors flex items-center"
                            title="View full details"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </button>
                          <select
                            value={request.status || 'new'}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleUpdateRequestStatus(request.id, e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="new">New</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                          </select>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteContactRequest(request.id, request.name);
                            }}
                            className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded text-xs transition-colors"
                            title="Delete request"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      <MessageSquare className="w-10 h-10 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No contact requests found</h3>
                      <p className="text-gray-600">
                        {contactRequestSearchTerm ? 'Try adjusting your search terms' : 'Contact requests will appear here'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Contact Request Details Modal */}
      {showContactModal && selectedContactRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Contact Request Details
                </h3>
                <button
                  onClick={handleCloseContactModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Contact Information */}
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Contact Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                        Name
                      </label>
                      <p className="text-sm text-gray-900">{selectedContactRequest.name || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                        Email
                      </label>
                      <p className="text-sm text-gray-900">{selectedContactRequest.email || 'Not provided'}</p>
                    </div>
                    {selectedContactRequest.phone && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                          Phone
                        </label>
                        <p className="text-sm text-gray-900">{selectedContactRequest.phone}</p>
                      </div>
                    )}
                    {selectedContactRequest.company && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                          Company
                        </label>
                        <p className="text-sm text-gray-900">{selectedContactRequest.company}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Request Details */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Request Details</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                        Subject
                      </label>
                      <p className="text-sm text-gray-900">{selectedContactRequest.subject || 'No subject'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                        Message
                      </label>
                      <div className="bg-white border border-gray-200 rounded-md p-3">
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">
                          {selectedContactRequest.message || 'No message provided'}
                        </p>
                      </div>
                    </div>
                    {selectedContactRequest.category && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                          Category
                        </label>
                        <p className="text-sm text-gray-900">{selectedContactRequest.category}</p>
                      </div>
                    )}
                    {selectedContactRequest.priority && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                          Priority
                        </label>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          selectedContactRequest.priority === 'high' ? 'bg-red-100 text-red-800' :
                          selectedContactRequest.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {selectedContactRequest.priority}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status and Metadata */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Status & Metadata</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                        Status
                      </label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedContactRequest.status === 'new' ? 'bg-blue-100 text-blue-800' :
                        selectedContactRequest.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        selectedContactRequest.status === 'resolved' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedContactRequest.status || 'new'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                        Submitted
                      </label>
                      <p className="text-sm text-gray-900">
                        {selectedContactRequest.createdAt ? 
                          new Date(selectedContactRequest.createdAt.toDate()).toLocaleString() : 
                          'Unknown'
                        }
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                        Request ID
                      </label>
                      <p className="text-sm text-gray-900 font-mono">{selectedContactRequest.id}</p>
                    </div>
                    {selectedContactRequest.userAgent && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                          User Agent
                        </label>
                        <p className="text-xs text-gray-600 break-all">{selectedContactRequest.userAgent}</p>
                      </div>
                    )}
                    {selectedContactRequest.ipAddress && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                          IP Address
                        </label>
                        <p className="text-sm text-gray-900">{selectedContactRequest.ipAddress}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-3">
                    <label className="text-sm font-medium text-gray-700">Update Status:</label>
                    <select
                      value={selectedContactRequest.status || 'new'}
                      onChange={(e) => {
                        handleUpdateRequestStatus(selectedContactRequest.id, e.target.value);
                        setSelectedContactRequest({...selectedContactRequest, status: e.target.value});
                      }}
                      className="text-sm px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="new">New</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        handleDeleteContactRequest(selectedContactRequest.id, selectedContactRequest.name);
                        handleCloseContactModal();
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Delete Request
                    </button>
                    <button
                      onClick={handleCloseContactModal}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactRequestsManagement;
