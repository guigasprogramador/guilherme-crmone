'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SimpleLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Hardcoded credentials temporariamente
    if (email === 'admin@exemplo.com' && password === 'admin123') {
      // Login bem-sucedido - salvar no localStorage diretamente
      const user = {
        id: 'admin-1',
        name: 'Administrador',
        email: 'admin@exemplo.com',
        role: 'admin'
      };
      
      localStorage.setItem('user', JSON.stringify(user));
      
      // Redirecionar para o dashboard
      router.push('/dashboard');
    } else {
      setError('Credenciais inválidas');
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-center">Login Simplificado</h1>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <form onSubmit={handleLogin}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Senha
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>
        
        <div className="mb-6">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
        
        <div className="text-center text-sm">
          <p>
            Use as credenciais temporárias para testar:
            <br />
            Email: admin@exemplo.com
            <br />
            Senha: admin123
          </p>
        </div>
      </form>
    </div>
  );
}
