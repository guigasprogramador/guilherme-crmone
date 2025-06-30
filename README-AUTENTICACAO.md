# Módulo de Autenticação com Login Social e Controle de Acesso

Este módulo implementa um sistema de autenticação completo com as seguintes funcionalidades:

- Registro e login de usuários com email/senha
- Integração com Microsoft OAuth para login social
- Controle de acesso baseado em funções (RBAC)
- Armazenamento de avatares usando MinIO S3
- Tokens JWT para autenticação segura com refresh tokens

## Estrutura do Módulo

O módulo de autenticação é composto pelos seguintes componentes:

### Backend (API Routes)

- `/api/auth/register`: Registro de novos usuários
- `/api/auth/login`: Login com email e senha
- `/api/auth/refresh`: Renovação de tokens de acesso
- `/api/auth/microsoft`: Integração com Microsoft OAuth
- `/api/auth/microsoft/callback`: Callback para autenticação Microsoft
- `/api/auth/logout`: Encerramento de sessão
- `/api/auth/avatar`: Gerenciamento de avatares de usuário com MinIO S3
- `/api/users`: Gerenciamento de usuários (admin)
- `/api/users/[id]`: Operações em usuários específicos
- `/api/users/profile`: Gerenciamento de perfil de usuário
- `/api/users/preferences`: Gerenciamento de preferências de usuário

### Frontend (Componentes e Páginas)

- `/hooks/useAuth.tsx`: Context API para gerenciamento de autenticação
- `/app/auth/login/page.tsx`: Página de login
- `/app/auth/register/page.tsx`: Página de registro
- `/app/perfil/page.tsx`: Gerenciamento de perfil de usuário
- `/app/configuracoes/usuarios/page.tsx`: Painel de administração de usuários
- `/components/auth/protected-route.tsx`: Proteção de rotas baseado em autenticação
- `/components/auth/role-protected-route.tsx`: Proteção de rotas baseado em funções

### Banco de Dados (MySQL)

O esquema do banco de dados para autenticação está definido em `auth_mysql.sql`. Este arquivo contém as definições para as tabelas `users` e `refresh_tokens` utilizadas no sistema de autenticação MySQL.

## Configuração

### 2. Configuração do Microsoft OAuth

1. Registre um novo aplicativo no [Portal do Azure](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. Configure as seguintes variáveis de ambiente:

```
MICROSOFT_CLIENT_ID=seu-client-id
MICROSOFT_CLIENT_SECRET=seu-client-secret
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/auth/microsoft/callback
```

### 3. Configuração do MinIO S3

1. Instale e configure o [MinIO](https://min.io/) ou use um serviço compatível com S3
2. Configure as seguintes variáveis de ambiente:

```
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=sua-chave-de-acesso
MINIO_SECRET_KEY=sua-chave-secreta
MINIO_BUCKET_NAME=avatars
MINIO_PUBLIC_ENDPOINT=http://localhost:9000
```

### 4. Configuração de JWT

Configure as seguintes variáveis de ambiente para os tokens JWT:

```
JWT_SECRET=chave-secreta-para-tokens-jwt
JWT_REFRESH_SECRET=chave-secreta-para-refresh-tokens
```

### 5. Instalação de Dependências

As seguintes dependências foram adicionadas ao projeto:

```bash
npm install bcrypt jsonwebtoken jose @minio/minio-js
npm install -D @types/bcrypt @types/jsonwebtoken
```

## Níveis de Acesso

O sistema implementa três níveis de acesso principais:

1. **Administrador**: Acesso completo ao sistema, incluindo gerenciamento de usuários.
2. **Contador**: Acesso restrito a módulos específicos.
3. **Usuário**: Acesso básico ao sistema.

Os níveis de acesso são facilmente expansíveis através do banco de dados.

## Uso no Frontend

### Proteger uma Rota

```tsx
import ProtectedRoute from "@/components/auth/protected-route";

export default function SuaPagina() {
  return (
    <ProtectedRoute>
      {/* Conteúdo da página protegida */}
    </ProtectedRoute>
  );
}
```

### Proteger uma Rota com Função Específica

```tsx
import RoleProtectedRoute from "@/components/auth/role-protected-route";

export default function PaginaAdmin() {
  return (
    <RoleProtectedRoute allowedRoles="admin">
      {/* Conteúdo da página de administração */}
    </RoleProtectedRoute>
  );
}
```

### Usar o Hook de Autenticação

```tsx
import { useAuth } from "@/hooks/useAuth";

export default function SeuComponente() {
  const { user, login, logout, isAuthenticated, hasPermission } = useAuth();
  
  // Verificar se usuário tem permissão específica
  if (hasPermission("admin")) {
    // Fazer algo específico para admin
  }
  
  return (
    <div>
      {isAuthenticated ? (
        <button onClick={logout}>Sair</button>
      ) : (
        <button onClick={() => login("email@example.com", "senha")}>Entrar</button>
      )}
    </div>
  );
}
```

## Segurança

O sistema implementa diversas medidas de segurança:

- Senhas armazenadas com hash usando bcrypt
- Tokens JWT com expiração curta (1 hora)
- Refresh tokens armazenados em cookies HTTP-only
- Proteção contra XSS e CSRF
- Validação de dados com Zod
- Limpeza automática de tokens expirados

## Próximos Passos

Para expandir o módulo de autenticação, considere:

1. Adicionar mais provedores de login social (Google, GitHub, etc.)
2. Implementar autenticação de dois fatores (2FA)
3. Adicionar confirmação de email no registro
4. Implementar funcionalidade de recuperação de senha
5. Adicionar mais granularidade no controle de permissões
