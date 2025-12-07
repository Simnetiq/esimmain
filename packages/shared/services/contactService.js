import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';

// Contact request data structure
const createContactRequestData = (requestData) => {
  return {
    name: requestData.name || '',
    email: requestData.email || '',
    message: requestData.message || '',
    status: 'new', // new, in_progress, resolved, closed
    priority: 'medium', // low, medium, high, urgent
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    resolvedAt: null,
    assignedTo: null,
    notes: []
  };
};

// Create a new contact request
export const createContactRequest = async (requestData) => {
  try {
    const contactRequest = createContactRequestData(requestData);
    const docRef = await addDoc(collection(db, 'contact_requests'), contactRequest);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating contact request:', error);
    throw error;
  }
};

// Get all contact requests
export const getContactRequests = async () => {
  try {
    const q = query(
      collection(db, 'contact_requests'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting contact requests:', error);
    throw error;
  }
};

// Get contact requests by status
export const getContactRequestsByStatus = async (status) => {
  try {
    const q = query(
      collection(db, 'contact_requests'),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting contact requests by status:', error);
    throw error;
  }
};

// Update contact request status
export const updateContactRequestStatus = async (requestId, status, notes = '') => {
  try {
    const requestRef = doc(db, 'contact_requests', requestId);
    const updateData = {
      status,
      updatedAt: serverTimestamp()
    };
    
    if (status === 'resolved' || status === 'closed') {
      updateData.resolvedAt = serverTimestamp();
    }
    
    if (notes) {
      updateData.notes = [notes];
    }
    
    await updateDoc(requestRef, updateData);
    return { success: true };
  } catch (error) {
    console.error('Error updating contact request status:', error);
    throw error;
  }
};

// Delete contact request
export const deleteContactRequest = async (requestId) => {
  try {
    await deleteDoc(doc(db, 'contact_requests', requestId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting contact request:', error);
    throw error;
  }
};

// Add note to contact request
export const addNoteToContactRequest = async (requestId, note) => {
  try {
    const requestRef = doc(db, 'contact_requests', requestId);
    await updateDoc(requestRef, {
      notes: [note],
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error adding note to contact request:', error);
    throw error;
  }
};
