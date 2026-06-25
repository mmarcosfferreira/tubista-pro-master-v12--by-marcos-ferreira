import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { ref, push, set, update, onValue, remove } from 'firebase/database';
import { db, auth } from '../../firebase';
import { UserPlus, Trash2, Shield, User, Phone, Mail, KeyRound, Edit2, X, ArrowLeft } from 'lucide-react';

interface UserManagerProps {
  onBack?: () => void;
}

const UserManager: React.FC<UserManagerProps> = ({ onBack }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [senha, setSenha] = useState('');
  const [tipo, setTipo] = useState('Padrão');
  const [loading, setLoading] = useState(false);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  // Carregar usuários do Firebase
  useEffect(() => {
    const usersRef = ref(db, 'Credenciais/React/Tubista_Pro_Master/Id');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const usersList = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setUsers(usersList);
      } else {
        setUsers([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email && !whatsapp) {
      showFeedback('error', "Preencha pelo menos o E-mail ou o WhatsApp!");
      return;
    }

    setLoading(true);
    try {
      // Função auxiliar para garantir que tanto o E-mail quanto o WhatsApp existam no Firebase Auth
      const syncAuthAccounts = async () => {
        try {
          const secondaryApp = initializeApp(auth.app.options, `SecondaryApp_${Date.now()}`);
          const secondaryAuth = getAuth(secondaryApp);
          
          if (email) {
            try {
              await createUserWithEmailAndPassword(secondaryAuth, email, senha);
              await secondaryAuth.signOut();
            } catch (e: any) {
              if (e.code !== 'auth/email-already-in-use') console.error(e);
            }
          }
          
          if (whatsapp) {
            const fakeEmail = `${whatsapp.replace(/\D/g, '')}@tubistapro.com`;
            try {
              await createUserWithEmailAndPassword(secondaryAuth, fakeEmail, senha);
              await secondaryAuth.signOut();
            } catch (e: any) {
              if (e.code !== 'auth/email-already-in-use') console.error(e);
            }
          }
        } catch (err) {
          console.error("Erro ao sincronizar Auth:", err);
        }
      };

      if (editingId) {
        // Atualizar usuário existente no Realtime Database
        const userRef = ref(db, `Credenciais/React/Tubista_Pro_Master/Id/${editingId}`);
        await update(userRef, {
          "Nome": nome,
          "E-mail": email,
          "WhatsApp": whatsapp,
          "Senha": senha,
          "Administrador": tipo === 'Admin'
        });
        
        // Sincroniza as contas no Auth (útil para contas antigas que não tinham o WhatsApp registrado no Auth)
        await syncAuthAccounts();
        
        showFeedback('success', "Usuário atualizado com sucesso!");
      } else {
        // 1. Criar usuário no Firebase Auth (Sincroniza E-mail e WhatsApp)
        await syncAuthAccounts();

        // 2. Criar usuário no Realtime Database (usando a sessão principal do Admin)
        const usersRef = ref(db, 'Credenciais/React/Tubista_Pro_Master/Id');
        const newUserRef = push(usersRef);
        
        await set(newUserRef, {
          "Nome": nome,
          "E-mail": email,
          "WhatsApp": whatsapp,
          "Senha": senha,
          "Administrador": tipo === 'Admin',
          "UID": auth.currentUser?.uid // Salva o link com o Auth
        });
        showFeedback('success', "Usuário cadastrado com sucesso!");
      }

      // Limpar formulário
      resetForm();
    } catch (error: any) {
      console.error(error);
      if (error.message && error.message.includes('PERMISSION_DENIED')) {
        showFeedback('error', "Erro de Permissão! Vá no console do Firebase > Realtime Database > Regras (Rules) e altere '.write' para true.");
      } else {
        showFeedback('error', "Erro ao salvar usuário. Verifique sua conexão e permissões.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (u: any) => {
    setEditingId(u.id);
    setNome(u["Nome"] || '');
    setEmail(u["E-mail"] || '');
    setWhatsapp(u["WhatsApp"] || '');
    setSenha(u["Senha"] || '');
    
    // Verifica se é admin (suporta o antigo "Sim" e o novo booleano true)
    const isAdmin = u["Administrador"] === true || u["Administrador"] === "Sim" || u["Tipo"] === "Admin";
    setTipo(isAdmin ? 'Admin' : 'Padrão');
    
    // Rola a página para o topo para ver o formulário
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setNome('');
    setEmail('');
    setWhatsapp('');
    setSenha('');
    setTipo('Padrão');
  };

  const executeDelete = async (userId: string) => {
    try {
      // 1. Remove do Realtime Database
      const userRef = ref(db, `Credenciais/React/Tubista_Pro_Master/Id/${userId}`);
      await remove(userRef);
      
      if (editingId === userId) resetForm();

      showFeedback('success', "Usuário removido com sucesso!");
      setDeleteConfirmId(null);
    } catch (error: any) {
      console.error(error);
      if (error.message && error.message.includes('PERMISSION_DENIED')) {
        showFeedback('error', "Erro de Permissão! Vá no console do Firebase > Realtime Database > Regras (Rules) e altere '.write' para true.");
      } else {
        showFeedback('error', "Erro ao remover usuário. Verifique suas permissões.");
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 p-4 overflow-y-auto">
      <div className="max-w-4xl w-full mx-auto space-y-6 pb-20">
        
        {feedbackMsg && (
          <div className={`p-4 rounded-xl border ${feedbackMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-red-500/10 border-red-500/50 text-red-400'}`}>
            {feedbackMsg.text}
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              {onBack && (
                <button onClick={onBack} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors" title="Voltar ao Aplicativo">
                  <ArrowLeft size={20} />
                </button>
              )}
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {editingId ? <Edit2 className="text-blue-400" /> : <UserPlus className="text-safety-yellow" />}
                {editingId ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}
              </h2>
            </div>
            {editingId && (
              <button onClick={resetForm} className="text-slate-400 hover:text-white flex items-center gap-1 text-sm bg-slate-800 px-3 py-1 rounded-lg">
                <X size={14} /> Cancelar Edição
              </button>
            )}
          </div>
          
          <form onSubmit={handleSaveUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Nome</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" value={nome} onChange={e => setNome(e.target.value)} required className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-white focus:ring-safety-yellow outline-none" placeholder="Nome do usuário" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">E-mail (Opcional)</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-white focus:ring-safety-yellow outline-none" placeholder="email@exemplo.com" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">WhatsApp (Opcional)</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-white focus:ring-safety-yellow outline-none" placeholder="(11) 99999-9999" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Senha</label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" value={senha} onChange={e => setSenha(e.target.value)} required className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-white focus:ring-safety-yellow outline-none" placeholder="Senha de acesso" />
              </div>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-400 uppercase">Nível de Acesso</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="tipo" value="Padrão" checked={tipo === 'Padrão'} onChange={e => setTipo(e.target.value)} className="accent-safety-yellow" />
                  <span className="text-sm text-slate-300">Usuário Padrão</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="tipo" value="Admin" checked={tipo === 'Admin'} onChange={e => setTipo(e.target.value)} className="accent-safety-yellow" />
                  <span className="text-sm text-slate-300">Administrador</span>
                </label>
              </div>
            </div>

            <div className="md:col-span-2 pt-2 flex gap-4">
              {editingId && (
                <button type="button" onClick={resetForm} className="w-1/3 font-bold py-3 rounded-xl transition-colors text-white bg-slate-700 hover:bg-slate-600">
                  Voltar
                </button>
              )}
              <button type="submit" disabled={loading} className={`flex-1 font-bold py-3 rounded-xl transition-colors disabled:opacity-50 text-black ${editingId ? 'bg-blue-400 hover:bg-blue-500' : 'bg-safety-yellow hover:bg-yellow-400'}`}>
                {loading ? 'Processando...' : (editingId ? 'Atualizar Usuário' : 'Cadastrar Usuário')}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Shield className="text-blue-400" />
            Usuários Cadastrados
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-400">
              <thead className="text-xs text-slate-200 uppercase bg-slate-800">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Nome</th>
                  <th className="px-4 py-3">Acesso (Login)</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3 rounded-tr-lg text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, idx) => (
                  <tr key={u.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-medium text-white">{u["Nome"] || "Sem Nome"}</td>
                    <td className="px-4 py-3">
                      {u["E-mail"] && <div className="flex items-center gap-1"><Mail size={12}/> {u["E-mail"]}</div>}
                      {u["WhatsApp"] && <div className="flex items-center gap-1 mt-1"><Phone size={12}/> {u["WhatsApp"]}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${u["Administrador"] === true || u["Administrador"] === 'Sim' || u["Tipo"] === 'Admin' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-300'}`}>
                        {u["Administrador"] === true || u["Administrador"] === 'Sim' || u["Tipo"] === 'Admin' ? 'Admin' : 'Padrão'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right flex justify-end gap-2">
                      {deleteConfirmId === u.id ? (
                        <div className="flex items-center gap-2 bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20">
                          <span className="text-xs text-red-400 font-bold mr-1">Excluir?</span>
                          <button onClick={() => executeDelete(u.id)} className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs font-bold transition-colors">Sim</button>
                          <button onClick={() => setDeleteConfirmId(null)} className="px-2 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 text-xs font-bold transition-colors">Não</button>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => handleEditClick(u)} className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors" title="Editar Usuário">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => setDeleteConfirmId(u.id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors" title="Remover Usuário">
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">Nenhum usuário encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default UserManager;
