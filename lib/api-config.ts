import { Platform } from 'react-native';

// Configuration for API endpoints
const LOCAL_API_URL = 'http://localhost:3000';
const PRODUCTION_API_URL = 'https://codeonthego-backend.onrender.com';

// Always use localhost as primary, render.com as fallback
const getApiBaseUrl = () => {
  return LOCAL_API_URL;
};

export const API_BASE_URL = getApiBaseUrl();

// Function to make API calls with automatic fallback
export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const primaryUrl = LOCAL_API_URL; // Always try localhost first
  const fallbackUrl = PRODUCTION_API_URL; // Always use render.com as fallback
  
  console.log(`🔗 Trying primary API: ${primaryUrl}${endpoint}`);
  
  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(`${primaryUrl}${endpoint}`, {
      ...options,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      console.log(`✅ Primary API success: ${primaryUrl}`);
      return response;
    }
    throw new Error(`API responded with ${response.status}`);
  } catch (error) {
    console.log(`❌ Primary API failed: ${error}`);
    console.log(`🔄 Trying fallback API: ${fallbackUrl}${endpoint}`);
    
    try {
      const fallbackController = new AbortController();
      const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 10000);
      
      const fallbackResponse = await fetch(`${fallbackUrl}${endpoint}`, {
        ...options,
        signal: fallbackController.signal,
      });
      
      clearTimeout(fallbackTimeoutId);
      
      if (fallbackResponse.ok) {
        console.log(`✅ Fallback API success: ${fallbackUrl}`);
        return fallbackResponse;
      }
      throw new Error(`Fallback API responded with ${fallbackResponse.status}`);
    } catch (fallbackError) {
      console.log(`❌ Both APIs failed`);
      throw new Error(`Both primary (${primaryUrl}) and fallback (${fallbackUrl}) APIs failed`);
    }
  }
}

// Simple function for cases where you just need the URL
export function getApiUrl(endpoint: string = '') {
  return `${API_BASE_URL}${endpoint}`;
}

console.log(`🌐 API Configuration:
  Platform: ${Platform.OS}
  Primary URL: ${LOCAL_API_URL} (localhost)
  Fallback URL: ${PRODUCTION_API_URL} (render.com)
`);
