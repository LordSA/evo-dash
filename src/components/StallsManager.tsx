"use client";

import React, { useState } from "react";
import { StallExpo } from "@/types/database";
import { Plus, Pencil, Trash2, Upload, Loader2, Store, Search } from "lucide-react";
import { supabase, isSupabaseConfigured, uploadMediaFile } from "@/lib/supabase";

interface Props {
  stalls: StallExpo[];
  onRefresh: () => void;
}

export default function StallsManager({ stalls, onRefresh }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStall, setEditingStall] = useState<StallExpo | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState<Partial<StallExpo>>({
    name: "",
    description: "",
    image_url: "",
    order_index: 0,
  });

  const handleOpenAddModal = () => {
    setEditingStall(null);
    setFormData({
      name: "",
      description: "",
      image_url: "",
      order_index: stalls.length + 1,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (stall: StallExpo) => {
    setEditingStall(stall);
    setFormData({ ...stall });
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      if (isSupabaseConfigured) {
        const publicUrl = await uploadMediaFile(file, "stalls");
        setFormData(prev => ({ ...prev, image_url: publicUrl }));
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({ ...prev, image_url: reader.result as string }));
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      alert("Failed to upload image: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteStall = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete stall "${name}"?`)) return;

    if (isSupabaseConfigured) {
      const { error } = await supabase.from("stalls_and_expos").delete().eq("id", id);
      if (error) {
        alert("Failed to delete stall: " + error.message);
        return;
      }
    } else {
      const localStalls = JSON.parse(localStorage.getItem("evolvia_stalls") || "[]");
      const updated = localStalls.filter((st: StallExpo) => st.id !== id);
      localStorage.setItem("evolvia_stalls", JSON.stringify(updated));
    }
    onRefresh();
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      alert("Stall name is required.");
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        name: formData.name.trim(),
        description: formData.description || "",
        image_url: formData.image_url || "",
        order_index: Number(formData.order_index || 0),
      };

      if (isSupabaseConfigured) {
        if (editingStall) {
          const { error } = await supabase
            .from("stalls_and_expos")
            .update(payload)
            .eq("id", editingStall.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("stalls_and_expos")
            .insert([payload]);
          if (error) throw error;
        }
      } else {
        const localStalls: StallExpo[] = JSON.parse(localStorage.getItem("evolvia_stalls") || "[]");
        if (editingStall) {
          const updated = localStalls.map(st => 
            st.id === editingStall.id ? ({ ...st, ...payload } as StallExpo) : st
          );
          localStorage.setItem("evolvia_stalls", JSON.stringify(updated));
        } else {
          const newStall: StallExpo = {
            id: `stall-${Date.now()}`,
            ...payload,
            created_at: new Date().toISOString(),
          } as StallExpo;
          localStorage.setItem("evolvia_stalls", JSON.stringify([...localStalls, newStall]));
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

  const filteredStalls = stalls
    .filter(st => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return st.name.toLowerCase().includes(q) || st.description.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#11131f] border border-[#1e2238] p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-indigo-400" /> Stalls & Expos
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage startup stalls, project showcases, and robotics expos.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Stall / Expo
        </button>
      </div>

      <div className="relative w-full sm:w-72">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search stalls..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-[#11131f] border border-[#1e2238] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStalls.map(stall => (
          <div
            key={stall.id}
            className="bg-[#11131f] border border-[#1e2238] rounded-xl p-4 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3 text-xs text-slate-500">
                <span className="font-mono">Order #{stall.order_index}</span>
              </div>

              <div className="aspect-video w-full rounded-lg overflow-hidden bg-black/40 border border-[#1e2238] mb-3">
                {stall.image_url ? (
                  <img src={stall.image_url} alt={stall.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <Store className="w-6 h-6" />
                  </div>
                )}
              </div>

              <h3 className="text-sm font-bold text-white mb-1">{stall.name}</h3>
              <p className="text-xs text-slate-400 line-clamp-2">{stall.description}</p>
            </div>

            <div className="flex items-center justify-end gap-1.5 pt-4 mt-3 border-t border-[#1e2238]">
              <button
                onClick={() => handleOpenEditModal(stall)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteStall(stall.id, stall.name)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#11131f] border border-[#1e2238] rounded-2xl max-w-lg w-full p-6 text-white">
            <div className="flex items-center justify-between pb-4 border-b border-[#1e2238] mb-4">
              <h3 className="text-lg font-bold text-white">
                {editingStall ? "Edit Stall / Expo" : "Add Stall / Expo"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">?</button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Stall Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Robo Soccer / Innoverse"
                  value={formData.name || ""}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-[#0d0f1a] border border-[#1e2238] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Details regarding stall or expo display..."
                  value={formData.description || ""}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-[#0d0f1a] border border-[#1e2238] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Image / Cover URL</span>
                  {uploadingImage && (
                    <span className="text-indigo-400 flex items-center gap-1 text-[11px]">
                      <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="/stalls/image.webp or https://..."
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
                  {editingStall ? "Save Changes" : "Create Stall"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
