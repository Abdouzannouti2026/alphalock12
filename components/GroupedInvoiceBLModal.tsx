import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Layers, FileText, Calendar, DollarSign, Package, Eye, ChevronDown, ChevronUp, User, Hash, CheckCircle2 } from 'lucide-react';
import { Invoice, DeliveryNote, Client, CompanySettings } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import DocumentPreviewModal from './DocumentPreviewModal';

interface GroupedInvoiceBLModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: Invoice | null;
    deliveryNotes: DeliveryNote[];
    clients?: Client[];
    companySettings?: CompanySettings | null;
}

const GroupedInvoiceBLModal: React.FC<GroupedInvoiceBLModalProps> = ({
    isOpen,
    onClose,
    invoice,
    deliveryNotes,
    clients = [],
    companySettings
}) => {
    const { t, isRTL } = useLanguage();
    const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
    const [previewDoc, setPreviewDoc] = useState<DeliveryNote | null>(null);

    if (!isOpen || !invoice) return null;

    // Find linked delivery notes
    const invRef = invoice.documentId || invoice.id;
    const linkedNotes = deliveryNotes.filter(n => {
        if (invoice.deliveryNoteIds && invoice.deliveryNoteIds.includes(n.id)) return true;
        if (n.invoiceId && (n.invoiceId === invRef || n.invoiceId === invoice.id || n.invoiceId === invoice.documentId)) return true;
        return false;
    });

    const client = clients.find(c => c.id === invoice.clientId) || {
        id: invoice.clientId || 'client-default',
        clientCode: 'CLI-000',
        name: invoice.clientName || 'Client',
        company: '',
        email: '',
        phone: '',
        address: '',
        type: 'Particulier'
    } as Client;

    const currency = companySettings?.defaultCurrencyCode || 'MAD';

    const getGroupingModeLabel = (mode?: string) => {
        switch (mode) {
            case 'merged':
                return 'Articles fusionnés';
            case 'summary':
                return 'Récapitulatif (1 ligne par BL)';
            case 'detailed':
            default:
                return 'Lignes détaillées';
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div 
                className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-sm">
                            <Layers className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-slate-900">
                                    Bons de Livraison de la Facture
                                </h2>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    {invoice.documentId || invoice.id}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Client : <span className="font-semibold text-slate-700">{invoice.clientName}</span> • Date : <span className="font-medium text-slate-600">{new Date(invoice.date).toLocaleDateString('fr-FR')}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-5 flex-1">
                    {/* Overview Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total BLs liés</p>
                            <p className="text-lg font-black text-slate-900 mt-0.5">
                                {linkedNotes.length > 0 ? linkedNotes.length : (invoice.deliveryNoteIds?.length || 'N/A')}
                            </p>
                        </div>
                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mode Groupement</p>
                            <p className="text-xs font-bold text-emerald-700 mt-1 truncate">
                                {getGroupingModeLabel(invoice.groupingMode)}
                            </p>
                        </div>
                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Montant Facture</p>
                            <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                                {invoice.amount.toLocaleString('fr-FR', { style: 'currency', currency })}
                            </p>
                        </div>
                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Statut Paiement</p>
                            <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-full mt-1 bg-slate-200 text-slate-800">
                                {invoice.status}
                            </span>
                        </div>
                    </div>

                    {/* BLs List */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <FileText className="h-4 w-4 text-emerald-600" />
                                Détail des Bons de Livraison inclus ({linkedNotes.length})
                            </h3>
                        </div>

                        {linkedNotes.length === 0 ? (
                            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/80">
                                <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-sm font-semibold text-slate-600">
                                    Les détails spécifiques des BLs ne sont plus en mémoire ou ont été archivés.
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    Référence enregistrée : {invoice.reference || invoice.notes || 'N/A'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {linkedNotes.map((note) => {
                                    const isExpanded = expandedNoteId === note.id;
                                    const noteTotal = note.totalAmount || (note.lineItems?.reduce((sum, it) => sum + (it.quantity * it.unitPrice * (1 + it.vat / 100)), 0) || 0);
                                    
                                    return (
                                        <div 
                                            key={note.id}
                                            className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs transition-all hover:border-emerald-300"
                                        >
                                            <div className="p-4 flex items-center justify-between gap-4 bg-slate-50/50">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl font-bold text-xs">
                                                        BL
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-sm text-slate-900">
                                                                {note.documentId || note.id}
                                                            </span>
                                                            <span className="text-xs text-slate-400">
                                                                • {new Date(note.date).toLocaleDateString('fr-FR')}
                                                            </span>
                                                        </div>
                                                        {note.subject && (
                                                            <p className="text-xs text-slate-500 truncate max-w-xs sm:max-w-md">
                                                                {note.subject}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0">
                                                    <div className="text-right">
                                                        <p className="text-sm font-extrabold text-slate-900">
                                                            {noteTotal.toLocaleString('fr-FR', { style: 'currency', currency })}
                                                        </p>
                                                        <p className="text-[11px] text-slate-400 font-medium">
                                                            {note.lineItems?.length || 0} article(s)
                                                        </p>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => setPreviewDoc(note)}
                                                        className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                                                        title="Aperçu du Bon de Livraison"
                                                    >
                                                        <Eye size={17} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => setExpandedNoteId(isExpanded ? null : note.id)}
                                                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                                                        title={isExpanded ? 'Réduire' : 'Voir les articles'}
                                                    >
                                                        {isExpanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Expandable Line Items Table */}
                                            {isExpanded && (
                                                <div className="p-4 border-t border-slate-100 bg-white">
                                                    <table className="w-full text-xs">
                                                        <thead>
                                                            <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                                                                <th className="text-left pb-2">Désignation</th>
                                                                <th className="text-center pb-2">Qté</th>
                                                                <th className="text-right pb-2">P.U. HT</th>
                                                                <th className="text-center pb-2">TVA</th>
                                                                <th className="text-right pb-2">Total TTC</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-50">
                                                            {note.lineItems?.map((item, idx) => {
                                                                const lineHT = item.quantity * item.unitPrice;
                                                                const lineTTC = lineHT * (1 + (item.vat || 0) / 100);
                                                                return (
                                                                    <tr key={item.id || idx} className="hover:bg-slate-50/60">
                                                                        <td className="py-2 font-medium text-slate-800">
                                                                            {item.name}
                                                                            {item.description && item.description.trim() && item.description.trim().toLowerCase() !== item.name.trim().toLowerCase() && (
                                                                                <p className="text-[11px] text-slate-400">{item.description}</p>
                                                                            )}
                                                                        </td>
                                                                        <td className="py-2 text-center text-slate-600 font-semibold">
                                                                            {item.quantity} {item.unit || ''}
                                                                        </td>
                                                                        <td className="py-2 text-right text-slate-600">
                                                                            {item.unitPrice.toLocaleString('fr-FR', { style: 'currency', currency })}
                                                                        </td>
                                                                        <td className="py-2 text-center text-slate-500">
                                                                            {item.vat}%
                                                                        </td>
                                                                        <td className="py-2 text-right font-bold text-slate-900">
                                                                            {lineTTC.toLocaleString('fr-FR', { style: 'currency', currency })}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                    <p className="text-xs text-slate-500 font-medium">
                        Facture N° <span className="font-bold text-slate-800">{invoice.documentId || invoice.id}</span>
                    </p>
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors shadow-xs"
                    >
                        {t('close')}
                    </button>
                </div>
            </div>

            {/* Nested Preview Modal for individual BL if user clicks Eye */}
            {previewDoc && (
                <DocumentPreviewModal
                    isOpen={!!previewDoc}
                    onClose={() => setPreviewDoc(null)}
                    type="Bon de Livraison"
                    doc={previewDoc}
                    settings={companySettings}
                    recipient={client}
                />
            )}
        </div>,
        document.body
    );
};

export default GroupedInvoiceBLModal;
