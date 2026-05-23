'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Star, 
  Trash2, 
  ChevronLeft, 
  Copy, 
  Edit3, 
  Settings as SettingsIcon, 
  Download, 
  Upload, 
  Check, 
  Brain,
  Search,
  MoreVertical,
  X,
  AlertTriangle,
  Send,
  Undo,
  Sparkles,
  Key,
  MessageSquare,
  Cloud,
  CloudOff,
  User as UserIcon,
  LogOut,
  UserX,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Gate, Prompt, View, AppState } from './types';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  auth, 
  db, 
  signInWithGoogleWrapper, 
  logoutUserWrapper, 
  deleteUserAccountWrapper, 
  saveStateToFirestoreWrapper, 
  fetchStateFromFirestoreWrapper, 
  getSavedFirebaseConfig, 
  saveFirebaseConfig, 
  initFirebase,
  getSavedSimulatedUser,
  saveSimulatedUser,
  clearSavedSimulatedUser,
  FirebaseCustomConfig,
  CompactUser
} from './firebase';

const STORAGE_KEY = 'prompt_rkn_data';

const generateId = () => {
  return 'id-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now().toString(36);
};

const INITIAL_STATE: AppState = {
  gates: [
    { id: 'favorites', name: 'Favorites', isDeletable: false },
    { id: 'gate-1', name: 'General', isDeletable: true },
  ],
  prompts: [],
};

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_STATE;
    }
    return INITIAL_STATE;
  });

  const [view, setView] = useState<View>('home');
  const [currentGateId, setCurrentGateId] = useState<string | null>(null);
  const [currentPromptId, setCurrentPromptId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('Copied to clipboard!');
  const [showToast, setShowToast] = useState(false);
  const [gateToDelete, setGateToDelete] = useState<string | null>(null);

  // --- Google Auth Status & User ---
  const [currentUser, setCurrentUser] = useState<CompactUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // --- Server configuration check (Does the backend already possess a default API key?) ---
  const [serverHasDefaultKey, setServerHasDefaultKey] = useState(false);

  // --- Syncing & Connection states ---
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Rollback state for restoring previous organization
  const [rollbackState, setRollbackState] = useState<AppState | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('prompt_rkn_rollback');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  // Custom API Key configured by user
  const [customApiKey, setCustomApiKey] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('prompt_rkn_custom_key') || '';
    }
    return '';
  });

  // API key verification status
  const [isApiKeyVerified, setIsApiKeyVerified] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('prompt_rkn_key_verified') === 'true';
    }
    return false;
  });

  const [isKeyVerifying, setIsKeyVerifying] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Custom Model (Agent proxy / model name) configured by user
  const [customModel, setCustomModel] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('prompt_rkn_custom_model') || 'gemini-3.5-flash';
    }
    return 'gemini-3.5-flash';
  });

  // Custom System instructions / organizer role
  const [customSystemInstruction, setCustomSystemInstruction] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('prompt_rkn_custom_sys_inst') || '';
    }
    return '';
  });

  // Chat message interface
  interface ChatMessage {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    isProposal?: boolean;
    proposedState?: AppState;
    proposalStatus?: 'pending' | 'accepted' | 'rejected';
  }

  // Chat conversation logs
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('prompt_rkn_chat_history');
      if (saved) return JSON.parse(saved);
    }
    return [
      {
        id: 'welcome',
        sender: 'ai',
        text: 'مرحباً بك في منظم النصوص الذكي لـ Prompt RKN! 🧠✨\n\nبصفتي معالج ذكاء اصطناعي مدمج في صلب النظام، أمتلك تحكماً كاملاً لتنظيم وتصنيف وترتيب بواباتك ونصوصك.\n\nاكتب لي مثلاً: "نظم النصوص في التطبيق وقسمها إلى فئات وفولدرات مخصصة برمجية وأدبية وثقافية" وسأقوم بمراجعة فورية واقتراح واجهة جديدة كاملة والمطالبة بموافقتك قبل التطبيق. وفي حال لم يعجبك التنظيم، يمكنك الضغط على "استرجاع" لإعادة البيانات بالكامل إلى ما كانت عليه سابقاً!',
      }
    ];
  });

  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Persist settings
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('prompt_rkn_custom_key', customApiKey);
    }
  }, [customApiKey]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('prompt_rkn_key_verified', isApiKeyVerified ? 'true' : 'false');
    }
  }, [isApiKeyVerified]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('prompt_rkn_custom_model', customModel);
    }
  }, [customModel]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('prompt_rkn_custom_sys_inst', customSystemInstruction);
    }
  }, [customSystemInstruction]);

  // Persist chat history
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('prompt_rkn_chat_history', JSON.stringify(chatMessages));
    }
  }, [chatMessages]);

  const triggerToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // --- Network Connection Handler ---
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      triggerToast('📶 تم استعادة الشبكة! بدأت مزامنة بياناتك تلقائياً...');
    };

    const handleOffline = () => {
      setIsOnline(false);
      triggerToast('🔌 لا يوجد انترنت! التطبيق يعمل محلياً وسوف يتزامن تلقائياً بمجرد عودة الشبكة.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- Load Server Config and Check Default Keys ---
  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data && data.hasServerKey) {
          setServerHasDefaultKey(true);
        }
      })
      .catch(err => console.error("Error reading server key config:", err));
  }, []);

  // --- Firebase Google Auth & Simulator State Observer ---
  useEffect(() => {
    // 1. Check if there is already a simulated active Gmail user in session
    const savedSim = getSavedSimulatedUser();
    if (savedSim) {
      setCurrentUser(savedSim);
      setIsAuthLoading(false);

      // Async fetch and load user's segmented data
      setIsSyncing(true);
      fetchStateFromFirestoreWrapper(savedSim.uid)
        .then(cloudState => {
          if (cloudState && (cloudState.gates || cloudState.prompts)) {
            setState({
              gates: cloudState.gates,
              prompts: cloudState.prompts
            });
          }
        })
        .finally(() => {
          setIsSyncing(false);
        });
    }

    if (!auth) {
      if (!savedSim) {
        setIsAuthLoading(false);
      }
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsAuthLoading(false);
      if (user) {
        const compact: CompactUser = {
          uid: user.uid,
          displayName: user.displayName || 'مستخدم Google نشط',
          email: user.email || '',
          photoURL: user.photoURL || undefined
        };
        setCurrentUser(compact);
        saveSimulatedUser(compact);

        setIsSyncing(true);
        try {
          const cloudState = await fetchStateFromFirestoreWrapper(user.uid);
          if (cloudState && (cloudState.gates || cloudState.prompts)) {
            setState({
              gates: cloudState.gates,
              prompts: cloudState.prompts
            });
            triggerToast(`👤 مرحباً ${compact.displayName}! تمت مزامنة بواباتك ونصوصك السحابية.`);
          } else {
            await saveStateToFirestoreWrapper(user.uid, state);
            triggerToast('☁️ تم إنشاء نسختك السحابية وحفظ بواباتك المحلية الحالية عليها بنجاح!');
          }
        } catch (err) {
          console.error("Firebase auth cloud load error:", err);
          triggerToast('⚠️ تم تسجيل الدخول محلياً. تعذر جلب البيانات السحابية.');
        } finally {
          setIsSyncing(false);
        }
      } else {
        // If logged out from Firebase, check if we had a simulated user instead to avoid clearing unnecessarily
        if (getSavedSimulatedUser() && getSavedSimulatedUser()?.uid.indexOf('sim-') === -1) {
          setCurrentUser(null);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // --- Main Persistence and Sparing Cloud Sync Observer ---
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // A. Always sync to localized cache
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    // B. Push to Firestore / Simulated node if authenticated and network online
    if (currentUser && isOnline) {
      setIsSyncing(true);
      saveStateToFirestoreWrapper(currentUser.uid, state)
        .then(() => {
          setHasUnsavedChanges(false);
          setIsSyncing(false);
        })
        .catch(err => {
          console.error("automatic background sync failure:", err);
          setHasUnsavedChanges(true);
          setIsSyncing(false);
        });
    } else if (currentUser) {
      // Authenticated but currently disconnected/offline -> mark as unsaved
      setHasUnsavedChanges(true);
    }
  }, [state, currentUser, isOnline]);

  // Navigation helpers
  const navigateToHome = () => setView('home');
  const navigateToGate = (id: string) => {
    setCurrentGateId(id);
    setView('gate');
  };
  const navigateToPrompt = (id: string) => {
    setCurrentPromptId(id);
    setView('prompt');
  };
  const navigateToSettings = () => setView('settings');

  // Data Actions
  const addGate = (name: string) => {
    const newGate: Gate = {
      id: generateId(),
      name,
      isDeletable: true,
    };
    setState(prev => ({ ...prev, gates: [...prev.gates, newGate] }));
  };

  const updateGate = (id: string, name: string) => {
    setState(prev => ({
      ...prev,
      gates: prev.gates.map(g => g.id === id ? { ...g, name } : g),
    }));
  };

  const deleteGate = (id: string) => {
    if (id === 'favorites') return;
    setState(prev => ({
      ...prev,
      gates: prev.gates.filter(g => g.id !== id),
      prompts: prev.prompts.filter(p => p.gateId !== id),
    }));
    setGateToDelete(null);
    if (currentGateId === id) navigateToHome();
  };

  const addPrompt = (title: string, content: string, note: string, gateId: string) => {
    const newPrompt: Prompt = {
      id: generateId(),
      gateId,
      title,
      content,
      note,
      isFavorite: false,
    };
    setState(prev => ({ ...prev, prompts: [...prev.prompts, newPrompt] }));
  };

  const deletePrompt = (id: string) => {
    setState(prev => ({
      ...prev,
      prompts: prev.prompts.filter(p => p.id !== id),
    }));
    if (currentPromptId === id) setView('gate');
  };

  const toggleFavorite = (id: string) => {
    setState(prev => ({
      ...prev,
      prompts: prev.prompts.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p),
    }));
  };

  const updatePrompt = (id: string, updates: Partial<Prompt>) => {
    setState(prev => ({
      ...prev,
      prompts: prev.prompts.map(p => p.id === id ? { ...p, ...updates } : p),
    }));
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Prompt_RKN_Backup.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<AppState | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedState = JSON.parse(event.target?.result as string);
        if (importedState.gates && Array.isArray(importedState.gates) && 
            importedState.prompts && Array.isArray(importedState.prompts)) {
          setPendingImportData(importedState);
          setShowImportConfirm(true);
        } else {
          alert('Invalid backup file format. Please ensure it contains gates and prompts.');
        }
      } catch (err) {
        console.error('Import error:', err);
        alert('Error parsing backup file. Please ensure it is a valid JSON.');
      }
      // Reset input value to allow selecting the same file again
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const executeImport = () => {
    if (!pendingImportData) return;

    try {
      // 1. Save strictly to localStorage first
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingImportData));
      
      // 2. Update React state directly
      setState(pendingImportData);
      
      // 3. Show success message
      triggerToast('Backup Imported Successfully!');
      
      // 4. Close modal and clear pending data
      setShowImportConfirm(false);
      setPendingImportData(null);

      // 5. Force reload after a short delay to ensure user sees the toast/success
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error('Execution error:', err);
      alert('Failed to save imported data.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    triggerToast('Copied to clipboard!');
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userText = chatInput;
    setChatInput('');

    const newUserMsg: ChatMessage = {
      id: generateId(),
      sender: 'user',
      text: userText,
    };

    const updatedMessages = [...chatMessages, newUserMsg];
    setChatMessages(updatedMessages);
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userText,
          state: state,
          chatHistory: updatedMessages.map(m => ({
            role: m.sender === 'user' ? 'user' : 'model',
            message: m.text,
          })),
          customApiKey: customApiKey,
          model: customModel,
          systemInstruction: customSystemInstruction,
        }),
      });

      const data = await response.json();

      if (response.ok && data) {
        const aiMsg: ChatMessage = {
          id: generateId(),
          sender: 'ai',
          text: data.message || 'تمت معالجة الطلب بنجاح.',
          isProposal: data.isProposal,
          proposedState: data.proposedState,
          proposalStatus: data.isProposal ? 'pending' : undefined,
        };
        setChatMessages(prev => [...prev, aiMsg]);
      } else {
        const aiMsg: ChatMessage = {
          id: generateId(),
          sender: 'ai',
          text: `عذراً، حدث خطأ أثناء الاتصال بالخادم: ${data.error || 'خطأ غير معروف'}`,
        };
        setChatMessages(prev => [...prev, aiMsg]);
      }
    } catch (error: any) {
      const aiMsg: ChatMessage = {
        id: generateId(),
        sender: 'ai',
        text: `فشل الاتصال بذكاء التطبيق: ${error?.message || 'الرجاء التحقق من الإنترنت.'}`,
      };
      setChatMessages(prev => [...prev, aiMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleVerifyAndActivateKey = async () => {
    if (!customApiKey.trim()) {
      setVerificationFeedback({
        type: 'error',
        text: 'الرجاء إدخال مفتاح الـ API أولاً قبل النقر على التحقق والتفعيل.'
      });
      return;
    }

    setIsKeyVerifying(true);
    setVerificationFeedback(null);

    try {
      const response = await fetch('/api/gemini/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customApiKey: customApiKey,
          model: customModel,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsApiKeyVerified(true);
        setVerificationFeedback({
          type: 'success',
          text: `تم تفعيل النموذج المسيطر (${data.modelName || customModel}) بنجاح والتحقق من المفتاح العام!`
        });
        triggerToast('🔑 تم تفعيل نموذج التحكم بنجاح!');
      } else {
        setIsApiKeyVerified(false);
        setVerificationFeedback({
          type: 'error',
          text: `فشل التحقق والتفعيل: ${data.error || 'المفتاح غير صالح أو غير نشط حالياً.'}`
        });
      }
    } catch (err: any) {
      setIsApiKeyVerified(false);
      setVerificationFeedback({
        type: 'error',
        text: `حدث خطأ أثناء محاولة الاتصال بالخادم: ${err?.message || 'خطأ اتصال غير معروف'}`
      });
    } finally {
      setIsKeyVerifying(false);
    }
  };

  const handleAcceptProposal = (msgId: string, proposed: AppState) => {
    // Save rollback snapshot
    localStorage.setItem('prompt_rkn_rollback', JSON.stringify(state));
    setRollbackState(state);

    // Apply new state
    setState(proposed);

    // Mark as accepted
    setChatMessages(prev => prev.map(m => m.id === msgId ? { ...m, proposalStatus: 'accepted' as const } : m));
    
    // Redirect to home dashboard
    setView('home');
    triggerToast('🎉 تم تطبيق التنظيم الذكي الجديد والعودة للرئيسية!');
  };

  const handleRejectProposal = (msgId: string) => {
    setChatMessages(prev => prev.map(m => m.id === msgId ? { ...m, proposalStatus: 'rejected' as const } : m));
    triggerToast('تم تجاهل المقترح بنجاح.');
  };

  const handleRestore = () => {
    if (!rollbackState) {
      triggerToast('لا توجد نسخة استرجاع محفوظة حالياً.');
      return;
    }

    const temp = state;
    setState(rollbackState);
    setRollbackState(temp);
    localStorage.setItem('prompt_rkn_rollback', JSON.stringify(temp));

    triggerToast('↩️ تم استرجاع التنظيم السابق بنجاح!');
  };

  const clearChatHistory = () => {
    setChatMessages([
      {
        id: 'welcome',
        sender: 'ai',
        text: 'مرحباً بك في منظم النصوص الذكي لـ Prompt RKN! 🧠✨\n\nبصفتي معالج ذكاء اصطناعي مدمج في صلب النظام، أمتلك تحكماً كاملاً لتنظيم وتصنيف وترتيب بواباتك ونصوصك.\n\nاكتب لي مثلاً: "نظم النصوص في التطبيق وقسمها إلى فئات وفولدرات مخصصة برمجية وأدبية وثقافية" وسأقوم بمراجعة فورية واقتراح واجهة جديدة كاملة والمطالبة بموافقتك قبل التطبيق. وفي حال لم يعجبك التنظيم، يمكنك الضغط على "استرجاع" لإعادة البيانات بالكامل إلى ما كانت عليه سابقاً!',
      }
    ]);
  };

  const renderProposedDiff = (proposed: AppState) => {
    const currentGatesMap = new Map(state.gates.map(g => [g.id, g.name]));
    const proposedGatesMap = new Map(proposed.gates.map(g => [g.id, g.name]));

    const newGates = proposed.gates.filter(pg => !state.gates.some(g => g.id === pg.id));
    const newPrompts = proposed.prompts.filter(pp => !state.prompts.some(p => p.id === pp.id));
    const modifiedPrompts = proposed.prompts.filter(pp => {
      const original = state.prompts.find(p => p.id === pp.id);
      if (!original) return false;
      return original.title !== pp.title || original.content !== pp.content || original.note !== pp.note || original.gateId !== pp.gateId;
    });

    return (
      <div className="space-y-3 pt-2 text-right text-xs" dir="rtl">
        {newGates.length > 0 && (
          <div className="space-y-1">
            <span className="font-bold text-amber-900 flex items-center gap-1">
              <span>📂</span> فئات جديدة سيتم إنشاؤها:
            </span>
            <div className="flex flex-wrap gap-1">
              {newGates.map((g, i) => (
                <span key={i} className="px-2 py-0.5 bg-amber-800/10 text-amber-900 rounded-md font-medium">
                  {g.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {newPrompts.length > 0 && (
          <div className="space-y-2">
            <span className="font-bold text-emerald-800 flex items-center gap-1">
              <span>✨</span> نصوص جديدة سيتم إضافتها:
            </span>
            <div className="space-y-2">
              {newPrompts.map((p, i) => {
                const targetGateName = proposedGatesMap.get(p.gateId) || p.gateId;
                return (
                  <div key={i} className="p-3 bg-[#fdfdf3] border border-emerald-200/50 rounded-xl space-y-1.5 shadow-sm">
                    <div className="flex justify-between items-start gap-1">
                      <span className="font-bold text-emerald-950">📝 {p.title || 'بدون عنوان'}</span>
                      <span className="text-[9px] shrink-0 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                        فئة: {targetGateName}
                      </span>
                    </div>
                    {p.content && (
                      <p className="text-[#4E342E]/80 break-words bg-emerald-50/20 p-2 rounded-lg border border-[#4E342E]/5 font-mono text-[10px] leading-relaxed max-h-24 overflow-y-auto">
                        {p.content}
                      </p>
                    )}
                    {p.note && (
                      <div className="text-[10px] text-amber-800 bg-amber-50/30 p-2 rounded-lg border border-amber-100/50">
                        <span className="font-bold">💡 الملاحظة: </span> {p.note}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {modifiedPrompts.length > 0 && (
          <div className="space-y-2">
            <span className="font-bold text-blue-800 flex items-center gap-1">
              <span>🔄</span> نصوص سيتم تعديلها أو نقلها:
            </span>
            <div className="space-y-2">
              {modifiedPrompts.map((p, i) => {
                const original = state.prompts.find(op => op.id === p.id);
                const targetGateName = proposedGatesMap.get(p.gateId) || p.gateId;
                const originalGateName = original ? currentGatesMap.get(original.gateId) || original.gateId : '';
                const isMoved = original && original.gateId !== p.gateId;

                return (
                  <div key={i} className="p-3 bg-blue-50/30 border border-blue-200/50 rounded-xl space-y-1.5 shadow-sm">
                    <div className="flex justify-between items-start gap-1">
                      <span className="font-bold text-blue-950">📝 {p.title}</span>
                      {isMoved ? (
                        <span className="text-[9px] shrink-0 bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                          نقل من [{originalGateName}] للـ [{targetGateName}]
                        </span>
                      ) : (
                        <span className="text-[9px] shrink-0 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                          تعديل محتوى/ملاحظات
                        </span>
                      )}
                    </div>
                    {p.content !== original?.content && (
                      <p className="text-[#4E342E]/80 bg-white/50 p-2 rounded-lg border border-[#4E342E]/5 font-mono text-[10px] max-h-24 overflow-y-auto">
                        {p.content}
                      </p>
                    )}
                    {p.note !== original?.note && p.note && (
                      <div className="text-[10px] text-amber-800 bg-amber-50/20 p-2 rounded-lg border border-amber-100/40">
                        <span className="font-bold">الملاحظة الجديدة: </span> {p.note}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {newGates.length === 0 && newPrompts.length === 0 && modifiedPrompts.length === 0 && (
          <div className="text-center text-[#4E342E]/60 py-2">
            تمت إعادة ترتيب أو تسمية العناصر القائمة دون إحداث تواجد جديد.
          </div>
        )}
      </div>
    );
  };

  // Filtered Prompts
  const currentGate = state.gates.find(g => g.id === currentGateId);
  const filteredPrompts = currentGateId === 'favorites' 
    ? state.prompts.filter(p => p.isFavorite)
    : state.prompts.filter(p => p.gateId === currentGateId);

  const searchedPrompts = filteredPrompts.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentPrompt = state.prompts.find(p => p.id === currentPromptId);

  return (
    <div className="min-h-screen bg-[#F5F5DC] text-[#4E342E] font-sans selection:bg-[#4E342E]/20">
      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#4E342E] text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-[#4E342E]/20 flex items-center gap-2"
          >
            <Check size={18} />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {gateToDelete && (
          <Modal onClose={() => setGateToDelete(null)} title="Delete Gate">
            <div className="space-y-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                  <AlertTriangle size={32} />
                </div>
                <div>
                  <p className="font-bold text-lg">Are you sure?</p>
                  <p className="text-sm text-[#4E342E]/60">This will permanently delete the gate and all prompts inside it.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setGateToDelete(null)}
                  className="flex-1 py-4 rounded-2xl border border-[#4E342E]/10 font-bold hover:bg-[#4E342E]/5 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => deleteGate(gateToDelete)}
                  className="flex-1 py-4 rounded-2xl bg-red-500 text-white font-bold shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <div className="max-w-md mx-auto min-h-screen flex flex-col relative overflow-hidden">
        
        {/* View Router */}
        <AnimatePresence mode="wait">
          {/* Import Confirmation Modal */}
          <AnimatePresence>
            {showImportConfirm && (
              <Modal onClose={() => setShowImportConfirm(false)} title="Confirm Import">
                <div className="space-y-6">
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                      <Upload size={32} />
                    </div>
                    <div>
                      <p className="font-bold text-lg">Replace Current Data?</p>
                      <p className="text-sm text-[#4E342E]/60">This will permanently replace all your current gates and prompts with the backup file.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setShowImportConfirm(false)}
                      className="flex-1 py-4 rounded-2xl border border-[#4E342E]/10 font-bold hover:bg-[#4E342E]/5 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={executeImport}
                      className="flex-1 py-4 rounded-2xl bg-[#4E342E] text-white font-bold shadow-lg shadow-[#4E342E]/20 hover:bg-[#3d2924] transition-all"
                    >
                      Import
                    </button>
                  </div>
                </div>
              </Modal>
            )}
          </AnimatePresence>

          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col p-6"
            >
              <header className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#4E342E] rounded-xl flex items-center justify-center shadow-lg shadow-[#4E342E]/20">
                    <Brain className="text-white" size={24} />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#4E342E]">Prompt RKN</h1>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setView('ai-chat')} 
                    className="p-2.5 hover:bg-[#4E342E]/5 text-[#4E342E] rounded-full transition-all relative flex items-center justify-center"
                    title="المنظم الذكي (AI Organizer)"
                  >
                    <div className="relative">
                      <Brain size={24} />
                      <span className="absolute top-0 right-0 w-2 h-2 bg-amber-600 rounded-full animate-pulse" />
                    </div>
                  </button>
                  <button onClick={navigateToSettings} className="p-2.5 hover:bg-[#4E342E]/5 rounded-full transition-colors">
                    <SettingsIcon size={24} className="text-[#4E342E]/60" />
                  </button>
                </div>
              </header>

              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-[#4E342E]/50 uppercase tracking-widest">Your Gates</h2>
                <div className="grid gap-3">
                  {state.gates.map(gate => (
                    <motion.div 
                      key={gate.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="relative group"
                    >
                      <div 
                        className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all ${
                          gate.id === 'favorites' 
                            ? 'bg-[#4E342E]/10 border-[#4E342E]/30' 
                            : 'bg-[#4E342E]/5 border-[#4E342E]/10 hover:border-[#4E342E]/20'
                        }`}
                      >
                        <button 
                          onClick={() => navigateToGate(gate.id)}
                          className="flex-1 flex items-center gap-4 text-left"
                        >
                          {gate.id === 'favorites' ? (
                            <Star className="text-[#4E342E] fill-[#4E342E]" size={20} />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-[#4E342E]" />
                          )}
                          <span className="text-lg font-medium truncate">{gate.name}</span>
                        </button>
                        
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-[#4E342E]/40 bg-[#4E342E]/5 px-2 py-1 rounded-lg">
                            {gate.id === 'favorites' 
                              ? state.prompts.filter(p => p.isFavorite).length
                              : state.prompts.filter(p => p.gateId === gate.id).length}
                          </span>
                          
                          {gate.isDeletable && (
                            <div className="flex items-center gap-1 border-l border-[#4E342E]/10 pl-2 ml-1">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setCurrentGateId(gate.id); setView('edit-gate'); }}
                                className="p-2 text-[#4E342E]/60 hover:text-[#4E342E] hover:bg-[#4E342E]/10 rounded-lg transition-all"
                                title="Edit Name"
                              >
                                <Edit3 size={18} />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setGateToDelete(gate.id); }}
                                className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                title="Delete Gate"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <button 
                  onClick={() => setView('add-gate')}
                  className="w-full mt-4 flex items-center justify-center gap-2 p-4 rounded-2xl border border-dashed border-[#4E342E]/20 text-[#4E342E]/60 hover:text-[#4E342E] hover:border-[#4E342E]/50 transition-all"
                >
                  <Plus size={20} />
                  <span>Add New Gate</span>
                </button>
              </div>
            </motion.div>
          )}

          {view === 'gate' && currentGate && (
            <motion.div 
              key="gate"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 flex flex-col"
            >
              <header className="p-6 flex items-center gap-4 border-b border-[#4E342E]/5 bg-[#F5F5DC]/80 backdrop-blur-xl sticky top-0 z-10">
                <button onClick={navigateToHome} className="p-2 hover:bg-[#4E342E]/5 rounded-full transition-colors">
                  <ChevronLeft size={24} />
                </button>
                <h2 className="text-xl font-bold flex-1 truncate">{currentGate.name}</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4E342E]/50" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-[#4E342E]/5 border border-[#4E342E]/10 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[#4E342E]/50 transition-all w-32 focus:w-48"
                  />
                </div>
              </header>

              <div className="flex-1 p-6 space-y-4 overflow-y-auto pb-32">
                {searchedPrompts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-[#4E342E]/50 gap-4">
                    <Brain size={48} className="opacity-20" />
                    <p>No prompts found here.</p>
                  </div>
                ) : (
                  searchedPrompts.map(prompt => (
                    <motion.div 
                      key={prompt.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group bg-[#4E342E]/5 border border-[#4E342E]/10 rounded-2xl p-5 hover:border-[#4E342E]/30 transition-all cursor-pointer relative"
                      onClick={() => navigateToPrompt(prompt.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-semibold pr-16 truncate">{prompt.title}</h3>
                        <div className="flex items-center gap-1 absolute top-5 right-5">
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(prompt.id); }}
                            className={`p-2 rounded-lg transition-colors ${prompt.isFavorite ? 'text-[#4E342E]' : 'text-[#4E342E]/50 hover:text-[#4E342E]'}`}
                          >
                            <Star size={18} fill={prompt.isFavorite ? "currentColor" : "none"} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); deletePrompt(prompt.id); }}
                            className="p-2 text-[#4E342E]/50 hover:text-red-500 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-[#4E342E]/60 line-clamp-2 leading-relaxed">
                        {prompt.content}
                      </p>
                    </motion.div>
                  ))
                )}
              </div>

              {currentGateId !== 'favorites' && (
                <button 
                  onClick={() => setView('add-prompt')}
                  className="fixed bottom-8 right-8 w-14 h-14 bg-[#4E342E] text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-[#4E342E]/40 hover:scale-110 transition-transform active:scale-95 z-20"
                >
                  <Plus size={28} />
                </button>
              )}
            </motion.div>
          )}

          {view === 'prompt' && currentPrompt && (
            <motion.div 
              key="prompt"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex-1 flex flex-col"
            >
              <header className="p-6 flex items-center gap-4 border-b border-[#4E342E]/5 bg-[#F5F5DC]/80 backdrop-blur-xl sticky top-0 z-10">
                <button onClick={() => setView('gate')} className="p-2 hover:bg-[#4E342E]/5 rounded-full transition-colors">
                  <ChevronLeft size={24} />
                </button>
                <h2 className="text-xl font-bold flex-1 truncate">{currentPrompt.title}</h2>
                <button 
                  onClick={() => toggleFavorite(currentPrompt.id)}
                  className={`p-2 rounded-full transition-colors ${currentPrompt.isFavorite ? 'text-[#4E342E]' : 'text-[#4E342E]/50'}`}
                >
                  <Star size={24} fill={currentPrompt.isFavorite ? "currentColor" : "none"} />
                </button>
              </header>

              <div className="flex-1 p-6 space-y-8 overflow-y-auto pb-20">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-[#4E342E]/50 uppercase tracking-widest">Prompt Content</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => copyToClipboard(currentPrompt.content)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#4E342E]/5 hover:bg-[#4E342E]/10 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Copy size={14} />
                        Copy
                      </button>
                    </div>
                  </div>
                  
                  <PromptEditor 
                    content={currentPrompt.content} 
                    onSave={(newContent) => updatePrompt(currentPrompt.id, { content: newContent })}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-[#4E342E]/50 uppercase tracking-widest">Notes</label>
                  <textarea 
                    value={currentPrompt.note}
                    onChange={(e) => updatePrompt(currentPrompt.id, { note: e.target.value })}
                    placeholder="Add some notes about this prompt..."
                    className="w-full h-32 bg-[#4E342E]/5 border border-[#4E342E]/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-[#4E342E]/50 transition-all resize-none leading-relaxed"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {view === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col p-6"
            >
              <header className="flex items-center gap-4 mb-10">
                <button onClick={navigateToHome} className="p-2 hover:bg-[#4E342E]/5 rounded-full transition-colors">
                  <ChevronLeft size={24} />
                </button>
                <h2 className="text-2xl font-bold">Settings</h2>
              </header>

              <div className="space-y-8">
                {/* 1. Google iCloud & Profile Section */}
                <section className="space-y-4 text-right" dir="rtl">
                  <div className="flex justify-between items-center border-b border-[#4E342E]/10 pb-2">
                    <h3 className="text-sm font-semibold text-[#4E342E]/50 uppercase tracking-widest font-sans">
                      الملف الشخصي والنسخ السحابي تلقائياً ☁️
                    </h3>
                    <div className="flex items-center gap-1.5">
                      {isSyncing ? (
                        <span className="flex items-center gap-1.5 text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-semibold">
                          <RefreshCw size={11} className="animate-spin text-emerald-600" />
                          جاري المزامنة...
                        </span>
                      ) : !isOnline ? (
                        <span className="flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full font-semibold">
                          <WifiOff size={11} className="text-amber-600" />
                          تعمل دون اتصال
                        </span>
                      ) : hasUnsavedChanges ? (
                        <span className="flex items-center gap-1.5 text-[10px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full font-semibold">
                          <CloudOff size={11} className="text-amber-700" />
                          تعديلات غير مزامنة
                        </span>
                      ) : currentUser ? (
                        <span className="flex items-center gap-1.5 text-[10px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full font-semibold">
                          <Cloud size={11} className="text-emerald-600" />
                          سحابي متزامن ومحمي
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {isAuthLoading ? (
                    <div className="p-6 bg-[#4E342E]/5 border border-[#4E342E]/10 rounded-2xl flex items-center justify-center gap-3">
                      <span className="w-4 h-4 border-2 border-[#4E342E]/25 border-t-[#4E342E] rounded-full animate-spin" />
                      <p className="text-sm text-[#4E342E]/70 font-medium">جاري تحديث حالة الاتصال السحابي بمزود غوغل...</p>
                    </div>
                  ) : currentUser ? (
                    /* User Profile Details block */
                    <div className="p-5 bg-emerald-50/40 border border-[#4E342E]/10 rounded-2xl space-y-4">
                      <div className="flex items-center gap-4 flex-row-reverse">
                        {currentUser.photoURL ? (
                          <img 
                            src={currentUser.photoURL} 
                            referrerPolicy="no-referrer"
                            alt={currentUser.displayName || "Google User"} 
                            className="w-14 h-14 rounded-full border border-[#4E342E]/20 shadow-sm"
                          />
                        ) : (
                          <div className="w-14 h-14 bg-[#4E342E]/10 rounded-full flex items-center justify-center text-[#4E342E]">
                            <UserIcon size={24} />
                          </div>
                        )}
                        <div className="text-right flex-1 space-y-0.5">
                          <h4 className="font-bold text-base text-[#4E342E]">{currentUser.displayName || 'مستخدم Gmail نشط'}</h4>
                          <p className="text-xs text-[#4E342E]/65">{currentUser.email}</p>
                          <p className="text-[10px] text-emerald-700 bg-emerald-50 rounded-lg px-2.5 py-1 inline-block font-semibold mt-1">
                            ✓ متصل سحابياً مع Firestore (متاح في جميع المتصفحات)
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-[#4E342E]/10">
                        <button
                          onClick={async () => {
                            try {
                              await logoutUserWrapper();
                              setCurrentUser(null);
                              triggerToast('👋 تم تسجيل الخروج بنجاح! التطبيق يعمل محلياً الآن.');
                            } catch (e: any) {
                              triggerToast(`فشل تسجيل الخروج: ${e?.message}`);
                            }
                          }}
                          className="flex-1 py-2.5 px-4 bg-[#4E342E]/10 hover:bg-[#4E342E]/15 text-[#4E342E] font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                        >
                          <LogOut size={14} />
                          <span>تسجيل الخروج</span>
                        </button>

                        <button
                          onClick={async () => {
                            if (window.confirm('⚠️ هل أنت متأكد تماماً من رغبتك في حذف حسابك وحذف جميع بواباتك ومقترحاتك المخزنة سحابياً بشكل نهائي؟ لا يمكن التراجع عن هذا الإجراء.')) {
                              try {
                                const uid = currentUser.uid;
                                await deleteUserAccountWrapper(uid);
                                setCurrentUser(null);
                                triggerToast('🗑️ تم إتلاف وحذف جميع ملفاتك وقفل المساحة السحابية بنجاح.');
                              } catch (e: any) {
                                triggerToast(`فشلت الإزالة الكاملة: يرجى تسجيل الدخول مجدداً للإجراء الأمني.`);
                              }
                            }
                          }}
                          className="flex-1 py-2.5 px-4 bg-red-500/10 hover:bg-red-500/15 text-red-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                        >
                          <UserX size={14} />
                          <span>حذف الحساب بالكامل</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Google sign-in trigger placeholder card */
                    <div className="p-6 bg-[#4E342E]/5 border border-[#4E342E]/10 rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
                      <div className="w-12 h-12 bg-[#4E342E]/5 border border-[#4E342E]/10 rounded-full flex items-center justify-center text-[#4E342E]/40 animate-pulse">
                        <Cloud size={24} />
                      </div>
                      <div className="space-y-1.5 max-w-sm">
                        <h4 className="font-bold text-sm text-[#4E342E]">ربط التطبيق والمزامنة الفورية عبر حساب Google 🔑</h4>
                        <p className="text-xs text-[#4E342E]/75 leading-relaxed">
                          بمجرد تسجيل دخولك بحساب Gmail، سيتم مزامنة جميع بواباتك وتعديلاتك ونصوصك تلقائياً مع السحابة الفورية وتحديثها تلقائياً على أي متصفح أو هاتف آخر!
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            const user = await signInWithGoogleWrapper();
                            if (user) {
                              const compact: CompactUser = {
                                uid: user.uid,
                                displayName: user.displayName || 'مستخدم Google',
                                email: user.email || '',
                                photoURL: user.photoURL || undefined
                              };
                              setCurrentUser(compact);
                              saveSimulatedUser(compact);

                              // Load data from firestore
                              setIsSyncing(true);
                              try {
                                const cloudState = await fetchStateFromFirestoreWrapper(user.uid);
                                if (cloudState && (cloudState.gates || cloudState.prompts)) {
                                  setState({
                                    gates: cloudState.gates,
                                    prompts: cloudState.prompts
                                  });
                                  triggerToast(`🎉 تم مزامنة واستيراد بواباتك ونصوصك السحابية بنجاح!`);
                                } else {
                                  await saveStateToFirestoreWrapper(user.uid, state);
                                  triggerToast('🎉 تم ربط حسابك بـ Google وفتح المساحة السحابية المزامنة بنجاح!');
                                }
                              } catch (loadErr) {
                                triggerToast('🎉 تم تسجيل الدخول بنجاح عبر حساب Google!');
                              } finally {
                                setIsSyncing(false);
                              }
                            }
                          } catch (e: any) {
                            console.error("Google Auth popup error:", e);
                            setAuthError(e?.message || String(e));
                            if (e?.code === 'auth/popup-blocked') {
                              triggerToast('⚠️ تم حظر النافذة المنبثقة للاتصال بـ Google. يرجى فتح التطبيق في علامة تبويب جديدة ثم الدخول.');
                            } else if (e?.code === 'auth/configuration-not-found' || String(e).includes('configuration-not-found')) {
                              triggerToast('🔴 خطأ: خدمة تسجيل الدخول بـ Google غير مفعّلة في لوحة تحكّم Firebase.');
                            } else {
                              triggerToast(`❌ فشل الاتصال بـ Google: ${e?.message || e}`);
                            }
                          }
                        }}
                        className="py-3 px-6 bg-[#4E342E] hover:bg-[#3d2722] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-95 cursor-pointer font-sans"
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.71 0 3.27.61 4.5 1.64l2.43-2.43C17.39 1.62 14.97 1 12.24 1c-5.52 0-10 4.48-10 10s4.48 10 10 10c5.78 0 10-4.06 10-10 0-.68-.07-1.35-.16-1.715h-9.84z"/>
                        </svg>
                        <span>تسجيل الدخول الفوري بحساب Google</span>
                      </button>

                      {authError && (
                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2 text-right text-xs" dir="rtl">
                          <p className="text-amber-800 font-bold">⚠️ تنبيه إعدادات Firebase:</p>
                          <p className="text-[#4E342E]/75 leading-relaxed">
                            لم يتم تفعيل موفّر تسجيل الدخول (Google Provider) في لوحة تحكّم Firebase لمشروعك السحابي بعد. لتفعيل المزامنة الحقيقية، يرجى تفعيل تسجيل الدخول بـ Google في منصة Firebase.
                          </p>
                          <button
                            onClick={() => {
                              const compact: CompactUser = {
                                uid: "simulated_mimr5445_uid",
                                displayName: "مستكشف سحابي محاكي",
                                email: "mimr5445@gmail.com",
                              };
                              setCurrentUser(compact);
                              saveSimulatedUser(compact);
                              triggerToast('✨ تم تفعيل وضع المحاكاة الذكي بنجاح!');
                            }}
                            className="w-full py-2 bg-[#4E342E] hover:bg-[#3d2722] text-white font-bold rounded-lg transition-all active:scale-95 text-[11px] cursor-pointer"
                          >
                            ⚡ تجاوز الاتصال وتسجيل الدخول كحساب محاكي (mimr5445@gmail.com)
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                <section className="space-y-4">
                  <div className="p-5 bg-[#4E342E]/5 border border-[#4E342E]/10 rounded-2xl space-y-4 text-right" dir="rtl">
                    
                    {/* API Key */}
                    <div className="space-y-2 text-right">
                      <div className="flex justify-between items-center">
                        <Key size={16} className="text-[#4E342E]/60" />
                        {isApiKeyVerified && (
                          <div className="flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                            <span>Active</span>
                          </div>
                        )}
                      </div>
                      <input 
                        type="password" 
                        value={customApiKey}
                        onChange={e => {
                          setCustomApiKey(e.target.value);
                          setIsApiKeyVerified(false);
                          setVerificationFeedback(null);
                        }}
                        placeholder="••••••••••••••••••••••••"
                        className="w-full bg-[#F5F5DC] border border-[#4E342E]/10 rounded-xl p-3 text-sm focus:outline-none focus:border-[#4E342E]/50 transition-all text-left font-mono"
                      />
                    </div>

                    {/* Verification and Activation Action Button */}
                    <div className="space-y-2">
                      <button
                        onClick={handleVerifyAndActivateKey}
                        disabled={isKeyVerifying}
                        className="w-full py-3 bg-[#4E342E] hover:bg-[#3E2723] disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md shadow-[#4E342E]/10 cursor-pointer"
                      >
                        {isKeyVerifying ? (
                          <span className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Check size={16} />
                        )}
                      </button>

                      {/* Verification Feedback Badge */}
                      {verificationFeedback && (
                        <div 
                          className={`p-3 rounded-xl text-xs font-medium border text-right ${
                            verificationFeedback.type === 'success' 
                              ? 'bg-emerald-50/80 text-emerald-800 border-emerald-200' 
                              : 'bg-red-50/80 text-red-800 border-red-200'
                          }`}
                        >
                          {verificationFeedback.type === 'success' ? '✔' : '✖'}
                        </div>
                      )}
                    </div>

                    {/* Expandable Model selection parameters on successful verification only */}
                    {isApiKeyVerified && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-3 pt-3 border-t border-[#4E342E]/10 text-right"
                      >
                        {/* Model Selection */}
                        <div className="space-y-2 text-right">
                          <div className="flex justify-between items-center">
                            <Brain size={16} className="text-[#4E342E]/60" />
                          </div>
                          
                          <select 
                            value={customModel === 'gemini-3.5-flash' || customModel === 'gemini-3.1-pro-preview' ? customModel : 'custom'}
                            onChange={e => {
                              if (e.target.value !== 'custom') {
                                setCustomModel(e.target.value);
                                setVerificationFeedback(null);
                              }
                            }}
                            className="w-full bg-[#F5F5DC] border border-[#4E342E]/10 rounded-xl p-3 text-sm focus:outline-none focus:border-[#4E342E]/50 transition-all text-right font-sans outline-none"
                          >
                            <option value="gemini-3.5-flash">Flash</option>
                            <option value="gemini-3.1-pro-preview">Pro</option>
                            <option value="custom">Custom</option>
                          </select>

                          {/* Text Input for Custom Model */}
                          {customModel !== 'gemini-3.5-flash' && customModel !== 'gemini-3.1-pro-preview' && (
                            <input 
                              type="text"
                              value={customModel}
                              onChange={e => {
                                setCustomModel(e.target.value);
                                setVerificationFeedback(null);
                              }}
                              placeholder="gemini-xp"
                              className="w-full mt-1 bg-[#F5F5DC] border border-[#4E342E]/10 rounded-xl p-3 text-sm focus:outline-none focus:border-[#4E342E]/50 transition-all text-left font-mono"
                            />
                          )}
                        </div>

                        {/* Custom Agent Behavior / System Instruction */}
                        <div className="space-y-1.5 text-right">
                          <div className="flex justify-between items-center">
                            <SettingsIcon size={16} className="text-[#4E342E]/60" />
                          </div>
                          <textarea
                            value={customSystemInstruction}
                            onChange={e => setCustomSystemInstruction(e.target.value)}
                            placeholder="..."
                            rows={3}
                            className="w-full bg-[#F5F5DC] border border-[#4E342E]/10 rounded-xl p-3 text-sm focus:outline-none focus:border-[#4E342E]/50 transition-all text-right font-sans"
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>
                </section>

                <section className="space-y-4 font-sans">
                  <h3 className="text-sm font-semibold text-[#4E342E]/50 uppercase tracking-widest text-[#4E342E]/60 text-right">About</h3>
                  <div className="p-5 bg-[#4E342E]/5 border border-[#4E342E]/10 rounded-2xl space-y-2 text-right" dir="rtl">
                    <p className="text-sm font-bold">Prompt RKN v1.0.0</p>
                    <p className="text-xs text-[#4E342E]/60 leading-relaxed">
                      مدير نصوص وبوابات احترافي آمن بمزامنة سحابية متقدمة.
                    </p>
                  </div>
                </section>
              </div>
            </motion.div>
          )}

          {view === 'edit-gate' && currentGate && (
            <Modal onClose={navigateToHome} title="Edit Gate">
              <AddGateForm 
                initialValue={currentGate.name}
                onAdd={(name) => { updateGate(currentGate.id, name); navigateToHome(); }} 
                buttonLabel="Update Gate"
              />
            </Modal>
          )}

          {view === 'add-prompt' && (
            <Modal onClose={() => setView('gate')} title="New Prompt">
              <AddPromptForm onAdd={(title, content, note) => { 
                if (currentGateId) {
                  addPrompt(title, content, note, currentGateId); 
                  setView('gate'); 
                }
              }} />
            </Modal>
          )}

          {view === 'ai-chat' && (
            <motion.div 
              key="ai-chat"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col h-screen max-h-screen"
            >
              <header className="p-6 flex items-center justify-between border-b border-[#4E342E]/5 bg-[#F5F5DC]/80 backdrop-blur-xl sticky top-0 z-10 w-full">
                <div className="flex items-center gap-3">
                  <button onClick={navigateToHome} className="p-2 hover:bg-[#4E342E]/5 rounded-full transition-colors">
                    <ChevronLeft size={24} />
                  </button>
                  <div className="text-right">
                    <h2 className="text-sm font-bold pr-1 pl-2">المنظم الذكي (AI Organizer)</h2>
                    {isApiKeyVerified && (
                      <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 pr-1 pl-2">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                        متصل ومستعد
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {rollbackState && (
                    <button 
                      onClick={handleRestore}
                      className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-[#4E342E] rounded-xl transition-all font-bold text-xs flex items-center gap-1.5 border border-amber-500/20"
                      title="استرجاع الحالة السابقة"
                    >
                      <Undo size={14} />
                      <span className="hidden sm:inline">استرجاع</span>
                    </button>
                  )}
                  <button 
                    onClick={clearChatHistory}
                    className="p-2 hover:bg-red-500/5 hover:text-red-500 text-[#4E342E]/60 rounded-xl transition-colors"
                    title="مسح المحادثة"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </header>

              {/* Chat Content or Activation Block depends on isApiKeyVerified */}
              {!isApiKeyVerified ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4" dir="rtl">
                  <div className="w-16 h-16 bg-[#4E342E]/5 border border-[#4E342E]/10 rounded-full flex items-center justify-center text-[#4E342E]/50">
                    <Brain size={32} className="text-[#4E342E]" />
                  </div>
                  <div className="space-y-1 max-w-sm">
                    <h3 className="text-base font-bold text-[#4E342E]">تفعيل مفتاح الـ API مطلوب</h3>
                    <p className="text-xs text-[#4E342E]/60 leading-relaxed">
                      يرجى إدخال والتحقق من مفتاح الـ API في الإعدادات لتفعيل المنظم الذكي.
                    </p>
                  </div>
                  <button
                    onClick={() => setView('settings')}
                    className="px-5 py-2.5 bg-[#4E342E] hover:bg-[#3d2924] text-white font-bold text-xs rounded-xl shadow transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer font-sans"
                  >
                    <SettingsIcon size={14} />
                    <span>الانتقال للإعدادات</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Chat Message Stream */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-28">
                    {chatMessages.map((msg) => (
                      <div 
                        key={msg.id} 
                        className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-1`}
                      >
                        <div className="text-[10px] text-[#4E342E]/40 px-2">
                          {msg.sender === 'user' ? 'أنت' : 'منظم RKN الذكي'}
                        </div>
                        <div 
                          className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-wrap ${
                            msg.sender === 'user' 
                              ? 'bg-[#4E342E] text-white shadow-md rounded-tr-none text-right' 
                              : 'bg-[#4E342E]/5 text-[#4E342E] border border-[#4E342E]/10 rounded-tl-none text-right'
                          }`}
                          dir="rtl"
                        >
                          {msg.text}

                          {/* If there's a proposed re-org, render a clean card with Accept/Reject */}
                          {msg.isProposal && msg.proposedState && (
                            <div className="mt-4 p-4 rounded-2xl bg-[#F4F4E0] border border-[#4E342E]/20 space-y-4 text-right shadow-sm">
                              <div className="flex items-center gap-2 text-[#4E342E] font-bold text-xs border-b border-[#4E342E]/10 pb-2.5">
                                <Sparkles size={14} className="text-amber-600 animate-pulse" />
                                <span>المقترح الهيكلي للمعالج الذكي</span>
                              </div>

                              {/* Render the details diff beautifully showing any added prompts, notes, content, categories */}
                              <div className="bg-[#4E342E]/5 p-3 rounded-xl border border-[#4E342E]/5 max-h-[380px] overflow-y-auto space-y-3">
                                {renderProposedDiff(msg.proposedState)}
                              </div>

                              {msg.proposalStatus === 'pending' && (
                                <div className="flex gap-2 pt-2">
                                  <button
                                    onClick={() => handleAcceptProposal(msg.id, msg.proposedState!)}
                                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md shadow-emerald-650/10"
                                  >
                                    <Check size={14} />
                                    <span>الموافقة والتطبيق السريع</span>
                                  </button>
                                  <button
                                    onClick={() => handleRejectProposal(msg.id)}
                                    className="flex-1 py-3 border border-[#4E342E]/20 hover:bg-[#4E342E]/5 text-[#4E342E] font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95"
                                  >
                                    <X size={14} />
                                    <span>تجاهل هذا المقترح</span>
                                  </button>
                                </div>
                              )}

                              {msg.proposalStatus === 'accepted' && (
                                <div className="py-2.5 text-center text-xs text-emerald-700 font-bold bg-emerald-50 rounded-xl flex items-center justify-center gap-1.5 border border-emerald-150">
                                  <Check size={14} />
                                  <span>تمت الموافقة وتطبيق التعديل المقترح!</span>
                                </div>
                              )}

                              {msg.proposalStatus === 'rejected' && (
                                <div className="py-2.5 text-center text-xs text-[#4E342E]/60 font-bold bg-[#4E342E]/5 rounded-xl flex items-center justify-center gap-1.5 border border-[#4E342E]/10">
                                  <X size={14} />
                                  <span>تم رفض هذا الاقتراح.</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {isChatLoading && (
                      <div className="flex justify-start items-center space-x-2 text-xs text-[#4E342E]/50" dir="rtl">
                        <div className="w-6 h-6 bg-[#4E342E]/10 rounded-full flex items-center justify-center animate-spin">
                          <Brain size={12} className="text-[#4E342E]" />
                        </div>
                        <span>جاري تنظيم بوابات ونصوص النظام الذكي...</span>
                      </div>
                    )}
                  </div>

                  {/* Message Input panel */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-[#F5F5DC] border-t border-[#4E342E]/10 flex items-center gap-2">
                    <button
                      onClick={sendChatMessage}
                      disabled={!chatInput.trim() || isChatLoading}
                      className="w-12 h-12 bg-[#4E342E] hover:bg-[#3d2924] disabled:opacity-50 text-white rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-95"
                    >
                      <Send size={18} />
                    </button>
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') sendChatMessage(); }}
                      disabled={isChatLoading}
                      placeholder="كيف يمكنني مساعدتك في تنظيم بوابات ومقترحات النصوص اليوم؟"
                      className="flex-1 bg-[#4E342E]/5 border border-[#4E342E]/10 rounded-2xl p-3.5 text-right focus:outline-none focus:border-[#4E342E]/50 transition-all text-sm"
                      dir="rtl"
                    />
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PromptEditor({ content, onSave }: { content: string, onSave: (val: string) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setValue(content);
  }, [content]);

  const handleBlur = () => {
    setIsEditing(false);
    onSave(value);
  };

  const startEditing = () => {
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  return (
    <div className="relative group">
      {!isEditing && (
        <button 
          onClick={startEditing}
          className="absolute top-4 right-4 p-2 bg-[#4E342E]/10 hover:bg-[#4E342E]/20 rounded-lg text-[#4E342E] opacity-0 group-hover:opacity-100 transition-opacity z-10"
        >
          <Edit3 size={16} />
        </button>
      )}
      
      <div className={`w-full rounded-2xl border transition-all overflow-hidden ${
        isEditing ? 'border-[#4E342E]/50 ring-1 ring-[#4E342E]/20' : 'border-[#4E342E]/10'
      }`}>
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlur}
            className="w-full min-h-[300px] bg-[#FDF5E6] p-6 font-mono text-sm leading-relaxed text-[#4E342E] focus:outline-none resize-none"
          />
        ) : (
          <div 
            onClick={startEditing}
            className="w-full min-h-[300px] bg-[#FDF5E6] p-6 font-mono text-sm leading-relaxed text-[#4E342E]/80 whitespace-pre-wrap cursor-text"
          >
            {value || <span className="text-[#4E342E]/30 italic">Empty prompt...</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode, onClose: () => void, title: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="w-full max-w-md bg-[#F5F5DC] border border-[#4E342E]/10 rounded-3xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[#4E342E]/5 flex justify-between items-center">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-[#4E342E]/5 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

function AddGateForm({ onAdd, initialValue = '', buttonLabel = 'Create Gate' }: { onAdd: (name: string) => void, initialValue?: string, buttonLabel?: string }) {
  const [name, setName] = useState(initialValue);
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-xs font-bold text-[#4E342E]/50 uppercase tracking-widest">Gate Name</label>
        <input 
          autoFocus
          type="text" 
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Creative Writing"
          className="w-full bg-[#4E342E]/5 border border-[#4E342E]/10 rounded-2xl p-4 focus:outline-none focus:border-[#4E342E]/50 transition-all"
        />
      </div>
      <button 
        onClick={() => name && onAdd(name)}
        disabled={!name}
        className="w-full bg-[#4E342E] text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#4E342E]/20 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
      >
        {buttonLabel}
      </button>
    </div>
  );
}

function AddPromptForm({ onAdd }: { onAdd: (title: string, content: string, note: string) => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [note, setNote] = useState('');

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-xs font-bold text-[#4E342E]/50 uppercase tracking-widest">Title</label>
        <input 
          autoFocus
          type="text" 
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Prompt Title"
          className="w-full bg-[#4E342E]/5 border border-[#4E342E]/10 rounded-2xl p-4 focus:outline-none focus:border-[#4E342E]/50 transition-all"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-bold text-[#4E342E]/50 uppercase tracking-widest">Prompt Content</label>
        <textarea 
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Paste your prompt here..."
          className="w-full h-40 bg-[#4E342E]/5 border border-[#4E342E]/10 rounded-2xl p-4 text-sm font-mono focus:outline-none focus:border-[#4E342E]/50 transition-all resize-none"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-bold text-[#4E342E]/50 uppercase tracking-widest">Notes (Optional)</label>
        <textarea 
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="What is this prompt for?"
          className="w-full h-24 bg-[#4E342E]/5 border border-[#4E342E]/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-[#4E342E]/50 transition-all resize-none"
        />
      </div>
      <button 
        onClick={() => title && content && onAdd(title, content, note)}
        disabled={!title || !content}
        className="w-full bg-[#4E342E] text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#4E342E]/20 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
      >
        Save Prompt
      </button>
    </div>
  );
}
