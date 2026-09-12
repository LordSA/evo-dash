"use client";

import React, { useState } from "react";
import { Sponsor } from "@/types/database";
import { Plus, Pencil, Trash2, Upload, Loader2, Sparkles, Search, ShieldCheck } from "lucide-react";
import { supabase, isSupabaseConfigured, uploadMediaFile } from "@/lib/supabase";

interface Props {
  sponsors: Sponsor[];
  onRefresh: () => void;
}

export default function SponsorsManager({ sponsors, onRefresh }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState<Partial<Sponsor>>({
    name: "",
    category: "Title Sponsor",
    image_url: "",
    order_index: 0,
  });

  const handleOpenAddModal = () => {
    setEditingSponsor(null);
    setFormData({
      name: "",
      category: "Title Sponsor",
      image_url: "",
      order_index: sponsors.length + 1,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (sponsor: Sponsor) => {
    setEditingSponsor(sponsor);
    setFormData({ ...sponsor });
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      if (isSupabaseConfigured) {
        const publicUrl = await uploadMediaFile(file, "sponsors");
        setFormData(prev => ({ ...prev, image_url: publicUrl }));
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({ ...prev, image_url: reader.result as string }));
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      alert("Failed to upload logo: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteSponsor = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete sponsor "${name}"?`)) return;

    if (isSupabaseConfigured) {
      const { error } = await supabase.from("sponsors").delete().eq("id", id);
      if (error) {
        alert("Failed to delete sponsor: " + error.message);
        return;
      }
    } else {
      const localSponsors = JSON.parse(localStorage.getItem("evolvia_sponsors") || "[]");
      const updated = localSponsors.filter((sp: Sponsor) => sp.id !== id);
      localStorage.setItem("evolvia_sponsors", JSON.stringify(updated));
    }
    onRefresh();
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      alert("Sponsor name is required.");
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        name: formData.name.trim(),
        category: formData.category || "Sponsor",
        image_url: formData.image_url || "",
        order_index: Number(formData.order_index || 0),
      };

      if (isSupabaseConfigured) {
        if (editingSponsor) {
          const { error } = await supabase
            .from("sponsors")
            .update(payload)
            .eq("id", editingSponsor.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("sponsors")
            .insert([payload]);
          if (error) throw error;
        }
      } else {
        const localSponsors: Sponsor[] = JSON.parse(localStorage.getItem("evolvia_sponsors") || "[]");
        if (editingSponsor) {
          const updated = localSponsors.map(sp => 
            sp.id === editingSponsor.id ? ({ ...sp, ...payload } as Sponsor) : sp
          );
          localStorage.setItem("evolvia_sponsors", JSON.stringify(updated));
        } else {
          const newSponsor: Sponsor = {
            id: `sponsor-${Date.now()}`,
            ...payload,
            created_at: new Date().toISOString(),
          } as Sponsor;
          localStorage.setItem("evolvia_sponsors", JSON.stringify([...localSponsors, newSponsor]));
        }
      }

      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      alert("Save failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const filteredSponsors = sponsors
    .filter(sp => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return sp.name.toLowerCase().includes(q) || sp.category.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#11131f] border border-[#1e2238] p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" /> Sponsors & Partners
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage brands, partners, and title sponsors supporting Evolvia.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Sponsor
        </button>
      </div>

      <div className="relative w-full sm:w-72">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search sponsors..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-[#11131f] border border-[#1e2238] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {filteredSponsors.map(sponsor => (
          <div
            key={sponsor.id}
            className="bg-[#11131f] border border-[#1e2238] rounded-xl p-4 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2 text-[11px] text-slate-500">
                <span className="font-mono">#{sponsor.order_index}</span>
                <span className="text-indigo-400 truncate max-w-[100px]">{sponsor.category}</span>
              </div>

              <div className="h-24 w-full rounded-lg bg-black/40 border border-[#1e2238] flex items-center justify-center p-2 mb-3">
                {sponsor.image_url ? (
                  <img
                    src={sponsor.image_url}
                    alt={sponsor.name}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <Sparkles className="w-6 h-6 text-slate-600" />
                )}
              </div>

              <h3 className="text-xs font-bold text-white text-center truncate">{sponsor.name}</h3>
            </div>

            <div className="flex items-center justify-center gap-1 pt-3 mt-2 border-t border-[#1e2238]">
              <button
                onClick={() => handleOpenEditModal(sponsor)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDeleteSponsor(sponsor.id, sponsor.name)}
                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#11131f] border border-[#1e2238] rounded-2xl max-w-md w-full p-6 text-white">
            <div className="flex items-center justify-between pb-4 border-b border-[#1e2238] mb-4">
              <h3 className="text-lg font-bold text-white">
                {editingSponsor ? "Edit Sponsor" : "Add Sponsor"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">?</button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Company / Brand Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Made Products"
                  value={formData.name || ""}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-[#0d0f1a] border border-[#1e2238] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category / Tier</label>
                <input
                  type="text"
                  placeholder="e.g. Title Sponsor, Tech Partner"
                  value={formData.category || ""}
                  onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-[#0d0f1a] border border-[#1e2238] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Logo URL</span>
                  {uploadingImage && (
                    <span className="text-indigo-400 flex items-center gap-1 text-[11px]">
                      <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="/sponsors/logo.webp or https://..."
                    value={formData.image_url || ""}
                    onChange={e => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                    className="flex-1 bg-[#0d0f1a] border border-[#1e2238] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <label className="cursor-pointer px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded-lg flex items-center gap-1 font-medium transition-colors">
                    <Upload className="w-3.5 h-3.5" /> Upload
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Display Order</label>
                <input
                  type="number"
                  value={formData.order_index ?? 0}
                  onChange={e => setFormData(prev => ({ ...prev, order_index: Number(e.target.value) }))}
                  className="w-full bg-[#0d0f1a] border border-[#1e2238] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#1e2238]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingSponsor ? "Save Changes" : "Create Sponsor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
