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
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Gate, Prompt, View, AppState } from './types';

const STORAGE_KEY = 'prompt_rkn_data';

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

  // Persist custom key
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('prompt_rkn_custom_key', customApiKey);
    }
  }, [customApiKey]);

  // Persist chat history
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('prompt_rkn_chat_history', JSON.stringify(chatMessages));
    }
  }, [chatMessages]);

  const triggerToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  // Persist state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

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
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
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
        }),
      });

      const data = await response.json();

      if (response.ok && data) {
        const aiMsg: ChatMessage = {
          id: crypto.randomUUID(),
          sender: 'ai',
          text: data.message || 'تمت معالجة الطلب بنجاح.',
          isProposal: data.isProposal,
          proposedState: data.proposedState,
          proposalStatus: data.isProposal ? 'pending' : undefined,
        };
        setChatMessages(prev => [...prev, aiMsg]);
      } else {
        const aiMsg: ChatMessage = {
          id: crypto.randomUUID(),
          sender: 'ai',
          text: `عذراً، حدث خطأ أثناء الاتصال بالخادم: ${data.error || 'خطأ غير معروف'}`,
        };
        setChatMessages(prev => [...prev, aiMsg]);
      }
    } catch (error: any) {
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'ai',
        text: `فشل الاتصال بذكاء التطبيق: ${error?.message || 'الرجاء التحقق من الإنترنت.'}`,
      };
      setChatMessages(prev => [...prev, aiMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleAcceptProposal = (msgId: string, proposed: AppState) => {
    if (!confirm('هل توافق على تطبيق هذا التنظيم المقترح؟ سيتم حفظ نسخة احتياطية من بياناتك الحالية تلقائياً لتتمكن من التراجع في أي وقت.')) return;

    // Save rollback snapshot
    localStorage.setItem('prompt_rkn_rollback', JSON.stringify(state));
    setRollbackState(state);

    // Apply new state
    setState(proposed);

    // Mark as accepted
    setChatMessages(prev => prev.map(m => m.id === msgId ? { ...m, proposalStatus: 'accepted' as const } : m));
    triggerToast('🎉 تم تطبيق التنظيم الذكي الجديد بنجاح!');
  };

  const handleRejectProposal = (msgId: string) => {
    setChatMessages(prev => prev.map(m => m.id === msgId ? { ...m, proposalStatus: 'rejected' as const } : m));
    triggerToast('Option rejected.');
  };

  const handleRestore = () => {
    if (!rollbackState) {
      triggerToast('لا توجد نسخة استرجاع محفوظة حالياً.');
      return;
    }

    if (!confirm('هل تريد استرجاع آخر تنظيم كان فعالاً؟ سيتم عكس التغيير الذي قمنا به.')) return;

    const temp = state;
    setState(rollbackState);
    setRollbackState(temp);
    localStorage.setItem('prompt_rkn_rollback', JSON.stringify(temp));

    triggerToast('↩️ تم استرجاع التنظيم السابق بنجاح!');
  };

  const clearChatHistory = () => {
    if (!confirm('هل تريد مسح سجل دردشة المنظم وإعادة البدء؟')) return;
    setChatMessages([
      {
        id: 'welcome',
        sender: 'ai',
        text: 'مرحباً بك في منظم النصوص الذكي لـ Prompt RKN! 🧠✨\n\nبصفتي معالج ذكاء اصطناعي مدمج في صلب النظام، أمتلك تحكماً كاملاً لتنظيم وتصنيف وترتيب بواباتك ونصوصك.\n\nاكتب لي مثلاً: "نظم النصوص في التطبيق وقسمها إلى فئات وفولدرات مخصصة برمجية وأدبية وثقافية" وسأقوم بمراجعة فورية واقتراح واجهة جديدة كاملة والمطالبة بموافقتك قبل التطبيق. وفي حال لم يعجبك التنظيم، يمكنك الضغط على "استرجاع" لإعادة البيانات بالكامل إلى ما كانت عليه سابقاً!',
      }
    ]);
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
                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-[#4E342E]/50 uppercase tracking-widest">Backup & Sync</h3>
                  <div className="grid gap-4">
                    <button 
                      onClick={exportData}
                      className="flex items-center justify-between p-5 bg-[#4E342E]/5 border border-[#4E342E]/10 rounded-2xl hover:bg-[#4E342E]/10 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#4E342E]/20 rounded-xl flex items-center justify-center text-[#4E342E]">
                          <Download size={20} />
                        </div>
                        <div className="text-left">
                          <p className="font-medium">Export Data</p>
                          <p className="text-xs text-[#4E342E]/50">Download your prompts as JSON</p>
                        </div>
                      </div>
                    </button>

                    <label className="flex items-center justify-between p-5 bg-[#4E342E]/5 border border-[#4E342E]/10 rounded-2xl hover:bg-[#4E342E]/10 transition-all cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#4E342E]/20 rounded-xl flex items-center justify-center text-[#4E342E]">
                          <Upload size={20} />
                        </div>
                        <div className="text-left">
                          <p className="font-medium">Import Data</p>
                          <p className="text-xs text-[#4E342E]/50">Restore from a backup file</p>
                        </div>
                      </div>
                      <input type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
                    </label>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-[#4E342E]/50 uppercase tracking-widest text-[#4E342E]/60">AI Smart Integration</h3>
                  <div className="p-5 bg-[#4E342E]/5 border border-[#4E342E]/10 rounded-2xl space-y-4 text-right" dir="rtl">
                    <p className="text-xs text-[#4E342E]/70 leading-relaxed">
                      المنظم مبرمج للعمل تلقائياً. يمكنك وضع مفتاح الـ API الخاص بـ Gemini إذا أردت استخدام حسابك الخاص أو نموذج مخصص لتنظيم النصوص بالكامل:
                    </p>
                    <div className="space-y-2 text-right">
                      <div className="flex justify-between items-center text-xs font-bold text-[#4E342E]/60 tracking-wider">
                        <span>Gemini API Key</span>
                        <span className="text-[10px] opacity-60">(اختياري)</span>
                      </div>
                      <input 
                        type="password" 
                        value={customApiKey}
                        onChange={e => setCustomApiKey(e.target.value)}
                        placeholder="أدخل مفتاح الـ API هنا..."
                        className="w-full bg-[#F5F5DC] border border-[#4E342E]/10 rounded-xl p-3 text-sm focus:outline-none focus:border-[#4E342E]/50 transition-all text-left font-mono"
                      />
                    </div>
                    {rollbackState && (
                      <button 
                        onClick={handleRestore}
                        className="w-full mt-2 flex items-center justify-between p-3.5 bg-amber-500/10 hover:bg-amber-500/20 text-[#4E342E] border border-amber-500/20 font-bold text-xs rounded-xl transition-all"
                      >
                        <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded text-[#4E342E]">متاح</span>
                        <div className="flex items-center gap-2">
                          <Undo size={14} />
                          <span>استرجاع التنظيم السابق (Rollback)</span>
                        </div>
                      </button>
                    )}
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-[#4E342E]/50 uppercase tracking-widest">About</h3>
                  <div className="p-5 bg-[#4E342E]/5 border border-[#4E342E]/10 rounded-2xl space-y-2">
                    <p className="text-sm">Prompt RKN v1.0.0</p>
                    <p className="text-xs text-[#4E342E]/50 leading-relaxed">
                      A premium client-side prompt manager. All data is stored locally in your browser.
                    </p>
                  </div>
                </section>
              </div>
            </motion.div>
          )}

          {view === 'add-gate' && (
            <Modal onClose={navigateToHome} title="New Gate">
              <AddGateForm onAdd={(name) => { addGate(name); navigateToHome(); }} />
            </Modal>
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
              <header className="p-6 flex items-center justify-between border-b border-[#4E342E]/5 bg-[#F5F5DC]/80 backdrop-blur-xl sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <button onClick={navigateToHome} className="p-2 hover:bg-[#4E342E]/5 rounded-full transition-colors">
                    <ChevronLeft size={24} />
                  </button>
                  <div className="text-left">
                    <h2 className="text-lg font-bold pr-2">المنظم الذكي (AI Organizer)</h2>
                    <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 pl-2">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                      متصل ومستعد
                    </p>
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
                        <div className="mt-4 p-4 rounded-xl bg-[#F5F5DC] border border-[#4E342E]/10 space-y-3 text-right">
                          <div className="flex items-center gap-2 text-[#4E342E] font-bold text-xs border-b border-[#4E342E]/10 pb-2">
                            <Sparkles size={14} className="text-amber-600 animate-pulse" />
                            <span>تنظيم جديد مقترح من المعالج الذكي</span>
                          </div>
                          <div className="space-y-1.5 text-xs text-[#4E342E]/80">
                            <div>📌 الفئات المقترحة: <span className="font-bold">{msg.proposedState.gates.length}</span></div>
                            <div>📝 النصوص الإجمالية: <span className="font-bold">{msg.proposedState.prompts.length}</span></div>
                          </div>

                          <div className="space-y-1 bg-[#4E342E]/5 p-2.5 rounded-lg text-[11px] max-h-24 overflow-y-auto border border-[#4E342E]/5">
                            {msg.proposedState.gates.map((g, idx) => (
                              <div key={idx} className="flex justify-between items-center text-[#4E342E]/70" dir="ltr">
                                <span className="text-[10px] opacity-60">
                                  ({msg.proposedState?.prompts.filter(p => p.gateId === g.id).length || 0} prompts)
                                </span>
                                <span className="font-medium text-right font-sans">📁 {g.name}</span>
                              </div>
                            ))}
                          </div>

                          {msg.proposalStatus === 'pending' && (
                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => handleAcceptProposal(msg.id, msg.proposedState!)}
                                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-all active:scale-95 shadow-sm"
                              >
                                <Check size={12} />
                                <span>قبول وتطبيق</span>
                              </button>
                              <button
                                onClick={() => handleRejectProposal(msg.id)}
                                className="flex-1 py-2 border border-[#4E342E]/10 hover:bg-[#4E342E]/5 text-[#4E342E] font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-all active:scale-95"
                              >
                                <X size={12} />
                                <span>رفض الاقتراح</span>
                              </button>
                            </div>
                          )}

                          {msg.proposalStatus === 'accepted' && (
                            <div className="py-1.5 text-center text-xs text-emerald-600 font-bold bg-emerald-50 rounded-lg flex items-center justify-center gap-1">
                              <Check size={12} />
                              <span>تم قبول وتطبيق التعديل المقترح!</span>
                            </div>
                          )}

                          {msg.proposalStatus === 'rejected' && (
                            <div className="py-1.5 text-center text-xs text-red-500 font-bold bg-red-50 rounded-lg flex items-center justify-center gap-1">
                              <X size={12} />
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
                    <span>معالج RKN يقوم بتحليل وتخطيط بوابات ونصوص النظام...</span>
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
                  placeholder="مثال: قسّم نصوصي إلى بوابتي العمل والتثقيف..."
                  className="flex-1 bg-[#4E342E]/5 border border-[#4E342E]/10 rounded-2xl p-3.5 text-right focus:outline-none focus:border-[#4E342E]/50 transition-all text-sm"
                  dir="rtl"
                />
              </div>
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
