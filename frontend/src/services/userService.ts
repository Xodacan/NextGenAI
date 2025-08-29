import { getIdToken } from '../firebase/auth';

const API_BASE_URL = 'http://localhost:8000/api/auth';

interface UserProfile {
  display_name: string;
  email: string;
  institution: string;
  created_at: string;
  updated_at: string;
}

interface ProfileUpdateData {
  display_name?: string;
  institution?: string;
}

interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
}

interface EmailChangeData {
  newEmail: string;
  currentPassword: string;
}

// Helper function to get auth headers
const getAuthHeaders = async () => {
  const token = await getIdToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

// Get user profile
export const getUserProfile = async (): Promise<UserProfile> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/profile/`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.profile;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

// Update user profile
export const updateUserProfile = async (profileData: ProfileUpdateData): Promise<UserProfile> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/profile/`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.profile;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Change password
export const changePassword = async (passwordData: PasswordChangeData): Promise<void> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/change-password/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(passwordData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error changing password:', error);
    throw error;
  }
};

// Change email
export const changeEmail = async (emailData: EmailChangeData): Promise<void> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/change-email/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error changing email:', error);
    throw error;
  }
};
