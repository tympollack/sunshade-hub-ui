import React, { useState } from 'react';
import { supabase } from '@sunshade/supabase';
import { X, Upload, Loader2 } from 'lucide-react';
import type { GameLibraryItem } from '../../dashboard/types';

interface EditGameModalProps {
  game: GameLibraryItem;
  onClose: () => void;
  onSave: (updatedGame: GameLibraryItem) => void;
}

export default function EditGameModal({ game, onClose, onSave }: EditGameModalProps) {
  const [formData, setFormData] = useState({
    name: game.name || '',
    slug: game.slug || '',
    short_desc: game.short_desc || '',
    long_desc: game.long_desc || '',
    url_production: game.url_production || '',
    url_staging: game.url_staging || '',
    sort_order: game.sort_order || 0,
    tags: game.tags?.join(', ') || '',
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'sort_order' ? parseInt(value) || 0 : value }));
  };

  const uploadFileToR2 = async (file: File, assetType: 'logo' | 'hero'): Promise<string> => {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        gameSlug: formData.slug || game.slug,
        assetType,
      }),
    });

    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(`Upload URL error: ${error}`);
    }
    const { uploadUrl, publicUrl } = await res.json();

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });

    if (!uploadRes.ok) throw new Error(`Failed to upload ${assetType} to R2`);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);

    try {
      let finalLogoUrl = game.img_url_logo;
      let finalHeroUrl = game.img_url_hero;

      if (logoFile) {
        finalLogoUrl = await uploadFileToR2(logoFile, 'logo');
      }
      if (heroFile) {
        finalHeroUrl = await uploadFileToR2(heroFile, 'hero');
      }

      const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean);

      const updates = {
        name: formData.name,
        slug: formData.slug,
        short_desc: formData.short_desc,
        long_desc: formData.long_desc,
        url_production: formData.url_production || null,
        url_staging: formData.url_staging || null,
        sort_order: formData.sort_order,
        tags: tagsArray,
        img_url_logo: finalLogoUrl,
        img_url_hero: finalHeroUrl,
      };

      const { error } = await supabase
        .from('game_library')
        .update(updates)
        .eq('id', game.id);

      if (error) throw error;

      onSave({ ...game, ...updates });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred during save.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#161616] border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 shrink-0">
          <h2 className="text-xl font-bold text-white">Edit {game.name}</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {errorMsg && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm">
              {errorMsg}
            </div>
          )}

          <form id="edit-game-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Name</label>
                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Slug</label>
                <input required type="text" name="slug" value={formData.slug} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 font-mono" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Short Description</label>
              <input required type="text" name="short_desc" value={formData.short_desc} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Long Description</label>
              <textarea name="long_desc" value={formData.long_desc} onChange={handleChange} rows={3} className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Production URL</label>
                <input type="url" name="url_production" value={formData.url_production} onChange={handleChange} placeholder="https://..." className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Staging URL</label>
                <input type="url" name="url_staging" value={formData.url_staging} onChange={handleChange} placeholder="https://..." className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Tags (comma-separated)</label>
                <input type="text" name="tags" value={formData.tags} onChange={handleChange} placeholder="game, utility, etc." className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Sort Order</label>
                <input type="number" name="sort_order" value={formData.sort_order} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500" />
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800 grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Logo Image</label>
                <div className="flex items-center gap-4">
                  {(logoFile || game.img_url_logo) && (
                    <img 
                      src={logoFile ? URL.createObjectURL(logoFile) : (game.img_url_logo || undefined)} 
                      alt="Logo Preview" 
                      className="w-12 h-12 rounded object-cover border border-zinc-700"
                    />
                  )}
                  <label className="flex-1 flex flex-col items-center justify-center p-4 border-2 border-dashed border-zinc-800 rounded-lg hover:border-orange-500/50 hover:bg-orange-500/5 cursor-pointer transition-colors">
                    <Upload size={16} className="text-zinc-400 mb-2" />
                    <span className="text-xs text-zinc-400 text-center">Click to upload new logo</span>
                    <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)} className="hidden" />
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Hero Image</label>
                <div className="flex flex-col gap-3">
                  {(heroFile || game.img_url_hero) && (
                    <img 
                      src={heroFile ? URL.createObjectURL(heroFile) : (game.img_url_hero || undefined)} 
                      alt="Hero Preview" 
                      className="w-full h-16 rounded object-cover border border-zinc-700"
                    />
                  )}
                  <label className="flex items-center justify-center p-4 border-2 border-dashed border-zinc-800 rounded-lg hover:border-orange-500/50 hover:bg-orange-500/5 cursor-pointer transition-colors">
                    <Upload size={16} className="text-zinc-400 mr-2" />
                    <span className="text-xs text-zinc-400">Click to upload new hero</span>
                    <input type="file" accept="image/*" onChange={e => setHeroFile(e.target.files?.[0] || null)} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-zinc-800 flex justify-end gap-3 shrink-0 bg-[#161616] rounded-b-xl">
          <button 
            type="button" 
            onClick={onClose} 
            disabled={isSaving}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="edit-game-form"
            disabled={isSaving}
            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-orange-600/20"
          >
            {isSaving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
