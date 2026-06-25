import { ProjectData } from '../types';

const STORAGE_KEY = 'tubista_pro_projects';

export const saveProject = (project: ProjectData) => {
  try {
    const existingStr = localStorage.getItem(STORAGE_KEY);
    let projects: ProjectData[] = [];
    
    // Leitura robusta
    if (existingStr) {
      try {
        const parsed = JSON.parse(existingStr);
        if (Array.isArray(parsed)) {
            projects = parsed;
        } else {
            console.warn("Storage corrompido, iniciando nova lista mas mantendo backup no console.");
            console.log("Backup Data:", existingStr);
        }
      } catch (e) {
        console.error("Erro JSON ao ler. Dados anteriores podem ser perdidos se prosseguir.", e);
      }
    }
    
    // Lógica de atualização
    const idx = projects.findIndex(p => p.id === project.id);
    
    if (idx >= 0) {
      projects[idx] = project;
    } else {
      // Verifica duplicata por nome para manter organizado
      const nameIdx = projects.findIndex(p => p.name === project.name);
      if (nameIdx >= 0) {
         // Sobrescreve mantendo o ID antigo para consistência de links se houver
         project.id = projects[nameIdx].id;
         projects[nameIdx] = project;
      } else {
         projects.push(project);
      }
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error("FALHA CRÍTICA AO SALVAR:", error);
    alert("Erro ao salvar no dispositivo. Verifique se há espaço disponível.");
  }
};

export const loadProjects = (): ProjectData[] => {
  try {
    const existingStr = localStorage.getItem(STORAGE_KEY);
    if (!existingStr) return [];
    
    const parsed = JSON.parse(existingStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Erro ao carregar projetos:", error);
    return [];
  }
};

export const deleteProject = (id: string) => {
  try {
    const projects = loadProjects();
    const filtered = projects.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return filtered; // Retorna a nova lista para uso imediato
  } catch (error) {
    console.error("Erro ao excluir projeto:", error);
    return [];
  }
};

// --- NOVO RECURSO: Importação em Lote (Backup) ---
export const importBatchProjects = (newProjects: ProjectData[]) => {
  try {
    const currentProjects = loadProjects();
    let updatedCount = 0;
    let newCount = 0;

    newProjects.forEach(imported => {
       const idx = currentProjects.findIndex(curr => curr.id === imported.id);
       if (idx >= 0) {
          // Atualiza existente (confiamos no backup como versão mais recente ou desejada)
          currentProjects[idx] = imported;
          updatedCount++;
       } else {
          // Adiciona novo
          currentProjects.push(imported);
          newCount++;
       }
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentProjects));
    return { success: true, updated: updatedCount, added: newCount, total: currentProjects };
  } catch (error) {
    console.error("Erro ao importar backup:", error);
    return { success: false, updated: 0, added: 0, total: [] };
  }
};