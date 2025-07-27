import { Platform } from 'react-native';

// Configuration for API endpoints
const LOCAL_API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
const PRODUCTION_API_URL = 'https://codeonthego-backend.onrender.com';

// Determine which API URL to use based on environment
const getApiBaseUrl = () => {
  // Check if environment variable is set
  if (process.env.EXPO_PUBLIC_API_URL) {
    console.log('🌐 Using API URL from environment variable');
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // Check if we're in development mode
  const isDevelopment = __DEV__;
  
  if (isDevelopment) {
    console.log('🔧 Development mode detected, using local API');
    return LOCAL_API_URL;
  } else {
    console.log('🚀 Production mode detected, using production API');
    return PRODUCTION_API_URL;
  }
};

export const API_BASE_URL = getApiBaseUrl();

// Function to make API calls with automatic fallback
export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const primaryUrl = API_BASE_URL;
  const fallbackUrl = PRODUCTION_API_URL;
  
  console.log(`🔗 API Call Details:
  Endpoint: ${endpoint}
  Method: ${options.method || 'GET'}
  Primary URL: ${primaryUrl}
  Fallback URL: ${fallbackUrl}
  Platform: ${Platform.OS}
  `);
  
  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.log('⏰ Primary API call timed out after 60 seconds');
    }, 60000); // 60 second timeout for lesson generation
    
    const response = await fetch(`${primaryUrl}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      console.log(`✅ Primary API success: ${primaryUrl}`);
      return response;
    }

    // Log more details about the failed response
    console.log(`❌ Primary API failed with status: ${response.status}`);
    const errorText = await response.text();
    console.log(`Error details: ${errorText}`);
    
    throw new Error(`API responded with ${response.status}`);
  } catch (error: any) {
    console.log(`❌ Primary API failed: ${error.message}`);
    console.log(`🔄 Trying fallback API: ${fallbackUrl}${endpoint}`);
    
    try {
      const fallbackController = new AbortController();
      const fallbackTimeoutId = setTimeout(() => {
        fallbackController.abort();
        console.log('⏰ Fallback API call timed out after 60 seconds');
      }, 60000);
      
      const fallbackResponse = await fetch(`${fallbackUrl}${endpoint}`, {
        ...options,
        signal: fallbackController.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      clearTimeout(fallbackTimeoutId);
      
      if (fallbackResponse.ok) {
        console.log(`✅ Fallback API success: ${fallbackUrl}`);
        return fallbackResponse;
      }

      // Log more details about the failed fallback response
      console.log(`❌ Fallback API failed with status: ${fallbackResponse.status}`);
      const errorText = await fallbackResponse.text();
      console.log(`Error details: ${errorText}`);
      
      throw new Error(`Fallback API responded with ${fallbackResponse.status}`);
    } catch (fallbackError: any) {
      console.log(`❌ Both APIs failed. Last error: ${fallbackError.message}`);
      throw new Error(`Both primary (${primaryUrl}) and fallback (${fallbackUrl}) APIs failed: ${fallbackError.message}`);
    }
  }
}

// Simple function for cases where you just need the URL
export function getApiUrl(endpoint: string = '') {
  return `${API_BASE_URL}${endpoint}`;
}

// Log API configuration on startup
console.log(`🌐 API Configuration:
  Platform: ${Platform.OS}
  Primary URL: ${LOCAL_API_URL} ${Platform.OS === 'android' ? '(Android Emulator)' : '(localhost)'}
  Fallback URL: ${PRODUCTION_API_URL} (render.com)
`);
