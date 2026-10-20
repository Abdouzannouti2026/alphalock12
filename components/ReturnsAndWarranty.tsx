import React, { useState, useMemo, useRef, useEffect } from 'react';
import JsBarcode from 'jsbarcode';
import { 
  RotateCcw, 
  ShieldCheck, 
  ShieldAlert, 
  Search, 
  Plus, 
  Printer, 
  QrCode, 
  Barcode, 
  FileText, 
  Download, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  User, 
  Phone, 
  MapPin, 
  Package, 
  Calendar, 
  Trash2, 
  Edit3, 
  ChevronRight,
  ChevronDown,
  Sparkles,
  X,
  Wrench,
  Tag
} from 'lucide-react';
import { WarrantyReturn, ReturnStatus, Client, Product, CompanySettings } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

const BarcodeDisplay: React.FC<{ value: string; className?: string }> = ({ value, className = '' }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width: 2,
          height: 48,
          displayValue: true,
          fontOptions: 'bold',
          font: 'monospace',
          fontSize: 12,
          margin: 6,
          background: '#ffffff',
          lineColor: '#000000'
        });
      } catch (err) {
        console.warn('Barcode generation warning:', err);
      }
    }
  }, [value]);

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg ref={svgRef} className="max-w-full h-auto" />
    </div>
  );
};

interface ReturnsAndWarrantyProps {
  returns: WarrantyReturn[];
  clients: Client[];
  products: Product[];
  companySettings: CompanySettings | null;
  onAddReturn: (item: WarrantyReturn) => Promise<void>;
  onUpdateReturn: (item: WarrantyReturn) => Promise<void>;
  onDeleteReturn: (id: string) => Promise<void>;
}

