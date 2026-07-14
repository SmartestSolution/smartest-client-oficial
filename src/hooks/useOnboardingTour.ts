import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const STORAGE_KEY = 'smartest-onboarding-completed-v1';

export function hasCompletedOnboarding() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markOnboardingCompleted() {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {}
}

export function resetOnboarding() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function startOnboardingTour() {
  const d = driver({
    showProgress: true,
    nextBtnText: 'Próximo',
    prevBtnText: 'Voltar',
    doneBtnText: 'Concluir',
    progressText: '{{current}} de {{total}}',
    onDestroyed: () => markOnboardingCompleted(),
    steps: [
      {
        element: '[data-tour="dashboard"]',
        popover: {
          title: 'Bem-vindo ao SmartestClient',
          description: 'Aqui é o seu Dashboard com a visão geral dos seus projetos, indicadores e atividades recentes.',
          side: 'right',
        },
      },
      {
        element: '[data-tour="agenda"]',
        popover: {
          title: 'Agenda Geral',
          description: 'Veja todos os marcos e etapas dos seus projetos em um calendário único.',
          side: 'right',
        },
      },
      {
        element: '[data-tour="projects-list"]',
        popover: {
          title: 'Seus Projetos',
          description: 'Acesse rapidamente cada projeto e suas seções: Documentos, Progresso, Treinamentos e Suporte.',
          side: 'right',
        },
      },
      {
        element: '[data-tour="chat"]',
        popover: {
          title: 'Chat',
          description: 'Converse em tempo real com a equipe da Smartest sobre qualquer projeto.',
          side: 'right',
        },
      },
      {
        element: '[data-tour="search"]',
        popover: {
          title: 'Busca global (Ctrl+K)',
          description: 'Use Ctrl+K (ou Cmd+K) para procurar projetos, documentos, tickets e mensagens em qualquer lugar.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="notifications"]',
        popover: {
          title: 'Notificações',
          description: 'Avisos sobre novos documentos, etapas concluídas, versões e respostas no suporte aparecem aqui.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="profile"]',
        popover: {
          title: 'Seu perfil',
          description: 'Atualize seus dados, foto e veja informações da sua conta. Pronto para começar!',
          side: 'bottom',
        },
      },
    ],
  });
  d.drive();
}

/** Auto-start the tour once per device. Call inside the Dashboard page. */
export function useAutoStartOnboarding(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    if (hasCompletedOnboarding()) return;
    // Marca como concluído imediatamente para evitar que o tour reapareça
    // em recarregamentos futuros, mesmo se o usuário fechar antes do fim.
    markOnboardingCompleted();
    const t = setTimeout(() => startOnboardingTour(), 600);
    return () => clearTimeout(t);
  }, [enabled]);
}
