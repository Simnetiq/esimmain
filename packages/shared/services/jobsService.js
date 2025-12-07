import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const storage = getStorage();

// Create a new job application
export const createJobApplication = async (applicationData) => {
  try {
    let resumeUrl = null;
    
    // Upload resume file if provided
    if (applicationData.resume) {
      const resumeRef = ref(storage, `job-applications/resumes/${Date.now()}_${applicationData.resume.name}`);
      const uploadResult = await uploadBytes(resumeRef, applicationData.resume);
      resumeUrl = await getDownloadURL(uploadResult.ref);
    }

    // Create application document
    const applicationDoc = {
      name: applicationData.name,
      email: applicationData.email,
      phone: applicationData.phone,
      position: applicationData.position,
      resumeUrl: resumeUrl,
      resumeFileName: applicationData.resume?.name || null,
      status: 'pending', // pending, reviewed, contacted, rejected, hired
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'jobApplications'), applicationDoc);
    
    return { id: docRef.id, ...applicationDoc };
  } catch (error) {
    throw new Error(`Failed to create job application: ${error.message}`);
  }
};

// Get all job applications (for admin)
export const getJobApplications = async () => {
  try {
    const applicationsRef = collection(db, 'jobApplications');
    const q = query(applicationsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const applications = [];
    querySnapshot.forEach((doc) => {
      applications.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      });
    });
    
    return applications;
  } catch (error) {
    throw new Error(`Failed to get job applications: ${error.message}`);
  }
};

// Update job application status (for admin)
export const updateJobApplicationStatus = async (applicationId, newStatus) => {
  try {
    const { doc, updateDoc } = await import('firebase/firestore');
    const applicationRef = doc(db, 'jobApplications', applicationId);
    
    await updateDoc(applicationRef, {
      status: newStatus,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    throw new Error(`Failed to update job application status: ${error.message}`);
  }
};

// Delete job application (for admin)
export const deleteJobApplication = async (applicationId) => {
  try {
    const { doc, deleteDoc } = await import('firebase/firestore');
    const applicationRef = doc(db, 'jobApplications', applicationId);
    
    await deleteDoc(applicationRef);
    
    return true;
  } catch (error) {
    throw new Error(`Failed to delete job application: ${error.message}`);
  }
};

// Get job application statistics (for admin)
export const getJobApplicationStats = async () => {
  try {
    const applications = await getJobApplications();
    
    const stats = {
      total: applications.length,
      pending: applications.filter(app => app.status === 'pending').length,
      reviewed: applications.filter(app => app.status === 'reviewed').length,
      contacted: applications.filter(app => app.status === 'contacted').length,
      rejected: applications.filter(app => app.status === 'rejected').length,
      hired: applications.filter(app => app.status === 'hired').length
    };
    
      return stats;
  } catch (error) {
    throw new Error(`Failed to get job application stats: ${error.message}`);
  }
};
