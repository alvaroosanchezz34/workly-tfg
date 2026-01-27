export const refreshToken = (req, res) => {
    const { refreshToken } = req.body;

    try {
        const decoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET
        );

        const newAccessToken = jwt.sign(
            { id: decoded.id },
            process.env.JWT_SECRET,
            { expiresIn: "30m" }
        );

        res.json({ accessToken: newAccessToken });
    } catch (error) {
        return res.status(401).json({ message: "Refresh inválido" });
    }
};
