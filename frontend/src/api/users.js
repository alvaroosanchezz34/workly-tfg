export const updateProfile = async (token, profileData) => {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/users/profile`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(profileData),
    }
  );

  if (!res.ok) {
    throw new Error('Error al actualizar el perfil');
  }

  return res.json();
};
