import { useState, useEffect, useRef } from "react";
import { 
  Upload, 
  Image as ImageIcon, 
  Send, 
  Loader2, 
  ChevronRight, 
  ChevronLeft, 
  MessageSquare, 
  X, 
  Download, 
  Plus,
  Trash2,
  RefreshCw,
  Key
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";
import { Scene, ImageSize, ChatMessage } from "./types";
import { parseScriptToScenes, generateSceneImage, chatWithGemini } from "./services/geminiService";

// Extend window for AI Studio API
declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export default function App() {
  const [script, setScript] = useState("");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [imageSize, setImageSize] = useState<ImageSize>("1K");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentChatInput, setCurrentChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkApiKey();
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const checkApiKey = async () => {
    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(hasKey);
    }
  };

  const handleOpenSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const handleParseScript = async () => {
    if (!script.trim()) return;
    setIsParsing(true);
    try {
      const parsedScenes = await parseScriptToScenes(script);
      setScenes(parsedScenes);
    } catch (error) {
      console.error("Error parsing script:", error);
    } finally {
      setIsParsing(false);
    }
  };

  const handleGenerateImage = async (sceneId: string) => {
    if (!hasApiKey) {
      await handleOpenSelectKey();
    }

    setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, status: "generating" } : s));
    
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;

    try {
      const imageUrl = await generateSceneImage(scene.imagePrompt, imageSize);
      setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, imageUrl, status: "completed" } : s));
    } catch (error) {
      console.error("Error generating image:", error);
      setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, status: "error" } : s));
    }
  };

  const handleGenerateAll = async () => {
    if (!hasApiKey) {
      await handleOpenSelectKey();
    }

    for (const scene of scenes) {
      if (scene.status !== "completed") {
        await handleGenerateImage(scene.id);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!currentChatInput.trim()) return;

    const newUserMessage: ChatMessage = { role: "user", content: currentChatInput };
    setChatMessages(prev => [...prev, newUserMessage]);
    setCurrentChatInput("");
    setIsChatLoading(true);

    try {
      const response = await chatWithGemini([...chatMessages, newUserMessage]);
      setChatMessages(prev => [...prev, { role: "model", content: response || "No response" }]);
    } catch (error) {
      console.error("Error in chat:", error);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <motion.div 
        initial={false}
        animate={{ width: isSidebarOpen ? 400 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="bg-[#141414] border-r border-white/10 flex flex-col relative overflow-hidden"
      >
        <div className="p-6 flex flex-col h-full w-[400px]">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <ImageIcon className="text-black w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Storyboard AI</h1>
          </div>

          <div className="flex-1 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Script Input</label>
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Paste your script here..."
                className="w-full h-64 bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-white/20 transition-colors resize-none"
              />
            </div>

            <button
              onClick={handleParseScript}
              disabled={isParsing || !script.trim()}
              className="w-full py-4 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isParsing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
              {isParsing ? "Analyzing Script..." : "Generate Scenes"}
            </button>

            <div className="flex flex-col gap-4 mt-auto">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Image Quality</label>
                <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
                  {(["1K", "2K", "4K"] as ImageSize[]).map((size) => (
                    <button
                      key={size}
                      onClick={() => setImageSize(size)}
                      className={cn(
                        "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                        imageSize === size ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {!hasApiKey && (
                <button
                  onClick={handleOpenSelectKey}
                  className="w-full py-3 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-orange-500/20 transition-all"
                >
                  <Key className="w-4 h-4" />
                  Select API Key for Images
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-10">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-4">
            {scenes.length > 0 && (
              <button
                onClick={handleGenerateAll}
                className="px-6 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-bold hover:bg-white/10 transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Generate All Images
              </button>
            )}
            <button 
              onClick={() => setIsChatOpen(true)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors relative"
            >
              <MessageSquare className="w-5 h-5" />
              {chatMessages.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full" />}
            </button>
          </div>
        </header>

        {/* Storyboard Grid */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {scenes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6">
                <Upload className="w-8 h-8 text-white/20" />
              </div>
              <h2 className="text-2xl font-bold mb-2">No script uploaded</h2>
              <p className="text-white/40 text-sm leading-relaxed">
                Paste your script in the sidebar to begin generating your visual storyboard.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-8">
              <AnimatePresence mode="popLayout">
                {scenes.map((scene, index) => (
                  <motion.div
                    key={scene.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.1 }}
                    className="group bg-[#141414] border border-white/10 rounded-2xl overflow-hidden flex flex-col"
                  >
                    <div className="aspect-video bg-black/40 relative overflow-hidden">
                      {scene.imageUrl ? (
                        <img 
                          src={scene.imageUrl} 
                          alt={scene.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                          {scene.status === "generating" ? (
                            <>
                              <Loader2 className="w-8 h-8 animate-spin text-white/20" />
                              <span className="text-xs font-bold text-white/20 uppercase tracking-widest">Generating...</span>
                            </>
                          ) : (
                            <button
                              onClick={() => handleGenerateImage(scene.id)}
                              className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-all group-hover:scale-110"
                            >
                              <Plus className="w-6 h-6 text-white/40" />
                            </button>
                          )}
                        </div>
                      )}
                      
                      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Scene {index + 1}</span>
                      </div>
                    </div>

                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="text-lg font-bold mb-2 group-hover:text-white transition-colors">{scene.title}</h3>
                      <p className="text-sm text-white/40 leading-relaxed mb-4 flex-1">{scene.description}</p>
                      
                      <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-2">
                          <button className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/20 hover:text-white">
                            <Download className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setScenes(prev => prev.filter(s => s.id !== scene.id))}
                            className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-white/20 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <button
                          onClick={() => handleGenerateImage(scene.id)}
                          disabled={scene.status === "generating"}
                          className="text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors flex items-center gap-2"
                        >
                          {scene.imageUrl ? "Regenerate" : "Generate"}
                          <RefreshCw className={cn("w-3 h-3", scene.status === "generating" && "animate-spin")} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>

      {/* Chat Interface */}
      <AnimatePresence>
        {isChatOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChatOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#141414] border-l border-white/10 z-50 flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-bold">Creative Assistant</h3>
                </div>
                <button 
                  onClick={() => setIsChatOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
                {chatMessages.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20">
                    <MessageSquare className="w-12 h-12 mb-4" />
                    <p className="text-sm">Ask for visual ideas or script refinements</p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "flex flex-col max-w-[85%]",
                      msg.role === "user" ? "ml-auto items-end" : "items-start"
                    )}
                  >
                    <div 
                      className={cn(
                        "p-4 rounded-2xl text-sm leading-relaxed",
                        msg.role === "user" 
                          ? "bg-white text-black font-medium rounded-tr-none" 
                          : "bg-white/5 border border-white/10 rounded-tl-none"
                      )}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/20 mt-2">
                      {msg.role === "user" ? "You" : "Gemini"}
                    </span>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex items-center gap-2 text-white/20">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-widest">Assistant is thinking...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-6 border-t border-white/5">
                <div className="relative">
                  <input
                    type="text"
                    value={currentChatInput}
                    onChange={(e) => setCurrentChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="Type a message..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-4 pr-14 text-sm focus:outline-none focus:border-white/20 transition-colors"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!currentChatInput.trim() || isChatLoading}
                    className="absolute right-2 top-2 bottom-2 w-10 bg-white text-black rounded-lg flex items-center justify-center hover:bg-white/90 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
