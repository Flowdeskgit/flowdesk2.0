import React from 'react';

const UserNotRegisteredError = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="max-w-md w-full p-8 bg-card rounded-xl shadow-lg border border-border">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-brand-electric/10">
            <svg className="w-8 h-8 text-brand-electric" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-4">Acesso Restrito</h1>
          <p className="text-muted-foreground mb-8">
            Você não está registrado neste sistema. Entre em contato com o administrador para solicitar acesso.
          </p>
          <div className="p-4 bg-muted rounded-md text-sm text-muted-foreground">
            <p>Se acredita que isso é um erro, você pode:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Verificar se está logado com a conta correta</li>
              <li>Contatar o administrador do sistema</li>
              <li>Tentar fazer logout e login novamente</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;