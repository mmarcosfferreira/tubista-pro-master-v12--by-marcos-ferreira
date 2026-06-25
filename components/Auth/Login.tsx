import React, { useState } from 'react';
import { ref, get, child } from "firebase/database";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from '../../firebase';
import { Lock, User, KeyRound, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (userData: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Tenta fazer login no Firebase Auth
      // Se o usuário digitou um WhatsApp (apenas números), precisamos de uma lógica diferente.
      // Como o Firebase Auth exige e-mail, vamos assumir que o loginId é um e-mail por enquanto.
      // Se for um número, podemos criar um e-mail falso (ex: 11999999999@tubistapro.com) no cadastro.
      
      let emailToLogin = loginId.trim();
      
      // Se não tiver '@', assumimos que é um WhatsApp e formatamos como o e-mail falso que criaremos no cadastro
      if (!emailToLogin.includes('@')) {
        emailToLogin = `${emailToLogin.replace(/\D/g, '')}@tubistapro.com`;
      }

      let authUid = null;

      try {
        // 1. Tenta fazer login no Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, emailToLogin, password);
        authUid = userCredential.user.uid;
      } catch (authErr: any) {
        // Se falhar, vamos verificar se é um usuário antigo que só existe no Realtime Database
        if (authErr.code === 'auth/invalid-credential' || authErr.code === 'auth/user-not-found' || authErr.code === 'auth/wrong-password') {
          const dbRef = ref(db);
          const snapshot = await get(child(dbRef, `Credenciais/React/Tubista_Pro_Master/Id`));
          
          let oldUserValid = false;
          if (snapshot.exists()) {
            const users = snapshot.val();
            for (const key in users) {
              const u = users[key];
              const isEmailMatch = u["E-mail"] && u["E-mail"].trim().toLowerCase() === loginId.trim().toLowerCase();
              const isPhoneMatch = u["WhatsApp"] && u["WhatsApp"].trim() === loginId.trim();
              
              if ((isEmailMatch || isPhoneMatch) && u["Senha"] === password) {
                oldUserValid = true;
                break;
              }
            }
          }

          if (oldUserValid) {
            // É um usuário antigo válido! Vamos migrá-lo criando a conta no Auth agora mesmo
            try {
              const newUserCred = await createUserWithEmailAndPassword(auth, emailToLogin, password);
              authUid = newUserCred.user.uid;
            } catch (createErr: any) {
              console.error("Erro ao migrar usuário antigo para o Auth:", createErr);
              throw authErr; // Lança o erro original se a migração falhar
            }
          } else {
            throw authErr; // Lança o erro original se a senha estiver errada ou usuário não existir
          }
        } else {
          throw authErr; // Lança o erro se for problema de rede, muitas tentativas, etc.
        }
      }

      // 2. Se o login (ou migração) no Auth deu certo, buscamos os dados extras no Realtime Database
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, `Credenciais/React/Tubista_Pro_Master/Id`));
      
      if (snapshot.exists()) {
        const users = snapshot.val();
        let userFound = false;

        for (const key in users) {
          const user = users[key];
          
          // Verifica qual usuário bate com o e-mail ou whatsapp logado
          const isEmailMatch = user["E-mail"] && user["E-mail"].trim() !== "" && user["E-mail"].trim().toLowerCase() === loginId.trim().toLowerCase();
          const isPhoneMatch = user["WhatsApp"] && user["WhatsApp"].trim() !== "" && user["WhatsApp"].trim() === loginId.trim();
          
          if (isEmailMatch || isPhoneMatch) {
            userFound = true;
            
            // Verifica se é admin (suporta o antigo "Sim" e o novo booleano true)
            // No seu print, o campo se chama "Administrador" e o valor é booleano (true/false)
            const isAdmin = user["Administrador"] === true || user["Administrador"] === "true" || user["Administrador"] === "Sim" || user["Tipo"] === "Admin";
            
            const formattedUser = {
              NOME: user["Nome"] || (user["E-mail"] ? user["E-mail"].split('@')[0] : user["WhatsApp"]),
              ADMINISTRADOR: isAdmin ? "Sim" : "Não",
              EMAIL: user["E-mail"] || "",
              WHATSAPP: user["WhatsApp"] || "",
              UID: authUid // Salva o UID do Auth
            };
            
            onLoginSuccess(formattedUser);
            break;
          }
        }

        if (!userFound) {
          // Se logou no Auth mas não achou no Database, criamos um usuário básico
          onLoginSuccess({
            NOME: emailToLogin.split('@')[0],
            ADMINISTRADOR: "Não",
            EMAIL: emailToLogin,
            UID: authUid
          });
        }
      } else {
        // Se o banco estiver vazio, mas logou no Auth
        onLoginSuccess({
          NOME: emailToLogin.split('@')[0],
          ADMINISTRADOR: "Não",
          EMAIL: emailToLogin,
          UID: authUid
        });
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('E-mail, WhatsApp ou senha incorretos.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Muitas tentativas falhas. Tente novamente mais tarde.');
      } else {
        setError(`Erro: ${err.message || 'Falha na autenticação'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8 text-center border-b border-slate-800 bg-slate-900/50">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-safety-yellow/10 text-safety-yellow mb-4">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Acesso Restrito</h2>
          <p className="text-slate-400 text-sm">
            Insira suas credenciais para acessar o Tubista Pro.
          </p>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">E-mail ou WhatsApp</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={18} className="text-slate-500" />
                </div>
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-safety-yellow/50 focus:border-safety-yellow outline-none transition-all"
                  placeholder="seu@email.com ou 11999999999"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound size={18} className="text-slate-500" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-12 text-white focus:ring-2 focus:ring-safety-yellow/50 focus:border-safety-yellow outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-safety-yellow text-black font-bold py-3 px-4 rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {loading ? 'Autenticando...' : 'Entrar no Sistema'}
            </button>
          </form>
        </div>
      </div>
      
      <div className="mt-8 text-center text-slate-500 text-xs">
        <p>Tubista Pro Masterv 12</p>
        <p className="mt-1">Acesso exclusivo para usuários autorizados.</p>
        <p className="mt-2 text-slate-600">Desenvolvido por Marcos Ferreira | contato: mmarcos.fferreira@gmail.com</p>
      </div>
    </div>
  );
};

export default Login;
