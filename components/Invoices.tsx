import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import Header from './Header';
import { CreditCard, FileText, CheckCircle, Download, Plus, Loader2, Pencil, Printer, MoreVertical, Trash2, ArrowLeftRight, Search, MessageSquare, Eye, Receipt, Layers, PackageCheck, AlertCircle, Info, Sparkles } from 'lucide-react';
import { Invoice, InvoiceStatus, Payment, Client, Product, CompanySettings, PurchaseOrder, DeliveryNote } from '../types';
import CreateInvoiceModal from './CreateInvoiceModal';
import ConfirmationModal from './ConfirmationModal';
import InvoiceReportModal from './InvoiceReportModal';
import ThermalTicketModal from './ThermalTicketModal';
import GroupDeliveryNotesModal from './GroupDeliveryNotesModal';
import GroupedInvoiceBLModal from './GroupedInvoiceBLModal';
import { generatePDF, printDocument } from '../services/pdfService';
import { useLanguage } from '../contexts/LanguageContext';
import DocumentPreviewModal from './DocumentPreviewModal';

const getStatusBadge = (status: InvoiceStatus | string) => {
    switch (status) {
        case InvoiceStatus.Paid:
            return 'badge-success';
        case InvoiceStatus.Pending:
            return 'badge-warning';
        case InvoiceStatus.Overdue:
            return 'badge-danger';
        case InvoiceStatus.Partial:
            return 'badge-info';
        case InvoiceStatus.Returned:
        case 'Retournée':
        case 'Returned':
            return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-300';
        case InvoiceStatus.Draft:
        default:
            return 'badge-neutral';
    }
};

interface InvoicesProps {
    invoices: Invoice[];
    deliveryNotes?: DeliveryNote[];
    onUpdateInvoiceStatus: (invoiceId: string, newStatus: InvoiceStatus) => void;
    onAddPayment: (payment: Omit<Payment, 'id'>) => void;
    onCreateInvoice?: (invoice: any) => Promise<any> | void;
    onUpdateInvoice?: (invoice: any, id: string) => Promise<any> | void;
    onDeleteInvoice?: (id: string) => Promise<void> | void;
    onCreateCreditNote?: (invoiceId: string) => void;
    onCreateInvoiceFromMultipleDeliveryNotes?: (deliveryNoteIds: string[], customInvoiceData?: Partial<Invoice>, groupingMode?: 'detailed' | 'merged' | 'summary') => Promise<any> | void;
    clients?: Client[];
    products?: Product[];
    companySettings?: CompanySettings | null;
    generateDocumentId?: () => string;
}

type InvoiceTab = 'all' | 'grouped';