export const ReturnsAndWarranty: React.FC<ReturnsAndWarrantyProps> = ({
  returns,
  clients,
  products,
  companySettings,
  onAddReturn,
  onUpdateReturn,
  onDeleteReturn
}) => {
  const { t, isRTL } = useLanguage();
  
  // Tabs: 'list' | 'scan' | 'warranty_form' | 'return_form'
  const [activeTab, setActiveTab] = useState<'list' | 'scan' | 'warranty_form' | 'return_form'>('list');
  
  // Search & Filters for List
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'warranty' | 'return'>('all');
  
  // Scanner tab state
  const [scanCode, setScanCode] = useState('');
  const [scannedResult, setScannedResult] = useState<WarrantyReturn | null>(null);
  const [scanAttempted, setScanAttempted] = useState(false);
  
  // Modal for Print / View Details
  const [selectedReturnForPrint, setSelectedReturnForPrint] = useState<WarrantyReturn | null>(null);
  
  // Modal for Status Edit
  const [editingReturn, setEditingReturn] = useState<WarrantyReturn | null>(null);
  const [newStatus, setNewStatus] = useState<ReturnStatus>('Sous garantie');

  // Modal for Delete Confirmation
  const [deletingReturnItem, setDeletingReturnItem] = useState<WarrantyReturn | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal for Duplicate Record Blocked
  const [duplicateBlockedModal, setDuplicateBlockedModal] = useState<{
    existingRecord: WarrantyReturn;
    targetTab: 'warranty_form' | 'return_form';
  } | null>(null);

  const handleConfirmDelete = async () => {
    if (!deletingReturnItem) return;
    setIsDeleting(true);
    try {
      await onDeleteReturn(deletingReturnItem.id);
      setDeletingReturnItem(null);
    } catch (err: any) {
      console.error("Erreur lors de la suppression:", err);
      try {
        await onDeleteReturn(deletingReturnItem.id);
      } catch (_) {}
      setDeletingReturnItem(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // FORM 1: WARRANTY FORM STATE
  const [warrantyForm, setWarrantyForm] = useState({
    clientName: '',
    phone: '',
    address: '',
    productName: '',
    serialNumber: '',
    date: new Date().toISOString().split('T')[0],
    warrantyMonths: 12,
    invoiceNumber: '',
    notes: ''
  });

  // FORM 2: RETURN (SAV) FORM STATE
  const [returnForm, setReturnForm] = useState<{
    lookupCode: string;
    clientName: string;
    phone: string;
    address: string;
    productName: string;
    serialNumber: string;
    date: string;
    reason: string;
    status: ReturnStatus;
    accessories: string;
    notes: string;
    matchedWarranty: WarrantyReturn | null;
  }>({
    lookupCode: '',
    clientName: '',
    phone: '',
    address: '',
    productName: '',
    serialNumber: '',
    date: new Date().toISOString().split('T')[0],
    reason: 'Appareil défectueux / Panne',
    status: 'En cours',
    accessories: 'Appareil seul',
    notes: '',
    matchedWarranty: null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper: Find existing warranty or return record for a client and product/serial number
  const findExistingRecord = (clientName: string, productName: string, serialNumber: string) => {
    const cleanClient = (clientName || '').trim().toLowerCase();
    const cleanProduct = (productName || '').trim().toLowerCase();
    const cleanSerial = (serialNumber || '').trim().toLowerCase();

    if (!cleanClient && !cleanProduct && !cleanSerial) return null;

    return returns.find(r => {
      const rSerial = (r.serialNumber || '').trim().toLowerCase();
      const rClient = (r.clientName || '').trim().toLowerCase();
      const rProduct = (r.productName || '').trim().toLowerCase();

      // Priority 1: Match by exact serial number if present
      if (cleanSerial && rSerial && cleanSerial === rSerial) {
        return true;
      }

      // Priority 2: Match by same client AND same product name
      if (cleanClient && cleanProduct && rClient === cleanClient && rProduct === cleanProduct) {
        return true;
      }

      return false;
    });
  };

  // Live duplicate detection
  const existingWarrantyDuplicate = useMemo(() => {
    if (activeTab !== 'warranty_form') return null;
    return findExistingRecord(warrantyForm.clientName, warrantyForm.productName, warrantyForm.serialNumber);
  }, [returns, activeTab, warrantyForm.clientName, warrantyForm.productName, warrantyForm.serialNumber]);

  const existingReturnDuplicate = useMemo(() => {
    if (activeTab !== 'return_form') return null;
    return findExistingRecord(returnForm.clientName, returnForm.productName, returnForm.serialNumber);
  }, [returns, activeTab, returnForm.clientName, returnForm.productName, returnForm.serialNumber]);

  // Dropdown States for Product & Client Selectors
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // Click Outside Listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setIsProductDropdownOpen(false);
      }
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setIsClientDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filtered Products for Form Dropdown
  const activeProductName = activeTab === 'warranty_form' ? warrantyForm.productName : returnForm.productName;
  const filteredProductsForSelect = useMemo(() => {
    if (!activeProductName.trim()) return products;
    const q = activeProductName.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q) ||
      (p.productCode || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  }, [products, activeProductName]);

  // Filtered Clients for Form Dropdown
  const activeClientName = activeTab === 'warranty_form' ? warrantyForm.clientName : returnForm.clientName;
  const filteredClientsForSelect = useMemo(() => {
    if (!activeClientName.trim()) return clients;
    const q = activeClientName.toLowerCase();
    return clients.filter(c => 
      c.name.toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.company || '').toLowerCase().includes(q)
    );
  }, [clients, activeClientName]);

  // Helper: Calculate warranty expiration & status
  const getWarrantyInfo = (returnItem: WarrantyReturn) => {
    if (!returnItem.date) return { isExpired: false, daysLeft: 0, expiryDateStr: '' };
    const saleDate = new Date(returnItem.date);
    const months = returnItem.warrantyMonths || 12;
    const expiryDate = new Date(saleDate);
    expiryDate.setMonth(expiryDate.getMonth() + months);

    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isExpired = daysLeft < 0;

    const expiryDateStr = expiryDate.toLocaleDateString('fr-FR');
    return { isExpired, daysLeft, expiryDateStr };
  };

  // KPI Calculations
  const totalCount = returns.length;
  const activeWarrantiesCount = useMemo(() => {
    return returns.filter(r => {
      const { isExpired } = getWarrantyInfo(r);
      const isInactive = r.status === 'Clôturé' || r.status === 'Remboursé' || r.status === 'Garantie expirée';
      return !isExpired && !isInactive;
    }).length;
  }, [returns]);

  const monthReturnsCount = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return returns.filter(r => {
      if (!r.date) return false;
      const d = new Date(r.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
  }, [returns]);

  // Filtered Returns List
  const filteredReturns = useMemo(() => {
    return returns.filter(item => {
      const { isExpired } = getWarrantyInfo(item);
      const matchesSearch = 
        (item.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.serialNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.returnCode || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = 
        typeFilter === 'all' ? true :
        typeFilter === 'warranty' ? (item.recordType === 'warranty' || !item.recordType) :
        (item.recordType === 'return' || item.status === 'En cours' || item.status === 'Réparé' || item.status === 'Échangé' || item.status === 'Remboursé');

      if (!matchesType) return false;

      if (statusFilter === 'all') return matchesSearch;
      if (statusFilter === 'expired') return matchesSearch && (isExpired || item.status === 'Garantie expirée');
      if (statusFilter === 'active') {
        const isInactive = item.status === 'Clôturé' || item.status === 'Remboursé' || item.status === 'Garantie expirée';
        return matchesSearch && !isExpired && !isInactive;
      }
      return matchesSearch && item.status === statusFilter;
    });
  }, [returns, searchTerm, statusFilter, typeFilter]);

  // Handle Scan Search
  const handleScanSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!scanCode.trim()) return;

    setScanAttempted(true);
    const clean = scanCode.trim().toLowerCase();
    const found = returns.find(r => 
      (r.serialNumber || '').toLowerCase() === clean ||
      (r.returnCode || '').toLowerCase() === clean ||
      (r.phone || '').toLowerCase() === clean ||
      (r.invoiceNumber || '').toLowerCase() === clean
    );

    setScannedResult(found || null);
  };

  // Generate Serial Number / Barcode AL-XXXXXX
  const generateSerialNumber = () => {
    const random = Math.floor(10000000 + Math.random() * 90000000);
    return `AL-${random}`;
  };

  // Return Form Lookup Warranty
  const handleLookupWarrantyForReturn = () => {
    if (!returnForm.lookupCode.trim()) return;
    const clean = returnForm.lookupCode.trim().toLowerCase();
    const found = returns.find(r => 
      (r.serialNumber || '').toLowerCase() === clean ||
      (r.returnCode || '').toLowerCase() === clean ||
      (r.invoiceNumber || '').toLowerCase() === clean ||
      (r.phone || '').toLowerCase() === clean
    );

    if (found) {
      setReturnForm(prev => ({
        ...prev,
        clientName: found.clientName,
        phone: found.phone || prev.phone,
        address: found.address || prev.address,
        productName: found.productName,
        serialNumber: found.serialNumber,
        matchedWarranty: found
      }));
    } else {
      alert("Aucun enregistrement trouvé pour ce numéro. Vous pouvez saisir les informations du client et du produit manuellement.");
    }
  };

  // Submit Form 1: Warranty
  const handleSubmitWarrantyForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warrantyForm.clientName || !warrantyForm.productName || !warrantyForm.serialNumber) {
      alert("Veuillez remplir les champs obligatoires (Client, Produit, N° de Série)");
      return;
    }

    // CHECK FOR DUPLICATE RECORD!
    const existing = findExistingRecord(warrantyForm.clientName, warrantyForm.productName, warrantyForm.serialNumber);
    if (existing) {
      setDuplicateBlockedModal({
        existingRecord: existing,
        targetTab: 'warranty_form'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const returnCode = `GAR-${String(returns.length + 1).padStart(5, '0')}`;
      const newItem: WarrantyReturn = {
        id: crypto.randomUUID(),
        returnCode,
        recordType: 'warranty',
        clientName: warrantyForm.clientName,
        phone: warrantyForm.phone,
        address: warrantyForm.address,
        productName: warrantyForm.productName,
        serialNumber: warrantyForm.serialNumber,
        date: warrantyForm.date,
        warrantyMonths: Number(warrantyForm.warrantyMonths) || 12,
        invoiceNumber: warrantyForm.invoiceNumber,
        reason: 'Enregistrement de garantie',
        status: 'Sous garantie',
        notes: warrantyForm.notes,
        createdAt: new Date().toISOString()
      };

      await onAddReturn(newItem);

      // Reset form
      setWarrantyForm({
        clientName: '',
        phone: '',
        address: '',
        productName: '',
        serialNumber: '',
        date: new Date().toISOString().split('T')[0],
        warrantyMonths: 12,
        invoiceNumber: '',
        notes: ''
      });

      setSelectedReturnForPrint(newItem);
      setActiveTab('list');
    } catch (err: any) {
      alert("Erreur lors de l'enregistrement de la garantie: " + (err.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Form 2: Return (SAV)
  const handleSubmitReturnForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnForm.clientName || !returnForm.productName || !returnForm.serialNumber) {
      alert("Veuillez remplir les champs obligatoires (Client, Produit, N° de Série)");
      return;
    }

    // CHECK FOR DUPLICATE RECORD!
    const existing = findExistingRecord(returnForm.clientName, returnForm.productName, returnForm.serialNumber);
    if (existing) {
      setDuplicateBlockedModal({
        existingRecord: existing,
        targetTab: 'return_form'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const returnCode = `RET-${String(returns.length + 1).padStart(5, '0')}`;
      const combinedNotes = [
        returnForm.accessories ? `Accessoires: ${returnForm.accessories}` : '',
        returnForm.notes
      ].filter(Boolean).join(' | ');

      const newItem: WarrantyReturn = {
        id: crypto.randomUUID(),
        returnCode,
        recordType: 'return',
        clientName: returnForm.clientName,
        phone: returnForm.phone,
        address: returnForm.address,
        productName: returnForm.productName,
        serialNumber: returnForm.serialNumber,
        date: returnForm.date,
        warrantyMonths: returnForm.matchedWarranty?.warrantyMonths || 12,
        invoiceNumber: returnForm.matchedWarranty?.invoiceNumber || '',
        reason: returnForm.reason,
        status: returnForm.status,
        notes: combinedNotes,
        createdAt: new Date().toISOString()
      };

      await onAddReturn(newItem);

      // Reset form
      setReturnForm({
        lookupCode: '',
        clientName: '',
        phone: '',
        address: '',
        productName: '',
        serialNumber: '',
        date: new Date().toISOString().split('T')[0],
        reason: 'Appareil défectueux / Panne',
        status: 'En cours',
        accessories: 'Appareil seul',
        notes: '',
        matchedWarranty: null
      });

      setSelectedReturnForPrint(newItem);
      setActiveTab('list');
    } catch (err: any) {
      alert("Erreur lors de l'enregistrement du retour: " + (err.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save updated status
  const handleSaveStatus = async () => {
    if (!editingReturn) return;
    try {
      const updated = { ...editingReturn, status: newStatus };
      await onUpdateReturn(updated);
      setEditingReturn(null);
    } catch (err: any) {
      alert("Erreur lors de la mise à jour: " + err.message);
    }
  };

  // Export CSV
  const exportCSV = () => {
    if (returns.length === 0) {
      alert("Aucune donnée à exporter.");
      return;
    }
    const headers = ['Type', 'Code', 'Client', 'Téléphone', 'Produit', 'Numéro de Série', 'Date', 'Garantie (Mois)', 'Statut', 'Motif', 'Notes'];
    const rows = returns.map(r => [
      r.recordType === 'return' ? 'Retour SAV' : 'Garantie Vente',
      r.returnCode || '',
      `"${r.clientName || ''}"`,
      `"${r.phone || ''}"`,
      `"${r.productName || ''}"`,
      `"${r.serialNumber || ''}"`,
      r.date || '',
      r.warrantyMonths || 12,
      r.status || '',
      `"${r.reason || ''}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `registre_garanties_et_retours_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 uppercase tracking-wider">
              GARANTIES & SERVICE APRÈS-VENTE
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Gestion des garanties & retours SAV
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Enregistrez les garanties de vente, contrôlez leurs durées et gérez les retours produits.
          </p>
        </div>

        {/* TWO SEPARATE ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setActiveTab('warranty_form')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-all shadow-sm hover:shadow-md"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>+ Enregistrer une garantie</span>
          </button>

          <button
            onClick={() => setActiveTab('return_form')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-all shadow-sm hover:shadow-md"
          >
            <RotateCcw className="w-4 h-4" />
            <span>+ Enregistrer un retour (SAV)</span>
          </button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex flex-wrap border-b border-slate-200 dark:border-slate-700 gap-1 sm:gap-2">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'list'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Registre des dossiers</span>
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
            {totalCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('scan')}
          className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'scan'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Barcode className="w-4 h-4" />
          <span>Scanner un code</span>
        </button>

        <button
          onClick={() => setActiveTab('warranty_form')}
          className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'warranty_form'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Enregistrer une garantie</span>
        </button>

        <button
          onClick={() => setActiveTab('return_form')}
          className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'return_form'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <RotateCcw className="w-4 h-4 text-blue-600" />
          <span>Enregistrer un retour (SAV)</span>
        </button>
      </div>

      {/* TAB 1: REGISTRE DES RETOURS & GARANTIES */}
      {activeTab === 'list' && (
        <div className="space-y-6">
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Articles enregistrés
                </p>
                <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {totalCount}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Garanties en cours
                </p>
                <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  {activeWarrantiesCount}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Retours ce mois
                </p>
                <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                  {monthReturnsCount}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <RotateCcw className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* SEARCH & FILTERS BAR */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Rechercher client, téléphone, N° de série, modèle, facture..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white placeholder-slate-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* TYPE FILTER */}
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as any)}
                className="px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Tous les types</option>
                <option value="warranty">Garanties seulement</option>
                <option value="return">Retours SAV seulement</option>
              </select>

              {/* STATUS FILTER */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Sous garantie (Valide)</option>
                <option value="expired">Garantie expirée</option>
                <option value="En cours">En cours (SAV)</option>
                <option value="Réparé">Réparé</option>
                <option value="Échangé">Échangé</option>
                <option value="Remboursé">Remboursé</option>
                <option value="Clôturé">Clôturé</option>
              </select>

              <button
                onClick={exportCSV}
                className="inline-flex items-center gap-2 px-3 py-2.5 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* TABLE OF RETURNS & WARRANTIES */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Client</th>
                    <th className="py-3.5 px-4">Produit / N° de Série</th>
                    <th className="py-3.5 px-4">Date & Facture</th>
                    <th className="py-3.5 px-4">Garantie</th>
                    <th className="py-3.5 px-4">Statut</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                  {filteredReturns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        <div className="flex flex-col items-center justify-center">
                          <RotateCcw className="w-10 h-10 mb-3 text-slate-300 dark:text-slate-600" />
                          <p className="font-medium text-slate-600 dark:text-slate-300">Aucun enregistrement trouvé</p>
                          <p className="text-xs text-slate-400 mt-1">Utilisez les boutons ci-dessus pour enregistrer une garantie ou un retour.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredReturns.map(item => {
                      const { isExpired, daysLeft, expiryDateStr } = getWarrantyInfo(item);
                      const isReturnRecord = item.recordType === 'return' || item.status === 'En cours' || item.status === 'Réparé' || item.status === 'Échangé' || item.status === 'Remboursé';

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                          {/* Type Badge */}
                          <td className="py-3.5 px-4">
                            {isReturnRecord ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                <RotateCcw className="w-3 h-3" />
                                <span>Retour SAV</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <ShieldCheck className="w-3 h-3" />
                                <span>Garantie</span>
                              </span>
                            )}
                          </td>

                          {/* Client */}
                          <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                            <div>
                              <div className="font-semibold">{item.clientName}</div>
                              {item.phone && (
                                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                  <Phone className="w-3 h-3" />
                                  <span>{item.phone}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Product & Serial Number */}
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-slate-800 dark:text-slate-200">{item.productName}</div>
                            <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-xs border border-slate-200 dark:border-slate-600">
                              <Barcode className="w-3 h-3 text-emerald-600" />
                              <span>{item.serialNumber}</span>
                            </div>
                          </td>

                          {/* Date & Invoice */}
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 text-xs">
                            <div>{item.date ? new Date(item.date).toLocaleDateString('fr-FR') : '-'}</div>
                            {item.invoiceNumber && (
                              <div className="text-slate-400 text-2xs mt-0.5 font-mono">
                                Fac: {item.invoiceNumber}
                              </div>
                            )}
                          </td>

                          {/* Warranty Info */}
                          <td className="py-3.5 px-4">
                            {item.status === 'Remboursé' ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-950/40 px-2.5 py-1 rounded-full border border-pink-200 dark:border-pink-800">
                                <ShieldAlert className="w-3.5 h-3.5 text-pink-600" />
                                <span>Annulée (Remboursé)</span>
                              </span>
                            ) : item.status === 'Clôturé' ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                                <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                                <span>Clôturée</span>
                              </span>
                            ) : item.status === 'Échangé' ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-full border border-purple-200 dark:border-purple-800">
                                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                                <span>Échangé</span>
                              </span>
                            ) : isExpired || item.status === 'Garantie expirée' ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-full border border-red-200 dark:border-red-900">
                                <ShieldAlert className="w-3.5 h-3.5" />
                                <span>Expirée ({expiryDateStr})</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>{daysLeft}j restants ({expiryDateStr})</span>
                              </span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                              item.status === 'Sous garantie' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200' :
                              item.status === 'En cours' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200' :
                              item.status === 'Réparé' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200' :
                              item.status === 'Échangé' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200' :
                              item.status === 'Remboursé' ? 'bg-pink-100 text-pink-800 dark:bg-pink-900/60 dark:text-pink-200' :
                              'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                            }`}>
                              {item.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right space-x-1">
                            <button
                              onClick={() => setSelectedReturnForPrint(item)}
                              title="Imprimer la Fiche / Bon"
                              className="p-1.5 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => {
                                setEditingReturn(item);
                                setNewStatus(item.status);
                              }}
                              title="Modifier le statut"
                              className="p-1.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeletingReturnItem(item)}
                              title="Supprimer le dossier"
                              className="p-1.5 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 text-red-500 hover:text-red-600" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SCANNER UN CODE */}
      {activeTab === 'scan' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5 border border-emerald-100 dark:border-emerald-900/50 shadow-xs">
              <QrCode className="w-10 h-10 animate-pulse" />
            </div>

            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Scannez le code-barres ou N° de série
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 max-w-md mx-auto">
              Branchez un lecteur USB ou Bluetooth, cliquez dans le champ puis scannez pour retrouver la garantie ou le dossier SAV.
            </p>

            <form onSubmit={handleScanSearch} className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-lg mx-auto">
              <div className="relative w-full">
                <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <input
                  type="text"
                  value={scanCode}
                  onChange={e => setScanCode(e.target.value)}
                  placeholder="Ex: AL-88912741"
                  autoFocus
                  className="w-full pl-11 pr-4 py-3.5 text-base font-mono font-semibold bg-slate-50 dark:bg-slate-900 border-2 border-emerald-500/50 rounded-2xl focus:outline-hidden focus:border-emerald-600 text-slate-900 dark:text-white placeholder-slate-400 shadow-inner"
                />
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm whitespace-nowrap shadow-md transition-all"
              >
                Rechercher
              </button>
            </form>
          </div>

          {/* RESULTS CARD */}
          {scanAttempted && (
            scannedResult ? (
              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border-2 border-emerald-500/30 shadow-lg space-y-6 animate-in fade-in duration-300">
                {(() => {
                  const { isExpired, daysLeft, expiryDateStr } = getWarrantyInfo(scannedResult);

                  if (scannedResult.status === 'Remboursé') {
                    return (
                      <div className="p-4 rounded-2xl flex items-center justify-between bg-pink-50 text-pink-900 dark:bg-pink-950/60 dark:text-pink-200 border border-pink-200 dark:border-pink-800">
                        <div className="flex items-center gap-3">
                          <ShieldAlert className="w-8 h-8 text-pink-600" />
                          <div>
                            <div className="text-lg font-bold">GARANTIE ANNULÉE (PRODUIT REMBOURSÉ)</div>
                            <div className="text-xs opacity-90">Ce produit a été remboursé. La garantie n'est plus applicable.</div>
                          </div>
                        </div>

                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-white/80 dark:bg-slate-800/80 shadow-2xs text-pink-800 dark:text-pink-200">
                          Remboursé
                        </span>
                      </div>
                    );
                  }

                  if (scannedResult.status === 'Clôturé') {
                    return (
                      <div className="p-4 rounded-2xl flex items-center justify-between bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                          <ShieldAlert className="w-8 h-8 text-slate-500" />
                          <div>
                            <div className="text-lg font-bold">DOSSIER CLÔTURÉ</div>
                            <div className="text-xs opacity-90">Le dossier de garantie pour ce produit est clôturé.</div>
                          </div>
                        </div>

                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-white/80 dark:bg-slate-900/80 shadow-2xs text-slate-700 dark:text-slate-300">
                          Clôturé
                        </span>
                      </div>
                    );
                  }

                  if (scannedResult.status === 'Échangé') {
                    return (
                      <div className="p-4 rounded-2xl flex items-center justify-between bg-purple-50 text-purple-900 dark:bg-purple-950/60 dark:text-purple-200 border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center gap-3">
                          <ShieldCheck className="w-8 h-8 text-purple-600" />
                          <div>
                            <div className="text-lg font-bold">PRODUIT ÉCHANGÉ</div>
                            <div className="text-xs opacity-90">Ce produit a été remplacé ou échangé sous garantie.</div>
                          </div>
                        </div>

                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-white/80 dark:bg-slate-800/80 shadow-2xs text-purple-800 dark:text-purple-200">
                          Échangé
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div className={`p-4 rounded-2xl flex items-center justify-between ${
                      isExpired || scannedResult.status === 'Garantie expirée' ? 'bg-red-50 text-red-900 dark:bg-red-950/60 dark:text-red-200 border border-red-200 dark:border-red-800' :
                      'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                    }`}>
                      <div className="flex items-center gap-3">
                        {isExpired || scannedResult.status === 'Garantie expirée' ? <ShieldAlert className="w-8 h-8 text-red-600" /> : <ShieldCheck className="w-8 h-8 text-emerald-600" />}
                        <div>
                          <div className="text-lg font-bold">
                            {isExpired || scannedResult.status === 'Garantie expirée' ? 'GARANTIE EXPIRÉE' : 'GARANTIE VALIDE'}
                          </div>
                          <div className="text-xs opacity-90">
                            {isExpired || scannedResult.status === 'Garantie expirée' ? `Expirée le ${expiryDateStr}` : `Valide jusqu'au ${expiryDateStr} (${daysLeft} jours restants)`}
                          </div>
                        </div>
                      </div>

                      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-white/80 dark:bg-slate-800/80 shadow-2xs">
                        {scannedResult.status}
                      </span>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 space-y-2">
                    <div className="text-xs font-semibold text-slate-400 uppercase">Informations Client</div>
                    <div className="font-bold text-slate-900 dark:text-white text-base">{scannedResult.clientName}</div>
                    <div className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-emerald-600" />
                      <span>{scannedResult.phone || 'Non renseigné'}</span>
                    </div>
                    {scannedResult.address && (
                      <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 text-xs">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span>{scannedResult.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 space-y-2">
                    <div className="text-xs font-semibold text-slate-400 uppercase">Détails du Produit</div>
                    <div className="font-bold text-slate-900 dark:text-white text-base">{scannedResult.productName}</div>
                    <div className="text-slate-600 dark:text-slate-300 font-mono text-xs flex items-center gap-1.5">
                      <Barcode className="w-4 h-4 text-emerald-600" />
                      <span>{scannedResult.serialNumber}</span>
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 text-xs">
                      Date: {scannedResult.date ? new Date(scannedResult.date).toLocaleDateString('fr-FR') : '-'} | Facture: {scannedResult.invoiceNumber || 'N/A'}
                    </div>
                  </div>
                </div>

                {scannedResult.notes && (
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-900 dark:text-amber-200">
                    <span className="font-bold">Observations: </span>
                    {scannedResult.notes}
                  </div>
                )}

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={() => setSelectedReturnForPrint(scannedResult)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimer la Fiche</span>
                  </button>

                  <button
                    onClick={() => {
                      setReturnForm(prev => ({
                        ...prev,
                        lookupCode: scannedResult.serialNumber,
                        clientName: scannedResult.clientName,
                        phone: scannedResult.phone,
                        address: scannedResult.address || '',
                        productName: scannedResult.productName,
                        serialNumber: scannedResult.serialNumber,
                        matchedWarranty: scannedResult
                      }));
                      setActiveTab('return_form');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Créer un retour SAV pour ce produit</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 dark:bg-red-950/40 p-6 rounded-3xl border border-red-200 dark:border-red-900 text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
                <div className="text-base font-bold text-red-900 dark:text-red-200">
                  Aucun dossier trouvé pour le numéro "{scanCode}"
                </div>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setWarrantyForm(prev => ({ ...prev, serialNumber: scanCode }));
                      setActiveTab('warranty_form');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-sm"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Enregistrer comme nouvelle garantie</span>
                  </button>

                  <button
                    onClick={() => {
                      setReturnForm(prev => ({ ...prev, serialNumber: scanCode }));
                      setActiveTab('return_form');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-sm"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Enregistrer comme retour SAV</span>
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* TAB 3: FORM 1 - ENREGISTRER UNE GARANTIE (VENTE) */}
      {activeTab === 'warranty_form' && (
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="mb-6 pb-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Enregistrer une garantie (Nouvelle Vente)
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                Enregistrez le produit vendu et éditez son étiquette/certificat de garantie.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmitWarrantyForm} className="space-y-6">
            {/* SECTION 1: CLIENT */}
            <div className="space-y-4">
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                1. Client & Coordonnées
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Client Dropdown */}
                <div className="relative" ref={clientDropdownRef}>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nom du client *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={warrantyForm.clientName}
                      onFocus={() => setIsClientDropdownOpen(true)}
                      onChange={e => {
                        const val = e.target.value;
                        setWarrantyForm(prev => ({ ...prev, clientName: val }));
                        setIsClientDropdownOpen(true);
                        const matched = clients.find(c => c.name.toLowerCase() === val.toLowerCase());
                        if (matched) {
                          setWarrantyForm(prev => ({
                            ...prev,
                            phone: matched.phone || prev.phone,
                            address: matched.address || prev.address
                          }));
                        }
                      }}
                      placeholder="Rechercher ou saisir un client..."
                      className="w-full pl-9 pr-9 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <button
                      type="button"
                      onClick={() => setIsClientDropdownOpen(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${isClientDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {isClientDropdownOpen && (
                    <div className="absolute z-40 left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50">
                      <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900/80 text-[10px] font-medium text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <span>Clients ({filteredClientsForSelect.length})</span>
                        <span className="text-emerald-600 dark:text-emerald-400">Sélectionner</span>
                      </div>

                      {filteredClientsForSelect.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-500 dark:text-slate-400">
                          Aucun client trouvé.
                        </div>
                      ) : (
                        filteredClientsForSelect.map(c => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setWarrantyForm(prev => ({
                                ...prev,
                                clientName: c.name,
                                phone: c.phone || prev.phone,
                                address: c.address || prev.address
                              }));
                              setIsClientDropdownOpen(false);
                            }}
                            className="p-2.5 hover:bg-emerald-50/70 dark:hover:bg-slate-700/60 cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                                <User className="w-3.5 h-3.5" />
                              </div>
                              <div className="truncate">
                                <div className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate">
                                  {c.name}
                                </div>
                              </div>
                            </div>
                            {c.phone && (
                              <div className="text-2xs text-slate-500 dark:text-slate-400 font-medium shrink-0 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-emerald-600" />
                                <span>{c.phone}</span>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Téléphone *
                  </label>
                  <input
                    type="text"
                    required
                    value={warrantyForm.phone}
                    onChange={e => setWarrantyForm({ ...warrantyForm, phone: e.target.value })}
                    placeholder="06XXXXXXXX"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Adresse / Lieu d'installation
                </label>
                <input
                  type="text"
                  value={warrantyForm.address}
                  onChange={e => setWarrantyForm({ ...warrantyForm, address: e.target.value })}
                  placeholder="Ville, adresse..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* SECTION 2: PRODUIT & GARANTIE */}
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                2. Produit & Durée de Garantie
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Dropdown */}
                <div className="relative" ref={productDropdownRef}>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Produit / Modèle *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={warrantyForm.productName}
                      onFocus={() => setIsProductDropdownOpen(true)}
                      onChange={e => {
                        const val = e.target.value;
                        setWarrantyForm(prev => ({ ...prev, productName: val }));
                        setIsProductDropdownOpen(true);
                        const matched = products.find(p => p.name.toLowerCase() === val.toLowerCase());
                        if (matched) {
                          const cb = matched.barcode || matched.productCode || '';
                          if (cb) setWarrantyForm(prev => ({ ...prev, serialNumber: cb }));
                        }
                      }}
                      placeholder="Rechercher ou scroller les produits..."
                      className="w-full pl-9 pr-9 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <button
                      type="button"
                      onClick={() => setIsProductDropdownOpen(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${isProductDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {isProductDropdownOpen && (
                    <div className="absolute z-40 left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50">
                      <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900/80 text-[10px] font-medium text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <span>Produits ({filteredProductsForSelect.length})</span>
                        <span className="text-emerald-600 dark:text-emerald-400">Code-barres auto</span>
                      </div>

                      {filteredProductsForSelect.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-500 dark:text-slate-400">
                          Aucun produit trouvé.
                        </div>
                      ) : (
                        filteredProductsForSelect.map(p => (
                          <div
                            key={p.id}
                            onClick={() => {
                              const codeBarre = p.barcode || p.productCode || '';
                              setWarrantyForm(prev => ({
                                ...prev,
                                productName: p.name,
                                serialNumber: codeBarre ? codeBarre : (prev.serialNumber || generateSerialNumber())
                              }));
                              setIsProductDropdownOpen(false);
                            }}
                            className="p-2.5 hover:bg-emerald-50/70 dark:hover:bg-slate-700/60 cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                                <Package className="w-3.5 h-3.5" />
                              </div>
                              <div className="truncate">
                                <div className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate">
                                  {p.name}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              {(p.barcode || p.productCode) && (
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-2xs border border-slate-200 dark:border-slate-600">
                                  <Barcode className="w-3 h-3 text-emerald-600" />
                                  <span>{p.barcode || p.productCode}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    N° de Série / Code-Barres *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={warrantyForm.serialNumber}
                      onChange={e => setWarrantyForm({ ...warrantyForm, serialNumber: e.target.value })}
                      placeholder="Ex: AL-88912741"
                      className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setWarrantyForm({ ...warrantyForm, serialNumber: generateSerialNumber() })}
                      className="px-3 py-2.5 text-xs font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 rounded-xl border border-emerald-200 dark:border-emerald-800 whitespace-nowrap"
                    >
                      Générer
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date de vente *
                  </label>
                  <input
                    type="date"
                    required
                    value={warrantyForm.date}
                    onChange={e => setWarrantyForm({ ...warrantyForm, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Durée de garantie (mois) *
                  </label>
                  <select
                    value={warrantyForm.warrantyMonths}
                    onChange={e => setWarrantyForm({ ...warrantyForm, warrantyMonths: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={0}>Sans garantie (0 mois)</option>
                    <option value={6}>6 mois</option>
                    <option value={12}>12 mois (1 an)</option>
                    <option value={24}>24 mois (2 ans)</option>
                    <option value={36}>36 mois (3 ans)</option>
                    <option value={60}>60 mois (5 ans)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    N° Facture / Bon de livraison
                  </label>
                  <input
                    type="text"
                    value={warrantyForm.invoiceNumber}
                    onChange={e => setWarrantyForm({ ...warrantyForm, invoiceNumber: e.target.value })}
                    placeholder="Ex: FAC/2026/001"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes & Conditions particulières
                </label>
                <textarea
                  rows={3}
                  value={warrantyForm.notes}
                  onChange={e => setWarrantyForm({ ...warrantyForm, notes: e.target.value })}
                  placeholder="Pose, conditions d'utilisation, observations..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* LIVE DUPLICATE WARNING */}
            {existingWarrantyDuplicate && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-300 dark:border-amber-700/80 space-y-3 animate-in fade-in">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold text-amber-900 dark:text-amber-200 text-sm">
                      ⚠️ Ce produit est déjà enregistré pour ce client !
                    </div>
                    <div className="text-xs text-amber-800 dark:text-amber-300">
                      Un dossier existe déjà : <span className="font-semibold">{existingWarrantyDuplicate.clientName}</span> - <span className="font-semibold">{existingWarrantyDuplicate.productName}</span> ({existingWarrantyDuplicate.serialNumber})
                      <br />
                      Statut actuel : <span className="font-bold underline">{existingWarrantyDuplicate.status}</span> (Code: {existingWarrantyDuplicate.returnCode})
                    </div>
                    <p className="text-2xs text-amber-700 dark:text-amber-400 italic mt-1">
                      لا يمكنك إنشاء ملف ضمانة جديد مكرر لنفس الشخص والمنتج. يمكنك تغيير حالة الملف الحالي مباشرًة.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingReturn(existingWarrantyDuplicate);
                      setNewStatus(existingWarrantyDuplicate.status);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs shadow-xs"
                  >
                    ✏️ Modifier le statut de ce dossier
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm(existingWarrantyDuplicate.serialNumber || existingWarrantyDuplicate.clientName);
                      setActiveTab('list');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-medium text-xs hover:bg-amber-100/50"
                  >
                    🔍 Voir le dossier dans le registre
                  </button>
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Enregistrer & Générer la Garantie</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: FORM 2 - ENREGISTRER UN RETOUR (SAV) */}
      {activeTab === 'return_form' && (
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="mb-6 pb-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Enregistrer un retour (Service Après-Vente)
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                Réception d'un produit retourné par un client pour panne, défaut, réparation ou échange.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmitReturnForm} className="space-y-6">
            {/* QUICK LOOKUP BANNER */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Rechercher une garantie existante (Optionnel)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={returnForm.lookupCode}
                  onChange={e => setReturnForm({ ...returnForm, lookupCode: e.target.value })}
                  placeholder="Scannez ou entrez le N° de série ou N° garantie..."
                  className="w-full px-3.5 py-2 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleLookupWarrantyForReturn}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl whitespace-nowrap shadow-xs"
                >
                  Remplir automatiquement
                </button>
              </div>

              {returnForm.matchedWarranty && (
                <div className="mt-2 text-xs p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                  <span>✓ Garantie trouvée pour {returnForm.matchedWarranty.clientName} ({returnForm.matchedWarranty.productName})</span>
                  <span className="font-bold">({getWarrantyInfo(returnForm.matchedWarranty).isExpired ? 'Garantie Expirée' : 'Garantie Valide'})</span>
                </div>
              )}
            </div>

            {/* SECTION 1: CLIENT */}
            <div className="space-y-4">
              <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                1. Client
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Client Dropdown */}
                <div className="relative" ref={clientDropdownRef}>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nom du client *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={returnForm.clientName}
                      onFocus={() => setIsClientDropdownOpen(true)}
                      onChange={e => {
                        const val = e.target.value;
                        setReturnForm(prev => ({ ...prev, clientName: val }));
                        setIsClientDropdownOpen(true);
                        const matched = clients.find(c => c.name.toLowerCase() === val.toLowerCase());
                        if (matched) {
                          setReturnForm(prev => ({
                            ...prev,
                            phone: matched.phone || prev.phone,
                            address: matched.address || prev.address
                          }));
                        }
                      }}
                      placeholder="Rechercher ou saisir un client..."
                      className="w-full pl-9 pr-9 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <button
                      type="button"
                      onClick={() => setIsClientDropdownOpen(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${isClientDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {isClientDropdownOpen && (
                    <div className="absolute z-40 left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50">
                      <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900/80 text-[10px] font-medium text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <span>Clients ({filteredClientsForSelect.length})</span>
                        <span className="text-blue-600 dark:text-blue-400">Sélectionner</span>
                      </div>

                      {filteredClientsForSelect.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-500 dark:text-slate-400">
                          Aucun client trouvé.
                        </div>
                      ) : (
                        filteredClientsForSelect.map(c => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setReturnForm(prev => ({
                                ...prev,
                                clientName: c.name,
                                phone: c.phone || prev.phone,
                                address: c.address || prev.address
                              }));
                              setIsClientDropdownOpen(false);
                            }}
                            className="p-2.5 hover:bg-blue-50/70 dark:hover:bg-slate-700/60 cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                                <User className="w-3.5 h-3.5" />
                              </div>
                              <div className="truncate">
                                <div className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                                  {c.name}
                                </div>
                              </div>
                            </div>
                            {c.phone && (
                              <div className="text-2xs text-slate-500 dark:text-slate-400 font-medium shrink-0 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-blue-600" />
                                <span>{c.phone}</span>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Téléphone *
                  </label>
                  <input
                    type="text"
                    required
                    value={returnForm.phone}
                    onChange={e => setReturnForm({ ...returnForm, phone: e.target.value })}
                    placeholder="06XXXXXXXX"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: PRODUIT RETOURNÉ & MOTIF */}
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                2. Produit Retourné & Diagnostic SAV
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Dropdown */}
                <div className="relative" ref={productDropdownRef}>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Produit / Modèle *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={returnForm.productName}
                      onFocus={() => setIsProductDropdownOpen(true)}
                      onChange={e => {
                        const val = e.target.value;
                        setReturnForm(prev => ({ ...prev, productName: val }));
                        setIsProductDropdownOpen(true);
                        const matched = products.find(p => p.name.toLowerCase() === val.toLowerCase());
                        if (matched) {
                          const cb = matched.barcode || matched.productCode || '';
                          if (cb) setReturnForm(prev => ({ ...prev, serialNumber: cb }));
                        }
                      }}
                      placeholder="Rechercher ou scroller..."
                      className="w-full pl-9 pr-9 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <button
                      type="button"
                      onClick={() => setIsProductDropdownOpen(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${isProductDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {isProductDropdownOpen && (
                    <div className="absolute z-40 left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50">
                      <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900/80 text-[10px] font-medium text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <span>Produits ({filteredProductsForSelect.length})</span>
                        <span className="text-blue-600 dark:text-blue-400">Code-barres auto</span>
                      </div>

                      {filteredProductsForSelect.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-500 dark:text-slate-400">
                          Aucun produit trouvé.
                        </div>
                      ) : (
                        filteredProductsForSelect.map(p => (
                          <div
                            key={p.id}
                            onClick={() => {
                              const codeBarre = p.barcode || p.productCode || '';
                              setReturnForm(prev => ({
                                ...prev,
                                productName: p.name,
                                serialNumber: codeBarre ? codeBarre : (prev.serialNumber || generateSerialNumber())
                              }));
                              setIsProductDropdownOpen(false);
                            }}
                            className="p-2.5 hover:bg-blue-50/70 dark:hover:bg-slate-700/60 cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                                <Package className="w-3.5 h-3.5" />
                              </div>
                              <div className="truncate">
                                <div className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                                  {p.name}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              {(p.barcode || p.productCode) && (
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-2xs border border-slate-200 dark:border-slate-600">
                                  <Barcode className="w-3 h-3 text-blue-600" />
                                  <span>{p.barcode || p.productCode}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    N° de Série / Code-Barres *
                  </label>
                  <input
                    type="text"
                    required
                    value={returnForm.serialNumber}
                    onChange={e => setReturnForm({ ...returnForm, serialNumber: e.target.value })}
                    placeholder="Ex: AL-88912741"
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date de retour *
                  </label>
                  <input
                    type="date"
                    required
                    value={returnForm.date}
                    onChange={e => setReturnForm({ ...returnForm, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Motif du retour *
                  </label>
                  <select
                    value={returnForm.reason}
                    onChange={e => setReturnForm({ ...returnForm, reason: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Appareil défectueux / Panne">Panne / Appareil défectueux</option>
                    <option value="Défaut de fabrication">Défaut de fabrication</option>
                    <option value="Échange de modèle ou taille">Échange de modèle / taille</option>
                    <option value="Pièce manquante ou détériorée">Pièce manquante ou détériorée</option>
                    <option value="Demande de remboursement">Demande de remboursement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Statut du retour *
                  </label>
                  <select
                    value={returnForm.status}
                    onChange={e => setReturnForm({ ...returnForm, status: e.target.value as ReturnStatus })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    <option value="En cours">En cours de traitement (SAV)</option>
                    <option value="Réparé">Réparé</option>
                    <option value="Échangé">Échangé</option>
                    <option value="Remboursé">Remboursé</option>
                    <option value="Clôturé">Clôturé</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Accessoires fournis & État
                </label>
                <input
                  type="text"
                  value={returnForm.accessories}
                  onChange={e => setReturnForm({ ...returnForm, accessories: e.target.value })}
                  placeholder="Ex: Avec boîte d'origine, chargeur, légères rayures..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes & Diagnostic technique
                </label>
                <textarea
                  rows={3}
                  value={returnForm.notes}
                  onChange={e => setReturnForm({ ...returnForm, notes: e.target.value })}
                  placeholder="Diagnostic, réparations à effectuer, observations du technicien..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* LIVE DUPLICATE WARNING */}
            {existingReturnDuplicate && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-300 dark:border-amber-700/80 space-y-3 animate-in fade-in">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold text-amber-900 dark:text-amber-200 text-sm">
                      ⚠️ Ce produit/client possède déjà un dossier enregistré !
                    </div>
                    <div className="text-xs text-amber-800 dark:text-amber-300">
                      Dossier existant : <span className="font-semibold">{existingReturnDuplicate.clientName}</span> - <span className="font-semibold">{existingReturnDuplicate.productName}</span> ({existingReturnDuplicate.serialNumber})
                      <br />
                      Statut actuel : <span className="font-bold underline">{existingReturnDuplicate.status}</span> (Code: {existingReturnDuplicate.returnCode})
                    </div>
                    <p className="text-2xs text-amber-700 dark:text-amber-400 italic mt-1">
                      لا يمكنك إعادة تسجيل retour جديد لنفس الجهاز. يمكنك تحديث حالة الملف الحالي (مثلاً إلى En cours, Réparé, Échangé...).
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingReturn(existingReturnDuplicate);
                      setNewStatus(existingReturnDuplicate.status);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs shadow-xs"
                  >
                    ✏️ Modifier le statut de ce dossier
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm(existingReturnDuplicate.serialNumber || existingReturnDuplicate.clientName);
                      setActiveTab('list');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-medium text-xs hover:bg-amber-100/50"
                  >
                    🔍 Voir le dossier dans le registre
                  </button>
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Enregistrer & Générer le Bon SAV</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT STATUS MODAL */}
      {editingReturn && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Modifier le Statut
              </h3>
              <button
                onClick={() => setEditingReturn(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400">
              Client: <span className="font-semibold text-slate-900 dark:text-white">{editingReturn.clientName}</span> | Produit: <span className="font-semibold text-slate-900 dark:text-white">{editingReturn.productName}</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Nouveau Statut
              </label>
              <select
                value={newStatus}
                onChange={e => setNewStatus(e.target.value as ReturnStatus)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="Sous garantie">Sous garantie</option>
                <option value="En cours">En cours de traitement (SAV)</option>
                <option value="Réparé">Réparé</option>
                <option value="Échangé">Échangé</option>
                <option value="Remboursé">Remboursé</option>
                <option value="Clôturé">Clôturé</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingReturn(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveStatus}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT TICKET / WARRANTY OR SAV SLIP MODAL */}
      {selectedReturnForPrint && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 text-slate-900 border border-slate-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="font-bold text-lg text-slate-900 flex items-center gap-2">
                {selectedReturnForPrint.recordType === 'return' ? (
                  <>
                    <RotateCcw className="w-5 h-5 text-blue-600" />
                    <span>BON DE RETOUR - FICHE SAV</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span>CERTIFICAT DE GARANTIE</span>
                  </>
                )}
              </div>
              <button
                onClick={() => setSelectedReturnForPrint(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PRINTABLE AREA */}
            <div id="printable-warranty-ticket" className="p-6 border-2 border-dashed border-slate-300 rounded-2xl space-y-5 bg-slate-50/50">
              <div className="text-center pb-3 border-b border-slate-200">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-wide">
                  {companySettings?.companyName || 'FACTURAGO'}
                </h2>
                {companySettings?.address && <p className="text-2xs text-slate-500">{companySettings.address}</p>}
                {companySettings?.phone && <p className="text-2xs text-slate-500">Tél: {companySettings.phone}</p>}
              </div>

              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-400">N° Dossier: </span>
                  <span className="font-bold font-mono text-slate-900">{selectedReturnForPrint.returnCode || selectedReturnForPrint.id.substring(0, 8)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Date: </span>
                  <span className="font-semibold">{selectedReturnForPrint.date ? new Date(selectedReturnForPrint.date).toLocaleDateString('fr-FR') : '-'}</span>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 text-xs">
                <div className="font-bold text-slate-900">{selectedReturnForPrint.clientName}</div>
                <div className="text-slate-600">Tél: {selectedReturnForPrint.phone || 'Non renseigné'}</div>
                {selectedReturnForPrint.address && <div className="text-slate-500">{selectedReturnForPrint.address}</div>}
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-2xs uppercase font-semibold">Produit / Appareil</span>
                  <span className="font-bold text-sm text-slate-900">{selectedReturnForPrint.productName}</span>
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-2xs uppercase font-semibold">Numéro de Série</span>
                    <span className="font-mono font-bold text-emerald-700 text-xs">{selectedReturnForPrint.serialNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-2xs uppercase font-semibold">Garantie</span>
                    <span className="font-bold text-xs">{selectedReturnForPrint.warrantyMonths} Mois</span>
                  </div>
                </div>
              </div>

              {selectedReturnForPrint.reason && (
                <div className="p-2.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-medium">
                  <span className="font-bold text-slate-900">Motif / Diagnostic: </span>
                  {selectedReturnForPrint.reason}
                </div>
              )}

              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-900 text-center font-bold text-xs">
                STATUT : {selectedReturnForPrint.status.toUpperCase()}
              </div>

              {/* Real Scannable Barcode */}
              <div className="text-center pt-2 flex justify-center">
                <div className="inline-block bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
                  <BarcodeDisplay value={selectedReturnForPrint.serialNumber} />
                </div>
              </div>

              <div className="text-center text-2xs text-slate-400 pt-2 border-t">
                Conservateur de ce bon nécessaire pour tout contrôle ou suivi SAV.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedReturnForPrint(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-100"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => {
                  const content = document.getElementById('printable-warranty-ticket');
                  if (content) {
                    const printWindow = window.open('', '', 'width=600,height=800');
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Fiche - ${selectedReturnForPrint.serialNumber}</title>
                            <script src="https://cdn.tailwindcss.com"></script>
                          </head>
                          <body className="bg-white p-6">
                            ${content.innerHTML}
                            <script>
                              window.onload = function() { window.print(); window.close(); }
                            </script>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    }
                  }
                }}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer la Fiche</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DUPLICATE BLOCKED MODAL */}
      {duplicateBlockedModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400 font-bold text-lg">
                <ShieldAlert className="w-6 h-6" />
                <span>Création bloquée : Dossier déjà existant</span>
              </div>
              <button
                onClick={() => setDuplicateBlockedModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs space-y-2">
              <p className="font-semibold text-sm">
                Il est impossible de créer un deuxième dossier pour le même client et le même produit.
              </p>
              <p className="text-amber-800 dark:text-amber-300">
                هذا المنتج والزبون مسجلان بالفعل في النظام. لا يمكن تكرار إنشاء ملف جديد لنفس الشخص ونفس المنتج. يمكنك تغيير حالة الملف الحالي بدلاً من ذلك.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2.5 text-sm">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dossier existant trouvé</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-slate-400">Code:</span> <span className="font-mono font-bold text-slate-900 dark:text-white">{duplicateBlockedModal.existingRecord.returnCode}</span></div>
                <div><span className="text-slate-400">Statut:</span> <span className="font-bold text-emerald-600 dark:text-emerald-400">{duplicateBlockedModal.existingRecord.status}</span></div>
                <div><span className="text-slate-400">Client:</span> <span className="font-semibold text-slate-900 dark:text-white">{duplicateBlockedModal.existingRecord.clientName}</span></div>
                <div><span className="text-slate-400">Produit:</span> <span className="font-semibold text-slate-900 dark:text-white">{duplicateBlockedModal.existingRecord.productName}</span></div>
                <div className="col-span-2"><span className="text-slate-400">N° Série / Code:</span> <span className="font-mono text-slate-900 dark:text-white">{duplicateBlockedModal.existingRecord.serialNumber}</span></div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDuplicateBlockedModal(null)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => {
                  const rec = duplicateBlockedModal.existingRecord;
                  setDuplicateBlockedModal(null);
                  setSearchTerm(rec.serialNumber || rec.clientName);
                  setActiveTab('list');
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold"
              >
                🔍 Voir dans le registre
              </button>
              <button
                type="button"
                onClick={() => {
                  const rec = duplicateBlockedModal.existingRecord;
                  setDuplicateBlockedModal(null);
                  setEditingReturn(rec);
                  setNewStatus(rec.status);
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs"
              >
                ✏️ Modifier le statut actuel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingReturnItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-lg">
                <Trash2 className="w-5 h-5" />
                <span>Confirmation de suppression</span>
              </div>
              <button
                type="button"
                onClick={() => setDeletingReturnItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              Voulez-vous vraiment supprimer définitivement le dossier de <span className="font-bold text-slate-900 dark:text-white">{deletingReturnItem.clientName}</span> ({deletingReturnItem.productName} - {deletingReturnItem.serialNumber}) ?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingReturnItem(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Suppression...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Supprimer le dossier</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
