'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BypassLogin() {
  const [email, setEmail] = useState('admin@exemplo.com');
  const [name, setName] = useState('Administrador');
  const [role, setRole] = useState('admin');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Checar se já existe um usuário logado
    const storedUser = localStorage.getItem('bypass_user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setMessage(`Já existe um usuário logado: ${userData.name}`);
      } catch (e) {
        console.error('Erro ao parsear usuário:', e);
      }
    }
  }, []);

  const handleDirectLogin = () => {
    setLoading(true);
    try {
      // Criar um usuário diretamente no localStorage
      const user = {
        id: 'user-' + Date.now(),
        name: name || 'Administrador',
        email: email || 'admin@exemplo.com',
        role: role || 'admin',
        timestamp: new Date().toISOString()
      };
      
      // Salvar no localStorage
      localStorage.setItem('bypass_user', JSON.stringify(user));
      
      // Atualizar mensagem
      setMessage(`Login realizado com sucesso como ${user.name} (${user.role})`);
      
      // Redirecionar após um pequeno delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (error) {
      setMessage('Erro ao fazer login: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('bypass_user');
    setMessage('Logout realizado com sucesso');
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4 text-center">Login Direto</h1>
      <p className="mb-4 text-gray-600 text-center">
        Esta página permite fazer login diretamente sem validação, apenas para desenvolvimento.
      </p>
      
      {message && (
        <div className="mb-4 p-3 bg-blue-100 text-blue-700 rounded">
          {message}
        </div>
      )}
      
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Nome
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
        />
      </div>
      
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
        />
      </div>
      
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Perfil
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
        >
          <option value="admin">Administrador</option>
          <option value="contador">Contador</option>
          <option value="user">Usuário</option>
        </select>
      </div>
      
      <div className="flex space-x-2 mt-6">
        <button
          onClick={handleDirectLogin}
          disabled={loading}
          className="flex-1 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          {loading ? 'Processando...' : 'Login Direto'}
        </button>
        
        <button
          onClick={handleLogout}
          className="flex-1 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          Logout
        </button>
      </div>
      
      <div className="mt-4 text-center">
        <Link href="/dashboard" className="text-blue-500 hover:text-blue-700">
          Ir para Dashboard
        </Link>
      </div>
    </div>
  );
}
