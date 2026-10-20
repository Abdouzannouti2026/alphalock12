import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, QrCode, Search, RotateCcw, Check, ShoppingBag, User, FileText, ArrowRight, Package, Camera, AlertCircle, Sparkles, CheckCircle2, ShieldAlert, Ban, AlertTriangle } from 'lucide-react';
import { Product, Client, Invoice, DeliveryNote, StockMovement, ProductVariant, InvoiceStatus } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import BarcodeScannerModal from './BarcodeScannerModal';
import { formatDecimalForInput } from '../services/currencyService';

interface ScanReturnModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: Product[];
    movements: StockMovement[];
    clients: Client[];
    invoices: Invoice[];
    deliveryNotes: DeliveryNote[];
    onAddMovement: (movement: Omit<StockMovement, 'id'>) => void;
    onUpdateInvoiceStatus?: (invoiceId: string, newStatus: InvoiceStatus) => void;
}

interface SaleHistoryItem {
    id: string;
    docNumber: string;
    docType: 'Facture' | 'Bon de livraison';
    clientId: string;
    clientName: string;
    date: string;
    quantitySold: number;
    unitPrice: number;
    alreadyReturnedQty: number;
    remainingReturnableQty: number;
}

const ScanReturnModal: React.FC<ScanReturnModalProps> = ({
    isOpen,
    onClose,
    products,
    movements = [],
    clients,
    invoices,
    deliveryNotes,
    onAddMovement,
    onUpdateInvoiceStatus
}) => {
    const { language, isRTL } = useLanguage();
    const isAr = language === 'ar';

    const [scannedCode, setScannedCode] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

    // Selected Client & Doc & Sale Item
    const [selectedSale, setSelectedSale] = useState<SaleHistoryItem | null>(null);
    const [selectedClientName, setSelectedClientName] = useState('');
    const [selectedClientId, setSelectedClientId] = useState('');
    const [documentRef, setDocumentRef] = useState('');
    const [returnQty, setReturnQty] = useState(1);
    const [reason, setReason] = useState('Retour client / Marchandise réintégrée');

    // UI state
    const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
    const [successBanner, setSuccessBanner] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [isForceReturnAllowed, setIsForceReturnAllowed] = useState(false);

    const barcodeInputRef = useRef<HTMLInputElement>(null);

    // Auto-focus barcode input when modal opens or after a scan reset
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                barcodeInputRef.current?.focus();
            }, 150);
        }
    }, [isOpen]);

    // Handle barcode search
    const handleBarCodeSubmit = (codeToSearch: string) => {
        const query = codeToSearch.trim().toLowerCase();
        if (!query) return;

        let foundProduct: Product | null = null;
        let foundVariant: ProductVariant | null = null;

        // 1. Match exact barcode or code
        for (const p of products) {
            if (p.productType !== 'Produit') continue;

            if (p.barcode?.toLowerCase() === query || p.productCode?.toLowerCase() === query) {
                foundProduct = p;
                break;
            }

            // Check variants
            if (p.hasVariants && p.variants) {
                const matchedVar = p.variants.find(v => v.barcode?.toLowerCase() === query || v.name.toLowerCase().includes(query));
                if (matchedVar) {
                    foundProduct = p;
                    foundVariant = matchedVar;
                    break;
                }
            }
        }

        // 2. Fallback: match by partial name or code
        if (!foundProduct) {
            foundProduct = products.find(p => 
                p.productType === 'Produit' && 
                (p.name.toLowerCase().includes(query) || p.productCode.toLowerCase().includes(query))
            ) || null;
        }

        if (foundProduct) {
            setSelectedProduct(foundProduct);
            setSelectedVariant(foundVariant);
            setScannedCode(query);
            setSuccessBanner(null);
            setValidationError(null);
            setSelectedSale(null);
            setSelectedClientName('');
            setSelectedClientId('');
            setDocumentRef('');
            setReturnQty(1);
            setIsForceReturnAllowed(false);
            
            // Auto select variant if first variant available
            if (foundProduct.hasVariants && foundProduct.variants && foundProduct.variants.length > 0 && !foundVariant) {
                setSelectedVariant(foundProduct.variants[0]);
            }
        } else {
            setSuccessBanner(null);
            setValidationError(null);
            alert(isAr ? 'لم يتم العثور على أي منتج بهذا الرمز' : 'Aucun produit trouvé avec ce code barre.');
        }
    };

    // Find sales history for the selected product + calculate ALREADY RETURNED quantities!
    const salesHistory = useMemo<SaleHistoryItem[]>(() => {
        if (!selectedProduct) return [];

        const items: SaleHistoryItem[] = [];

        // Helper to count already returned units for a specific active document
        const getAlreadyReturnedForDoc = (docId: string, docNumber?: string) => {
            const cleanDocId = docId.trim().toLowerCase();
            const cleanDocNumber = (docNumber || '').trim().toLowerCase();

            const matchingReturnMovements = movements.filter(m => {
                if (m.type !== 'Retour' || m.productId !== selectedProduct.id) return false;
                const ref = (m.reference || '').toLowerCase();
                
                // 1. STRICT MATCH by doc_id UUID tag
                if (cleanDocId && ref.includes(`doc_id:${cleanDocId}`)) return true;

                // 2. Fallback for older returns WITHOUT any doc_id tag:
                // Only match docNumber if this movement does NOT belong to another specific doc_id tag
                if (!ref.includes('doc_id:')) {
                    if (cleanDocNumber && (ref.includes(`(${cleanDocNumber})`) || ref.includes(`:${cleanDocNumber})`) || ref.includes(` ${cleanDocNumber} `))) {
                        return true;
                    }
                }

                return false;
            });

            return matchingReturnMovements.reduce((sum, m) => sum + Math.abs(m.quantity || 0), 0);
        };

        // Scan Invoices
        for (const inv of invoices) {
            if (!inv.lineItems) continue;
            for (const line of inv.lineItems) {
                if (line.productId === selectedProduct.id || line.productCode === selectedProduct.productCode || line.name === selectedProduct.name) {
                    const docNumber = inv.documentId || inv.id.substring(0, 8);
                    const clientName = inv.clientName || 'Client Inconnu';
                    const quantitySold = line.quantity || 1;
                    const alreadyReturnedQty = getAlreadyReturnedForDoc(inv.id, docNumber);
                    const remainingReturnableQty = Math.max(0, quantitySold - alreadyReturnedQty);

                    items.push({
                        id: inv.id,
                        docNumber,
                        docType: 'Facture',
                        clientId: inv.clientId,
                        clientName,
                        date: inv.date,
                        quantitySold,
                        unitPrice: line.unitPrice || 0,
                        alreadyReturnedQty,
                        remainingReturnableQty
                    });
                }
            }
        }

        // Scan Delivery Notes
        for (const bl of deliveryNotes) {
            if (!bl.lineItems) continue;
            for (const line of bl.lineItems) {
                if (line.productId === selectedProduct.id || line.productCode === selectedProduct.productCode || line.name === selectedProduct.name) {
                    const docNumber = bl.documentId || bl.id.substring(0, 8);
                    const clientName = bl.clientName || 'Client Inconnu';
                    const quantitySold = line.quantity || 1;
                    const alreadyReturnedQty = getAlreadyReturnedForDoc(bl.id, docNumber);
                    const remainingReturnableQty = Math.max(0, quantitySold - alreadyReturnedQty);

                    items.push({
                        id: bl.id,
                        docNumber,
                        docType: 'Bon de livraison',
                        clientId: bl.clientId,
                        clientName,
                        date: bl.date,
                        quantitySold,
                        unitPrice: line.unitPrice || 0,
                        alreadyReturnedQty,
                        remainingReturnableQty
                    });
                }
            }
        }

        // Sort latest sales first
        return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [selectedProduct, invoices, deliveryNotes, movements]);

    // Compute remaining returnable quantity for current selection
    const currentMaxReturnable = useMemo<number | null>(() => {
        if (!selectedProduct) return null;

        if (selectedSale) {
            return selectedSale.remainingReturnableQty;
        }

        // If client name or doc ref is manually provided, compute total sold vs total returned for that client/doc
        if (selectedClientName || documentRef) {
            const matchingSales = salesHistory.filter(s => {
                const matchClient = selectedClientName ? s.clientName.toLowerCase().includes(selectedClientName.toLowerCase()) : true;
                const matchDoc = documentRef ? s.docNumber.toLowerCase().includes(documentRef.toLowerCase()) : true;
                return matchClient && matchDoc;
            });

            if (matchingSales.length > 0) {
                return matchingSales.reduce((sum, s) => sum + s.remainingReturnableQty, 0);
            }
        }

        // Overall product check across all sales
        if (salesHistory.length > 0) {
            return salesHistory.reduce((sum, s) => sum + s.remainingReturnableQty, 0);
        }

        return null; // Unlimited if no past sales tracked or manual return
    }, [selectedProduct, selectedSale, selectedClientName, documentRef, salesHistory]);

    // Auto-select best sale when selectedProduct changes
    useEffect(() => {
        if (selectedProduct && salesHistory.length > 0 && !selectedSale) {
            const topReturnableSale = salesHistory.find(s => s.remainingReturnableQty > 0);
            if (topReturnableSale) {
                handleSelectSale(topReturnableSale);
            } else if (salesHistory[0]) {
                handleSelectSale(salesHistory[0]);
            }
        }
    }, [selectedProduct, salesHistory]);

    // Handle selecting a past sale row
    const handleSelectSale = (sale: SaleHistoryItem) => {
        setSelectedSale(sale);
        setSelectedClientName(sale.clientName);
        setSelectedClientId(sale.clientId);
        setDocumentRef(`${sale.docType === 'Facture' ? 'Facture' : 'BL'}: ${sale.docNumber}`);
        setValidationError(null);

        if (sale.remainingReturnableQty <= 0) {
            setValidationError(
                isAr 
                    ? `⛔ تم إرجاع هذا المنتج بالكامل سابقاً لهذا الزبون على الوثيقة (${sale.docNumber})! لا يمكنك إجراء إرجاع جديد بدون مبيعات جديدة.`
                    : `⛔ CE PRODUIT A DÉJÀ ÉTÉ RETOURNÉ AU COMPLET pour ce document (${sale.docNumber}) ! (0 unité restante à retourner).`
            );
        } else {
            setReturnQty(Math.min(1, sale.remainingReturnableQty));
        }
    };

    // Handle return submission
    const handleConfirmReturn = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;

        if (returnQty <= 0) {
            alert(isAr ? 'يرجى إدخال كمية صالحة' : 'Veuillez saisir une quantité valide.');
            return;
        }

        // STRICT RETURN CHECK: Is this return blocked?
        if (!isForceReturnAllowed && currentMaxReturnable !== null && currentMaxReturnable <= 0) {
            const blockMsg = isAr
                ? `❌ لا يمكن إتمام هذا الإرجاع! لقد تم إرجاع جميع المبيعات المخصصة لهذا الزبون/الوثيقة بالكامل سابقاً (0 قطعة متبقية للإرجاع).`
                : `❌ RETOUR IMPOSSIBLE : Ce produit a DÉJÀ été retourné au complet pour ce document/client (0 unité restante à retourner) ! Vous ne pouvez pas effectuer un second retour sans nouvelle vente.`;
            setValidationError(blockMsg);
            alert(blockMsg);
            return;
        }

        if (!isForceReturnAllowed && currentMaxReturnable !== null && returnQty > currentMaxReturnable) {
            const excessMsg = isAr
                ? `❌ الكمية المطلوبة للإرجاع (${returnQty}) تتجاوز الكمية المتبقية القابلة للإرجاع (${currentMaxReturnable}).`
                : `❌ QUANTITÉ EXCESSIVE : Vous tentez de retourner ${returnQty} unité(s), mais il ne reste que ${currentMaxReturnable} unité(s) retournable(s) sur ce document.`;
            setValidationError(excessMsg);
            alert(excessMsg);
            return;
        }

        const docIdTag = selectedSale?.id ? `[DOC_ID:${selectedSale.id.toLowerCase()}] ` : '';
        const clientInfo = selectedClientName ? `Client: ${selectedClientName}` : 'Client Anonyme';
        const docInfo = documentRef ? ` (${documentRef})` : '';
        const noteInfo = reason ? ` - ${reason}` : '';
        const fullReference = `${docIdTag}Retour ${clientInfo}${docInfo}${noteInfo}`;

        const productNameWithVariant = selectedVariant 
            ? `${selectedProduct.name} - ${selectedVariant.name}`
            : selectedProduct.name;

        // Perform stock movement addition (+quantity = stock restoration)
        onAddMovement({
            productId: selectedProduct.id,
            variantId: selectedVariant?.id,
            productName: productNameWithVariant,
            date: new Date().toISOString().split('T')[0],
            quantity: Math.abs(returnQty),
            type: 'Retour',
            reference: fullReference
        });

        // Update Invoice status to Returned ('Retournée') if linked to an active invoice
        if (onUpdateInvoiceStatus) {
            if (selectedSale && selectedSale.docType === 'Facture') {
                onUpdateInvoiceStatus(selectedSale.id, InvoiceStatus.Returned);
            } else if (documentRef) {
                const matchedInv = invoices.find(inv => 
                    (inv.documentId && documentRef.toLowerCase().includes(inv.documentId.toLowerCase())) ||
                    (inv.id && documentRef.toLowerCase().includes(inv.id.toLowerCase()))
                );
                if (matchedInv) {
                    onUpdateInvoiceStatus(matchedInv.id, InvoiceStatus.Returned);
                }
            }
        }

        // Show success notification
        const successText = isAr 
            ? `تم إرجاع ${returnQty} من "${productNameWithVariant}" إلى المخزون بنجاح (وتحديث حالة الفاتورة)!`
            : `✓ ${returnQty} x "${productNameWithVariant}" réintégré(s) au stock avec succès ! (Facture passée en 'Retournée')`;
        
        setSuccessBanner(successText);
        setValidationError(null);

        // Reset for fast continuous douchette scanning!
        setSelectedProduct(null);
        setSelectedVariant(null);
        setSelectedSale(null);
        setScannedCode('');
        setSelectedClientName('');
        setSelectedClientId('');
        setDocumentRef('');
        setReturnQty(1);
        setIsForceReturnAllowed(false);

        setTimeout(() => {
            barcodeInputRef.current?.focus();
        }, 100);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-neutral-100 animate-in fade-in zoom-in duration-200 my-8">
                
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-5 text-white flex justify-between items-center relative overflow-hidden">
                    <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
                        <RotateCcw size={160} />
                    </div>
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                            <RotateCcw className="h-6 w-6 text-emerald-100 animate-spin-once" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight">
                                {isAr ? 'إرجاع المنتجات بالماسح (Scan Retour)' : 'Scan Retour Produit (Douchette)'}
                            </h2>
                            <p className="text-xs text-emerald-100 font-medium">
                                {isAr ? 'امسح رمز المنتج لإعادته للمخزون ومنع الإرجاع المكرر' : 'Scannez le produit retourné pour réintégrer le stock avec contrôle anti-doublon'}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors relative z-10"
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Success Banner */}
                {successBanner && (
                    <div className="bg-emerald-50 border-b border-emerald-200 p-4 flex items-center gap-3 text-emerald-800 text-sm font-semibold animate-in slide-in-from-top duration-300">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                        <span>{successBanner}</span>
                    </div>
                )}

                {/* Validation Error / Blocked Return Banner */}
                {validationError && (
                    <div className="bg-red-50 border-b-2 border-red-300 p-4 flex items-center gap-3 text-red-800 text-sm font-bold animate-in shake duration-300">
                        <Ban className="h-6 w-6 text-red-600 flex-shrink-0" />
                        <span>{validationError}</span>
                    </div>
                )}

                <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                    
                    {/* SECTION 1: SCANNER INPUT / DOUCHETTE AREA */}
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 shadow-inner space-y-3">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                            {isAr ? 'امسح الرمز الشريطي للفرّازة (Douchette) أو اكتب الكود' : 'Scannez avec la douchette ou saisissez le code produit'}
                        </label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <div className={`absolute inset-y-0 flex items-center pointer-events-none ${isRTL ? 'right-3' : 'left-3'}`}>
                                    <QrCode className="h-5 w-5 text-emerald-600" />
                                </div>
                                <input
                                    ref={barcodeInputRef}
                                    type="text"
                                    value={scannedCode}
                                    onChange={(e) => setScannedCode(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleBarCodeSubmit(scannedCode);
                                        }
                                    }}
                                    placeholder={isAr ? 'امسح هنا مباشرة بالدوشيت (Douchette)...' : 'Scannez ici directement avec la douchette...'}
                                    className={`w-full text-base font-semibold py-3 bg-white border-2 border-slate-300 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-sm ${isRTL ? 'pr-11 pl-4' : 'pl-11 pr-4'}`}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => handleBarCodeSubmit(scannedCode)}
                                className="px-5 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-md flex items-center gap-2"
                            >
                                <Search size={18} />
                                <span>{isAr ? 'بحث' : 'Rechercher'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsCameraScannerOpen(true)}
                                className="px-4 py-3 bg-slate-800 text-white font-medium rounded-xl hover:bg-slate-900 transition-colors shadow-md flex items-center gap-2"
                                title={isAr ? 'الكاميرا' : 'Caméra'}
                            >
                                <Camera size={18} />
                                <span className="hidden sm:inline text-xs">{isAr ? 'الكاميرا' : 'Caméra'}</span>
                            </button>
                        </div>

                        {/* Search or Quick Pick List */}
                        {!selectedProduct && (
                            <div className="pt-2">
                                <div className="text-xs font-semibold text-slate-500 mb-2">
                                    {isAr ? 'أو اختر منتجاً من القائمة بسرعة:' : 'Ou choisissez un produit dans la liste :'}
                                </div>
                                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                                    {products
                                        .filter(p => p.productType === 'Produit')
                                        .slice(0, 8)
                                        .map(p => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedProduct(p);
                                                    setValidationError(null);
                                                    setSelectedSale(null);
                                                    setSelectedClientName('');
                                                    setSelectedClientId('');
                                                    setDocumentRef('');
                                                    setReturnQty(1);
                                                    setIsForceReturnAllowed(false);
                                                    if (p.hasVariants && p.variants && p.variants.length > 0) {
                                                        setSelectedVariant(p.variants[0]);
                                                    }
                                                }}
                                                className="w-full text-left p-2 rounded-lg bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 transition-colors flex justify-between items-center text-xs font-medium"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Package className="w-4 h-4 text-emerald-600" />
                                                    <span className="font-bold text-slate-800">{p.name}</span>
                                                    <span className="text-slate-400 font-mono">({p.productCode})</span>
                                                </div>
                                                <span className="text-emerald-700 font-semibold">
                                                    Stock: {formatDecimalForInput(p.stockQuantity || 0, language)}
                                                </span>
                                            </button>
                                        ))
                                    }
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SECTION 2: SELECTED PRODUCT & CLIENT SALES HISTORY */}
                    {selectedProduct && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            
                            {/* Product Card */}
                            <div className="bg-emerald-50/80 border-2 border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-md">
                                        {selectedProduct.imageUrl ? (
                                            <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="h-full w-full object-cover rounded-xl" />
                                        ) : (
                                            <Package size={28} />
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-bold text-slate-900">{selectedProduct.name}</h3>
                                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-mono text-xs font-bold rounded-md">
                                                {selectedProduct.productCode}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-3">
                                            <span>Prix HT: {formatDecimalForInput(selectedProduct.salePrice || 0, language)} DH</span>
                                            {selectedProduct.barcode && <span className="font-mono">Code-barre: {selectedProduct.barcode}</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-emerald-200 shadow-sm w-full sm:w-auto justify-between sm:justify-start">
                                    <div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase">{isAr ? 'المخزون الحالي' : 'Stock Actuel'}</div>
                                        <div className="text-base font-extrabold text-slate-800">
                                            {formatDecimalForInput(
                                                selectedVariant ? (selectedVariant.stockQuantity || 0) : (selectedProduct.stockQuantity || 0), 
                                                language
                                            )}
                                        </div>
                                    </div>
                                    <ArrowRight size={16} className="text-emerald-500" />
                                    <div>
                                        <div className="text-[10px] text-emerald-600 font-bold uppercase">{isAr ? 'بعد الإرجاع' : 'Stock Après'}</div>
                                        <div className="text-base font-extrabold text-emerald-700">
                                            {formatDecimalForInput(
                                                (selectedVariant ? (selectedVariant.stockQuantity || 0) : (selectedProduct.stockQuantity || 0)) + Math.abs(returnQty), 
                                                language
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Variant Selector if applicable */}
                            {selectedProduct.hasVariants && selectedProduct.variants && selectedProduct.variants.length > 0 && (
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-700">
                                        {isAr ? 'اختر المتغير (Variant)' : 'Sélectionner la variante :'}
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {selectedProduct.variants.map(v => (
                                            <button
                                                key={v.id}
                                                type="button"
                                                onClick={() => setSelectedVariant(v)}
                                                className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all flex justify-between items-center ${
                                                    selectedVariant?.id === v.id 
                                                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm ring-2 ring-emerald-500/20' 
                                                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                                }`}
                                            >
                                                <span>{v.name}</span>
                                                <span className="text-[11px] opacity-75">Qté: {v.stockQuantity}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* SALES HISTORY & CLIENT RECOGNITION SECTION WITH ALREADY RETURNED TRACKING */}
                            <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200 space-y-3">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                        <ShoppingBag className="w-4 h-4 text-emerald-600" />
                                        {isAr ? 'سجل مبيعات هذا المنتج (تتبع الإرجاع ومنع التكرار)' : 'Historique des ventes de ce produit (Contrôle des retours déjà effectués)'}
                                    </h4>
                                    <span className="text-[11px] font-semibold text-slate-500">
                                        {salesHistory.length} {isAr ? 'عملية بيع مسجلة' : 'vente(s) trouvée(s)'}
                                    </span>
                                </div>

                                {salesHistory.length > 0 ? (
                                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                                        {salesHistory.map((sale) => {
                                            const isFullyReturned = sale.remainingReturnableQty <= 0;
                                            const isSelected = selectedSale?.id === sale.id || (selectedClientName === sale.clientName && documentRef.includes(sale.docNumber));

                                            return (
                                                <div
                                                    key={`${sale.docType}-${sale.id}`}
                                                    onClick={() => handleSelectSale(sale)}
                                                    className={`p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                                                        isFullyReturned
                                                            ? 'bg-red-50/60 border-red-200 hover:border-red-300 opacity-90'
                                                            : isSelected
                                                            ? 'bg-emerald-100/80 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                                                            : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${isFullyReturned ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                                            {isFullyReturned ? <Ban size={16} /> : <User size={16} />}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                                                                <span>{sale.clientName}</span>
                                                                <span className="px-2 py-0.5 text-[10px] bg-slate-100 text-slate-700 rounded-md font-mono">
                                                                    {sale.docType} {sale.docNumber}
                                                                </span>
                                                                {isFullyReturned && (
                                                                    <span className="px-2 py-0.5 text-[10px] font-extrabold bg-red-100 text-red-800 rounded-full border border-red-300">
                                                                        {isAr ? 'تم الإرجاع بالكامل (0 متبقي)' : '100% Déjà Retourné (0 restant)'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                                                                <span>{sale.date}</span>
                                                                <span>• {isAr ? 'المباع:' : 'Vendu:'} <strong className="text-slate-800">{sale.quantitySold}</strong></span>
                                                                {sale.alreadyReturnedQty > 0 && (
                                                                    <span className="text-amber-700 font-medium">
                                                                        • {isAr ? 'المُرجع سابقاً:' : 'Déjà retourné:'} <strong>{sale.alreadyReturnedQty}</strong>
                                                                    </span>
                                                                )}
                                                                <span className={`font-bold ${sale.remainingReturnableQty > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                                                    • {isAr ? 'المتبقي للإرجاع:' : 'Restant retournable:'} <strong>{sale.remainingReturnableQty}</strong>
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
                                                            isFullyReturned
                                                                ? 'bg-red-100 text-red-800 border border-red-200'
                                                                : isSelected
                                                                ? 'bg-emerald-600 text-white'
                                                                : 'bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700'
                                                        }`}
                                                    >
                                                        {isFullyReturned ? (
                                                            <>
                                                                <Ban size={14} />
                                                                <span>{isAr ? 'مُرجع بالكامل' : 'Bloqué (0)'}</span>
                                                            </>
                                                        ) : isSelected ? (
                                                            <>
                                                                <Check size={14} />
                                                                <span>{isAr ? 'محدد' : 'Sélectionné'}</span>
                                                            </>
                                                        ) : (
                                                            <span>{isAr ? 'اختيار' : 'Sélectionner'}</span>
                                                        )}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="bg-white p-4 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                                        <AlertCircle className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                                        <span>{isAr ? 'لم يتم العثور على أي فاتورة أو وصل تسليم سابق لهذا المنتج. يمكنك تحديد الزبون يدوياً أدناه.' : 'Aucune facture ni bon de livraison trouvé pour ce produit. Vous pouvez sélectionner le client manuellement ci-dessous.'}</span>
                                    </div>
                                )}
                            </div>

                            {/* RETURN FORM */}
                            <form onSubmit={handleConfirmReturn} className="space-y-4 pt-2">
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Client Input / Selection */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                                            <User size={14} className="text-emerald-600" />
                                            {isAr ? 'اسم الزبون (Client)' : 'Nom du Client :'}
                                        </label>
                                        <input
                                            type="text"
                                            value={selectedClientName}
                                            onChange={(e) => {
                                                setSelectedClientName(e.target.value);
                                                setValidationError(null);
                                            }}
                                            placeholder={isAr ? 'اكتب اسم الزبون أو اختره من السجل أعلاه' : 'Nom du client ou sélectionnez ci-dessus'}
                                            className="w-full text-sm font-semibold p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500"
                                        />
                                    </div>

                                    {/* Document Reference */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                                            <FileText size={14} className="text-emerald-600" />
                                            {isAr ? 'مرجع الوثيقة (Facture / BL)' : 'Référence Document (Facture/BL) :'}
                                        </label>
                                        <input
                                            type="text"
                                            value={documentRef}
                                            onChange={(e) => {
                                                setDocumentRef(e.target.value);
                                                setValidationError(null);
                                            }}
                                            placeholder={isAr ? 'مثال: Facture FA00012' : 'Ex: Facture FA00012 ou BL00008'}
                                            className="w-full text-sm font-semibold p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {/* Return Quantity */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            {isAr ? 'الكمية المرجعة (+المرجعة للمخزون)' : 'Quantité retournée (+Stock) :'}
                                        </label>
                                        <div className="flex items-center">
                                            <button
                                                type="button"
                                                onClick={() => setReturnQty(prev => Math.max(1, prev - 1))}
                                                className="px-3 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-l-xl border border-r-0 border-slate-300"
                                            >
                                                -
                                            </button>
                                            <input
                                                type="number"
                                                min="1"
                                                value={returnQty}
                                                onChange={(e) => {
                                                    setReturnQty(Math.max(1, parseInt(e.target.value) || 1));
                                                    setValidationError(null);
                                                }}
                                                className="w-full text-center text-base font-extrabold p-2.5 bg-white border border-slate-300 focus:ring-emerald-500 focus:border-emerald-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setReturnQty(prev => prev + 1)}
                                                className="px-3 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-r-xl border border-l-0 border-slate-300"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    {/* Reason / Notes */}
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            {isAr ? 'سبب الإرجاع / ملاحظة' : 'Motif du retour / Remarque :'}
                                        </label>
                                        <input
                                            type="text"
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            placeholder={isAr ? 'سبب الإرجاع...' : 'Ex: Produit défectueux, erreur de taille, annulation...'}
                                            className="w-full text-sm p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500"
                                        />
                                    </div>
                                </div>

                                {/* BLOCKED / VALIDATED STATUS PREVIEW */}
                                {currentMaxReturnable !== null && currentMaxReturnable <= 0 && !isForceReturnAllowed && (
                                    <div className="bg-red-100 border-2 border-red-300 p-3.5 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-3 text-red-900 text-xs font-extrabold shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <Ban className="h-5 w-5 text-red-600 flex-shrink-0" />
                                            <span>
                                                {isAr
                                                    ? `تنبيه: تم إرجاع هذه الوثيقة بالكامل (0 متبقي). إذا أعدت إنشاء الفاتورة وتريد التجاوز:`
                                                    : `Attention : Ce document est déjà 100% retourné (0 restant). Si vous souhaitez forcer le retour :`}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsForceReturnAllowed(true);
                                                setValidationError(null);
                                            }}
                                            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs whitespace-nowrap shadow-sm transition-colors cursor-pointer"
                                        >
                                            {isAr ? 'تجاوز وإرجاع (Nouveau)' : 'Forcer le retour (Nouveau)'}
                                        </button>
                                    </div>
                                )}

                                {/* Modal Actions */}
                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedProduct(null);
                                            setSelectedVariant(null);
                                            setSelectedSale(null);
                                            setValidationError(null);
                                            setIsForceReturnAllowed(false);
                                        }}
                                        className="px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                                    >
                                        {isAr ? 'إلغاء المنتج' : 'Autre produit'}
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={currentMaxReturnable !== null && currentMaxReturnable <= 0 && !isForceReturnAllowed}
                                        className={`px-6 py-2.5 text-sm font-extrabold rounded-xl shadow-lg transition-all flex items-center gap-2 transform ${
                                            currentMaxReturnable !== null && currentMaxReturnable <= 0 && !isForceReturnAllowed
                                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                                                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/20 active:scale-95'
                                        }`}
                                    >
                                        {currentMaxReturnable !== null && currentMaxReturnable <= 0 && !isForceReturnAllowed ? (
                                            <>
                                                <Ban size={18} />
                                                <span>{isAr ? 'مغلق: تم الإرجاع بالكامل' : 'Retour Bloqué (0 Restant)'}</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 size={18} />
                                                <span>{isAr ? 'تأكيد الإرجاع وإعادة للمخزون' : 'Valider le retour et réintégrer au stock'}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                </div>
            </div>

            {/* Embed Camera Barcode Scanner Modal */}
            <BarcodeScannerModal
                isOpen={isCameraScannerOpen}
                onClose={() => setIsCameraScannerOpen(false)}
                onScan={(code) => {
                    setIsCameraScannerOpen(false);
                    handleBarCodeSubmit(code);
                }}
            />
        </div>
    );
};

export default ScanReturnModal;
