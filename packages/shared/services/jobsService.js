/**
 * Jobs Service - Supabase version
 */

import { getSupabase, isSupabaseAvailable } from '../lib/supabase';

export const createJobApplication = async (applicationData) => {
  try {
    const supabase = getSupabase();
    let resumeUrl = null;
    let resumeFileName = null;

    // Upload resume file if provided
    if (applicationData.resume) {
      const fileName = `${Date.now()}_${applicationData.resume.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('job-applications')
        .upload(`resumes/${fileName}`, applicationData.resume);

      if (uploadError) throw new Error(`Failed to upload resume: ${uploadError.message}`);

      const { data: urlData } = supabase.storage
        .from('job-applications')
        .getPublicUrl(`resumes/${fileName}`);

      resumeUrl = urlData.publicUrl;
      resumeFileName = applicationData.resume.name;
    }

    const applicationDoc = {
      name: applicationData.name,
      email: applicationData.email,
      phone: applicationData.phone,
      position: applicationData.position,
      resume_url: resumeUrl,
      resume_file_name: resumeFileName,
      status: 'pending'
    };

    const { data, error } = await supabase
      .from('job_applications')
      .insert(applicationDoc)
      .select()
      .single();

    if (error) throw new Error(`Failed to create job application: ${error.message}`);
    return { id: data.id, ...data };
  } catch (error) {
    throw new Error(`Failed to create job application: ${error.message}`);
  }
};

export const getJobApplications = async () => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('job_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get job applications: ${error.message}`);

    return (data || []).map(row => ({
      id: row.id,
      ...row,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date()
    }));
  } catch (error) {
    throw new Error(`Failed to get job applications: ${error.message}`);
  }
};

export const updateJobApplicationStatus = async (applicationId, newStatus) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('job_applications')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', applicationId);

    if (error) throw new Error(`Failed to update job application status: ${error.message}`);
    return true;
  } catch (error) {
    throw new Error(`Failed to update job application status: ${error.message}`);
  }
};

export const deleteJobApplication = async (applicationId) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('job_applications').delete().eq('id', applicationId);
    if (error) throw new Error(`Failed to delete job application: ${error.message}`);
    return true;
  } catch (error) {
    throw new Error(`Failed to delete job application: ${error.message}`);
  }
};

export const getJobApplicationStats = async () => {
  try {
    const applications = await getJobApplications();
    return {
      total: applications.length,
      pending: applications.filter(app => app.status === 'pending').length,
      reviewed: applications.filter(app => app.status === 'reviewed').length,
      contacted: applications.filter(app => app.status === 'contacted').length,
      rejected: applications.filter(app => app.status === 'rejected').length,
      hired: applications.filter(app => app.status === 'hired').length
    };
  } catch (error) {
    throw new Error(`Failed to get job application stats: ${error.message}`);
  }
};
