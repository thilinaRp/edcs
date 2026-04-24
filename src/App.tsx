import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Files, 
  ArrowLeftRight, 
  History, 
  Users, 
  Plus, 
  Search, 
  Trash2, 
  Edit2,
  Download, 
  Upload, 
  Sun, 
  Moon,
  Menu,
  FileText,
  Clock,
  MapPin,
  ChevronRight,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDate } from './lib/utils';
import { LedgerEntry, FileRecord, Transfer, Section } from './types';
import { dbService } from './services/db';
import { Autocomplete } from './components/Autocomplete';
import { DateTimePicker } from './components/DateTimePicker';

// --- Constants ---
const DISTRICTS = [
  "Colombo", "Kalutara", "Gampaha", "Matara", "Galle", "Hambantota", 
  "Kegalle", "Ratnapura", "Monaragala", "Badulla", "Anuradhapura", 
  "Polonnaruwa", "Ampara", "Batticaloa", "Trincomalee", "Puttalam", 
  "Kurunegala", "Kandy", "Nuwara Eliya", "Matale", "Kilinochchi",
  "Dehiowita", "Kelaniya", "Kuliyapitiya"
];

const App: React.FC = () => {
  // --- State ---
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [historyFileId, setHistoryFileId] = useState<string>('');
  
  // Form States
  const [newLedgerEntry, setNewLedgerEntry] = useState({ ledgerNumber: '', epf: '', zoneSection: '' });
  const [newFile, setNewFile] = useState({ name: '', description: '', district: '', schoolDepartment: '', holderId: '', timestamp: '' });
  const [newTransfer, setNewTransfer] = useState({ fileId: '', toId: '', district: '', schoolDepartment: '', notes: '', timestamp: '' });
  
  // Edit States
  const [editingLedger, setEditingLedger] = useState<LedgerEntry | null>(null);
  const [editingFile, setEditingFile] = useState<FileRecord | null>(null);

  // --- Initialization ---
  useEffect(() => {
    const init = async () => {
      await dbService.init();
      loadData();
    };
    init();

    // Theme initialization
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const loadData = async () => {
    const [l, f, t] = await Promise.all([
      dbService.getAll<LedgerEntry>('ledger'),
      dbService.getAll<FileRecord>('files'),
      dbService.getAll<Transfer>('transfers')
    ]);
    setLedger(l.sort((a, b) => b.createdAt - a.createdAt));
    setFiles(f.sort((a, b) => b.updatedAt - a.updatedAt));
    setTransfers(t.sort((a, b) => b.timestamp - a.timestamp));
  };

  // --- Handlers ---
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleAddLedgerEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const entry: LedgerEntry = {
      id: crypto.randomUUID(),
      ...newLedgerEntry,
      createdAt: Date.now()
    };
    await dbService.add('ledger', entry);
    setNewLedgerEntry({ ledgerNumber: '', epf: '', zoneSection: '' });
    loadData();
  };

  const handleAddFile = async (e: React.FormEvent) => {
    e.preventDefault();
    const fileId = crypto.randomUUID();
    const timestamp = newFile.timestamp ? new Date(newFile.timestamp).getTime() : Date.now();
    
    const file: FileRecord = {
      id: fileId,
      name: newFile.name,
      description: newFile.description,
      district: newFile.district,
      schoolDepartment: newFile.schoolDepartment,
      currentHolderId: newFile.holderId,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Create initial transfer record
    const transfer: Transfer = {
      id: crypto.randomUUID(),
      fileId: fileId,
      fromId: 'system', // Initial creation
      toId: newFile.holderId,
      district: newFile.district,
      notes: 'Initial file creation',
      timestamp: timestamp
    };

    await dbService.add('files', file);
    await dbService.add('transfers', transfer);
    setNewFile({ name: '', description: '', district: '', schoolDepartment: '', holderId: '', timestamp: '' });
    loadData();
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = files.find(f => f.id === newTransfer.fileId);
    if (!file) return;

    const timestamp = newTransfer.timestamp ? new Date(newTransfer.timestamp).getTime() : Date.now();
    
    const transfer: Transfer = {
      id: crypto.randomUUID(),
      fileId: newTransfer.fileId,
      fromId: file.currentHolderId,
      toId: newTransfer.toId,
      district: newTransfer.district,
      schoolDepartment: newTransfer.schoolDepartment,
      notes: newTransfer.notes,
      timestamp: timestamp
    };

    const updatedFile: FileRecord = {
      ...file,
      currentHolderId: newTransfer.toId,
      district: newTransfer.district,
      schoolDepartment: newTransfer.schoolDepartment,
      updatedAt: timestamp
    };

    await dbService.put('files', updatedFile);
    await dbService.add('transfers', transfer);
    setNewTransfer({ fileId: '', toId: '', district: '', schoolDepartment: '', notes: '', timestamp: '' });
    loadData();
  };

  const handleDeleteFile = async (id: string) => {
    if (!confirm('Are you sure you want to delete this file and its history?')) return;
    await dbService.delete('files', id);
    await dbService.deleteTransfersByFile(id);
    loadData();
  };

  const handleDeleteLedgerEntry = async (id: string) => {
    if (!confirm('Are you sure? This will not delete files held by this person but may cause display issues.')) return;
    await dbService.delete('ledger', id);
    loadData();
  };

  const handleUpdateLedgerEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLedger) return;
    await dbService.put('ledger', editingLedger);
    setEditingLedger(null);
    loadData();
  };

  const handleUpdateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFile) return;
    const updatedFile = {
      ...editingFile,
      updatedAt: Date.now()
    };
    await dbService.put('files', updatedFile);
    setEditingFile(null);
    loadData();
  };

  const exportData = () => {
    const data = { ledger, files, transfers };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `file-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (confirm('This will clear existing data and import from file. Continue?')) {
          await dbService.clearAll();
          for (const l of (data.ledger || data.people)) await dbService.add('ledger', l);
          for (const f of data.files) await dbService.add('files', f);
          for (const t of data.transfers) await dbService.add('transfers', t);
          loadData();
          alert('Data imported successfully!');
        }
      } catch (err) {
        alert('Error importing data. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  // --- Helpers ---
  const getPersonName = (id: string) => {
    if (id === 'system') return 'System';
    return ledger.find(p => p.id === id)?.ledgerNumber || 'Unknown';
  };

  const getFileName = (id: string) => {
    return files.find(f => f.id === id)?.name || 'Unknown File';
  };

  const filteredFiles = useMemo(() => {
    return files.filter(f => 
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.district.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [files, searchQuery]);

  const historyTransfers = useMemo(() => {
    if (!historyFileId) return transfers;
    return transfers.filter(t => t.fileId === historyFileId);
  }, [transfers, historyFileId]);

  // --- Sub-components ---
  const NavItem = ({ section, icon: Icon, label }: { section: Section, icon: any, label: string }) => (
    <button
      onClick={() => { setActiveSection(section); setIsSidebarOpen(false); }}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all duration-200",
        activeSection === section 
          ? "bg-brand-500 text-white shadow-md" 
          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
      )}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full p-4">
          <div className="flex items-center gap-3 px-2 mb-8">
            <div className="p-2 bg-brand-500 rounded-lg text-white">
              <FileText size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">FileTracker</h1>
          </div>

          <nav className="flex-1 space-y-1">
            <NavItem section="dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavItem section="files" icon={Files} label="Files" />
            <NavItem section="transfer" icon={ArrowLeftRight} label="Transfer" />
            <NavItem section="history" icon={History} label="History" />
            <NavItem section="ledger" icon={Users} label="Ledger" />
          </nav>

          <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex items-center gap-2 px-4 py-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Local Storage</span>
            </div>
            
            <button onClick={exportData} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <Download size={16} />
              <span>Export Data</span>
            </button>
            
            <label className="flex items-center gap-3 w-full px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
              <Upload size={16} />
              <span>Import Data</span>
              <input type="file" onChange={importData} className="hidden" accept=".json" />
            </label>

            <button onClick={toggleTheme} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
              <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            <button 
              onClick={async () => {
                if (confirm('Are you sure you want to clear ALL data? This cannot be undone.')) {
                  await dbService.clearAll();
                  loadData();
                }
              }} 
              className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <Trash2 size={16} />
              <span>Clear All Data</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-bottom border-slate-200 dark:border-slate-800 lg:px-8">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 lg:hidden">
            <Menu size={20} />
          </button>
          
          <div className="flex items-center gap-4 ml-auto">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-medium">
              <Database size={14} className="text-brand-500" />
              <span>IndexedDB Active</span>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          {/* Dashboard Section */}
          {activeSection === 'dashboard' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <p className="text-slate-500 dark:text-slate-400">Overview of your file records and activity.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                      <Files size={20} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold">{files.length}</div>
                  <div className="text-sm text-slate-500">Total Files</div>
                </div>
                <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                      <ArrowLeftRight size={20} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold">{transfers.length}</div>
                  <div className="text-sm text-slate-500">Total Transfers</div>
                </div>
                <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                      <Users size={20} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold">{ledger.length}</div>
                  <div className="text-sm text-slate-500">Ledger Entries</div>
                </div>
                <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
                      <Clock size={20} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold">
                    {transfers.filter(t => Date.now() - t.timestamp < 7 * 24 * 60 * 60 * 1000).length}
                  </div>
                  <div className="text-sm text-slate-500">Last 7 Days</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="text-lg font-semibold">Recent Transfers</h3>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {transfers.slice(0, 5).map(t => (
                      <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                            <ArrowLeftRight size={18} />
                          </div>
                          <div>
                            <div className="font-medium">{getFileName(t.fileId)}</div>
                            <div className="text-sm text-slate-500">
                              {getPersonName(t.fromId)} → {getPersonName(t.toId)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{new Date(t.timestamp).toLocaleDateString()}</div>
                          <div className="text-xs text-slate-500">{t.district}</div>
                        </div>
                      </div>
                    ))}
                    {transfers.length === 0 && (
                      <div className="p-8 text-center text-slate-500">No transfers recorded yet.</div>
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                  <h3 className="text-lg font-semibold mb-6">Data Management</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button 
                      onClick={exportData}
                      className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-brand-500 hover:bg-brand-50/50 dark:hover:bg-brand-900/10 transition-all group"
                    >
                      <div className="p-3 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-full group-hover:scale-110 transition-transform">
                        <Download size={24} />
                      </div>
                      <div className="text-center">
                        <div className="font-bold">Export Data</div>
                        <div className="text-xs text-slate-500">Download all records as JSON</div>
                      </div>
                    </button>

                    <label className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-brand-500 hover:bg-brand-50/50 dark:hover:bg-brand-900/10 transition-all group cursor-pointer">
                      <div className="p-3 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-full group-hover:scale-110 transition-transform">
                        <Upload size={24} />
                      </div>
                      <div className="text-center">
                        <div className="font-bold">Import Data</div>
                        <div className="text-xs text-slate-500">Restore from backup file</div>
                      </div>
                      <input type="file" onChange={importData} className="hidden" accept=".json" />
                    </label>
                  </div>
                  
                  <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-lg">
                    <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                      <strong>Note:</strong> This exports your local database records. To download the full application source code or build files, please use the <strong>Settings</strong> menu in AI Studio and select <strong>Export to ZIP</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Files Section */}
          {activeSection === 'files' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">File Registry</h2>
                  <p className="text-slate-500 dark:text-slate-400">Manage your physical file records.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Add/Edit File Form */}
                <div className="lg:col-span-1">
                  {editingFile ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-brand-500 shadow-lg p-6 animate-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold">Edit File</h3>
                        <button onClick={() => setEditingFile(null)} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                      </div>
                      <form onSubmit={handleUpdateFile} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1.5">File Name / Number *</label>
                          <input 
                            required
                            value={editingFile.name}
                            onChange={e => setEditingFile({...editingFile, name: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                          />
                        </div>
                        <Autocomplete
                          label="District / Zonal Office"
                          required
                          options={DISTRICTS.map(d => ({ id: d, name: d }))}
                          value={editingFile.district}
                          onChange={val => setEditingFile({...editingFile, district: val})}
                          placeholder="Select District"
                        />
                        <div>
                          <label className="block text-sm font-medium mb-1.5">School / Department</label>
                          <input 
                            value={editingFile.schoolDepartment || ''}
                            onChange={e => setEditingFile({...editingFile, schoolDepartment: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                            placeholder="e.g. Royal College, Admin"
                          />
                        </div>
                        <Autocomplete
                          label="Current Holder"
                          required
                          options={ledger.map(p => ({ id: p.id, name: p.ledgerNumber, subtext: `EPF: ${p.epf}` }))}
                          value={editingFile.currentHolderId}
                          onChange={val => setEditingFile({...editingFile, currentHolderId: val})}
                          placeholder="Select Person"
                        />
                        <div>
                          <label className="block text-sm font-medium mb-1.5">Description</label>
                          <textarea 
                            value={editingFile.description}
                            onChange={e => setEditingFile({...editingFile, description: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                            rows={3}
                          />
                        </div>
                        <DateTimePicker
                          label="Date Created"
                          value={(() => {
                            const d = new Date(editingFile.createdAt);
                            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                          })()}
                          onChange={val => setEditingFile({...editingFile, createdAt: new Date(val).getTime()})}
                        />
                        <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors">
                          Save Changes
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                      <h3 className="text-lg font-semibold mb-6">Add New File</h3>
                      <form onSubmit={handleAddFile} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1.5">File Name / Number *</label>
                          <input 
                            required
                            value={newFile.name}
                            onChange={e => setNewFile({...newFile, name: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                            placeholder="e.g. Case File #1024"
                          />
                        </div>
                        <Autocomplete
                          label="District / Zonal Office"
                          required
                          options={DISTRICTS.map(d => ({ id: d, name: d }))}
                          value={newFile.district}
                          onChange={val => setNewFile({...newFile, district: val})}
                          placeholder="Select District"
                        />
                        <div>
                          <label className="block text-sm font-medium mb-1.5">School / Department</label>
                          <input 
                            value={newFile.schoolDepartment}
                            onChange={e => setNewFile({...newFile, schoolDepartment: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                            placeholder="e.g. Royal College, Admin"
                          />
                        </div>
                        <Autocomplete
                          label="Initial Holder"
                          required
                          options={ledger.map(p => ({ id: p.id, name: p.ledgerNumber, subtext: `EPF: ${p.epf}` }))}
                          value={newFile.holderId}
                          onChange={val => setNewFile({...newFile, holderId: val})}
                          placeholder="Select Person"
                        />
                        <div>
                          <label className="block text-sm font-medium mb-1.5">Description</label>
                          <textarea 
                            value={newFile.description}
                            onChange={e => setNewFile({...newFile, description: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                            rows={3}
                            placeholder="Brief description..."
                          />
                        </div>
                        <DateTimePicker
                          label="Date & Time"
                          value={newFile.timestamp}
                          onChange={val => setNewFile({...newFile, timestamp: val})}
                        />
                        <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors">
                          <Plus size={18} />
                          Add File
                        </button>
                      </form>
                    </div>
                  )}
                </div>

                {/* File List */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all shadow-sm"
                      placeholder="Search files by name, district, or description..."
                    />
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs uppercase tracking-wider">
                            <th className="px-6 py-4 font-semibold">File Details</th>
                            <th className="px-6 py-4 font-semibold">District / School</th>
                            <th className="px-6 py-4 font-semibold text-center">Date Created</th>
                            <th className="px-6 py-4 font-semibold">Current Holder</th>
                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {filteredFiles.map(f => (
                            <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                              <td className="px-6 py-4">
                                <div className="font-medium text-slate-900 dark:text-slate-100">{f.name}</div>
                                <div className="text-xs text-slate-500 line-clamp-1">{f.description || 'No description'}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1.5 text-sm">
                                    <MapPin size={14} className="text-slate-400" />
                                    {f.district}
                                  </div>
                                  {f.schoolDepartment && (
                                    <div className="text-xs text-slate-500 font-medium ml-5">
                                      {f.schoolDepartment}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800/50 px-2 py-1 inline-block uppercase border border-slate-200 dark:border-slate-700">
                                  {formatDate(f.createdAt)}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2 text-sm">
                                  <div className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center text-[10px] font-bold">
                                    {getPersonName(f.currentHolderId).charAt(0)}
                                  </div>
                                  {getPersonName(f.currentHolderId)}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => setEditingFile(f)} className="p-1.5 text-slate-400 hover:text-brand-500 transition-colors">
                                    <Edit2 size={16} />
                                  </button>
                                  <button onClick={() => handleDeleteFile(f.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {filteredFiles.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                No files found matching your search.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Transfer Section */}
          {activeSection === 'transfer' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-8">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Transfer File</h2>
                <p className="text-slate-500 dark:text-slate-400">Hand over a file to another person.</p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
                <form onSubmit={handleTransfer} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Autocomplete
                      label="Select File"
                      required
                      options={files.map(f => ({ id: f.id, name: f.name, subtext: f.district }))}
                      value={newTransfer.fileId}
                      onChange={val => setNewTransfer({...newTransfer, fileId: val})}
                      placeholder="Search File..."
                    />
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Current Holder</label>
                      <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 min-h-[42px] flex items-center">
                        {newTransfer.fileId ? getPersonName(files.find(f => f.id === newTransfer.fileId)?.currentHolderId || '') : 'Select a file first'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Autocomplete
                      label="Transfer To"
                      required
                      options={ledger.map(p => ({ id: p.id, name: p.ledgerNumber, subtext: `EPF: ${p.epf}` }))}
                      value={newTransfer.toId}
                      onChange={val => setNewTransfer({...newTransfer, toId: val})}
                      placeholder="Search Person..."
                    />
                    <Autocomplete
                      label="New District"
                      required
                      options={DISTRICTS.map(d => ({ id: d, name: d }))}
                      value={newTransfer.district}
                      onChange={val => setNewTransfer({...newTransfer, district: val})}
                      placeholder="Select District"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">New School / Department</label>
                      <input 
                        value={newTransfer.schoolDepartment}
                        onChange={e => setNewTransfer({...newTransfer, schoolDepartment: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                        placeholder="e.g. Royal College, Admin"
                      />
                    </div>
                    <DateTimePicker
                      label="Date & Time"
                      value={newTransfer.timestamp}
                      onChange={val => setNewTransfer({...newTransfer, timestamp: val})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Notes</label>
                    <textarea 
                      value={newTransfer.notes}
                      onChange={e => setNewTransfer({...newTransfer, notes: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                      rows={3}
                      placeholder="Reason for transfer or remarks..."
                    />
                  </div>

                  <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-500 text-white rounded-lg font-bold hover:bg-brand-600 shadow-lg shadow-brand-500/20 transition-all active:scale-[0.98]">
                    <ArrowLeftRight size={20} />
                    Complete Transfer
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* History Section */}
          {activeSection === 'history' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Transfer History</h2>
                  <p className="text-slate-500 dark:text-slate-400">Track the complete chain of custody.</p>
                </div>
                <Autocomplete
                  options={files.map(f => ({ id: f.id, name: f.name, subtext: f.district }))}
                  value={historyFileId}
                  onChange={val => setHistoryFileId(val)}
                  placeholder="All Files"
                  className="min-w-[240px]"
                />
              </div>

              <div className="relative">
                <div className="absolute left-8 top-0 bottom-0 w-px bg-slate-200 dark:border-slate-800" />
                <div className="space-y-8">
                  {historyTransfers.map((t, i) => (
                    <div key={t.id} className="relative flex gap-8">
                      <div className={cn(
                        "z-10 flex items-center justify-center w-16 h-16 rounded-full border-4 border-slate-50 dark:border-slate-950 shadow-sm",
                        i === 0 ? "bg-brand-500 text-white" : "bg-white dark:bg-slate-900 text-slate-400"
                      )}>
                        {i === 0 ? <ArrowLeftRight size={24} /> : <Clock size={24} />}
                      </div>
                      <div className="flex-1 pt-2">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                            <h4 className="font-bold text-lg">{getFileName(t.fileId)}</h4>
                            <span className="text-[10px] font-mono text-brand-500 bg-brand-50 dark:bg-brand-900/20 px-2 py-1 inline-block uppercase tracking-widest border border-brand-100 dark:border-brand-900/30">
                              {formatDate(t.timestamp)}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm mb-4">
                            <div className="flex flex-col">
                              <span className="text-xs text-slate-500 uppercase tracking-wider">From</span>
                              <span className="font-medium">{getPersonName(t.fromId)}</span>
                            </div>
                            <ChevronRight className="text-slate-300" size={20} />
                            <div className="flex flex-col">
                              <span className="text-xs text-slate-500 uppercase tracking-wider">To</span>
                              <span className="font-medium">{getPersonName(t.toId)}</span>
                            </div>
                          </div>
                          {t.notes && (
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-sm text-slate-600 dark:text-slate-400 italic">
                              "{t.notes}"
                            </div>
                          )}
                          <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <MapPin size={12} />
                              {t.district}
                            </div>
                            {t.schoolDepartment && (
                              <div className="flex items-center gap-1.5">
                                <FileText size={12} />
                                {t.schoolDepartment}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {historyTransfers.length === 0 && (
                    <div className="pl-24 py-12 text-slate-500">No transfers found for this selection.</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Ledger Section */}
          {activeSection === 'ledger' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Ledger</h2>
                <p className="text-slate-500 dark:text-slate-400">Manage organizational ledger entries.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Add/Edit Ledger Form */}
                <div className="lg:col-span-1">
                  {editingLedger ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-brand-500 shadow-lg p-6 animate-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold">Edit Entry</h3>
                        <button onClick={() => setEditingLedger(null)} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                      </div>
                      <form onSubmit={handleUpdateLedgerEntry} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1.5">Ledger Number *</label>
                          <input 
                            required
                            value={editingLedger.ledgerNumber}
                            onChange={e => setEditingLedger({...editingLedger, ledgerNumber: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1.5">EPF *</label>
                          <input 
                            required
                            value={editingLedger.epf}
                            onChange={e => setEditingLedger({...editingLedger, epf: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1.5">Zone / Section</label>
                          <input 
                            value={editingLedger.zoneSection}
                            onChange={e => setEditingLedger({...editingLedger, zoneSection: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                          />
                        </div>
                        <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors">
                          Save Changes
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                      <h3 className="text-lg font-semibold mb-6">Add Entry</h3>
                      <form onSubmit={handleAddLedgerEntry} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1.5">Ledger Number *</label>
                          <input 
                            required
                            value={newLedgerEntry.ledgerNumber}
                            onChange={e => setNewLedgerEntry({...newLedgerEntry, ledgerNumber: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                            placeholder="e.g. L-1001"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1.5">EPF *</label>
                          <input 
                            required
                            value={newLedgerEntry.epf}
                            onChange={e => setNewLedgerEntry({...newLedgerEntry, epf: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                            placeholder="e.g. EPF/001"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1.5">Zone / Section</label>
                          <input 
                            value={newLedgerEntry.zoneSection}
                            onChange={e => setNewLedgerEntry({...newLedgerEntry, zoneSection: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                            placeholder="e.g. Accounts, HR"
                          />
                        </div>
                        <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors">
                          <Plus size={18} />
                          Add Entry
                        </button>
                      </form>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ledger.map(p => (
                      <div key={p.id} className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center text-lg font-bold">
                            {p.ledgerNumber.charAt(0)}
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setEditingLedger(p)} className="p-1.5 text-slate-400 hover:text-brand-500 transition-colors opacity-0 group-hover:opacity-100">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDeleteLedgerEntry(p.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <h4 className="font-bold text-lg">{p.ledgerNumber}</h4>
                        <div className="text-xs text-slate-500 mb-2 font-medium">EPF: {p.epf}</div>
                        <div className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded inline-block text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          {p.zoneSection || 'No Department'}
                        </div>
                      </div>
                    ))}
                    {ledger.length === 0 && (
                      <div className="col-span-full py-12 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                        No ledger entries added yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
