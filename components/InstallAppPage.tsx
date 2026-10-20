import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ArrowRight, Smartphone, Download, 
  Share2, CheckCircle2, Sparkles, Zap, Check, 
  ChevronRight, ExternalLink, Laptop, Monitor
} from 'lucide-react';
import { usePWAInstall } from '../contexts/usePWAInstall';
import { useLanguage } from '../contexts/LanguageContext';

export const InstallAppPage: React.FC<{ isPublic?: boolean }> = ({ isPublic = false }) => {
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  const { isIOS, isInstallable, isInstalled, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop'>('desktop');
  const [isInstalling, setIsInstalling] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    if (!isMobileDevice) {
      setActiveTab('desktop');
    } else if (isIOS) {
      setActiveTab('ios');
    } else {
      setActiveTab('android');
    }
  }, [isIOS]);

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      const success = await install();
      setIsInstalling(false);
      if (success) {
        setInstalledSuccess(true);
      }
    }
  };

  const handleBack = () => {
    navigate(isPublic ? '/' : '/dashboard');
  };

  return (
    <div 
      className={`${isPublic ? 'min-h-screen' : 'fixed inset-0 z-50 overflow-y-auto'} bg-slate-50 text-slate-800 flex flex-col`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 sm:px-6 shadow-xs flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 transition-colors"
          id="install-page-back-btn"
        >
          {isRTL ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
          <span>{language === 'ar' ? 'رجوع' : 'Retour'}</span>
        </button>

        <h1 className="text-base font-bold text-slate-900 truncate">
          {language === 'ar' ? 'تثبيت تطبيق FacturaGo' : 'Installer l\'application FacturaGo'}
        </h1>

        <div className="w-16 flex justify-end">
          <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
            PWA
          </span>
        </div>
      </header>

      {/* Main Content Page */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-20">
        
        {/* App Hero Card */}
        <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left rtl:sm:text-right gap-5 relative z-10">
            <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-white p-2 shadow-2xl shrink-0 flex items-center justify-center">
              <img 
                src="/pwa-192x192.png" 
                alt="FacturaGo" 
                className="w-full h-full object-cover rounded-xl"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/icon.svg';
                }}
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h2 className="text-2xl font-black tracking-tight text-white">FacturaGo</h2>
                <span className="px-2.5 py-0.5 text-xs font-bold bg-white/20 text-emerald-100 rounded-full">
                  App Multi-support
                </span>
              </div>
              <p className="text-sm text-emerald-100/90 leading-relaxed max-w-md">
                {language === 'ar'
                  ? 'ثبّت FacturaGo كـ تطبيق مستقل على هاتفك أو حاسوبك (Windows / Mac) للوصول الفوري والآمن بضغطة واحدة.'
                  : 'Installez FacturaGo comme application dédiée sur votre téléphone ou ordinateur (PC / Mac) pour un accès ultra rapide.'}
              </p>
            </div>
          </div>

          {/* If already running standalone or installed */}
          {isInstalled && (
            <div className="mt-5 p-3 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center gap-2 text-xs font-bold text-white">
              <CheckCircle2 size={16} className="text-emerald-300" />
              <span>{language === 'ar' ? 'التطبيق مثبت بالفعل على هذا الجهاز!' : 'FacturaGo est déjà installé sur cet appareil !'}</span>
            </div>
          )}
        </div>

        {/* Device Switcher Tabs */}
        <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-slate-200 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('desktop')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'desktop'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Laptop size={18} />
            <span>PC / Mac</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'android'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Smartphone size={18} />
            <span>Android</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ios')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'ios'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Share2 size={18} />
            <span>iOS / Safari</span>
          </button>
        </div>

        {/* Success Alert */}
        {installedSuccess && (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-4 animate-in fade-in">
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Check size={22} strokeWidth={3} />
            </div>
            <div>
              <div className="font-bold text-sm">
                {language === 'ar' ? 'تم التثبيت بنجاح!' : 'Installation réussie !'}
              </div>
              <div className="text-xs text-emerald-700 mt-0.5">
                {language === 'ar' 
                  ? 'ستجد أيقونة FacturaGo على شاشة جهازك الرئيسية.' 
                  : 'L\'icône FacturaGo se trouve désormais sur votre écran d\'accueil.'}
              </div>
            </div>
          </div>
        )}

        {/* Tab 0: Desktop PC / Mac Guide */}
        {activeTab === 'desktop' && (
          <div className="space-y-4">
            {/* Direct 1-Click Install Button if supported */}
            {isInstallable && (
              <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-emerald-200 bg-emerald-50/40 space-y-3">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <Zap size={18} className="text-emerald-600" />
                  <span>{language === 'ar' ? 'التثبيت المباشر متاح لحاسوبك :' : 'Installation directe disponible :'}</span>
                </div>
                <button
                  type="button"
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-base rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  <Download size={20} />
                  <span>
                    {isInstalling 
                      ? (language === 'ar' ? 'جاري التثبيت...' : 'Installation en cours...') 
                      : (language === 'ar' ? 'تثبيت على الكمبيوتر الآن' : 'Installer sur cet ordinateur')}
                  </span>
                </button>
              </div>
            )}

            {/* Step-by-Step for PC/Mac */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                {language === 'ar'
                  ? 'طريقة التثبيت على الكمبيوتر (Windows / Mac) :'
                  : 'Étapes d\'installation sur PC / Mac (Google Chrome, Edge, Brave...) :'}
              </h3>

              <div className="space-y-3">
                {/* Step 1 */}
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold text-sm shadow-sm">
                    1
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 text-sm">
                      {language === 'ar' ? 'انقر على أيقونة التثبيت في الأعلى' : 'Cliquez sur l\'icône d\'installation en haut'}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {language === 'ar'
                        ? 'في أقصى يمين شريط العنوان (Barre d\'adresse) في متصفحك، ستجد علامة شاشة كمبيوتر مع سهم للأسفل أو رمز الزائد (⊕).'
                        : 'À droite dans la barre d\'adresse de votre navigateur, cliquez sur l\'icône d\'installation (un écran avec une flèche de téléchargement ou un bouton ⊕).'}
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold text-sm shadow-sm">
                    2
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 text-sm">
                      {language === 'ar' ? 'أو من قائمة المتصفح ثلاثية النقاط (⁝)' : 'Ou via le menu 3 points du navigateur'}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {language === 'ar'
                        ? 'انقر على خيار النقاط الثلاث في أعلى يمين نافذة المتصفح، ثم اختر « Installer l\'application FacturaGo ».'
                        : 'Cliquez sur les 3 points verticaux en haut à droite du navigateur, puis sélectionnez « Installer FacturaGo ».'}
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold text-sm shadow-sm">
                    3
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 text-sm">
                      {language === 'ar' ? 'تأكيد وحفظ الاختصار' : 'Confirmez l\'installation'}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {language === 'ar'
                        ? 'اضغط على زر تأكيد لتثبيت البرنامج. سيفتح فوراً كبرنامج مستقل وتتم إضافة أيقونة ذكية على سطح المكتب لبدء التشغيل الفوري.'
                        : 'Validez le message de confirmation. FacturaGo s\'ouvrira immédiatement dans une fenêtre autonome et un raccourci sera créé sur votre bureau.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: Android Guide */}
        {activeTab === 'android' && (
          <div className="space-y-4">
            {/* Direct 1-Click Install Button if supported */}
            {isInstallable && (
              <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-emerald-200 bg-emerald-50/40 space-y-3">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <Zap size={18} className="text-emerald-600" />
                  <span>{language === 'ar' ? 'التثبيت المباشر متاح لهاتفك :' : 'Installation directe disponible :'}</span>
                </div>
                <button
                  type="button"
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-base rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  <Download size={20} />
                  <span>
                    {isInstalling 
                      ? (language === 'ar' ? 'جاري التثبيت...' : 'Installation en cours...') 
                      : (language === 'ar' ? 'تثبيت على الهاتف الآن' : 'Installer sur ce téléphone')}
                  </span>
                </button>
              </div>
            )}

            {/* Step-by-Step for Android */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                {language === 'ar'
                  ? 'خطوات التثبيت عبر متصفح Google Chrome :'
                  : 'Étapes d\'installation sur Android (Google Chrome) :'}
              </h3>

              <div className="space-y-3">
                {/* Step 1 */}
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold text-sm shadow-sm">
                    1
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 text-sm">
                      {language === 'ar' ? 'اضغط على النقاط الثلاث (⁝)' : 'Appuyez sur les 3 points (⁝)'}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {language === 'ar'
                        ? 'في الزاوية العليا لمتصفح Chrome على هاتفك (أعلى اليمين أو اليسار حسب لغة الهاتف).'
                        : 'Dans le coin supérieur droit de votre navigateur Chrome sur votre téléphone.'}
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold text-sm shadow-sm">
                    2
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 text-sm">
                      {language === 'ar'
                        ? 'اختر « Installer l\'application » أو « Ajouter à l\'écran d\'accueil »'
                        : 'Sélectionnez « Installer l\'application » ou « Ajouter à l\'écran d\'accueil »'}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {language === 'ar'
                        ? 'ستفتح لك نافذة صغيرة لتأكيد الاسم FacturaGo.'
                        : 'Une confirmation apparaîtra pour ajouter FacturaGo à vos applications.'}
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold text-sm shadow-sm">
                    3
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 text-sm">
                      {language === 'ar' ? 'اضغط « Installer » أو « Ajouter »' : 'Confirmez en appuyant sur « Installer »'}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {language === 'ar'
                        ? 'تم الأمر! ستجد أيقونة FacturaGo على شاشتك الرئيسية ويمكنك فتحها في أي وقت.'
                        : 'FacturaGo est maintenant accessible directement depuis votre écran d\'accueil.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: iPhone / Safari Guide */}
        {activeTab === 'ios' && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 font-medium">
                {language === 'ar'
                  ? 'على هواتف iPhone و iPad، يجب فتح الرابط في متصفح Safari لإضافته إلى الشاشة الرئيسية.'
                  : 'Sur iPhone et iPad, ouvrez cette page dans Safari pour ajouter l\'application en 5 secondes.'}
              </div>

              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                {language === 'ar' ? 'خطوات التثبيت على iPhone (Safari) :' : 'Étapes sur iPhone / Safari :'}
              </h3>

              <div className="space-y-3">
                {/* Step 1 */}
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold text-sm shadow-sm">
                    1
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 text-sm">
                      {language === 'ar' ? '1. اضغط على زر المشاركة (Partager)' : '1. Appuyez sur le bouton Partager'}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {language === 'ar'
                        ? 'في أسفل شاشة Safari، اضغط على أيقونة المربع مع سهم للأعلى (⎋).'
                        : 'Dans la barre en bas de votre écran Safari, appuyez sur l\'icône carré avec une flèche (⎋).'}
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold text-sm shadow-sm">
                    2
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 text-sm">
                      {language === 'ar' ? '2. اختر « Sur l\'écran d\'accueil »' : '2. Choisissez « Sur l\'écran d\'accueil »'}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {language === 'ar'
                        ? 'مرر قائمة الخيارات للأسفل واضغط على « Sur l\'écran d\'accueil » بجانب علامة الزائد (+).'
                        : 'Faites défiler le menu des options vers le bas et appuyez sur « Sur l\'écran d\'accueil » (+).'}
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold text-sm shadow-sm">
                    3
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 text-sm">
                      {language === 'ar' ? '3. اضغط « Ajouter »' : '3. Appuyez sur « Ajouter »'}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {language === 'ar'
                        ? 'في الزاوية العليا اليمين، وسيتم إنشاء أيقونة FacturaGo على شاشة هاتفك فوراً.'
                        : 'En haut à droite de l\'écran. L\'icône FacturaGo apparaît immédiatement avec vos autres apps.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Benefits Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Sparkles size={16} className="text-emerald-600" />
            <span>{language === 'ar' ? 'لماذا تثبيت تطبيق FacturaGo؟' : 'Pourquoi installer l\'application FacturaGo ?'}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                ⚡
              </div>
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 text-xs">
                  {language === 'ar' ? 'تشغيل فوري' : 'Lancement immédiat'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {language === 'ar' ? 'افتح البرنامج فورا بنقرة واحدة من جهازك.' : 'Ouvrez l\'application en un clic sans retaper l\'adresse.'}
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                🖥️
              </div>
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 text-xs">
                  {language === 'ar' ? 'شاشة كاملة ومريحة' : 'Expérience plein écran'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {language === 'ar' ? 'مساحة عمل احترافية خالية من أشرطة المتصفح المشتتة.' : 'Profitez d\'un espace de travail optimal sans distractions.'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Big Bottom Back Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleBack}
            className="w-full py-3.5 px-6 rounded-2xl bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-800 font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {isRTL ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
            <span>{language === 'ar' ? 'رجوع إلى لوحة التحكم' : 'Retour au tableau de bord'}</span>
          </button>
        </div>

      </main>
    </div>
  );
};

export default InstallAppPage;
