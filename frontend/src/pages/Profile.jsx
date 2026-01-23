import { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { updateProfile } from '../api/users';
import Sidebar from '../components/Sidebar';

const Profile = () => {
    const { token, user, login } = useContext(AuthContext);

    const [form, setForm] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        company_name: user?.company_name || '',
        avatar_url: user?.avatar_url || '',
        language: user?.language || 'es',
        timezone: user?.timezone || 'Europe/Madrid',
    });

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(false);

        try {
            const updatedUser = await updateProfile(token, form);

            // 🔑 actualizar contexto + localStorage
            login(token, updatedUser);

            setSuccess(true);
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen">
            <Sidebar />

            <main className="ml-64 p-8 max-w-3xl">
                <h2 className="text-2xl font-semibold text-slate-800 mb-6">
                    Perfil de usuario
                </h2>

                <form
                    onSubmit={handleSubmit}
                    className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
                >
                    {success && (
                        <p className="text-green-600 text-sm">
                            Perfil actualizado correctamente
                        </p>
                    )}

                    <Input
                        label="Nombre"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                    />

                    <Input
                        label="Email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                    />

                    <Input
                        label="Teléfono"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                    />

                    <Input
                        label="Empresa"
                        name="company_name"
                        value={form.company_name}
                        onChange={handleChange}
                    />

                    <Input
                        label="Avatar (URL)"
                        name="avatar_url"
                        value={form.avatar_url}
                        onChange={handleChange}
                    />

                    <div className="flex gap-4">
                        <Select
                            label="Idioma"
                            name="language"
                            value={form.language}
                            onChange={handleChange}
                            options={[
                                { value: 'es', label: 'Español' },
                                { value: 'en', label: 'English' },
                            ]}
                        />

                        <Select
                            label="Zona horaria"
                            name="timezone"
                            value={form.timezone}
                            onChange={handleChange}
                            options={[
                                { value: 'Europe/Madrid', label: 'Europe/Madrid' },
                                { value: 'Europe/London', label: 'Europe/London' },
                            ]}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg transition"
                    >
                        {loading ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                </form>
            </main>
        </div>
    );
};

export default Profile;

/* COMPONENTES AUX */
const Input = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
            {label}
        </label>
        <input
            {...props}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
    </div>
);

const Select = ({ label, options, ...props }) => (
    <div className="flex-1">
        <label className="block text-sm font-medium text-slate-700 mb-1">
            {label}
        </label>
        <select
            {...props}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
            {options.map(opt => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    </div>
);
