import { Track, Album, Artist, User, ErrorResponse } from '@/types'; // Import necessary types

if (!process.env.NEXT_PUBLIC_BACKEND_URL) {
  throw new Error("Backend URL is not defined in .env.local");
}
export const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

export const handleResponse = async <T = any>(response: Response): Promise<T> => {
  if (!response.ok) {
    const clonedResponse = response.clone();
    try {
      let errorData: ErrorResponse;
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        errorData = await response.json();
        // Handle validation errors specifically if status is 400
        if (response.status === 400 && errorData.errors) {
          const validationErrors = Object.values(errorData.errors).join(', ');
          throw new Error(`Validation error: ${validationErrors}`);
        }
      } else {
        errorData = { message: await clonedResponse.text() };
      }

      console.error('Error response:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
      });

      const errorMessage = errorData.message || 'Unknown error occurred';
      throw new Error(`Error ${response.status}: ${errorMessage}`);
    } catch (error) {
      console.error('Error parsing response:', error);
      throw new Error(`Error parsing server response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  return response.json() as Promise<T>;
};

export const register = async (data: { name?: string; email: string; password: string }) => {
  const { name, email, password } = data;
  try {
    const response = await fetch(`${backendUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    return await handleResponse(response);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error during registration:', error.message);
    } else {
      console.error('Unknown error occurred during registration');
    }
    throw error;
  }
};


export const getToken = () => {
  // Retrieve the JWT token from localStorage
  const token = localStorage.getItem('token');
  return token || '';  // Return the token, or an empty string if it's not found
};

export const validateToken = async () => {
  const token = localStorage.getItem('token');
  console.log("Validating token from localStorage:", token);

  if (!token) {
    throw new Error('No token found in localStorage');
  }

  try {
    const response = await fetch(`${backendUrl}/auth/validateToken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      throw new Error(`Token validation failed with status: ${response.status}`);
    }

    const jsonResponse = await response.json();
    console.log("Response from validateToken:", jsonResponse);

    return jsonResponse;
  } catch (error) {
    console.error('Error validating token:', error);
    throw error;
  }
};


export const login = async (email: string, password: string) => {
  console.log("Login request data:", { email, password });

  try {
    const response = await fetch(`${backendUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.message || 'Login failed';
      console.error('Login error:', errorMessage);
      throw new Error(`Error ${response.status}: ${errorMessage}`);
    }

    const data = await response.json();
    console.log("Login response data:", data);

    if (!data || !data.access_token) {
      console.error('Invalid response structure:', data);
      throw new Error('Login response does not include token');
    }

    localStorage.setItem('token', data.access_token);
    console.log('Token stored:', localStorage.getItem('token'));

    return data; // Return the entire data object for further inspection
  } catch (error) {
    console.error('Error during login:', error);
    throw error;
  }
};



export const logout = async () => {
  const refreshToken = localStorage.getItem('refreshToken'); // Retrieve the refresh token
  try {
    const response = await fetch(`${backendUrl}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${refreshToken}`, // Use the refresh token
      },
    });
    return await handleResponse(response);
  } catch (error: any) {
    console.error('Error during logout:', error.message);
    throw error;
  }
};

export const deleteAccount = async (userId: number) => {
  const token = getToken();
  try {
    const response = await fetch(`${backendUrl}/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`, // Include the JWT token here
      },
    });
    return await handleResponse(response);
  } catch (error: any) {
    console.error(`Error deleting account for user ID ${userId}:`, error.message);
    throw error;
  }
};

export const fetchTracks = async (): Promise<Track[]> => {
  try {
    const response = await fetch(`${backendUrl}/tracks`);

    // Log the response status and status text
    console.log(`Response status: ${response.status}, status text: ${response.statusText}`);

    // Handle the response and parse it as JSON
    const tracks = await handleResponse<Track[]>(response);

    // Log the fetched tracks
    console.log('Tracks fetched:', tracks);

    return tracks;
  } catch (error) {
    // Log the error with more details
    console.error('Error fetching tracks:', error);

    if (error instanceof Error) {
      throw new Error(`Fetching tracks failed: ${error.message}`);
    } else {
      throw new Error('Unknown error occurred while fetching tracks');
    }
  }
};

export const uploadTrack = async (formData: FormData) => {
  console.log("Preparing to upload file");

  // Log the contents of formData for debugging
  // Convert formData keys to an array and log them
  const formDataKeys = Array.from(formData.keys());
  for (const key of formDataKeys) {
    console.log(key, formData.get(key));
  }

  try {
    console.log("Sending upload request to server");
    const response = await fetch(`${backendUrl}/tracks/upload`, {
      method: 'POST',
      body: formData,
    });

    console.log("Received response from upload request", response);

    if (!response.ok) {
      console.error('Response status:', response.status);
      const errorData = await response.json();
      console.error('Response error data:', errorData);
      throw new Error(errorData.message || 'Error uploading track');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error uploading track:', error.message);
    throw error;
  }
};

export const deleteTrack = async (id: number) => {
  try {
    const response = await fetch(`${backendUrl}/tracks/${id}`, {
      method: 'DELETE',
    });
    await handleResponse(response);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`Error deleting track with ID ${id}:`, error.message);
    } else {
      console.error('Unknown error occurred:', error);
    }
    throw error;
  }
};

// Metadata functionality
export const updateTrackMetadata = async (trackId: number, updatedData: Partial<Track>) => {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL as string;
  const response = await fetch(`${backendUrl}/tracks/${trackId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updatedData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error updating track');
  }

  return response.json();
};


// Artists and albums functionality
export const fetchArtists = async (): Promise<Artist[]> => {
  const response = await fetch(`${backendUrl}/artists`);
  return handleResponse(response);
};

export const fetchAlbums = async (): Promise<Album[]> => {
  const response = await fetch(`${backendUrl}/albums`);
  return handleResponse(response);
};

export const createArtist = async (artistData: Partial<Artist>): Promise<Artist> => {
  const response = await fetch(`${backendUrl}/artists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(artistData),
  });
  return handleResponse(response);
};

export const createAlbum = async (albumData: Partial<Album>): Promise<Album> => {
  const response = await fetch(`${backendUrl}/albums`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(albumData),
  });
  return handleResponse(response);
};
