"use client";

import React, { useState, useMemo } from "react";
import { Sponsor } from "@/types/database";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Upload, 
  Loader2, 
  ShieldCheck, 
  Search, 
  ChevronUp, 
  ChevronDown, 
  Sparkles,
  AlertTriangle,
  Award
} from "lucide-react";
import { supabase, isSupabaseConfigured, uploadMediaFile, getErrorMessage } from "@/lib/supabase";
import { useToast } from "./ToastContext";

interface Props {
  sponsors: Sponsor[];
  onRefresh: () => void;
}

const COMMON_TIERS = [
  "Title Sponsor",
  "Platinum Partner",
  "Gold Partner",
  "Silver Partner",
  "Innovation Partner",
  "Media Partner",
  "Community Partner",
  "Food & Beverage Partner",
];

export default function SponsorsManager({ sponsors, onRefresh }: Props) {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingSponsor, setDeletingSponsor] = useState<Sponsor | null>(null);
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
        showToast("Sponsor logo uploaded successfully", "success");
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({ ...prev, image_url: reader.result as string }));
          showToast("Logo loaded (LocalStorage)", "info");
        };
        reader.readAsDataURL(file);
      }
    } catch (err: unknown) {
      showToast("Upload failed: " + getErrorMessage(err), "error");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      showToast("Sponsor name is required", "error");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        category: formData.category?.trim() || "Partner",
        image_url: formData.image_url || "",
        order_index: Number(formData.order_index) || 0,
      };

      if (isSupabaseConfigured) {
        if (editingSponsor) {
          const { error } = await supabase
            .from("sponsors")
            .update(payload)
            .eq("id", editingSponsor.id);
          if (error) throw error;
          showToast(`Updated sponsor "${formData.name}"`, "success");
        } else {
          const { error } = await supabase.from("sponsors").insert([payload]);
          if (error) throw error;
          showToast(`Added sponsor "${formData.name}"`, "success");
        }
      } else {
        const stored = localStorage.getItem("evolvia_sponsors");
        const list: Sponsor[] = stored ? JSON.parse(stored) : [];
        if (editingSponsor) {
          const updated = list.map(item =>
            item.id === editingSponsor.id ? ({ ...item, ...payload } as Sponsor) : item
          );
          localStorage.setItem("evolvia_sponsors", JSON.stringify(updated));
          showToast(`Updated sponsor "${formData.name}" (LocalStorage)`, "success");
        } else {
          const newItem: Sponsor = {
            id: `sponsor-${Date.now()}`,
            created_at: new Date().toISOString(),
            ...payload,
          } as Sponsor;
          list.push(newItem);
          localStorage.setItem("evolvia_sponsors", JSON.stringify(list));
          showToast(`Added sponsor "${formData.name}" (LocalStorage)`, "success");
        }
      }

      setIsModalOpen(false);
      onRefresh();
    } catch (err: unknown) {
      showToast("Save error: " + getErrorMessage(err), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOrderChange = async (sponsor: Sponsor, direction: "up" | "down") => {
    const currIndex = sponsors.findIndex(s => s.id === sponsor.id);
    if (currIndex === -1) return;
    const targetIndex = direction === "up" ? currIndex - 1 : currIndex + 1;
    if (targetIndex < 0 || targetIndex >= sponsors.length) return;

    const targetSponsor = sponsors[targetIndex];
    const newCurrOrder = targetSponsor.order_index;
    const newTargetOrder = sponsor.order_index;

    try {
      if (isSupabaseConfigured) {
        await Promise.all([
          supabase.from("sponsors").update({ order_index: newCurrOrder }).eq("id", sponsor.id),
          supabase.from("sponsors").update({ order_index: newTargetOrder }).eq("id", targetSponsor.id),
        ]);
      } else {
        const stored = localStorage.getItem("evolvia_sponsors");
        const list: Sponsor[] = stored ? JSON.parse(stored) : [];
        const updated = list.map(item => {
          if (item.id === sponsor.id) return { ...item, order_index: newCurrOrder };
          if (item.id === targetSponsor.id) return { ...item, order_index: newTargetOrder };
          return item;
        });
        localStorage.setItem("evolvia_sponsors", JSON.stringify(updated));
      }
      showToast("Sponsor order updated", "info");
      onRefresh();
    } catch (err: unknown) {
      showToast("Order update error: " + getErrorMessage(err), "error");
    }
  };

  const confirmDelete = (sponsor: Sponsor) => {
    setDeletingSponsor(sponsor);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingSponsor) return;
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from("sponsors").delete().eq("id", deletingSponsor.id);
        if (error) throw error;
      } else {
        const stored = localStorage.getItem("evolvia_sponsors");
        const list: Sponsor[] = stored ? JSON.parse(stored) : [];
        const updated = list.filter(item => item.id !== deletingSponsor.id);
        localStorage.setItem("evolvia_sponsors", JSON.stringify(updated));
      }
      showToast(`Deleted "${deletingSponsor.name}"`, "info");
      setIsDeleteModalOpen(false);
      setDeletingSponsor(null);
      onRefresh();
    } catch (err: unknown) {
      showToast("Delete failed: " + getErrorMessage(err), "error");
    }
  };

  const filteredSponsors = useMemo(() => {
    return sponsors
      .filter(s => {
        if (selectedTier !== "all" && s.category !== selectedTier) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q);
      })
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }, [sponsors, selectedTier, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[220px] flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search sponsors by brand or tier..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl glass-input"
            />
          </div>

          <select
            value={selectedTier}
            onChange={e => setSelectedTier(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-medium glass-input"
          >
            <option value="all">All Sponsorship Tiers</option>
            {COMMON_TIERS.map(tier => (
              <option key={tier} value={tier}>{tier}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/40 shadow-lg shadow-indigo-600/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Sponsor</span>
        </button>
      </div>

      {/* Grid Display */}
      {filteredSponsors.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center">
          <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-slate-600 animate-pulse" />
          <h3 className="text-base font-bold text-white mb-1">No Sponsors Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
            {searchQuery || selectedTier !== "all"
              ? "No sponsors match your filter criteria."
              : "No sponsors or brand partners listed yet. Add partners supporting Evolvia."}
          </p>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500"
          >
            Add First Sponsor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredSponsors.map(sponsor => (
            <div
              key={sponsor.id}
              className="glass-panel glass-panel-hover rounded-2xl p-4 flex flex-col justify-between group overflow-hidden"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-400 bg-[#0d0f1a] border border-[#1e2238]">
                    Order #{sponsor.order_index}
                  </span>

                  <div className="flex items-center gap-0.5 bg-[#0d0f1a] rounded-lg border border-[#1e2238] p-0.5">
                    <button
                      onClick={() => handleOrderChange(sponsor, "up")}
                      className="p-1 hover:text-indigo-400 text-slate-400 transition-colors"
                      title="Move Up"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleOrderChange(sponsor, "down")}
                      className="p-1 hover:text-indigo-400 text-slate-400 transition-colors"
                      title="Move Down"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Logo Box */}
                <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-black/60 border border-white/5 p-4 flex items-center justify-center mb-3.5">
                  {sponsor.image_url ? (
                    <img
                      src={sponsor.image_url}
                      alt={sponsor.name}
                      className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-600 text-xs">
                      <Sparkles className="w-6 h-6 mb-1 opacity-30 text-amber-400" />
                      <span>No Logo Image</span>
                    </div>
                  )}
                </div>

                {/* Title & Tier Badge */}
                <h4 className="text-base font-bold text-white tracking-tight group-hover:text-indigo-300 transition-colors">
                  {sponsor.name}
                </h4>

                <div className="mt-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Award className="w-3 h-3" />
                    <span>{sponsor.category || "Partner"}</span>
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#1e2238] flex items-center justify-end gap-1.5">
                <button
                  onClick={() => handleOpenEditModal(sponsor)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-white/5 transition-colors"
                  title="Edit Sponsor"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => confirmDelete(sponsor)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-colors"
                  title="Delete Sponsor"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && deletingSponsor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0f111d] border border-rose-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Sponsor</h3>
                <p className="text-xs text-slate-400">Remove partner from sponsors list.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 bg-[#08090e] p-3 rounded-xl border border-[#1e2238]">
              Are you sure you want to remove <strong className="text-white">"{deletingSponsor.name}"</strong>?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/20"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#0f111d] border border-[#1e2238] rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden my-auto flex flex-col">
            <div className="px-6 py-4 border-b border-[#1e2238] flex items-center justify-between bg-[#0b0d18]">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  {editingSponsor ? "Edit Sponsor" : "Add Brand Sponsor"}
                </h3>
                <p className="text-xs text-slate-400">Configure partner branding and tier</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Brand / Organization Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Google Cloud"
                  value={formData.name || ""}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Sponsorship Tier / Category
                </label>
                <input
                  type="text"
                  list="tier-options"
                  placeholder="e.g. Platinum Partner"
                  value={formData.category || ""}
                  onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl glass-input"
                />
                <datalist id="tier-options">
                  {COMMON_TIERS.map(t => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>

              {/* Logo Upload */}
              <div className="p-4 rounded-2xl bg-[#08090e] border border-[#1e2238] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-amber-400" />
                    Sponsor Brand Logo
                  </span>
                  {uploadingImage && (
                    <span className="text-[11px] text-amber-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste logo image URL..."
                    value={formData.image_url || ""}
                    onChange={e => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                    className="flex-1 px-3 py-2 text-xs rounded-xl glass-input"
                  />
                  <label className="cursor-pointer px-3 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 shrink-0 transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Browse</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.order_index ?? 0}
                  onChange={e => setFormData(prev => ({ ...prev, order_index: Number(e.target.value) }))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl glass-input font-mono"
                />
              </div>

              <div className="pt-4 border-t border-[#1e2238] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingSponsor ? "Save Changes" : "Add Sponsor"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
