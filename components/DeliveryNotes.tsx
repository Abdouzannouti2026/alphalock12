
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import { Truck, FileText, Plus, Pencil, Download, Trash2, CheckCircle, AlertCircle, Clock, Loader2, FileCheck, MoreVertical, Printer, ChevronLeft, ChevronRight, Search, MessageSquare, Eye, Layers, CheckSquare, Square, X, AlertTriangle } from 'lucide-react';
import { DeliveryNote, Invoice, Client, Product, CompanySettings } from '../types';
import CreateDeliveryNoteModal from './CreateDeliveryNoteModal';
import ConfirmationModal from './ConfirmationModal';
import DeliveryNoteOptionModal from './DeliveryNoteOptionModal';
import GroupDeliveryNotesModal from './GroupDeliveryNotesModal';
import { generatePDF, printDocument } from '../services/pdfService';
import { useLanguage } from '../contexts/LanguageContext';
import { shareDocument } from '../services/shareService';
import DocumentPreviewModal from './DocumentPreviewModal';

interface DeliveryNotesProps {
    deliveryNotes: DeliveryNote[];
    invoices: Invoice[];
    onCreateDeliveryNote: (note: Omit<DeliveryNote, 'id'>) => void;
    onUpdateDeliveryNote: (note: DeliveryNote) => void;
    onDeleteDeliveryNote: (id: string) => void;
    onCreateInvoice?: (deliveryNoteId: string) => void;
    onCreateInvoiceFromMultipleDeliveryNotes?: (deliveryNoteIds: string[], customInvoiceData?: Partial<Invoice>, groupingMode?: 'detailed' | 'merged' | 'summary') => Promise<any> | void;
    clients?: Client[];
    products?: Product[];
    companySettings?: CompanySettings | null;
    generateDocumentId?: () => string;
}

