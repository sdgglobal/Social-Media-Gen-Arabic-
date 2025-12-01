import React, { useState, useEffect, useRef } from 'react';
import { generatePostContent, generateImageForPlatform } from './services/geminiService';
import { Platform, Tone, GenerationResult, AspectRatio, ImageSize } from './types';
import { TONE_LABELS, TONE_ICONS, ASPECT_RATIOS } from './constants';
import PostCard from './components/PostCard';
import { Sparkles, Image as ImageIcon, Settings2, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState(false);
  const [idea, setIdea] = useState('');
  const [tone, setTone] = useState<Tone>(Tone.PROFESSIONAL);
  
  // Settings
  const [imageSize, setImageSize] = useState<ImageSize>('1K');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio | 'AUTO'>('AUTO');
  const [showSettings, setShowSettings] = useState(false);

  // Loading States
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [results, setResults] = useState<GenerationResult | null>(null);
  
  // Ref to prevent spamming alerts during parallel image generation
  const permissionErrorRef = useRef(false);

  // Initialize API Key check
  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        // If in AI Studio environment, strictly respect the selection state
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } else {
        // Fallback for local/other environments
        setHasKey(!!process.env.API_KEY);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        // Assume selection was successful if it resolves
        setHasKey(true);
        permissionErrorRef.current = false; // Reset error flag
      } catch (e) {
        console.error("Key selection failed/cancelled", e);
      }
    }
  };

  const handleApiError = async (error: any) => {
    console.error("API Operation Failed", error);
    
    // Robust error message extraction
    let errorMessage = "";
    if (typeof error === 'string') {
        errorMessage = error;
    } else if (error instanceof Error) {
        errorMessage = error.message;
        // Check for nested error response often found in GenAI errors
        if ((error as any).response) {
            try {
                errorMessage += " " + JSON.stringify((error as any).response);
            } catch {}
        }
    } else {
        try {
            errorMessage = JSON.stringify(error);
        } catch {
            errorMessage = "Unknown error";
        }
    }
    
    // Check for permission/billing issues (403 Permission Denied)
    const isPermissionError = 
      errorMessage.includes("403") || 
      errorMessage.includes("PERMISSION_DENIED") ||
      errorMessage.includes("The caller does not have permission") ||
      errorMessage.includes("Requested entity was not found");

    if (isPermissionError) {
      if (!permissionErrorRef.current) {
        permissionErrorRef.current = true;
        setHasKey(false); // Immediately unmount app to prevent further calls
        
        // Show user-friendly alert
        alert("⚠️ خطأ في الصلاحيات (403)\n\nهذا النموذج (Gemini 3 Pro) يتطلب مفتاح API مرتبط بمشروع مدفوع (Billing Enabled).\n\nيرجى اختيار مشروع يحتوي على حساب فوترة نشط.");
        
        // Attempt to re-open selector if available
        if (window.aistudio) {
          try {
            await window.aistudio.openSelectKey();
            setHasKey(true);
            permissionErrorRef.current = false;
          } catch (e) {
            console.log("Key selection cancelled", e);
          }
        }
      }
    } else {
       console.warn("Non-permission API error:", errorMessage);
    }
  };

  const handleGenerate = async () => {
    if (!idea.trim()) return;
    setIsGeneratingText(true);
    setResults(null);
    permissionErrorRef.current = false; // Reset error flag before new generation

    try {
      const content = await generatePostContent(idea, tone);
      
      const newResults: GenerationResult = {
        [Platform.LINKEDIN]: { ...content.linkedin, platform: Platform.LINKEDIN },
        [Platform.TWITTER]: { ...content.twitter, platform: Platform.TWITTER },
        [Platform.INSTAGRAM]: { ...content.instagram, platform: Platform.INSTAGRAM },
        [Platform.FACEBOOK]: { ...content.facebook, platform: Platform.FACEBOOK }
      };

      setResults(newResults);
      
      // Trigger image generation in parallel
      // We don't await this because we want to show text immediately
      generateAllImages(newResults);

    } catch (error) {
      await handleApiError(error);
      if (!permissionErrorRef.current) {
        alert("حدث خطأ أثناء توليد النصوص. يرجى التأكد من الاتصال والمحاولة مرة أخرى.");
      }
    } finally {
      setIsGeneratingText(false);
    }
  };

  const generateAllImages = async (currentResults: GenerationResult) => {
    const platforms = [Platform.LINKEDIN, Platform.TWITTER, Platform.INSTAGRAM, Platform.FACEBOOK];
    
    // Set loading indicators
    setResults(prev => {
      if (!prev) return null;
      const next = { ...prev };
      platforms.forEach(p => { next[p].imageLoading = true; });
      return next;
    });

    const promises = platforms.map(async (platform) => {
      // If a permission error occurred elsewhere, stop trying
      if (permissionErrorRef.current) {
         setResults(prev => {
          if (!prev) return null;
          return { ...prev, [platform]: { ...prev[platform], imageLoading: false } };
        });
        return;
      }

      const post = currentResults[platform];
      try {
        const imageUrl = await generateImageForPlatform(post.imagePrompt, platform, {
          aspectRatio,
          size: imageSize
        });
        
        setResults(prev => {
          if (!prev) return null;
          return {
            ...prev,
            [platform]: { ...prev[platform], imageUrl, imageLoading: false }
          };
        });
      } catch (error) {
        // Only handle error if global permission flag isn't set yet (avoids spamming)
        if (!permissionErrorRef.current) {
             await handleApiError(error);
        }

        setResults(prev => {
          if (!prev) return null;
          return {
            ...prev,
            [platform]: { ...prev[platform], imageLoading: false }
          };
        });
      }
    });

    await Promise.all(promises);
  };

  const handleRegenerateImage = async (platform: Platform) => {
    if (!results) return;
    permissionErrorRef.current = false;
    
    setResults(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [platform]: { ...prev[platform], imageLoading: true }
      };
    });

    try {
      const imageUrl = await generateImageForPlatform(
        results[platform].imagePrompt, 
        platform,
        { aspectRatio, size: imageSize }
      );
      
      setResults(prev => {
        if (!prev) return null;
        return {
          ...prev,
          [platform]: { ...prev[platform], imageUrl, imageLoading: false }
        };
      });
    } catch (error) {
      await handleApiError(error);
      setResults(prev => {
        if (!prev) return null;
        return {
          ...prev,
          [platform]: { ...prev[platform], imageLoading: false }
        };
      });
    }
  };

  if (!hasKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-cairo" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600">
            <Sparkles size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">مرحباً بك في صانع المحتوى</h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            للبدء في استخدام ميزات Gemini المتطورة (مثل توليد الصور عالي الدقة)، تحتاج إلى اختيار مشروع مدفوع (Billing Enabled).
          </p>
          <button 
            onClick={handleSelectKey}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-lg shadow transition-transform transform hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            <span>اختيار مفتاح API</span>
            <span className="text-xl">🔑</span>
          </button>
          <div className="mt-6 text-xs text-gray-400">
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-blue-500">
              معلومات حول الفوترة
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-blue-600 to-purple-600 p-2 rounded-lg text-white">
              <Sparkles size={24} />
            </div>
            <h1 className="text-xl font-bold text-gray-800 hidden sm:block">مولد المحتوى الذكي</h1>
          </div>
          <div className="flex items-center gap-2">
             <button 
               onClick={() => setShowSettings(!showSettings)}
               className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`}
               title="إعدادات الصورة"
             >
               <Settings2 size={24} />
             </button>
          </div>
        </div>
        
        {/* Settings Panel */}
        {showSettings && (
          <div className="border-t bg-gray-50/50 backdrop-blur-sm animate-in slide-in-from-top-2 duration-200">
            <div className="container mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <ImageIcon size={16} />
                  دقة الصورة
                </label>
                <div className="flex gap-2">
                  {(['1K', '2K', '4K'] as ImageSize[]).map((size) => (
                    <button
                      key={size}
                      onClick={() => setImageSize(size)}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                        imageSize === size 
                          ? 'bg-blue-600 text-white shadow-md' 
                          : 'bg-white text-gray-600 border hover:border-blue-300'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Settings2 size={16} />
                  نسبة الأبعاد
                </label>
                <select 
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as AspectRatio | 'AUTO')}
                  className="w-full p-2 rounded-md border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm text-right"
                  dir="rtl"
                >
                  <option value="AUTO">تلقائي (حسب المنصة)</option>
                  {ASPECT_RATIOS.map(ratio => (
                    <option key={ratio} value={ratio}>{ratio}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="container mx-auto px-4 py-8">
        
        {/* Input Section */}
        <section className="max-w-3xl mx-auto mb-12">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <label className="block text-lg font-semibold text-gray-800 mb-3">عن ماذا تريد أن تكتب اليوم؟</label>
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="مثال: إطلاق منتج جديد للقهوة العربية يركز على التراث والحداثة..."
              className="w-full h-32 p-4 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none text-gray-700 text-lg placeholder:text-gray-300 outline-none"
            />
            
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-600 mb-3">نبرة الصوت</label>
              <div className="flex flex-wrap gap-3">
                {Object.values(Tone).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all duration-200 ${
                      tone === t 
                        ? 'bg-gray-900 text-white shadow-lg scale-105' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span>{TONE_ICONS[t]}</span>
                    <span>{TONE_LABELS[t]}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGeneratingText || !idea.trim()}
              className={`mt-8 w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                isGeneratingText || !idea.trim()
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5'
              }`}
            >
              {isGeneratingText ? (
                <>
                  <RefreshCw className="animate-spin" />
                  جاري الكتابة...
                </>
              ) : (
                <>
                  <Sparkles />
                  توليد المحتوى
                </>
              )}
            </button>
          </div>
        </section>

        {/* Results Section */}
        {results && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex items-center gap-2 mb-6">
                <div className="h-8 w-1 bg-blue-600 rounded-full"></div>
                <h2 className="text-2xl font-bold text-gray-800">النتائج المقترحة</h2>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <div className="h-full">
                  <PostCard 
                    post={results[Platform.LINKEDIN]} 
                    isImageLoading={!!results[Platform.LINKEDIN].imageLoading}
                    onRegenerateImage={() => handleRegenerateImage(Platform.LINKEDIN)}
                  />
                </div>
                <div className="h-full">
                  <PostCard 
                    post={results[Platform.TWITTER]} 
                    isImageLoading={!!results[Platform.TWITTER].imageLoading}
                    onRegenerateImage={() => handleRegenerateImage(Platform.TWITTER)}
                  />
                </div>
                <div className="h-full">
                  <PostCard 
                    post={results[Platform.INSTAGRAM]} 
                    isImageLoading={!!results[Platform.INSTAGRAM].imageLoading}
                    onRegenerateImage={() => handleRegenerateImage(Platform.INSTAGRAM)}
                  />
                </div>
                 <div className="h-full">
                  <PostCard 
                    post={results[Platform.FACEBOOK]} 
                    isImageLoading={!!results[Platform.FACEBOOK].imageLoading}
                    onRegenerateImage={() => handleRegenerateImage(Platform.FACEBOOK)}
                  />
                </div>
             </div>
          </section>
        )}

      </main>
    </div>
  );
};

export default App;