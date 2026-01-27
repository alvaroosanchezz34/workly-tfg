const logoutHard = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("loginTime");
    window.location.href = "/login";
};

export const fetchWithAuth = async (url, token, options = {}) => {
    let res = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            Authorization: `Bearer ${token}`,
        },
    });

    if (res.status === 401) {
        const refreshToken = localStorage.getItem("refreshToken");

        if (!refreshToken) {
            logoutHard();
            throw new Error("Sesión expirada");
        }

        const refreshRes = await fetch(
            `${import.meta.env.VITE_API_URL}/auth/refresh`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken }),
            }
        );

        if (!refreshRes.ok) {
            logoutHard();
            throw new Error("Refresh inválido");
        }

        const data = await refreshRes.json();

        localStorage.setItem("token", data.accessToken);

        res = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                Authorization: `Bearer ${data.accessToken}`,
            },
        });
    }

    return res;
};
