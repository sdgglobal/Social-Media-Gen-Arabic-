import React, { useState, useEffect } from 'react';
import { GeneratedPost, Platform } from '../types';
import { RefreshCw, Copy, Download, Share2, Type, Image as ImageIcon, ChevronDown, ChevronUp, Plus, X, Hash } from 'lucide-react';

interface PostCardProps {
  post: GeneratedPost;
  onRegenerateImage: () => void;
  isImageLoading: boolean;
}

const PostCard: React.FC<PostCardProps> = ({ post, onRegenerateImage, isImageLoading }) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [editableHashtags, setEditableHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');

  // Sync state with props when content is regenerated
  useEffect(() => {
    if (post.platform === Platform.INSTAGRAM && post.hashtags) {
      // Normalize tags to ensure they start with #
      setEditableHashtags(post.hashtags.map(t => t.startsWith('#') ? t : `#${t}`));
    } else {
      setEditableHashtags([]);
    }
  }, [post.hashtags, post.platform]);

  const addHashtag = () => {
    if (!hashtagInput.trim()) return;
    let tag = hashtagInput.trim();
    if (!tag.startsWith('#')) tag = `#${tag}`;
    
    // Prevent duplicates (case insensitive)
    if (!editableHashtags.some(t => t.toLowerCase() === tag.toLowerCase())) {
        setEditableHashtags([...editableHashtags, tag]);
    }
    setHashtagInput('');
  };

  const removeHashtag = (indexToRemove: number) => {
    setEditableHashtags(editableHashtags.filter((_, index) => index !== indexToRemove));
  };

  const getIcon = () => {
    switch (post.platform) {
      case Platform.LINKEDIN: return <span className="text-[#0077b5]">Linkedin</span>;
      case Platform.TWITTER: return <span className="text-[#1DA1F2]">X / Twitter</span>;
      case Platform.INSTAGRAM: return <span className="text-[#E1306C]">Instagram</span>;
    }
  };

  const getBorderColor = () => {
    switch (post.platform) {
      case Platform.LINKEDIN: return 'border-blue-200';
      case Platform.TWITTER: return 'border-sky-200';
      case Platform.INSTAGRAM: return 'border-pink-200';
    }
  };

  const getTextContent = () => {
    return post.platform === Platform.INSTAGRAM 
      ? `${post.text}\n\n${editableHashtags.join(' ')}` 
      : post.text;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getTextContent());
  };

  const handleShare = async () => {
    const textContent = getTextContent();
    
    if (navigator.share) {
      try {
        const shareData: ShareData = {
          title: `منشور ${post.platform}`,
          text: textContent,
        };

        if (post.imageUrl && !post.imageLoading) {
            try {
                const res = await fetch(post.imageUrl);
                const blob = await res.blob();
                const file = new File([blob], 'image.png', { type: blob.type });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    shareData.files = [file];
                }
            } catch (e) {
                console.warn("Image sharing preparation failed", e);
            }
        }

        await navigator.share(shareData);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
             console.error('Share failed', error);
        }
      }
    } else {
      alert("المشاركة غير مدعومة في هذا المتصفح. تم نسخ النص بدلاً من ذلك.");
      copyToClipboard();
    }
  };

  return (
    <div className={`rounded-2xl border bg-white flex flex-col h-full overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 ${getBorderColor()}`}>
      
      {/* 1. Header Block */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
        <div className="font-bold text-base flex items-center gap-2">
          {getIcon()}
        </div>
        <div className="flex items-center gap-1">
             <button 
                onClick={handleShare} 
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" 
                title="مشاركة"
            >
                <Share2 size={16} />
            </button>
            <button 
                onClick={copyToClipboard} 
                className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all" 
                title="نسخ النص"
            >
                <Copy size={16} />
            </button>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        
        {/* 2. Text Content Block */}
        <div className="border border-gray-100 rounded-xl bg-white overflow-hidden">
          <div className="bg-gray-50/80 px-3 py-2 border-b border-gray-100 flex items-center gap-2">
             <Type size={14} className="text-gray-400" />
             <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">النص</span>
          </div>
          <div className="p-4">
             <p className="text-gray-800 whitespace-pre-wrap leading-7 text-sm">
                {post.text}
             </p>
          </div>
        </div>

        {/* 3. Hashtags Block (Instagram Only) */}
        {post.platform === Platform.INSTAGRAM && (
           <div className="border border-pink-100 rounded-xl bg-pink-50/30 overflow-hidden">
             <div className="bg-pink-50/80 px-3 py-2 border-b border-pink-100 flex items-center gap-2">
                <Hash size={14} className="text-pink-400" />
                <span className="text-xs font-semibold text-pink-500 uppercase tracking-wider">الهاشتاجات</span>
             </div>
             <div className="p-3">
                <div className="flex flex-wrap gap-2 mb-3">
                    {editableHashtags.map((tag, i) => (
                      <span key={i} className="inline-flex items-center text-xs font-medium text-pink-700 bg-white border border-pink-200 px-2 py-1 rounded-full shadow-sm group">
                        {tag}
                        <button 
                          onClick={() => removeHashtag(i)} 
                          className="mr-1.5 text-pink-300 hover:text-red-500 transition-colors"
                          title="إزالة"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                </div>
                <div className="flex gap-2">
                   <input 
                      type="text" 
                      value={hashtagInput}
                      onChange={(e) => setHashtagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addHashtag()}
                      placeholder="إضافة هاشتاج..." 
                      className="flex-1 text-xs border border-gray-200 bg-white rounded-lg px-3 py-2 outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all placeholder:text-gray-400"
                   />
                   <button 
                      onClick={addHashtag}
                      disabled={!hashtagInput.trim()}
                      className="bg-white border border-pink-200 text-pink-500 p-2 rounded-lg hover:bg-pink-50 disabled:opacity-50 transition-colors"
                   >
                      <Plus size={14} />
                   </button>
                </div>
             </div>
           </div>
        )}

        {/* 4. Visual Asset Block */}
        <div className="mt-auto border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm">
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ImageIcon size={14} className="text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">التصميم</span>
                </div>
                {post.imagePrompt && (
                    <button 
                        onClick={() => setShowPrompt(!showPrompt)}
                        className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-colors ${
                            showPrompt 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        <span>Prompt</span>
                        {showPrompt ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    </button>
                )}
            </div>

            {/* Collapsible Prompt */}
            {showPrompt && post.imagePrompt && (
                <div className="bg-slate-900 text-slate-300 text-[11px] p-3 font-mono leading-relaxed border-b border-slate-800 shadow-inner max-h-32 overflow-y-auto" dir="ltr">
                    {post.imagePrompt}
                </div>
            )}

            {/* Image Preview Area */}
            <div className="relative bg-gray-100 min-h-[200px] flex items-center justify-center group/image overflow-hidden">
                {isImageLoading ? (
                    <div className="flex flex-col items-center justify-center py-10">
                        <RefreshCw className="animate-spin text-blue-500 mb-3" size={24} />
                        <span className="text-gray-400 text-xs animate-pulse">جاري التصميم...</span>
                    </div>
                ) : post.imageUrl ? (
                    <>
                        <img 
                            src={post.imageUrl} 
                            alt="Generated Content" 
                            className="w-full h-auto object-cover max-h-[400px] transition-transform duration-700 group-hover/image:scale-105" 
                        />
                        {/* Overlay Actions */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center gap-6 backdrop-blur-[2px]">
                            <a 
                                href={post.imageUrl} 
                                download={`gemini-${post.platform.toLowerCase()}.png`} 
                                className="flex flex-col items-center gap-2 text-white transform translate-y-4 group-hover/image:translate-y-0 transition-transform duration-300"
                            >
                                <div className="p-3 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30 transition-colors border border-white/30">
                                    <Download size={20} />
                                </div>
                                <span className="text-[10px] font-medium tracking-wide shadow-black drop-shadow-md">تحميل</span>
                            </a>
                            <button 
                                onClick={onRegenerateImage} 
                                className="flex flex-col items-center gap-2 text-white transform translate-y-4 group-hover/image:translate-y-0 transition-transform duration-300 delay-75"
                            >
                                <div className="p-3 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30 transition-colors border border-white/30">
                                    <RefreshCw size={20} />
                                </div>
                                <span className="text-[10px] font-medium tracking-wide shadow-black drop-shadow-md">إعادة توليد</span>
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="py-12 px-6 text-center">
                        <p className="text-gray-400 text-sm mb-4">لا توجد صورة مولدة</p>
                        <button 
                            onClick={onRegenerateImage}
                            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-600 shadow-sm transition-colors"
                        >
                            توليد الصورة الآن
                        </button>
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
};

export default PostCard;