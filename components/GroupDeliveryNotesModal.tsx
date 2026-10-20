import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Layers, CheckCircle, FileText, Calendar, DollarSign, Clock, AlertTriangle, User, Hash, ChevronRight, Check, ListChecks, ArrowRight, ShieldCheck, Tag } from 'lucide-react';
import { DeliveryNote, Invoice, Client, CompanySettings, LineItem } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { generateUUID } from '../src/utils/uuid';

interface GroupDeliveryNotesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: {
        selectedNoteIds: string[];
        customData: Partial<Invoice>;
        groupingMode: 'detailed' | 'merged' | 'summary';
    }) => Promise<void> | void;
    deliveryNotes: DeliveryNote[];
    initialSelectedIds?: string[];
    clients?: Client[];
    companySettings?: CompanySettings | null;
    generateDocumentId?: () => string;
}

const GroupDeliveryNotesModal: React.FC<GroupDeliveryNotesModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    deliveryNotes,
    initialSelectedIds = [],
    clients = [],
    companySettings,
    generateDocumentId
}) => {
    const { t, isRTL, language } = useLanguage();
    const [isVisible, setIsVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [selectedClientFilter, setSelectedClientFilter] = useState<string>('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    // Grouping Mode: detailed (keep each line), merged (merge same products), summary (1 line per BL)
    const [groupingMode, setGroupingMode] = useState<'detailed' | 'merged' | 'summary'>('detailed');

    // Invoice Form Fields
    const [documentId, setDocumentId] = useState('');
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [subject, setSubject] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [notes, setNotes] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Initial setup when modal opens
    useEffect(() => {
        if (!isOpen) {
            setIsVisible(false);
            return;
        }

        const timer = setTimeout(() => setIsVisible(true), 10);
        const initialIds = initialSelectedIds && initialSelectedIds.length > 0 ? [...initialSelectedIds] : [];
        setSelectedIds(initialIds);

        let initialClient = '';
        if (initialIds.length > 0) {
            const firstNote = deliveryNotes.find(n => n.id === initialIds[0]);
            if (firstNote) {
                initialClient = firstNote.clientId;
            }
        } else {
            // Find first client with available unbilled notes
            const firstUnbilled = deliveryNotes.find(n => !n.invoiceId || n.invoiceId.trim() === '');
            if (firstUnbilled) {
                initialClient = firstUnbilled.clientId;
            } else if (clients.length > 0) {
                initialClient = clients[0].id;
            }
        }
        setSelectedClientFilter(initialClient);

        const nextId = generateDocumentId ? generateDocumentId() : '';
        setDocumentId(nextId);
        setInvoiceDate(new Date().toISOString().split('T')[0]);
        setDueDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        setPaymentMethod('');
        setErrorMsg(null);
        setGroupingMode('detailed');

        if (initialIds.length > 0) {
            const chosenNotes = deliveryNotes.filter(n => initialIds.includes(n.id));
            const blRefs = chosenNotes.map(n => n.documentId || n.id.slice(0, 8)).join(', ');
            setSubject(`Facture groupée (${chosenNotes.length} BL: ${blRefs})`);
            setNotes('');
        } else {
            setSubject('');
            setNotes('');
        }

        return () => clearTimeout(timer);
    }, [isOpen]);

    // Available unbilled delivery notes or notes already selected
    const availableDeliveryNotes = useMemo(() => {
        return deliveryNotes.filter(n => {
            const isUnbilled = !n.invoiceId || n.invoiceId.trim() === '';
            const isAlreadySelected = selectedIds.includes(n.id);
            return isUnbilled || isAlreadySelected;
        });
    }, [deliveryNotes, selectedIds]);

    // Distinct clients with available delivery notes
    const clientsWithNotes = useMemo(() => {
        const clientIds = Array.from(new Set(availableDeliveryNotes.map(n => n.clientId)));
        return clients.filter(c => clientIds.includes(c.id));
    }, [availableDeliveryNotes, clients]);

    // Notes eligible for the selected client
    const clientNotes = useMemo(() => {
        if (!selectedClientFilter) return [];
        return availableDeliveryNotes.filter(n => n.clientId === selectedClientFilter);
    }, [availableDeliveryNotes, selectedClientFilter]);

    // Current selected delivery notes objects
    const selectedNotes = useMemo(() => {
        return deliveryNotes.filter(n => selectedIds.includes(n.id));
    }, [deliveryNotes, selectedIds]);

    const activeClient = useMemo(() => {
        if (selectedClientFilter) {
            return clients.find(c => c.id === selectedClientFilter);
        }
        if (selectedNotes.length > 0) {
            return clients.find(c => c.id === selectedNotes[0].clientId);
        }
        return null;
    }, [clients, selectedClientFilter, selectedNotes]);

    // Helper to update subject when selection changes (keeps notes intact unless empty)
    const updateSubjectAndNotes = (newSelectedIds: string[]) => {
        const notesList = deliveryNotes.filter(n => newSelectedIds.includes(n.id));
        if (notesList.length > 0) {
            const blRefs = notesList.map(n => n.documentId || n.id.slice(0, 8)).join(', ');
            setSubject(`Facture groupée (${notesList.length} BL: ${blRefs})`);
        } else {
            setSubject('');
        }
    };

    // Toggle a single delivery note
    const toggleNote = (note: DeliveryNote) => {
        let nextIds: string[] = [];
        if (selectedIds.includes(note.id)) {
            nextIds = selectedIds.filter(id => id !== note.id);
            setSelectedIds(nextIds);
        } else {
            // If changing to a note of another client, switch
            if (selectedClientFilter && note.clientId !== selectedClientFilter) {
                setSelectedClientFilter(note.clientId);
                nextIds = [note.id];
                setSelectedIds(nextIds);
            } else {
                nextIds = [...selectedIds, note.id];
                setSelectedIds(nextIds);
                if (!selectedClientFilter) {
                    setSelectedClientFilter(note.clientId);
                }
            }
        }
        updateSubjectAndNotes(nextIds);
    };

    // Select all for current client
    const handleSelectAllForClient = () => {
        const clientNoteIds = clientNotes.map(n => n.id);
        const allSelected = clientNoteIds.every(id => selectedIds.includes(id));
        let nextIds: string[] = [];
        if (allSelected) {
            nextIds = selectedIds.filter(id => !clientNoteIds.includes(id));
            setSelectedIds(nextIds);
        } else {
            nextIds = Array.from(new Set([...selectedIds.filter(id => {
                const note = deliveryNotes.find(n => n.id === id);
                return note && note.clientId === selectedClientFilter;
            }), ...clientNoteIds]));
            setSelectedIds(nextIds);
        }
        updateSubjectAndNotes(nextIds);
    };

    // Calculate preview line items & totals based on selected groupingMode
    const previewData = useMemo(() => {
        if (selectedNotes.length === 0) {
            return { items: [], subTotal: 0, vatAmount: 0, totalAmount: 0, totalPaid: 0 };
        }

        let items: LineItem[] = [];

        if (groupingMode === 'summary') {
            items = selectedNotes.map(note => ({
                id: generateUUID(),
                productId: null,
                name: `Bon de Livraison N° ${note.documentId || note.id}`,
                description: `Livraison du ${new Date(note.date).toLocaleDateString('fr-FR')}${note.subject ? ` - ${note.subject}` : ''}`,
                quantity: 1,
                unitPrice: note.subTotal || note.totalAmount || 0,
                vat: (note.vatAmount && note.subTotal && note.subTotal > 0) ? Math.round((note.vatAmount / note.subTotal) * 100) : (companySettings?.defaultTva ?? 20),
                unit: 'BL'
            }));
        } else if (groupingMode === 'merged') {
            const itemMap = new Map<string, LineItem>();
            for (const note of selectedNotes) {
                for (const item of note.lineItems) {
                    const key = item.productId 
                        ? `${item.productId}-${item.variantId || 'base'}-${item.unitPrice}-${item.vat}`
                        : `${item.name.trim().toLowerCase()}-${item.unitPrice}-${item.vat}`;
                        
                    if (itemMap.has(key)) {
                        const existing = itemMap.get(key)!;
                        existing.quantity += item.quantity;
                        if (item.length && existing.length) existing.length += item.length;
                        if (item.height && existing.height) existing.height += item.height;
                        if (item.weight && existing.weight) existing.weight += item.weight;
                    } else {
                        itemMap.set(key, {
                            ...item,
                            id: generateUUID()
                        });
                    }
                }
            }
            items = Array.from(itemMap.values());
        } else {
            // Detailed
            items = selectedNotes.flatMap(note => 
                note.lineItems.map(item => ({
                    ...item,
                    id: generateUUID(),
                    description: item.description 
                        ? `${item.description} (BL: ${note.documentId || note.id})`
                        : `BL: ${note.documentId || note.id}`
                }))
            );
        }

        let subTotal = 0;
        let vatAmount = 0;
        for (const item of items) {
            const lineHT = item.quantity * item.unitPrice;
            const lineVat = lineHT * (item.vat / 100);
            subTotal += lineHT;
            vatAmount += lineVat;
        }

        const totalAmount = subTotal + vatAmount;
        const totalPaid = selectedNotes.reduce((sum, n) => sum + (n.paymentAmount || 0), 0);

        return {
            items,
            subTotal: Math.round(subTotal * 100) / 100,
            vatAmount: Math.round(vatAmount * 100) / 100,
            totalAmount: Math.round(totalAmount * 100) / 100,
            totalPaid: Math.round(totalPaid * 100) / 100
        };
    }, [selectedNotes, groupingMode, companySettings]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedIds.length === 0) {
            setErrorMsg(language === 'ar' ? 'يرجى تحديد سند تسليم واحد على الأقل' : 'Veuillez sélectionner au moins un bon de livraison.');
            return;
        }

        // Validate same client
        const firstClientId = selectedNotes[0].clientId;
        const allSame = selectedNotes.every(n => n.clientId === firstClientId);
        if (!allSame) {
            setErrorMsg(language === 'ar' ? 'يجب أن تنتمي جميع السندات لنفس العميل' : 'Tous les bons de livraison sélectionnés doivent appartenir au même client.');
            return;
        }

        setIsSubmitting(true);
        setErrorMsg(null);
        try {
            await onConfirm({
                selectedNoteIds: selectedIds,
                customData: {
                    documentId: documentId.trim() || undefined,
                    date: invoiceDate,
                    dueDate: dueDate,
                    subject: subject.trim(),
                    paymentMethod: paymentMethod || undefined,
                    notes: notes.trim()
                },
                groupingMode
            });
            onClose();
        } catch (err: any) {
            setErrorMsg(err.message || 'Erreur lors de la création de la facture groupée.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const currencyCode = companySettings?.defaultCurrencyCode || 'MAD';

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className={`relative w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto transform transition-all duration-300 ${
                    isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 sm:px-7 py-4.5 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white border-b border-slate-700/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                            <Layers className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                                {language === 'ar' ? 'إنشاء فاتورة مجمعة من سندات التسليم' : 'Facturation groupée des Bons de Livraison'}
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                                    {selectedIds.length} {language === 'ar' ? 'سند محدد' : 'sélectionné(s)'}
                                </span>
                            </h2>
                            <p className="text-xs text-slate-300 mt-0.5">
                                {language === 'ar' ? 'اختر سندات التسليم لتحويلها معاً في فاتورة واحدة رسمية' : 'Regroupez plusieurs bons de livraison pour générer une seule facture complète.'}
                            </p>
                        </div>
                    </div>
                    <button 
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        title={t('close')}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body Content */}
                <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-6 max-h-[calc(85vh-130px)] overflow-y-auto">
                    {errorMsg && (
                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-3">
                            <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Step 1: Select Client & Filter BLs */}
                    <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                <User className="h-4 w-4 text-emerald-600" />
                                1. {language === 'ar' ? 'العميل وسندات التسليم المتاحة' : 'Client & Bons de Livraison éligibles'}
                            </label>
                            
                            {/* Client Selector */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 font-medium">{t('client')}:</span>
                                <select
                                    value={selectedClientFilter}
                                    onChange={(e) => {
                                        const newClientId = e.target.value;
                                        setSelectedClientFilter(newClientId);
                                        // Keep only selected ids for this client
                                        setSelectedIds(prev => prev.filter(id => {
                                            const note = deliveryNotes.find(n => n.id === id);
                                            return note && note.clientId === newClientId;
                                        }));
                                    }}
                                    className="text-xs font-bold py-1.5 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                >
                                    {clients.map(client => {
                                        const count = availableDeliveryNotes.filter(n => n.clientId === client.id).length;
                                        return (
                                            <option key={client.id} value={client.id}>
                                                {client.name} ({count} BL dispo)
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        </div>

                        {/* Delivery notes checklist card */}
                        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                            <div className="p-3 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600">
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="checkbox"
                                        id="select-all-client-bl"
                                        checked={clientNotes.length > 0 && clientNotes.every(n => selectedIds.includes(n.id))}
                                        onChange={handleSelectAllForClient}
                                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <label htmlFor="select-all-client-bl" className="cursor-pointer select-none font-bold text-slate-800">
                                        {language === 'ar' ? 'تحديد الكل لهذا العميل' : 'Tout sélectionner pour ce client'} ({clientNotes.length} BLs)
                                    </label>
                                </div>
                                <span className="text-slate-500">
                                    {selectedIds.length} {language === 'ar' ? 'محدد' : 'sélectionné(s)'}
                                </span>
                            </div>

                            <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 p-1 bg-white">
                                {clientNotes.length > 0 ? (
                                    clientNotes.map((note) => {
                                        const isChecked = selectedIds.includes(note.id);
                                        const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
                                        const docNum = note.documentId || (isUUID(note.id) ? note.id.slice(0, 8) : note.id);
                                        const amount = note.totalAmount || (note.subTotal ? (note.subTotal + (note.vatAmount || 0)) : 0);

                                        return (
                                            <div 
                                                key={note.id}
                                                onClick={() => toggleNote(note)}
                                                className={`p-3 flex items-center justify-between rounded-xl transition-all cursor-pointer select-none ${
                                                    isChecked 
                                                        ? 'bg-emerald-50/80 border border-emerald-200 text-slate-900 shadow-xs' 
                                                        : 'hover:bg-slate-50 text-slate-700'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <input 
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => {}} // handled by parent div
                                                        className="h-4.5 w-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                                                    />
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-extrabold text-emerald-700">#{docNum}</span>
                                                            <span className="text-[11px] text-slate-400 font-medium">{new Date(note.date).toLocaleDateString('fr-FR')}</span>
                                                            {note.lineItems && (
                                                                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                                                                    {note.lineItems.length} article(s)
                                                                </span>
                                                            )}
                                                        </div>
                                                        {note.subject && (
                                                            <p className="text-xs text-slate-500 truncate mt-0.5">{note.subject}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="text-right shrink-0 pl-3">
                                                    <span className="text-xs font-black text-slate-900 block">
                                                        {amount.toLocaleString('fr-FR', { style: 'currency', currency: currencyCode })}
                                                    </span>
                                                    {note.invoiceId ? (
                                                        <span className="text-[10px] text-purple-600 font-semibold bg-purple-50 px-1.5 py-0.5 rounded">
                                                            Déjà liée: #{note.invoiceId}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-emerald-600 font-semibold">
                                                            {language === 'ar' ? 'جاهز للفوترة' : 'Prêt à facturer'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-8 text-slate-400 text-xs font-medium">
                                        {language === 'ar' ? 'لا توجد سندات تسليم غير مفوترة لهذا العميل.' : 'Aucun bon de livraison en attente pour ce client.'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Grouping Mode */}
                    <div className="space-y-2.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <Tag className="h-4 w-4 text-emerald-600" />
                            2. {language === 'ar' ? 'طريقة عرض البنود في الفاتورة' : 'Mode de regroupement des articles'}
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            {/* Option 1: Detailed */}
                            <div 
                                onClick={() => setGroupingMode('detailed')}
                                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                                    groupingMode === 'detailed' 
                                        ? 'border-emerald-600 bg-emerald-50/50 shadow-xs' 
                                        : 'border-slate-200 hover:border-slate-300 bg-white'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-slate-900">
                                        {language === 'ar' ? 'مفصل حسب كل سند' : 'Détaillé par BL'}
                                    </span>
                                    {groupingMode === 'detailed' && <CheckCircle className="h-4 w-4 text-emerald-600" />}
                                </div>
                                <p className="text-[11px] text-slate-500 leading-tight">
                                    {language === 'ar' ? 'إدراج جميع المواد مع ذكر رقم السند في الشرح' : 'Conserve toutes les lignes d’articles avec référence au BL d’origine.'}
                                </p>
                            </div>

                            {/* Option 2: Merged */}
                            <div 
                                onClick={() => setGroupingMode('merged')}
                                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                                    groupingMode === 'merged' 
                                        ? 'border-emerald-600 bg-emerald-50/50 shadow-xs' 
                                        : 'border-slate-200 hover:border-slate-300 bg-white'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-slate-900">
                                        {language === 'ar' ? 'مدمج ومجمّع' : 'Cumulé par Article'}
                                    </span>
                                    {groupingMode === 'merged' && <CheckCircle className="h-4 w-4 text-emerald-600" />}
                                </div>
                                <p className="text-[11px] text-slate-500 leading-tight">
                                    {language === 'ar' ? 'دمج المواد المتطابقة وجمع كمياتها في سطر واحد' : 'Fusionne les produits identiques en sommant les quantités.'}
                                </p>
                            </div>

                            {/* Option 3: Summary */}
                            <div 
                                onClick={() => setGroupingMode('summary')}
                                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                                    groupingMode === 'summary' 
                                        ? 'border-emerald-600 bg-emerald-50/50 shadow-xs' 
                                        : 'border-slate-200 hover:border-slate-300 bg-white'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-slate-900">
                                        {language === 'ar' ? 'ملخص (سطر لكل سند)' : '1 Ligne par BL'}
                                    </span>
                                    {groupingMode === 'summary' && <CheckCircle className="h-4 w-4 text-emerald-600" />}
                                </div>
                                <p className="text-[11px] text-slate-500 leading-tight">
                                    {language === 'ar' ? 'سطر موجز واحد يمثل كل سند تسليم مع إجماليه' : 'Une ligne de synthèse par bon de livraison (Montant global du BL).'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Step 3: Invoice Meta Form */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <FileText className="h-4 w-4 text-emerald-600" />
                            3. {language === 'ar' ? 'معلومات الفاتورة الجديدة' : 'Informations de la Facture'}
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    {language === 'ar' ? 'رقم الفاتورة' : language === 'es' ? 'Nº Factura' : language === 'en' ? 'Invoice Number' : 'N° Facture'}
                                </label>
                                <div className="relative">
                                    <input 
                                        type="text"
                                        value={documentId}
                                        onChange={(e) => setDocumentId(e.target.value)}
                                        placeholder="FA00001"
                                        className="w-full text-xs font-bold py-2 px-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('date')}</label>
                                <input 
                                    type="date"
                                    value={invoiceDate}
                                    onChange={(e) => setInvoiceDate(e.target.value)}
                                    className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('dueDate')}</label>
                                <input 
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('subject')}</label>
                                <input 
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="Objet de la facture..."
                                    className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('paymentMethod')}</label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                                >
                                    <option value="">Sélectionner un mode...</option>
                                    <option value="Virement">Virement bancaire</option>
                                    <option value="Chèque">Chèque</option>
                                    <option value="Espèces">Espèces</option>
                                    <option value="Carte Bancaire">Carte Bancaire</option>
                                    <option value="Effet de commerce">Effet de commerce</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">{t('notes')}</label>
                            <input 
                                type="text"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Observations ou mentions spéciales..."
                                className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    {/* Step 4: Live Summary Card */}
                    <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                                    {language === 'ar' ? 'إجمالي الفاتورة المجمعة' : 'Total de la facture groupée'}
                                </span>
                                <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold">
                                    {previewData.items.length} {language === 'ar' ? 'سطر' : 'ligne(s)'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400">
                                Client: <span className="text-white font-bold">{activeClient?.name || 'Non spécifié'}</span>
                            </p>
                        </div>

                        <div className="flex items-center gap-6 sm:text-right">
                            <div>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total HT</span>
                                <span className="text-sm font-bold text-slate-200">
                                    {previewData.subTotal.toLocaleString('fr-FR', { style: 'currency', currency: currencyCode })}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">TVA</span>
                                <span className="text-sm font-bold text-slate-200">
                                    {previewData.vatAmount.toLocaleString('fr-FR', { style: 'currency', currency: currencyCode })}
                                </span>
                            </div>
                            <div className="border-l border-slate-700 pl-4">
                                <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-extrabold block">Net à Payer (TTC)</span>
                                <span className="text-lg sm:text-xl font-black text-emerald-400">
                                    {previewData.totalAmount.toLocaleString('fr-FR', { style: 'currency', currency: currencyCode })}
                                </span>
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer Actions */}
                <div className="flex items-center justify-between px-5 sm:px-7 py-4 bg-slate-50 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-all"
                    >
                        {t('cancel')}
                    </button>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting || selectedIds.length === 0}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {isSubmitting ? (
                            <>
                                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>{language === 'ar' ? 'جارٍ الإنشاء...' : 'Génération en cours...'}</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle className="h-4 w-4" />
                                <span>
                                    {language === 'ar' ? `إنشاء الفاتورة (${selectedIds.length} سند)` : `Générer la Facture (${selectedIds.length} BL)`}
                                </span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default GroupDeliveryNotesModal;