const DeliveryNotes: React.FC<DeliveryNotesProps> = ({ 
    deliveryNotes, 
    invoices, 
    onCreateDeliveryNote, 
    onUpdateDeliveryNote, 
    onDeleteDeliveryNote, 
    onCreateInvoice, 
    onCreateInvoiceFromMultipleDeliveryNotes,
    clients = [], 
    products = [],
    companySettings,
    generateDocumentId
}) => {
    const navigate = useNavigate();
    const { t, isRTL, language } = useLanguage();
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isGroupInvoiceModalOpen, setIsGroupInvoiceModalOpen] = useState(false);
    const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
    const [convertingId, setConvertingId] = useState<string | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Responsive items per page
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const filteredNotes = deliveryNotes.filter(note => {
        const term = searchTerm.toLowerCase();
        return (
            (note.documentId || note.id).toLowerCase().includes(term) ||
            (note.clientName || '').toLowerCase().includes(term) ||
            (note.invoiceId || '').toLowerCase().includes(term)
        );
    });
    const totalPages = Math.ceil(filteredNotes.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedNotes = filteredNotes.slice(startIndex, startIndex + itemsPerPage);

    // Multi-selection logic & analysis
    const selectedNotes = useMemo(() => {
        return deliveryNotes.filter(n => selectedNoteIds.includes(n.id));
    }, [deliveryNotes, selectedNoteIds]);

    const selectedClientIds = useMemo(() => {
        return Array.from(new Set(selectedNotes.map(n => n.clientId)));
    }, [selectedNotes]);

    const hasMultipleClients = selectedClientIds.length > 1;
    
    const selectedClientName = useMemo(() => {
        if (selectedNotes.length === 0) return '';
        if (hasMultipleClients) return 'Clients multiples';
        return selectedNotes[0].clientName || '';
    }, [selectedNotes, hasMultipleClients]);

    const totalSelectedAmount = useMemo(() => {
        return selectedNotes.reduce((sum, n) => {
            const amount = n.totalAmount || (n.subTotal ? (n.subTotal + (n.vatAmount || 0)) : 0);
            return sum + amount;
        }, 0);
    }, [selectedNotes]);

    const isAllPaginatedSelected = paginatedNotes.length > 0 && paginatedNotes.every(n => selectedNoteIds.includes(n.id));

    const toggleSelectAllPaginated = () => {
        if (isAllPaginatedSelected) {
            const paginatedIds = paginatedNotes.map(n => n.id);
            setSelectedNoteIds(prev => prev.filter(id => !paginatedIds.includes(id)));
        } else {
            const paginatedIds = paginatedNotes.map(n => n.id);
            setSelectedNoteIds(prev => Array.from(new Set([...prev, ...paginatedIds])));
        }
    };

    const toggleSelectNote = (id: string, e?: React.SyntheticEvent) => {
        if (e) e.stopPropagation();
        setSelectedNoteIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const clearSelection = () => {
        setSelectedNoteIds([]);
    };

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            
            if (currentPage > 3) {
                pages.push('...');
            }
            
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            
            for (let i = start; i <= end; i++) {
                if (!pages.includes(i)) pages.push(i);
            }
            
            if (currentPage < totalPages - 2) {
                pages.push('...');
            }
            
            if (!pages.includes(totalPages)) pages.push(totalPages);
        }
        return pages;
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [deliveryNotes.length, searchTerm, itemsPerPage]);
    
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState<{top: number, left: number, transformOrigin: string} | null>(null);
    
    const [noteToEdit, setNoteToEdit] = useState<DeliveryNote | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [noteIdToDelete, setNoteIdToDelete] = useState<string | null>(null);
    const [isSharingDoc, setIsSharingDoc] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [selectedDocForPreview, setSelectedDocForPreview] = useState<any>(null);
    const [selectedRecipientForPreview, setSelectedRecipientForPreview] = useState<any>(null);

    const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
    const [selectedNoteForOutput, setSelectedNoteForOutput] = useState<DeliveryNote | null>(null);
    const [outputAction, setOutputAction] = useState<'print' | 'download'>('download');

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

    const handleCreateFromInvoice = (invoiceId: string) => {
        const invoice = invoices.find(i => i.id === invoiceId);
        if(invoice) {
            onCreateDeliveryNote({
                invoiceId: invoice.documentId || invoice.id,
                clientId: invoice.clientId,
                clientName: invoice.clientName,
                date: new Date().toISOString().split('T')[0],
                lineItems: invoice.lineItems,
                status: 'Livré', 
                subTotal: invoice.subTotal,
                vatAmount: invoice.vatAmount,
                totalAmount: invoice.amount,
                paymentAmount: invoice.amountPaid
            });
            setIsInvoiceModalOpen(false);
        }
    };

    const handleSaveManual = (noteData: Omit<DeliveryNote, 'id'>, id?: string) => {
        if (id) {
            onUpdateDeliveryNote({ ...noteData, id });
        } else {
            onCreateDeliveryNote(noteData);
        }
    };

    const handleEditClick = (note: DeliveryNote) => {
        setNoteToEdit(note);
        setIsCreateModalOpen(true);
        setActiveMenuId(null);
    };

    const handleDeleteClick = (id: string) => {
        setNoteIdToDelete(id);
        setIsDeleteModalOpen(true);
        setActiveMenuId(null);
    };

    const confirmDelete = () => {
        if (noteIdToDelete) {
            onDeleteDeliveryNote(noteIdToDelete);
            setIsDeleteModalOpen(false);
            setNoteIdToDelete(null);
        }
    };

    const handlePDFClick = (note: DeliveryNote) => {
        setSelectedNoteForOutput(note);
        setOutputAction('download');
        setIsOptionModalOpen(true);
        setActiveMenuId(null);
    };

    const handlePrintClick = (note: DeliveryNote) => {
        setSelectedNoteForOutput(note);
        setOutputAction('print');
        setIsOptionModalOpen(true);
        setActiveMenuId(null);
    };

    const handleOptionConfirm = async (showPrices: boolean) => {
        const note = selectedNoteForOutput;
        if (!note) return;
        setIsOptionModalOpen(false);
        try {
            const client = clients.find(c => c.id === note.clientId);
            if (outputAction === 'download') {
                setDownloadingId(note.id);
                await generatePDF('Bon de Livraison', note, companySettings || null, client, { showPrices });
            } else {
                printDocument('Bon de Livraison', note, companySettings || null, client, { showPrices });
            }
        } catch (error: any) {
            alert(error.message);
        } finally {
            setDownloadingId(null);
            setSelectedNoteForOutput(null);
        }
    };
    
    const openNewModal = () => {
        setNoteToEdit(null);
        setIsCreateModalOpen(true);
    };

    const toggleMenu = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (activeMenuId === id) {
            setActiveMenuId(null);
            setMenuPosition(null);
        } else {
            const rect = e.currentTarget.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const menuHeight = 300; 
            const menuWidth = 208; // w-52 is 13rem = 208px
            
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

    const handleConvertToInvoice = async (noteId: string) => {
        if(onCreateInvoice && !convertingId) {
            setConvertingId(noteId);
            try {
                await onCreateInvoice(noteId);
            } catch (error) {
                console.error("Erreur conversion", error);
            } finally {
                setConvertingId(null);
                setActiveMenuId(null);
            }
        }
    };

    const getStatusDisplay = (note: DeliveryNote) => {
        if (note.invoiceId && note.invoiceId.length > 0) {
            return { label: t('statusBilled'), badgeClass: 'badge-purple' };
        }
        
        const total = note.totalAmount || 0;
        const paid = note.paymentAmount || 0;

        // If amount is 0 and not invoiced, show as Draft
        if (total === 0) {
            return { label: t('statusFree'), badgeClass: 'badge-neutral' };
        }

        if (paid >= total) {
            return { label: t('paid'), badgeClass: 'badge-success' };
        } else if (paid > 0) {
            return { label: t('statusPartial'), badgeClass: 'badge-info' };
        } else {
            return { label: t('statusUnpaid'), badgeClass: 'badge-danger' };
        }
    };

    const activeNote = deliveryNotes.find(n => n.id === activeMenuId);
    const isConverting = activeNote ? convertingId === activeNote.id : false;
    const isDownloading = activeNote ? downloadingId === activeNote.id : false;

    return (
        <div className="space-y-6">
            <Header title={t('deliveryNotes')}>
                 <div className={`flex items-center gap-2.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <button 
                        type="button"
                        onClick={() => setIsGroupInvoiceModalOpen(true)}
                        className="btn-secondary px-3.5 py-2.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        title={t('createGroupInvoice')}
                    >
                        <Layers className="h-4 w-4 text-emerald-600" />
                        <span className="hidden xs:inline">{t('groupDeliveryNotes')}</span>
                        <span className="xs:hidden">{t('groupDeliveryNotes')}</span>
                    </button>
                    <button 
                        type="button"
                        onClick={() => setIsInvoiceModalOpen(true)}
                        className="btn-secondary px-3.5 py-2.5"
                    >
                        <FileText className="h-4 w-4 text-slate-500" />
                        <span className="hidden xs:inline">{t('fromInvoice')}</span>
                        <span className="xs:hidden">{t('invoice')}</span>
                    </button>
                    <button 
                        type="button"
                        onClick={openNewModal}
                        className="btn-primary px-3.5 py-2.5"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="hidden xs:inline">{t('newNote')}</span>
                        <span className="xs:hidden">{t('add')}</span>
                    </button>
                 </div>
            </Header>
            
            <CreateDeliveryNoteModal 
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={handleSaveManual}
                clients={clients}
                products={products}
                invoices={invoices}
                noteToEdit={noteToEdit || undefined}
                companySettings={companySettings}
                generateDocumentId={generateDocumentId}
            />

            <GroupDeliveryNotesModal
                isOpen={isGroupInvoiceModalOpen}
                onClose={() => setIsGroupInvoiceModalOpen(false)}
                onConfirm={async ({ selectedNoteIds: ids, customData, groupingMode }) => {
                    if (onCreateInvoiceFromMultipleDeliveryNotes) {
                        await onCreateInvoiceFromMultipleDeliveryNotes(ids, customData, groupingMode);
                        setSelectedNoteIds([]);
                    }
                }}
                deliveryNotes={deliveryNotes}
                initialSelectedIds={selectedNoteIds}
                clients={clients}
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
                    type="Bon de Livraison"
                    doc={selectedDocForPreview}
                    settings={companySettings}
                    recipient={selectedRecipientForPreview}
                />
            )}

            <DeliveryNoteOptionModal 
                isOpen={isOptionModalOpen}
                onClose={() => setIsOptionModalOpen(false)}
                onConfirm={handleOptionConfirm}
            />
            
            {isInvoiceModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">{t('generateDeliveryNote')}</h3>
                        <p className="text-sm text-gray-500 mb-4">{language === 'es' ? 'Seleccione una factura para generar el albarán correspondiente.' : 'Sélectionnez une facture pour générer le BL correspondant.'}</p>
                        <div className="max-h-60 overflow-y-auto space-y-2">
                            {invoices.filter(inv => !deliveryNotes.some(dn => dn.invoiceId === inv.id || dn.invoiceId === inv.documentId)).map(invoice => (
                                <button 
                                    key={invoice.id} 
                                    onClick={() => handleCreateFromInvoice(invoice.id)}
                                    className={`w-full text-left p-3 rounded-lg border hover:bg-emerald-50 hover:border-emerald-500 transition-colors flex justify-between items-center ${isRTL ? 'flex-row-reverse text-right' : ''}`}
                                >
                                    <span className="truncate mr-2">#{invoice.documentId || invoice.id} - {invoice.clientName}</span>
                                    <span className="text-[10px] sm:text-xs bg-gray-100 px-2 py-1 rounded whitespace-nowrap">{new Date(invoice.date).toLocaleDateString()}</span>
                                </button>
                            ))}
                        </div>
                         <div className="flex justify-end gap-2 mt-4">
                            <button type="button" onClick={() => setIsInvoiceModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">{t('close')}</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="card-base overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-white">
                    <div className="relative">
                        <div className={`pointer-events-none absolute inset-y-0 flex items-center ${isRTL ? 'right-0 pr-3.5' : 'left-0 pl-3.5'}`}>
                            <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        </div>
                        <input
                            type="search"
                            placeholder={t('search')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`block w-full rounded-xl border border-slate-200 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                        />
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50/70">
                            <tr>
                                <th scope="col" className="w-12 px-4 py-3.5 text-center">
                                    <input 
                                        type="checkbox"
                                        checked={isAllPaginatedSelected}
                                        onChange={toggleSelectAllPaginated}
                                        aria-label="Tout sélectionner"
                                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                    />
                                </th>
                                <th scope="col" className={`px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('deliveryNoteNumber')}</th>
                                <th scope="col" className={`px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('date')}</th>
                                <th scope="col" className={`px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('client')}</th>
                                <th scope="col" className={`px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('reference')}</th>
                                <th scope="col" className={`px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('amount')}</th>
                                <th scope="col" className={`px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('status')}</th>
                                <th scope="col" className="relative px-6 py-3.5 text-right"><span className="sr-only">{t('actions')}</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {paginatedNotes.length > 0 ? (
                                paginatedNotes.map((note) => {
                                    const isSelected = selectedNoteIds.includes(note.id);
                                    const statusInfo = getStatusDisplay(note);
                                    const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
                                    const displayReference = note.invoiceId && !isUUID(note.invoiceId) ? `#${note.invoiceId}` : (note.invoiceId ? t('statusBilled') : t('statusManual'));

                                    return (
                                    <tr 
                                        key={note.id} 
                                        className={`transition-colors duration-150 ${isSelected ? 'bg-emerald-50/60' : 'hover:bg-slate-50/80'}`}
                                    >
                                        <td className="px-4 py-4 text-center">
                                            <input 
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={(e) => toggleSelectNote(note.id, e)}
                                                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                            />
                                        </td>
                                        <td className={`whitespace-nowrap px-4 py-4 text-sm font-bold text-emerald-600 ${isRTL ? 'text-right' : 'text-left'}`}>{note.documentId || note.id.slice(0, 8)}</td>
                                        <td className={`whitespace-nowrap px-4 py-4 text-sm font-medium text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>{new Date(note.date).toLocaleDateString('fr-FR')}</td>
                                        <td className={`whitespace-nowrap px-4 py-4 text-sm font-bold text-slate-900 max-w-[160px] truncate ${isRTL ? 'text-right' : 'text-left'}`}>{note.clientName}</td>
                                        <td className={`whitespace-nowrap px-4 py-4 text-sm font-medium text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            {displayReference}
                                        </td>
                                        <td className={`whitespace-nowrap px-4 py-4 text-sm font-extrabold text-slate-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            {note.totalAmount ? note.totalAmount.toLocaleString('fr-FR', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD' }) : '-'}
                                        </td>
                                        <td className={`whitespace-nowrap px-4 py-4 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <span className={statusInfo.badgeClass}>
                                                {statusInfo.label}
                                            </span>
                                        </td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm font-medium relative ${isRTL ? 'text-left' : 'text-right'}`}>
                                            <button 
                                                onClick={(e) => toggleMenu(e, note.id)}
                                                className={`p-2 rounded-xl transition-all ${activeMenuId === note.id ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
                                                title={t('actions')}
                                            >
                                                <MoreVertical size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                )})
                            ) : (
                                <tr>
                                    <td colSpan={8} className="text-center py-16 px-6">
                                        <div className="flex flex-col items-center justify-center">
                                            <Truck className="h-10 w-10 text-slate-300 mb-3" />
                                            <h3 className="text-sm font-bold text-slate-800">{t('noDeliveryNotesFound')}</h3>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-slate-100 bg-slate-50/20 p-2">
                    {paginatedNotes.length > 0 ? (
                        paginatedNotes.map((note) => {
                            const isSelected = selectedNoteIds.includes(note.id);
                            const statusInfo = getStatusDisplay(note);
                            const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
                            const displayReference = note.invoiceId && !isUUID(note.invoiceId) ? `#${note.invoiceId}` : (note.invoiceId ? t('statusBilled') : t('statusManual'));

                            return (
                                <div 
                                    key={note.id} 
                                    className={`p-4 mb-2.5 rounded-2xl shadow-xs border transition-all ${
                                        isSelected 
                                            ? 'bg-emerald-50/70 border-emerald-300' 
                                            : 'bg-white border-slate-100 active:bg-slate-50'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-start gap-3 min-w-0 flex-1">
                                            <input 
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={(e) => toggleSelectNote(note.id, e)}
                                                className="h-4.5 w-4.5 mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="text-xs font-bold text-emerald-600">#{note.documentId || note.id.slice(0, 8)}</p>
                                                    <span className={statusInfo.badgeClass}>
                                                        {statusInfo.label}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-bold text-slate-900 truncate pr-2">{note.clientName}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={(e) => toggleMenu(e, note.id)}
                                            className={`p-2 rounded-xl transition-all border border-slate-100 shadow-xs ${activeMenuId === note.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 hover:text-slate-700'}`}
                                        >
                                            <MoreVertical size={18} />
                                        </button>
                                    </div>
                                    
                                    <div className="flex justify-between items-end bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('amount')}</p>
                                            <p className="text-sm font-extrabold text-slate-900">
                                                {note.totalAmount ? note.totalAmount.toLocaleString('fr-FR', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD', maximumFractionDigits: 0 }) : '-'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{new Date(note.date).toLocaleDateString('fr-FR')}</p>
                                            <p className="text-[11px] text-slate-500 font-medium">{displayReference}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-12 px-4">
                            <Truck className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                            <h3 className="text-sm font-bold text-slate-800">{t('noDeliveryNotesFound')}</h3>
                        </div>
                    )}
                </div>

                {/* Floating Bottom Multi-Select Action Bar */}
                {selectedNoteIds.length > 0 && createPortal(
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-2xl animate-in slide-in-from-bottom-5 duration-300">
                        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                                        <Layers className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs sm:text-sm font-extrabold text-white">
                                                {selectedNoteIds.length} {language === 'ar' ? 'سند محدد' : 'BL sélectionné(s)'}
                                            </span>
                                            {hasMultipleClients ? (
                                                <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                                    <AlertTriangle className="h-3 w-3" />
                                                    {language === 'ar' ? 'عملاء مختلفون' : 'Clients différents'}
                                                </span>
                                            ) : (
                                                <span className="text-[11px] text-slate-300 font-medium truncate max-w-[140px]">
                                                    {selectedClientName}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-emerald-400 font-bold">
                                            Total: {totalSelectedAmount.toLocaleString('fr-FR', { style: 'currency', currency: companySettings?.defaultCurrencyCode || 'MAD' })}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={clearSelection}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors sm:hidden"
                                    title="Désélectionner tout"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                <button
                                    type="button"
                                    onClick={clearSelection}
                                    className="hidden sm:inline-flex px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                                >
                                    {language === 'ar' ? 'إلغاء التحديد' : 'Désélectionner'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setIsGroupInvoiceModalOpen(true)}
                                    disabled={hasMultipleClients}
                                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    <FileText className="h-4 w-4" />
                                    <span>
                                        {language === 'ar' ? 'إنشاء فاتورة واحدة' : 'Créer Facture groupée'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

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
                                className="btn-secondary text-xs ml-3"
                            >
                                {isRTL ? 'السابق' : 'Suivant'}
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-500">
                                    Affichage de <span className="font-bold text-slate-800">{startIndex + 1}</span> à <span className="font-bold text-slate-800">{Math.min(startIndex + itemsPerPage, filteredNotes.length)}</span> sur <span className="font-bold text-slate-800">{filteredNotes.length}</span> bons
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-xl shadow-xs -space-x-px overflow-hidden border border-slate-200" aria-label="Pagination">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="relative inline-flex items-center px-3 py-2 bg-white text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    {getPageNumbers().map((page, i) => (
                                        <React.Fragment key={i}>
                                            {page === '...' ? (
                                                <span className="relative inline-flex items-center px-3.5 py-2 bg-white text-xs font-semibold text-slate-400 border-l border-slate-100">
                                                    ...
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => setCurrentPage(page as number)}
                                                    className={`relative inline-flex items-center px-3.5 py-2 text-xs font-bold transition-colors border-l border-slate-100 ${currentPage === page ? 'z-10 bg-emerald-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                                                >
                                                    {page}
                                                </button>
                                            )}
                                        </React.Fragment>
                                    ))}
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="relative inline-flex items-center px-3 py-2 bg-white text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-40 border-l border-slate-100"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {activeMenuId && activeNote && menuPosition && createPortal(
                <div 
                    className="absolute z-50 w-56 rounded-2xl bg-white shadow-xl border border-slate-100/80 p-1.5 focus:outline-none animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: menuPosition.top, left: menuPosition.left, transformOrigin: menuPosition.transformOrigin }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex flex-col gap-0.5">
                        <button 
                            onClick={() => { handleEditClick(activeNote); setActiveMenuId(null); }} 
                            className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                        >
                            <Pencil size={16} className={`text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('edit')}
                        </button>
                        
                        {!activeNote.invoiceId ? (
                            onCreateInvoice && (
                                <button 
                                    onClick={() => { handleConvertToInvoice(activeNote.id); setActiveMenuId(null); }} 
                                    disabled={isConverting}
                                    className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group disabled:opacity-50"
                                >
                                    {isConverting ? (
                                        <Loader2 size={16} className={`animate-spin text-purple-600 ${isRTL ? 'ml-3' : 'mr-3'}`} />
                                    ) : (
                                        <FileText size={16} className={`text-purple-600 ${isRTL ? 'ml-3' : 'mr-3'}`} />
                                    )}
                                    {t('convert')}
                                </button>
                            )
                        ) : (
                            <button 
                                onClick={() => { navigate('/sales/invoices'); setActiveMenuId(null); }} 
                                className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                            >
                                <FileCheck size={16} className={`text-teal-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('view')} {t('invoices')}
                            </button>
                        )}
                        
                        <div className="border-t border-slate-100 my-1 mx-2"></div>

                        <button 
                            onClick={async () => {
                                const client = clients.find(c => c.id === activeNote.clientId) || (activeNote.clientName ? { id: activeNote.clientId || 'client-default', clientCode: 'CLI-000', name: activeNote.clientName, company: '', email: '', phone: '', address: '', type: 'Particulier' } as Client : undefined);
                                setSelectedDocForPreview(activeNote);
                                setSelectedRecipientForPreview(client);
                                setIsPreviewModalOpen(true);
                                setActiveMenuId(null);
                            }}
                            className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                        >
                            <Eye size={16} className={`text-slate-500 group-hover:text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('view')}
                        </button>

                        <button 
                            onClick={() => { handlePrintClick(activeNote); setActiveMenuId(null); }}
                            className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                        >
                            <Printer size={16} className={`text-slate-500 group-hover:text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('print')}
                        </button>

                        <button 
                            onClick={() => { handlePDFClick(activeNote); setActiveMenuId(null); }}
                            disabled={isDownloading}
                            className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group disabled:opacity-50"
                        >
                            {isDownloading ? <Loader2 size={16} className={`animate-spin ${isRTL ? 'ml-3' : 'mr-3'}`} /> : <Download size={16} className={`text-slate-500 group-hover:text-emerald-600 ${isRTL ? 'ml-3' : 'mr-3'}`} />} {t('download')}
                        </button>
                        
                        <button 
                            onClick={async () => {
                                const client = clients.find(c => c.id === activeNote.clientId) || (activeNote.clientName ? { id: activeNote.clientId || 'client-default', clientCode: 'CLI-000', name: activeNote.clientName, company: '', email: '', phone: '', address: '', type: 'Particulier' } as Client : undefined);
                                setSelectedDocForPreview(activeNote);
                                setSelectedRecipientForPreview(client);
                                setIsPreviewModalOpen(true);
                                setActiveMenuId(null);
                            }}
                            className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors group"
                        >
                            <MessageSquare size={16} className={`text-emerald-500 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('sendWhatsApp')}
                        </button>

                        <div className="border-t border-slate-100 my-1 mx-2"></div>

                        <button 
                            onClick={() => { handleDeleteClick(activeNote.id); setActiveMenuId(null); }} 
                            className="flex w-full items-center px-3 py-2 text-[13px] font-semibold text-rose-600 rounded-xl hover:bg-rose-50 transition-colors group"
                        >
                            <Trash2 size={16} className={`text-rose-500 ${isRTL ? 'ml-3' : 'mr-3'}`} /> {t('delete')}
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default DeliveryNotes;