const Invoices: React.FC<InvoicesProps> = ({ 
    invoices, 
    deliveryNotes = [],
    onUpdateInvoiceStatus, 
    onAddPayment, 
    onCreateInvoice, 
    onUpdateInvoice, 
    onDeleteInvoice, 
    onCreateCreditNote, 
    onCreateInvoiceFromMultipleDeliveryNotes,
    clients = [], 
    products = [], 
    companySettings, 
    generateDocumentId 
}) => {
    const { t, isRTL, language } = useLanguage();
    const location = useLocation();

    // Tab state: 'all' vs 'grouped'
    const [activeTab, setActiveTab] = useState<InvoiceTab>('all');
    const [highlightInvoiceId, setHighlightInvoiceId] = useState<string | null>(null);

    const [isGroupDeliveryModalOpen, setIsGroupDeliveryModalOpen] = useState(false);
    const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
    const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<'Virement' | 'Chèque' | 'Espèces' | 'Carte Bancaire'>('Virement');
    const [checkNumber, setCheckNumber] = useState('');
    const [bankName, setBankName] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [prefilledPO, setPrefilledPO] = useState<string | undefined>(undefined);
    const [prefilledOrder, setPrefilledOrder] = useState<PurchaseOrder | undefined>(undefined);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isThermalModalOpen, setIsThermalModalOpen] = useState(false);
    const [selectedInvoiceForThermal, setSelectedInvoiceForThermal] = useState<Invoice | null>(null);

    // Grouped Invoice BL inspection modal
    const [isBLModalOpen, setIsBLModalOpen] = useState(false);
    const [selectedInvoiceForBLs, setSelectedInvoiceForBLs] = useState<Invoice | null>(null);

    // Helper to check if an invoice originated from multiple/single BL group
    const isGroupedInvoice = (invoice: Invoice): boolean => {
        if (invoice.isGrouped) return true;
        if (invoice.deliveryNoteIds && invoice.deliveryNoteIds.length > 0) return true;
        const invRef = invoice.documentId || invoice.id;
        if (deliveryNotes.some(dn => dn.invoiceId && (dn.invoiceId === invRef || dn.invoiceId === invoice.id || dn.invoiceId === invoice.documentId))) {
            return true;
        }
        const sub = (invoice.subject || '').toLowerCase();
        const ref = (invoice.reference || '').toLowerCase();
        const notes = (invoice.notes || '').toLowerCase();
        if (sub.includes('facture group') || sub.includes('groupee') || notes.includes('regroupant les bons') || (ref.startsWith('bl:') && ref.includes(','))) {
            return true;
        }
        return false;
    };

    // Helper to retrieve all linked BLs for a given invoice
    const getLinkedDeliveryNotes = (invoice: Invoice): DeliveryNote[] => {
        const invRef = invoice.documentId || invoice.id;
        return deliveryNotes.filter(n => {
            if (invoice.deliveryNoteIds && invoice.deliveryNoteIds.includes(n.id)) return true;
            if (n.invoiceId && (n.invoiceId === invRef || n.invoiceId === invoice.id || n.invoiceId === invoice.documentId)) return true;
            return false;
        });
    };

    // Parse navigation state
    useEffect(() => {
        if (location.state) {
            const state = location.state as any;
            if (state.activeTab === 'grouped') {
                setActiveTab('grouped');
            } else if (state.activeTab === 'all') {
                setActiveTab('all');
            }

            if (state.highlightInvoiceId) {
                setHighlightInvoiceId(state.highlightInvoiceId);
                const timer = setTimeout(() => setHighlightInvoiceId(null), 5000);
                return () => clearTimeout(timer);
            }

            if (state.prefilledOrder) {
                setPrefilledOrder(state.prefilledOrder);
                setIsCreateModalOpen(true);
                window.history.replaceState({}, document.title);
            } else if (state.prefilledPO) {
                setPrefilledPO(state.prefilledPO);
                setIsCreateModalOpen(true);
                window.history.replaceState({}, document.title);
            }
        }
    }, [location]);

    // All vs Grouped lists
    const groupedInvoicesList = useMemo(() => {
        return invoices.filter(inv => isGroupedInvoice(inv));
    }, [invoices, deliveryNotes]);

    const activeList = useMemo(() => {
        return activeTab === 'grouped' ? groupedInvoicesList : invoices;
    }, [activeTab, groupedInvoicesList, invoices]);

    // Grouped tab KPIs
    const groupedStats = useMemo(() => {
        const totalGroupedInvoices = groupedInvoicesList.length;
        const totalAmountTTC = groupedInvoicesList.reduce((sum, inv) => sum + (inv.amount || 0), 0);
        const totalAmountPaid = groupedInvoicesList.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
        const totalRemaining = Math.max(0, totalAmountTTC - totalAmountPaid);
        
        let totalBLCount = 0;
        groupedInvoicesList.forEach(inv => {
            const bls = getLinkedDeliveryNotes(inv);
            totalBLCount += bls.length > 0 ? bls.length : (inv.deliveryNoteIds?.length || 1);
        });

        return {
            totalGroupedInvoices,
            totalAmountTTC,
            totalRemaining,
            totalBLCount
        };
    }, [groupedInvoicesList, deliveryNotes]);

    // Responsive
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Pagination & Search
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const filteredInvoices = activeList.filter(invoice => {
        const term = searchTerm.toLowerCase();
        const docId = (invoice.documentId || invoice.id).toLowerCase();
        const clientName = (invoice.clientName || '').toLowerCase();
        const subject = (invoice.subject || '').toLowerCase();
        const ref = (invoice.reference || '').toLowerCase();
        return docId.includes(term) || clientName.includes(term) || subject.includes(term) || ref.includes(term);
    });
    const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + itemsPerPage);

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('...');
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) {
                if (!pages.includes(i)) pages.push(i);
            }
            if (currentPage < totalPages - 2) pages.push('...');
            if (!pages.includes(totalPages)) pages.push(totalPages);
        }
        return pages;
    };

    // Reset page if search or tab change
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchTerm, itemsPerPage]);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [invoiceIdToDelete, setInvoiceIdToDelete] = useState<string | null>(null);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [selectedDocForPreview, setSelectedDocForPreview] = useState<any>(null);
    const [selectedRecipientForPreview, setSelectedRecipientForPreview] = useState<any>(null);

    // Menu Dropdown State
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState<{top: number, left: number, transformOrigin: string} | null>(null);

    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        if(activeMenuId) {
            document.addEventListener('click', handleClickOutside);
            window.addEventListener('scroll', handleClickOutside, true);
            window.addEventListener('resize', handleClickOutside);
        }
        return () => {
            document.removeEventListener('click', handleClickOutside);
            window.removeEventListener('scroll', handleClickOutside, true);
            window.removeEventListener('resize', handleClickOutside);
        };
    }, [activeMenuId]);

    const toggleMenu = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (activeMenuId === id) {
            setActiveMenuId(null);
            setMenuPosition(null);
        } else {
            const rect = e.currentTarget.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const menuHeight = 350; 
            const menuWidth = 270;
            
            let top: number;
            let transformOrigin: string;
            
            if (rect.bottom + menuHeight > viewportHeight) {
                top = rect.top + window.scrollY - menuHeight - 5;
                transformOrigin = isRTL ? 'bottom left' : 'bottom right';
            } else {
                top = rect.bottom + window.scrollY + 5;
                transformOrigin = isRTL ? 'top left' : 'top right';
            }

            let left: number;
            if (isRTL) {
                left = rect.left + window.scrollX;
            } else {
                left = rect.right + window.scrollX - menuWidth;
            }

            setActiveMenuId(id);
            setMenuPosition({ top, left: Math.max(10, left), transformOrigin });
        }
    };

    const openPaymentModal = (invoice: Invoice) => {
        setSelectedInvoiceForPayment(invoice);
        setPaymentAmount(invoice.amount - (invoice.amountPaid || 0));
    };

    const handleEditClick = (invoice: Invoice) => {
        setInvoiceToEdit(invoice);
        setIsCreateModalOpen(true);
    };

    const handleCreateClick = () => {
        setInvoiceToEdit(null);
        setIsCreateModalOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        setInvoiceIdToDelete(id);
        setIsDeleteModalOpen(true);
        setActiveMenuId(null);
    };

    const confirmDelete = () => {
        if (invoiceIdToDelete && onDeleteInvoice) {
            onDeleteInvoice(invoiceIdToDelete);
        }
        setIsDeleteModalOpen(false);
        setInvoiceIdToDelete(null);
    };

    const handlePaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInvoiceForPayment) return;
        
        onAddPayment({
            invoiceId: selectedInvoiceForPayment.id,
            invoiceNumber: selectedInvoiceForPayment.documentId || selectedInvoiceForPayment.id,
            clientId: selectedInvoiceForPayment.clientId,
            clientName: selectedInvoiceForPayment.clientName,
            date: new Date().toISOString().split('T')[0],
            amount: paymentAmount,
            method: paymentMethod,
            reference: paymentMethod === 'Chèque' ? checkNumber : undefined,
            bankName: paymentMethod === 'Chèque' ? bankName : undefined,
            notes: undefined
        });
        
        setSelectedInvoiceForPayment(null);
        setCheckNumber('');
        setBankName('');
    };

    const handleSaveInvoice = (invoiceData: any, id?: string) => {
        if (id && onUpdateInvoice) {
            return onUpdateInvoice(invoiceData, id);
        } else if (onCreateInvoice) {
            return onCreateInvoice(invoiceData);
        }
    };

    const handleDownload = async (invoice: Invoice) => {
        setDownloadingId(invoice.id);
        try {
            const client = clients.find(c => c.id === invoice.clientId);
            await generatePDF('Facture', invoice, companySettings || null, client);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setDownloadingId(null);
        }
    };

    const handlePrint = (invoice: Invoice) => {
        try {
            const client = clients.find(c => c.id === invoice.clientId);
            printDocument('Facture', invoice, companySettings || null, client);
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleCreateCreditNote = (invoiceId: string) => {
        if(onCreateCreditNote) {
            onCreateCreditNote(invoiceId);
            setActiveMenuId(null);
        }
    };

    const activeInvoice = invoices.find(inv => inv.id === activeMenuId);
    const activeInvoiceRemaining = activeInvoice ? activeInvoice.amount - (activeInvoice.amountPaid || 0) : 0;
    const isDownloading = activeInvoice ? downloadingId === activeInvoice.id : false;
    const isActiveInvoiceGrouped = activeInvoice ? isGroupedInvoice(activeInvoice) : false;

    const currency = companySettings?.defaultCurrencyCode || 'MAD';

    return (
        <div className="space-y-4">
            <Header title={t('invoices')}>
                <div className={`flex items-center gap-2.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <button
                        type="button"
                        onClick={() => setIsGroupDeliveryModalOpen(true)}
                        className="btn-secondary px-3.5 py-2.5 border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/70 transition-all font-semibold"
                        title={t('createGroupInvoice') || 'Grouper des Bons de Livraison'}
                    >
                        <Layers className="h-4 w-4 text-emerald-600" />
                        <span className="hidden sm:inline">Grouper des BL</span>
                        <span className="sm:hidden">Grouper BL</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsReportModalOpen(true)}
                        className="btn-secondary px-3.5 py-2.5"
                    >
                        <Printer className="h-4 w-4 text-slate-500" />
                        <span className="hidden sm:inline">Rapport Global</span>
                        <span className="sm:hidden">Rapport</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleCreateClick}
                        className="btn-primary px-3.5 py-2.5 shadow-xs"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">{t('newInvoice')}</span>
                        <span className="sm:hidden">{t('add')}</span>
                    </button>
                </div>
            </Header>

            {/* Navigation Tabs (Toutes les factures VS Factures groupées) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-100 shadow-2xs">
                <div className="inline-flex p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">
                    <button
                        type="button"
                        onClick={() => setActiveTab('all')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                            activeTab === 'all'
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <FileText className="h-4 w-4 text-slate-500" />
                        <span>Toutes les factures</span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${activeTab === 'all' ? 'bg-slate-100 text-slate-700' : 'bg-slate-200 text-slate-600'}`}>
                            {invoices.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('grouped')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                            activeTab === 'grouped'
                                ? 'bg-white text-emerald-700 shadow-xs'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Layers className="h-4 w-4 text-emerald-600" />
                        <span>Factures groupées (BL)</span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${activeTab === 'grouped' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-200 text-slate-600'}`}>
                            {groupedInvoicesList.length}
                        </span>
                    </button>
                </div>

                {activeTab === 'grouped' && (
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsGroupDeliveryModalOpen(true)}
                            className="btn-primary text-xs sm:text-sm py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Nouveau regroupement de BL</span>
                        </button>
                    </div>
                )}
            </div>

            {/* If in 'grouped' tab, show informative summary cards */}
            {activeTab === 'grouped' && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-150">
                    <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Factures groupées</span>
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                                <Layers className="h-4 w-4" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-slate-900 mt-2">{groupedStats.totalGroupedInvoices}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Factures issues de plusieurs BL</p>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total BLs liés</span>
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                <PackageCheck className="h-4 w-4" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-slate-900 mt-2">{groupedStats.totalBLCount}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Bons de livraison regroupés</p>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Montant Facturé TTC</span>
                            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                                <FileText className="h-4 w-4" />
                            </div>
                        </div>
                        <p className="text-xl font-black text-slate-900 mt-2 truncate">
                            {groupedStats.totalAmountTTC.toLocaleString('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Chiffre d'affaires groupé</p>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reste à recouvrer</span>
                            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                                <CreditCard className="h-4 w-4" />
                            </div>
                        </div>
                        <p className={`text-xl font-black mt-2 truncate ${groupedStats.totalRemaining > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {groupedStats.totalRemaining.toLocaleString('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Solde impayé sur factures groupées</p>
                    </div>
                </div>
            )}
            
            {/* Modal to inspect linked Delivery Notes */}
            <GroupedInvoiceBLModal
                isOpen={isBLModalOpen}
                onClose={() => {
                    setIsBLModalOpen(false);
                    setSelectedInvoiceForBLs(null);
                }}
                invoice={selectedInvoiceForBLs}
                deliveryNotes={deliveryNotes}
                clients={clients}
                companySettings={companySettings}
            />

            <GroupDeliveryNotesModal
                isOpen={isGroupDeliveryModalOpen}
                onClose={() => setIsGroupDeliveryModalOpen(false)}
                onConfirm={async ({ selectedNoteIds: ids, customData, groupingMode }) => {
                    if (onCreateInvoiceFromMultipleDeliveryNotes) {
                        await onCreateInvoiceFromMultipleDeliveryNotes(ids, customData, groupingMode);
                        setActiveTab('grouped');
                    }
                }}
                deliveryNotes={deliveryNotes}
                clients={clients}
                companySettings={companySettings}
                generateDocumentId={generateDocumentId}
            />

            <CreateInvoiceModal 
                isOpen={isCreateModalOpen}
                onClose={() => { setIsCreateModalOpen(false); setPrefilledOrder(undefined); setPrefilledPO(undefined); }}
                onSave={handleSaveInvoice}
                clients={clients}
                products={products}
                invoiceToEdit={invoiceToEdit}
                prefilledPO={prefilledPO}
                prefilledOrder={prefilledOrder}
                companySettings={companySettings}
                generateDocumentId={generateDocumentId}
            />

            <ConfirmationModal 
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
            />

            {isPreviewModalOpen && selectedDocForPreview && (
                <DocumentPreviewModal
                    isOpen={isPreviewModalOpen}
                    onClose={() => {
                        setIsPreviewModalOpen(false);
                        setSelectedDocForPreview(null);
                        setSelectedRecipientForPreview(null);
                    }}
                    type="Facture"
                    doc={selectedDocForPreview}
                    settings={companySettings}
                    recipient={selectedRecipientForPreview}
                />
            )}

            {isThermalModalOpen && selectedInvoiceForThermal && (
                <ThermalTicketModal
                    isOpen={isThermalModalOpen}
                    onClose={() => {
                        setIsThermalModalOpen(false);
                        setSelectedInvoiceForThermal(null);
                    }}
                    document={selectedInvoiceForThermal}
                    settings={companySettings}
                    recipient={clients.find(c => c.id === selectedInvoiceForThermal.clientId)}
                />
            )}

            {selectedInvoiceForPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-3xl shadow-xl p-6 w-full max-w-md animate-in zoom-in-95 duration-150 border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-900 mb-1">{t('paymentRecorded')}</h3>
                        <p className="text-xs text-slate-500 mb-4">{t('invoices')} {selectedInvoiceForPayment.documentId || selectedInvoiceForPayment.id}</p>
                        <form onSubmit={handlePaymentSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">{t('amount')}</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    max={selectedInvoiceForPayment.amount - (selectedInvoiceForPayment.amountPaid || 0)}
                                    value={paymentAmount} 
                                    onChange={e => setPaymentAmount(parseFloat(e.target.value))}
                                    className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                />
                                <p className="text-xs text-slate-500 mt-1.5">{t('remaining')} : {(selectedInvoiceForPayment.amount - (selectedInvoiceForPayment.amountPaid || 0)).toLocaleString('fr-FR', { style: 'currency', currency })}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">{t('paymentMethod')}</label>
                                <select 
                                    value={paymentMethod} 
                                    onChange={e => setPaymentMethod(e.target.value as any)}
                                    className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white"
                                >
                                    <option>Virement</option>
                                    <option>Chèque</option>
                                    <option>Espèces</option>
                                    <option>Carte Bancaire</option>
                                </select>
                            </div>
                            {paymentMethod === 'Chèque' && (
                                <div className="grid grid-cols-2 gap-3 animate-in fade-in">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                            {language === 'ar' ? 'رقم الشيك' : 'N° de chèque'}
                                        </label>
                                        <input 
                                            type="text"
                                            value={checkNumber}
                                            onChange={(e) => setCheckNumber(e.target.value)}
                                            className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500"
                                            placeholder="Ex: CH-12345"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                            {language === 'ar' ? 'البنك' : 'Banque'}
                                        </label>
                                        <input 
                                            type="text"
                                            value={bankName}
                                            onChange={(e) => setBankName(e.target.value)}
                                            className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500"
                                            placeholder="Ex: BMCE, Attijari..."
                                        />
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setSelectedInvoiceForPayment(null)} className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">{t('cancel')}</button>
                                <button type="submit" className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors shadow-xs">{t('confirm')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Main Invoices Table / Card Container */}
            <div className="card-base overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-2xs">
                <div className="p-4 border-b border-slate-100 bg-white">
                    <div className="relative">
                        <div className={`pointer-events-none absolute inset-y-0 flex items-center ${isRTL ? 'right-0 pr-3.5' : 'left-0 pl-3.5'}`}>
                            <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        </div>
                        <input
                            type="search"
                            placeholder={activeTab === 'grouped' ? "Rechercher dans les factures groupées (N°, Client, BL)..." : t('search')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`block w-full rounded-xl border border-slate-200 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                        />
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-hidden">
                    <table className="w-full divide-y divide-slate-100 table-auto">
                        <thead className="bg-slate-50/80">
                            <tr>
                                <th scope="col" className={`px-3 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>#</th>
                                <th scope="col" className={`px-3 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('date')}</th>
                                <th scope="col" className={`px-3 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('client')}</th>
                                {activeTab === 'grouped' && (
                                    <th scope="col" className={`px-3 py-3 text-xs font-bold uppercase tracking-wider text-emerald-700 ${isRTL ? 'text-right' : 'text-left'}`}>BLs Liés</th>
                                )}
                                <th scope="col" className={`px-3 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('amount')}</th>
                                <th scope="col" className={`hidden xl:table-cell px-3 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('remaining')}</th>
                                <th scope="col" className={`px-3 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('status')}</th>
                                <th scope="col" className="relative px-2 py-3 text-right w-10"><span className="sr-only">{t('actions')}</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {paginatedInvoices.length > 0 ? (
                                paginatedInvoices.map((invoice) => {
                                    const remaining = invoice.amount - (invoice.amountPaid || 0);
                                    const isGrouped = isGroupedInvoice(invoice);
                                    const linkedBLs = getLinkedDeliveryNotes(invoice);
                                    const isHighlighted = highlightInvoiceId === invoice.id;

                                    return (
                                    <tr 
                                        key={invoice.id} 
                                        className={`hover:bg-slate-50/80 transition-colors duration-150 ${
                                            isHighlighted ? 'bg-emerald-50/70 ring-2 ring-emerald-500/50' : ''
                                        }`}
                                    >
                                        <td className={`whitespace-nowrap px-3 py-3 text-xs sm:text-sm font-bold ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="text-emerald-600 font-extrabold">{invoice.documentId || invoice.id}</span>
                                                {isGrouped && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedInvoiceForBLs(invoice);
                                                            setIsBLModalOpen(true);
                                                        }}
                                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200 transition-colors"
                                                        title="Facture issue de bons de livraison - Cliquer pour voir les BLs"
                                                    >
                                                        <Layers className="h-2.5 w-2.5 text-emerald-600" />
                                                        <span>Groupée</span>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className={`whitespace-nowrap px-3 py-3 text-xs sm:text-sm font-medium text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            {new Date(invoice.date).toLocaleDateString('fr-FR')}
                                        </td>
                                        <td className={`px-3 py-3 text-xs sm:text-sm font-bold text-slate-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <div className="truncate max-w-[120px] lg:max-w-[170px]" title={invoice.clientName}>{invoice.clientName}</div>
                                            {invoice.subject && (
                                                <p className="text-[10px] sm:text-[11px] font-normal text-slate-400 truncate max-w-[120px] lg:max-w-[170px]" title={invoice.subject}>{invoice.subject}</p>
                                            )}
                                        </td>
                                        
                                        {activeTab === 'grouped' && (
                                            <td className={`px-3 py-3 text-xs ${isRTL ? 'text-right' : 'text-left'}`}>
                                                {linkedBLs.length > 0 ? (
                                                    <div className="flex flex-wrap items-center gap-1 max-w-[160px]">
                                                        {linkedBLs.slice(0, 2).map(bl => (
                                                            <button
                                                                key={bl.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedInvoiceForBLs(invoice);
                                                                    setIsBLModalOpen(true);
                                                                }}
                                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-emerald-100 hover:text-emerald-800 transition-colors border border-slate-200"
                                                                title="Voir ce BL"
                                                            >
                                                                <span>{bl.documentId || bl.id}</span>
                                                            </button>
                                                        ))}
                                                        {linkedBLs.length > 2 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedInvoiceForBLs(invoice);
                                                                    setIsBLModalOpen(true);
                                                                }}
                                                                className="px-1.5 py-0.5 rounded text-[11px] font-extrabold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                                                            >
                                                                +{linkedBLs.length - 2}
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedInvoiceForBLs(invoice);
                                                            setIsBLModalOpen(true);
                                                        }}
                                                        className="text-[11px] font-semibold text-emerald-600 hover:underline flex items-center gap-1"
                                                    >
                                                        <Info className="h-3 w-3" />
                                                        <span>Détails</span>
                                                    </button>
                                                )}
                                            </td>
                                        )}

                                        <td className={`whitespace-nowrap px-3 py-3 text-xs sm:text-sm font-extrabold text-slate-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            {invoice.amount.toLocaleString('fr-FR', { style: 'currency', currency })}
                                        </td>
                                        <td className={`hidden xl:table-cell whitespace-nowrap px-3 py-3 text-xs sm:text-sm font-bold text-rose-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            {remaining > 0 ? remaining.toLocaleString('fr-FR', { style: 'currency', currency }) : '-'}
                                        </td>
                                        <td className={`whitespace-nowrap px-3 py-3 text-xs ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <span className={getStatusBadge(invoice.status)}>
                                                {invoice.status}
                                            </span>
                                        </td>
                                        <td className={`whitespace-nowrap px-2 py-3 text-sm font-medium relative ${isRTL ? 'text-left' : 'text-right'}`}>
                                            <button 
                                                onClick={(e) => toggleMenu(e, invoice.id)}
                                                className={`p-1.5 rounded-lg transition-all ${activeMenuId === invoice.id ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
                                                title={t('actions')}
                                            >
                                                <MoreVertical size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                )})
                            ) : (
                                <tr>
                                    <td colSpan={activeTab === 'grouped' ? 8 : 7} className="text-center py-16 px-6">
                                        <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                                            {activeTab === 'grouped' ? (
                                                <>
                                                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-3xl mb-3">
                                                        <Layers className="h-8 w-8" />
                                                    </div>
                                                    <h3 className="text-base font-bold text-slate-800">Aucune facture groupée</h3>
                                                    <p className="text-xs text-slate-400 mt-1 mb-4 text-center">
                                                        Vous pouvez regrouper plusieurs bons de livraison d'un même client en une seule facture claire et synthétique.
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsGroupDeliveryModalOpen(true)}
                                                        className="btn-primary text-xs font-bold py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                        <span>Créer une facture groupée</span>
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <FileText className="h-10 w-10 text-slate-300 mb-3" />
                                                    <h3 className="text-sm font-bold text-slate-800">Aucune facture trouvée</h3>
                                                    <p className="text-xs text-slate-400 mt-1">Créez votre première facture ou modifiez vos critères de recherche.</p>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-slate-100 bg-slate-50/20 p-2">
                    {paginatedInvoices.length > 0 ? (
                        paginatedInvoices.map((invoice) => {
                            const remaining = invoice.amount - (invoice.amountPaid || 0);
                            const isGrouped = isGroupedInvoice(invoice);
                            const linkedBLs = getLinkedDeliveryNotes(invoice);
                            const isHighlighted = highlightInvoiceId === invoice.id;

                            return (
                                <div 
                                    key={invoice.id} 
                                    className={`p-4 bg-white mb-2.5 rounded-2xl shadow-xs border border-slate-100 transition-all ${
                                        isHighlighted ? 'ring-2 ring-emerald-500 bg-emerald-50/50' : ''
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <p className="text-xs font-bold text-emerald-600">{invoice.documentId || invoice.id}</p>
                                                <span className={getStatusBadge(invoice.status)}>
                                                    {invoice.status}
                                                </span>
                                                {isGrouped && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedInvoiceForBLs(invoice);
                                                            setIsBLModalOpen(true);
                                                        }}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200"
                                                    >
                                                        <Layers className="h-3 w-3" />
                                                        <span>Groupée ({linkedBLs.length || invoice.deliveryNoteIds?.length || 1} BL)</span>
                                                    </button>
                                                )}
                                            </div>
                                            <p className="text-sm font-bold text-slate-900 truncate pr-2">{invoice.clientName}</p>
                                        </div>
                                        <button 
                                            onClick={(e) => toggleMenu(e, invoice.id)}
                                            className={`p-2 rounded-xl transition-all border border-slate-100 shadow-xs ${activeMenuId === invoice.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 hover:text-slate-700'}`}
                                        >
                                            <MoreVertical size={18} />
                                        </button>
                                    </div>

                                    {isGrouped && linkedBLs.length > 0 && (
                                        <div className="mb-2.5 flex flex-wrap items-center gap-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">BLs :</span>
                                            {linkedBLs.slice(0, 3).map(bl => (
                                                <button
                                                    key={bl.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedInvoiceForBLs(invoice);
                                                        setIsBLModalOpen(true);
                                                    }}
                                                    className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200"
                                                >
                                                    {bl.documentId || bl.id}
                                                </button>
                                            ))}
                                            {linkedBLs.length > 3 && (
                                                <span className="text-[10px] font-bold text-emerald-700">+{linkedBLs.length - 3}</span>
                                            )}
                                        </div>
                                    )}
                                    
                                    <div className="flex justify-between items-end bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('amount')}</p>
                                            <p className="text-sm font-extrabold text-slate-900">
                                                {invoice.amount.toLocaleString('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 })}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{new Date(invoice.date).toLocaleDateString('fr-FR')}</p>
                                            {remaining > 0 && (
                                                <p className="text-[11px] text-rose-600 font-bold">
                                                    {t('remaining')}: {remaining.toLocaleString('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 })}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-12 px-4">
                            <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                            <h3 className="text-sm font-bold text-slate-800">
                                {activeTab === 'grouped' ? 'Aucune facture groupée trouvée' : 'Aucune facture trouvée'}
                            </h3>
                        </div>
                    )}
                </div>

                {/* Pagination UI */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-slate-100">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="btn-secondary text-xs"
                            >
                                {isRTL ? 'التالي' : 'Précédent'}
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="btn-secondary text-xs"
                            >
                                {isRTL ? 'السابق' : 'Suivant'}
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-xs text-slate-500">
                                    Affichage de <span className="font-bold text-slate-800">{filteredInvoices.length > 0 ? startIndex + 1 : 0}</span> à <span className="font-bold text-slate-800">{Math.min(startIndex + itemsPerPage, filteredInvoices.length)}</span> sur <span className="font-bold text-slate-800">{filteredInvoices.length}</span> facture(s)
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-xl shadow-2xs -space-x-px" aria-label="Pagination">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="relative inline-flex items-center px-3 py-2 rounded-l-xl border border-slate-200 bg-white text-xs font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                                    >
                                        Précédent
                                    </button>
                                    {getPageNumbers().map((page, index) => (
                                        <button
                                            key={index}
                                            onClick={() => typeof page === 'number' && setCurrentPage(page)}
                                            disabled={page === '...'}
                                            className={`relative inline-flex items-center px-3.5 py-2 border text-xs font-bold ${
                                                currentPage === page
                                                    ? 'z-10 bg-emerald-600 border-emerald-600 text-white'
                                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                            } ${page === '...' ? 'cursor-default' : ''}`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="relative inline-flex items-center px-3 py-2 rounded-r-xl border border-slate-200 bg-white text-xs font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                                    >
                                        Suivant
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Menu Dropdown via Portal */}
            {activeMenuId && activeInvoice && menuPosition && createPortal(
                <div 
                    className="absolute z-50 w-[270px] rounded-2xl bg-white shadow-xl border border-slate-100 p-1.5 focus:outline-none animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: menuPosition.top, left: menuPosition.left, transformOrigin: menuPosition.transformOrigin }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex flex-col gap-0.5">
                        {isActiveInvoiceGrouped && (
                            <button 
                                onClick={() => { 
                                    setSelectedInvoiceForBLs(activeInvoice);
                                    setIsBLModalOpen(true);
                                    setActiveMenuId(null); 
                                }} 
                                className="flex w-full items-center whitespace-nowrap px-3 py-2 text-[13px] font-bold text-emerald-700 bg-emerald-50/70 rounded-xl hover:bg-emerald-100 transition-colors group mb-1"
                            >
                                <Layers size={16} className={`text-emerald-600 shrink-0 ${isRTL ? 'ml-3' : 'mr-3'}`} /> Voir les BLs inclus
                            </button>
                        )}

                        <button 
                            onClick={() => { handleEditClick(activeInvoice); setActiveMenuId(null); }} 
                            className="flex w-full items-center whitespace-nowrap px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                        >
                            <Pencil size={16} className={`text-emerald-600 shrink-0 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('edit')}
                        </button>

                        {activeInvoice.status === InvoiceStatus.Draft && (
                             <button 
                                onClick={() => { onUpdateInvoiceStatus(activeInvoice.id, InvoiceStatus.Pending); setActiveMenuId(null); }} 
                                className="flex w-full items-center whitespace-nowrap px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                            >
                                <CheckCircle size={16} className={`text-emerald-600 shrink-0 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('validate')}
                            </button>
                        )}

                        {activeInvoiceRemaining > 0 && (
                            <button 
                                onClick={() => { openPaymentModal(activeInvoice); setActiveMenuId(null); }} 
                                className="flex w-full items-center whitespace-nowrap px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                            >
                                <CreditCard size={16} className={`text-emerald-600 shrink-0 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('paymentAmount')}
                            </button>
                        )}

                        {onCreateCreditNote && (
                            <button 
                                onClick={() => { handleCreateCreditNote(activeInvoice.id); setActiveMenuId(null); }} 
                                className="flex w-full items-center whitespace-nowrap px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                            >
                                <ArrowLeftRight size={16} className={`text-purple-600 shrink-0 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('newCreditNote')}
                            </button>
                        )}
                        
                        <div className="border-t border-slate-100 my-1 mx-2"></div>

                        <button 
                            onClick={async () => {
                                const client = clients.find(c => c.id === activeInvoice.clientId) || (activeInvoice.clientName ? { id: activeInvoice.clientId || 'client-default', clientCode: 'CLI-000', name: activeInvoice.clientName, company: '', email: '', phone: '', address: '', type: 'Particulier' } as Client : undefined);
                                setSelectedDocForPreview(activeInvoice);
                                setSelectedRecipientForPreview(client);
                                setIsPreviewModalOpen(true);
                                setActiveMenuId(null);
                            }}
                            className="flex w-full items-center whitespace-nowrap px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                        >
                            <Eye size={16} className={`text-slate-500 group-hover:text-emerald-600 shrink-0 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('view')}
                        </button>

                        <button 
                            onClick={() => { handlePrint(activeInvoice); setActiveMenuId(null); }}
                            className="flex w-full items-center whitespace-nowrap px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                        >
                            <Printer size={16} className={`text-slate-500 group-hover:text-emerald-600 shrink-0 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('print')}
                        </button>

                        <button 
                            onClick={() => { 
                                setSelectedInvoiceForThermal(activeInvoice);
                                setIsThermalModalOpen(true);
                                setActiveMenuId(null); 
                            }}
                            className="flex w-full items-center whitespace-nowrap px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                        >
                            <Receipt size={16} className={`text-slate-500 group-hover:text-emerald-600 shrink-0 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {language === 'ar' ? 'تذكرة كيس (80مم / 58مم)' : 'Ticket Caisse (80mm / 58mm)'}
                        </button>

                        <button 
                            onClick={() => { handleDownload(activeInvoice); setActiveMenuId(null); }}
                            disabled={isDownloading}
                            className="flex w-full items-center whitespace-nowrap px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group disabled:opacity-50"
                        >
                            {isDownloading ? <Loader2 size={16} className={`animate-spin shrink-0 ${isRTL ? 'ml-3' : 'mr-3'}`} /> : <Download size={16} className={`text-slate-500 group-hover:text-emerald-600 shrink-0 ${isRTL ? 'ml-3' : 'mr-3'}`} />} {t('download')}
                        </button>

                        <button 
                            onClick={async () => {
                                const client = clients.find(c => c.id === activeInvoice.clientId) || (activeInvoice.clientName ? { id: activeInvoice.clientId || 'client-default', clientCode: 'CLI-000', name: activeInvoice.clientName, company: '', email: '', phone: '', address: '', type: 'Particulier' } as Client : undefined);
                                setSelectedDocForPreview(activeInvoice);
                                setSelectedRecipientForPreview(client);
                                setIsPreviewModalOpen(true);
                                setActiveMenuId(null);
                            }}
                            className="flex w-full items-center whitespace-nowrap px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                        >
                            <MessageSquare size={16} className={`text-emerald-500 shrink-0 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('sendWhatsApp')}
                        </button>

                        <div className="border-t border-slate-100 my-1 mx-2"></div>

                        <button 
                            onClick={() => { handleDeleteClick(activeInvoice.id); setActiveMenuId(null); }} 
                            className="flex w-full items-center whitespace-nowrap px-3 py-2 text-[13px] font-semibold text-rose-600 rounded-xl hover:bg-rose-50 transition-colors group"
                        >
                            <Trash2 size={16} className={`text-rose-500 shrink-0 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('delete')}
                        </button>
                    </div>
                </div>,
                document.body
            )}
            <InvoiceReportModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                invoices={invoices}
                clients={clients}
                companySettings={companySettings}
            />
        </div>
    );
};

export default Invoices;
