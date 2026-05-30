import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Plus, Trash2 } from 'lucide-react';
import { BackgroundGlow } from '@/components/ui/BackgroundGlow';
import { PageHeader } from '@/components/layout/BottomNav';
import { dashboardApi } from '@/api/client';

export default function EmergencyContactsPage() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Array<Record<string, string>>>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', relationship: '', phone: '' });

  const load = () => dashboardApi.contacts().then(({ data }) => setContacts(data.data));
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    await dashboardApi.deleteContact(id);
    load();
  };

  const saveContact = async () => {
    if (form.name && form.relationship && form.phone) {
      await dashboardApi.addContact(form);
      setForm({ name: '', relationship: '', phone: '' });
      setShowForm(false);
      load();
    }
  };

  return (
    <BackgroundGlow>
      <PageHeader title="Emergency Contacts" onBack={() => navigate(-1)} />
      <div className="px-6 pb-8 lg:max-w-lg lg:mx-auto">
        <div className="glass-card p-4 mb-6 flex gap-3">
          <Bell className="w-5 h-5 text-cyan shrink-0 mt-0.5" />
          <div>
            <p className="text-white text-sm font-medium">Auto-Alert System</p>
            <p className="text-white/50 text-xs mt-1 leading-relaxed">
              These contacts will automatically receive alerts when you trigger SOS or enter unsafe zones.
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {contacts.map((c) => (
            <div key={c.id} className="glass-card p-4 flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">{c.name}</p>
                <p className="text-white/50 text-xs">{c.relationship} • {c.phone}</p>
              </div>
              <button onClick={() => remove(c.id)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-white/40" />
              </button>
            </div>
          ))}
        </div>

        {showForm ? (
          <div className="glass-card p-4 space-y-3 mb-6 animate-fadeSlideUp">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Contact Name"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan/50"
            />
            <input
              value={form.relationship}
              onChange={(e) => setForm({ ...form, relationship: e.target.value })}
              placeholder="Relationship (e.g. Spouse, Friend)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan/50"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Phone Number"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan/50"
            />
            <div className="flex gap-2">
              <button
                onClick={saveContact}
                className="flex-1 h-11 rounded-xl bg-cyan/20 border border-cyan/30 text-cyan text-sm font-semibold hover:bg-cyan/30 active:scale-95 transition-all"
              >
                Save Contact
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 h-11 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="btn-secondary w-full h-12 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" /> Add New Contact
          </button>
        )}
      </div>
    </BackgroundGlow>
  );
}
