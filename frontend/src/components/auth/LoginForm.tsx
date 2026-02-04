import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Lock, Mail } from 'lucide-react';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast.error('Credenciales inválidas');
      setIsLoading(false);
    }
    // If successful, LoginPage will redirect and this component will unmount
    // No need to reset isLoading on success
  };

  return (
    <div className="w-full max-w-[480px] bg-white dark:bg-[#1a2233] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Header / Logo Area */}
      <div className="flex flex-col items-center pt-8 pb-2 px-8">
        <div className="h-16 w-16 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-primary text-4xl">apartment</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-center text-slate-900 dark:text-white">AppMinuta</h2>
      </div>

      {/* Page Heading */}
      <div className="px-8 pb-4 text-center">
        <p className="text-2xl font-bold leading-tight mb-2 text-slate-900 dark:text-white">Bienvenido de nuevo</p>
        <p className="text-slate-500 dark:text-[#92a4c8] text-sm font-normal leading-normal">
          Genera tus minutas inmobiliarias en segundos.
        </p>
      </div>

      {/* Form Section */}
      <div className="px-8 pb-8 pt-2 flex flex-col gap-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Email Field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-sm font-medium leading-normal text-slate-700 dark:text-white">
              Correo Electrónico
            </Label>
            <input
              id="email"
              type="email"
              placeholder="ejemplo@appminuta.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="form-input flex w-full min-w-0 resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-[#334366] bg-slate-50 dark:bg-[#111622] focus:border-primary h-12 placeholder:text-slate-400 dark:placeholder:text-[#92a4c8] px-4 text-base font-normal leading-normal transition-all"
            />
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="password" className="text-sm font-medium leading-normal text-slate-700 dark:text-white">
                Contraseña
              </Label>
            </div>
            <div className="relative flex w-full items-center">
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="form-input flex w-full min-w-0 resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-[#334366] bg-slate-50 dark:bg-[#111622] focus:border-primary h-12 placeholder:text-slate-400 dark:placeholder:text-[#92a4c8] pl-4 pr-12 text-base font-normal leading-normal transition-all"
              />
              <button
                type="button"
                className="absolute right-0 top-0 bottom-0 px-3 flex items-center justify-center text-slate-400 dark:text-[#92a4c8] hover:text-primary transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">visibility</span>
              </button>
            </div>
            <div className="flex justify-end mt-1">
              <a className="text-sm font-medium text-primary hover:text-blue-400 transition-colors" href="#">
                ¿Olvidaste tu contraseña?
              </a>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              type="submit"
              className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-primary hover:bg-blue-600 text-white text-base font-bold leading-normal tracking-[0.015em] transition-all shadow-lg shadow-blue-900/20"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Iniciando...
                </>
              ) : (
                <span className="truncate">Iniciar Sesión</span>
              )}
            </Button>
          </div>
        </form>

        {/* Sign Up Link */}
        <div className="flex justify-center items-center gap-2 pt-2">
          <p className="text-slate-500 dark:text-[#92a4c8] text-sm">¿No tienes una cuenta?</p>
          <a className="text-sm font-bold text-primary hover:text-blue-400 transition-colors" href="#">
            Regístrate
          </a>
        </div>
      </div>
    </div>
  );
};
