import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Download, Smartphone, Share2, PlusSquare, 
  X, CheckCircle2, Sparkles, Check, Chrome, Apple,
  ArrowRight, ShieldCheck, Zap, Laptop, Monitor
} from 'lucide-react';
import { usePWAInstall } from '../contexts/usePWAInstall';
import { useLanguage } from '../contexts/LanguageContext';

export const PWAInstallModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { language, isRTL } = useLanguage();
  const { isIOS, isInstallable, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop'>('desktop');
  const [isInstalling, setIsInstalling] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    if (!isMobileDevice) {
      setActiveTab('desktop');
    } else if (isIOS) {
      setActiveTab('ios');
    } else {
      setActiveTab('android');
    }
  }, [isIOS, isOpen]);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      const success = await install();
      setIsInstalling(false);
      if (success) {
        setInstalledSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1800);
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] overflow-y-auto p-3 sm:p-4 flex flex-col items-center justify-center min-h-screen bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col my-auto max-h-[calc(100dvh-2rem)] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header with App Icon */}
        <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800 px-5 py-4 text-white relative shrink-0">
          <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8" />
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 rtl:right-auto rtl:left-3.5 p-2 text-white/80 hover:text-white hover:bg-white/15 rounded-full transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white p-1 shadow-md flex-shrink-0 flex items-center justify-center">
              <img 
                src="/pwa-192x192.png" 
                alt="FacturaGo" 
                className="w-full h-full object-cover rounded-xl"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/icon.svg';
                }}
              />
            </div>
            <div className="min-w-0 pr-8 rtl:pr-0 rtl:pl-8">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                  {language === 'ar' ? 'تثبيت التطبيق' : 'Installer l\'application'}
                </h3>
              </div>
              <p className="text-[11px] sm:text-xs text-emerald-100/90 leading-tight">
                {language === 'ar' 
                  ? 'أيقونة FacturaGo مباشرة في الشاشة الرئيسية للجهاز' 
                  : 'Ajoutez FacturaGo à votre écran d\'accueil ou bureau'}
              </p>
            </div>
          </div>
        </div>

        {/* Device Switcher Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50 p-1.5 gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('desktop')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all min-h-[38px] ${
              activeTab === 'desktop'
                ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Laptop size={14} className={activeTab === 'desktop' ? 'text-emerald-600' : 'text-slate-400'} />
            <span>PC / Mac</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all min-h-[38px] ${
              activeTab === 'android'
                ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone size={14} className={activeTab === 'android' ? 'text-emerald-600' : 'text-slate-400'} />
            <span>Android</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ios')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all min-h-[38px] ${
              activeTab === 'ios'
                ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Share2 size={14} className={activeTab === 'ios' ? 'text-emerald-600' : 'text-slate-400'} />
            <span>iOS / Safari</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {installedSuccess ? (
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-2.5">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={28} />
              </div>
              <h4 className="text-base font-bold text-slate-800">
                {language === 'ar' ? 'تمت إضافة التطبيق بنجاح!' : 'Application installée avec succès !'}
              </h4>
              <p className="text-xs text-slate-500 max-w-xs">
                {language === 'ar' 
                  ? 'يمكنك الآن فتح FacturaGo مباشرة من جهازك كأي تطبيق رسمي.' 
                  : 'FacturaGo est maintenant disponible directement sur votre appareil.'}
              </p>
            </div>
          ) : activeTab === 'desktop' ? (
            /* Desktop PC/Mac Content */
            <div className="space-y-3.5">
              {/* If browser supports 1-click install prompt */}
              {isInstallable && (
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                    <Zap size={14} className="text-emerald-600" />
                    <span>{language === 'ar' ? 'تثبيت فوري بنقرة واحدة :' : 'Installation directe en 1 clic :'}</span>
                  </div>
                  <button
                    onClick={handleInstallClick}
                    disabled={isInstalling}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <Download size={16} />
                    <span>
                      {isInstalling 
                        ? (language === 'ar' ? 'جاري التثبيت...' : 'Installation...') 
                        : (language === 'ar' ? 'تثبيت على الكمبيوتر الآن' : 'Installer sur mon ordinateur')}
                    </span>
                  </button>
                </div>
              )}

              {/* Step-by-step instructions for Desktop */}
              <div className="space-y-2.5">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {language === 'ar' ? 'طريقة التثبيت على الكمبيوتر (Chrome / Edge) :' : 'Étapes sur Windows ou Mac :'}
                </div>

                {/* Step 1 */}
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    1
                  </div>
                  <div className="text-xs text-slate-700">
                    <strong className="block text-slate-900 font-semibold mb-0.5">
                      {language === 'ar' ? 'زر التثبيت في شريط العنوان' : 'Bouton d\'installation dans la barre d\'adresse'}
                    </strong>
                    <span className="text-slate-500 text-[11px]">
                      {language === 'ar' 
                        ? 'انظر إلى يمين شريط العنوان (Barre d\'adresse) في الأعلى، ستجد أيقونة تثبيت على شكل شاشة مع سهم للأسفل أو علامة ⊕.' 
                        : 'Cliquez sur l\'icône d\'installation (un écran avec une flèche ou un bouton ⊕) à droite dans la barre d\'adresse.'}
                    </span>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    2
                  </div>
                  <div className="text-xs text-slate-700">
                    <strong className="block text-slate-900 font-semibold mb-0.5">
                      {language === 'ar' ? 'أو من خلال قائمة المتصفح (⁝)' : 'Ou depuis le menu du navigateur (⁝)'}
                    </strong>
                    <span className="text-slate-500 text-[11px]">
                      {language === 'ar' 
                        ? 'اضغط على النقاط الثلاث في أعلى يمين المتصفح، ثم اختر « Installer FacturaGo ».' 
                        : 'Cliquez sur les 3 points en haut à droite du navigateur, puis sélectionnez « Installer FacturaGo ».'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Benefits list */}
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/70 text-[11px] text-emerald-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <Sparkles size={13} />
                  <span>{language === 'ar' ? 'مميزات تطبيق الكمبيوتر :' : 'Avantages sur PC/Mac :'}</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-emerald-900/80">
                  <li>{language === 'ar' ? 'أيقونة رسمية على سطح المكتب لبدء التشغيل الفوري' : 'Icône officielle sur le bureau pour un lancement direct'}</li>
                  <li>{language === 'ar' ? 'نافذة مستقلة وسريعة بدون تشتيت المتصفح' : 'Fenêtre autonome dédiée ultra-rapide sans onglets'}</li>
                </ul>
              </div>
            </div>
          ) : activeTab === 'android' ? (
            /* Android Content */
            <div className="space-y-3.5">
              {/* If browser supports 1-click install prompt */}
              {isInstallable && (
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                    <Zap size={14} className="text-emerald-600" />
                    <span>{language === 'ar' ? 'تثبيت فوري بضغطة واحدة :' : 'Installation directe en 1 clic :'}</span>
                  </div>
                  <button
                    onClick={handleInstallClick}
                    disabled={isInstalling}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <Download size={16} />
                    <span>
                      {isInstalling 
                        ? (language === 'ar' ? 'جاري التثبيت...' : 'Installation...') 
                        : (language === 'ar' ? 'تثبيت على الهاتف الآن' : 'Installer sur mon téléphone')}
                    </span>
                  </button>
                </div>
              )}

              {/* Step-by-step instructions for Android Chrome / Samsung */}
              <div className="space-y-2.5">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {language === 'ar' ? 'طريقة التثبيت عبر المتصفح (Chrome) :' : 'Étapes sur Android (Google Chrome) :'}
                </div>

                {/* Step 1 */}
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    1
                  </div>
                  <div className="text-xs text-slate-700">
                    <strong className="block text-slate-900 font-semibold mb-0.5">
                      {language === 'ar' ? 'اضغط على النقاط الثلاث (⁝)' : 'Appuyez sur les 3 points (⁝)'}
                    </strong>
                    <span className="text-slate-500 text-[11px]">
                      {language === 'ar' ? 'في الزاوية العليا لمتصفح Chrome على هاتفك.' : 'Dans le coin supérieur droit de votre navigateur Chrome.'}
                    </span>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    2
                  </div>
                  <div className="text-xs text-slate-700">
                    <strong className="block text-slate-900 font-semibold mb-0.5">
                      {language === 'ar' 
                        ? 'اختر « Installer l\'application » أو « Ajouter à l\'écran d\'accueil »' 
                        : 'Choisissez « Installer l\'application » ou « Ajouter à l\'écran d\'accueil »'}
                    </strong>
                    <span className="text-slate-500 text-[11px]">
                      {language === 'ar' ? 'ستظهر لك أيقونة FacturaGo على شاشتك الرئيسية فوراً.' : 'L\'icône FacturaGo apparaîtra sur votre écran d\'accueil.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Benefits list */}
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/70 text-[11px] text-emerald-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <Sparkles size={13} />
                  <span>{language === 'ar' ? 'مميزات تطبيق الهاتف :' : 'Avantages sur téléphone :'}</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-emerald-900/80">
                  <li>{language === 'ar' ? 'ملء الشاشة بالكامل بدون متصفح (Plein écran)' : 'Affichage plein écran sans barre d\'adresse'}</li>
                  <li>{language === 'ar' ? 'فتح سريع بضغطة واحدة من الشاشة الرئيسية' : 'Ouverture rapide en un clic comme une vraie application'}</li>
                </ul>
              </div>
            </div>
          ) : (
            /* iPhone & iPad (Safari) Content */
            <div className="space-y-3.5">
              <div className="p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 leading-snug">
                {language === 'ar'
                  ? 'على iPhone، افتح الموقع في متصفح Safari ثم اتبع الخطوات الـ 3 السريعة :'
                  : 'Sur iPhone (Safari), suivez ces 3 étapes simples pour l\'ajouter en 5 secondes :'}
              </div>

              <div className="space-y-2.5">
                {/* Step 1 */}
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    1
                  </div>
                  <div className="text-xs text-slate-700">
                    <strong className="block text-slate-900 font-semibold mb-0.5">
                      {language === 'ar' ? '1. اضغط على زر المشاركة (Partager)' : '1. Appuyez sur le bouton Partager'}
                    </strong>
                    <span className="text-slate-500 text-[11px]">
                      {language === 'ar' ? 'الأيقونة أسفل شاشة Safari (مربع مع سهم للأعلى ⎋).' : 'L\'icône au bas de l\'écran Safari (carré avec flèche ⎋).'}
                    </span>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    2
                  </div>
                  <div className="text-xs text-slate-700">
                    <strong className="block text-slate-900 font-semibold mb-0.5">
                      {language === 'ar' ? '2. اختر « Sur l\'écran d\'accueil »' : '2. Choisissez « Sur l\'écran d\'accueil »'}
                    </strong>
                    <span className="text-slate-500 text-[11px]">
                      {language === 'ar' ? 'مرر للأسفل واضغط على رمز الزائد (+) « Sur l\'écran d\'accueil ».' : 'Faites défiler le menu et appuyez sur « Sur l\'écran d\'accueil » (+).'}
                    </span>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    3
                  </div>
                  <div className="text-xs text-slate-700">
                    <strong className="block text-slate-900 font-semibold mb-0.5">
                      {language === 'ar' ? '3. اضغط « Ajouter »' : '3. Appuyez sur « Ajouter »'}
                    </strong>
                    <span className="text-slate-500 text-[11px]">
                      {language === 'ar' ? 'في الزاوية العليا اليمين، وسيظهر التطبيق على شاشتك فوراً.' : 'En haut à droite de l\'écran. FacturaGo est prêt !'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Benefits list */}
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/70 text-[11px] text-emerald-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <Sparkles size={13} />
                  <span>{language === 'ar' ? 'المميزات على iPhone :' : 'Avantages sur iPhone :'}</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-emerald-900/80">
                  <li>{language === 'ar' ? 'تطبيق مستقل بدون شريط سفلي أو علوي لـ Safari' : 'Mode application complet sans la barre Safari'}</li>
                  <li>{language === 'ar' ? 'أيقونة رسمية أنيقة على الشاشة الرئيسية' : 'Icône officielle FacturaGo sur l\'écran d\'accueil'}</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-slate-200/80 hover:bg-slate-300 active:bg-slate-400 text-slate-700 font-bold text-xs rounded-xl transition-colors min-h-[40px]"
          >
            {language === 'ar' ? 'إغلاق' : 'Fermer'}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Header Quick Install Button for Mobile Bar & Top Nav
 */
export const PWAInstallButton: React.FC<{ 
  className?: string;
  variant?: 'badge' | 'button' | 'sidebar';
}> = ({ className = '', variant = 'badge' }) => {
  const navigate = useNavigate();
  const { isInstalled } = usePWAInstall();
  const { language } = useLanguage();

  // If already installed and running standalone, do not render
  if (isInstalled) {
    return null;
  }

  const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  const buttonText = isMobileDevice 
    ? (language === 'ar' ? 'تثبيت على الهاتف' : 'Installer sur téléphone') 
    : (language === 'ar' ? 'تثبيت على الكمبيوتر' : 'Installer sur PC/Mac');

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate('/install');
  };

  if (variant === 'button') {
    return (
      <button
        onClick={handleClick}
        type="button"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer ${className}`}
      >
        {isMobileDevice ? <Smartphone size={14} /> : <Laptop size={14} />}
        <span>{buttonText}</span>
      </button>
    );
  }

  // Default Badge Variant (Mounted in Mobile Sticky Header)
  return (
    <button
      onClick={handleClick}
      type="button"
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-300/80 text-emerald-800 text-xs font-bold transition-all shadow-xs shrink-0 min-h-[36px] cursor-pointer ${className}`}
      title={language === 'ar' ? 'تثبيت FacturaGo' : 'Installer FacturaGo'}
    >
      {isMobileDevice ? <Smartphone size={14} className="text-emerald-600 shrink-0" /> : <Laptop size={14} className="text-emerald-600 shrink-0" />}
      <span className="hidden xs:inline">
        {buttonText}
      </span>
      <span className="xs:hidden">
        {language === 'ar' ? 'تثبيت' : 'Installer'}
      </span>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
    </button>
  );
};

/**
 * Mobile Bottom Floating Banner
 * Prominently encourages user to add to home screen with one tap.
 */
export const PWAInstallBanner: React.FC = () => {
  const navigate = useNavigate();
  const { isInstalled } = usePWAInstall();
  const { language, isRTL } = useLanguage();
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    // Only show on mobile devices when not in standalone mode
    const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    if (!isMobileDevice || isInstalled) {
      setIsDismissed(true);
      return;
    }

    const dismissedUntil = localStorage.getItem('facturago_pwa_banner_dismissed');
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
      setIsDismissed(true);
    } else {
      // Delay showing banner slightly so app finishes initial render smoothly
      const timer = setTimeout(() => {
        setIsDismissed(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isInstalled]);

  if (isInstalled || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    // Dismiss for 2 days
    localStorage.setItem('facturago_pwa_banner_dismissed', String(Date.now() + 2 * 24 * 60 * 60 * 1000));
  };

  const handleAction = () => {
    navigate('/install');
  };

  return (
    <div 
      className="fixed bottom-3 left-3 right-3 z-40 md:hidden animate-in slide-in-from-bottom-5 duration-300"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-3 shadow-2xl border border-slate-700/80 flex items-center justify-between gap-2.5">
        
        <div 
          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
          onClick={handleAction}
        >
          <div className="w-10 h-10 rounded-xl bg-white p-1 flex-shrink-0 shadow-sm overflow-hidden flex items-center justify-center">
            <img 
              src="/pwa-192x192.png" 
              alt="FacturaGo" 
              className="w-full h-full object-cover rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/icon.svg';
              }}
            />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
              <span>FacturaGo</span>
              <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] rounded-full font-bold">
                App
              </span>
            </h4>
            <p className="text-[11px] text-slate-300 truncate">
              {language === 'ar' 
                ? 'تثبيت على الهاتف لفتح سريع بلا متصفح' 
                : 'Installer sur téléphone (Plein écran)'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleAction}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-600/30 flex items-center gap-1 min-h-[36px] cursor-pointer"
          >
            <Download size={13} />
            <span>{language === 'ar' ? 'تثبيت' : 'Installer'}</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Fermer"
            className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

      </div>
    </div>
  );
};
