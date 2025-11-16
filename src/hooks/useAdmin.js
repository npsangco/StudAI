import { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../config/api.config";

export function useAdmin() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/auth/check-admin`, {
                    withCredentials: true,
                });
                setIsAdmin(res.data.isAdmin);
            } catch (err) {
                console.error("Admin check error:", err);
                setError(err);
                setIsAdmin(false);
            } finally {
                setLoading(false);
            }
        };

        checkAdmin();
    }, []);

    return { isAdmin, loading, error };
}