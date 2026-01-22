import axios from 'axios';

const API_URL = 'http://localhost:3000/api/clients';

export const getClients = async (token) => {
    const res = await axios.get(API_URL, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    return res.data;
};
