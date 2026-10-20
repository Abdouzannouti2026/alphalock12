import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Files, Lock, Loader2, AlertCircle, CheckCircle, Eye, EyeOff, ArrowLeft, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';

interface ResetPasswordProps {
    onClose: () => void;
    onGoToLogin?: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ onClose, onGoToLogin }) => {
    const { language, isRTL } = useLanguage();
    const isAr = language === 'ar';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isLinkExpired, setIsLinkExpired] = useState(false);
    const [expiredReason, setExpiredReason] = useState<string | null>(null);

    useEffect(() => {
        // Inspect current URL (hash and search params) for errors sent by Supabase
        const hash = window.location.hash || '';
        const search = window.location.search || '';

        // Extract error query parameters from both hash and search
        const rawHashParams = hash.includes('#') ? hash.substring(hash.indexOf('#') + 1) : hash;
        const hashParams = new URLSearchParams(rawHashParams);
        const searchParams = new URLSearchParams(search);

        const errorCode = hashParams.get('error_code') || searchParams.get('error_code');
        const errorDesc = hashParams.get('error_description') || searchParams.get('error_description');
        const errorParam = hashParams.get('error') || searchParams.get('error');

        if (errorCode === 'otp_expired' || (errorDesc && errorDesc.toLowerCase().includes('expired')) || errorParam === 'access_denied') {
            setIsLinkExpired(true);
            setExpiredReason(
                isAr
                    ? 'انتهت صلاحية هذا الرابط أو تم استخدامه من قبل. روابط استعادة الحساب في سوبابايز صالحة لمرة واحدة فقط.'
                    : 'Ce lien de réinitialisation est invalide ou a expiré. Les liens de récupération sont à usage unique.'
            );
        } else {
            // Verify if a session or recovery token is actually present
            supabase.auth.getSession().then(({ data }) => {
                const hasSession = !!data?.session;
                const hasRecoveryHash = hash.includes('type=recovery') || hash.includes('access_token=');
                if (!hasSession && !hasRecoveryHash) {
                    setIsLinkExpired(true);
                    setExpiredReason(
                        isAr
                            ? 'لم يتم العثور على جلسة صالحة. يرجى طلب رابط جديد لإعادة تعيين كلمة المرور.'
                            : 'Aucune session valide trouvée. Veuillez demander un nouveau lien de réinitialisation.'
                    );
                }
            }).catch(() => {});
        }
    }, [isAr]);

    const handleBackToLogin = () => {
        try {
            window.history.replaceState(null, '', window.location.pathname);
            window.location.hash = '#/login';
        } catch (_) {}
        if (onGoToLogin) {
            onGoToLogin();
        } else {
            onClose();
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Simple validation
        if (password.length < 6) {
            setError(
                isAr
                    ? 'يجب أن تحتوي كلمة المرور على 6 أحرف على الأقل.'
                    : 'Le mot de passe doit contenir au moins 6 caractères.'
            );
            return;
        }

        if (password !== confirmPassword) {
            setError(
                isAr
                    ? 'كلمتا المرور غير متطابقتين.'
                    : 'Les mots de passe ne correspondent pas.'
            );
            return;
        }

        setIsLoading(true);

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password,
            });

            if (updateError) throw updateError;

            setSuccess(true);
            
            // Clean up url hashes/queries so the recovery tokens do not stay active in the browser history
            try {
                window.history.replaceState(null, '', window.location.pathname);
            } catch (historyErr) {
                console.warn('Failed to clear OAuth hash from URL:', historyErr);
            }
        } catch (err: any) {
            console.error('Password reset update error:', err);
            const rawMsg = (err.message || '').toLowerCase();
            let friendlyMsg = err.message || (isAr ? 'حدث خطأ أثناء تحديث كلمة المرور.' : 'Une erreur est survenue lors de la réinitialisation du mot de passe.');

            if (
                rawMsg.includes('auth session missing') || 
                rawMsg.includes('session not found') || 
                rawMsg.includes('jwt expired') || 
                rawMsg.includes('invalid token') ||
                rawMsg.includes('user not found')
            ) {
                friendlyMsg = isAr
                    ? 'انتهت صلاحية الرابط أو تم استخدامه من قبل. المرجو طلب رابط جديد من شاشة تسجيل الدخول.'
                    : 'La session a expiré ou le lien a déjà été utilisé. Veuillez redemander un nouveau lien depuis la page de connexion.';
                setIsLinkExpired(true);
            } else if (rawMsg.includes('different') || rawMsg.includes('same password') || rawMsg.includes('should be different')) {
                friendlyMsg = isAr
                    ? 'يجب أن تكون كلمة المرور الجديدة مختلفة عن كلمة المرور القديمة.'
                    : "Le nouveau mot de passe doit être différent de l'ancien mot de passe.";
            } else if (rawMsg.includes('at least 6 characters') || rawMsg.includes('password should be at least')) {
                friendlyMsg = isAr
                    ? 'يجب أن تحتوي كلمة المرور على 6 أحرف على الأقل.'
                    : 'Le mot de passe doit contenir au moins 6 caractères.';
            }

            setError(friendlyMsg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 ${isRTL ? 'rtl' : 'ltr'}`}>
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="h-12 w-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
                        <Files size={24} />
                    </div>
                </div>
                <h2 className="mt-6 text-center text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
                    {isAr ? 'تعيين كلمة مرور جديدة' : 'Nouveau mot de passe'}
                </h2>
                <p className="mt-2 text-center text-sm text-neutral-600">
                    {isAr 
                        ? 'قم بتحديد كلمة مرور آمنة لحسابك على فكتوراغو.'
                        : 'Définissez un mot de passe sécurisé pour votre compte Facturago.'}
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
                <div className="bg-white py-8 px-5 shadow-xl sm:rounded-2xl sm:px-10 border border-neutral-200">
                    {isLinkExpired ? (
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-center space-y-4"
                        >
                            <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-amber-100 text-amber-600">
                                <AlertCircle className="h-7 w-7" />
                            </div>
                            <h3 className="text-lg font-bold text-neutral-900">
                                {isAr ? 'الرابط غير صالح أو انتهت صلاحيته' : 'Lien expiré ou déjà utilisé'}
                            </h3>
                            <p className="text-sm text-neutral-600 leading-relaxed">
                                {expiredReason || (isAr 
                                    ? 'هذا الرابط انتهت صلاحيته أو تم الضغط عليه مسبقاً. روابط استعادة الحساب تعمل لمرة واحدة فقط لأسباب أمنية.'
                                    : 'Ce lien a expiré ou a déjà été utilisé. Les liens de récupération sont à usage unique pour garantir la sécurité de votre compte.')}
                            </p>

                            <div className="pt-4 space-y-2">
                                <button
                                    type="button"
                                    onClick={handleBackToLogin}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-transparent bg-emerald-600 py-3 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
                                >
                                    <RefreshCw size={16} />
                                    <span>{isAr ? 'طلب رابط جديد (نسيت كلمة المرور)' : 'Demander un nouveau lien'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                                >
                                    <ArrowLeft size={16} />
                                    <span>{isAr ? 'العودة' : 'Retour'}</span>
                                </button>
                            </div>
                        </motion.div>
                    ) : success ? (
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-center space-y-4"
                        >
                            <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-emerald-100 text-emerald-600">
                                <CheckCircle className="h-7 w-7" />
                            </div>
                            <h3 className="text-lg font-bold text-neutral-900">
                                {isAr ? 'تم تغيير كلمة المرور بنجاح' : 'Réinitialisation réussie'}
                            </h3>
                            <p className="text-sm text-neutral-600">
                                {isAr
                                    ? 'تم تحديث كلمة المرور الخاصة بك بنجاح. يمكنك الآن الدخول إلى مساحتك.'
                                    : 'Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant accéder à votre tableau de bord.'}
                            </p>
                            <div className="pt-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex w-full justify-center rounded-xl border border-transparent bg-emerald-600 py-3 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
                                >
                                    {isAr ? 'الدخول إلى لوحة التحكم' : 'Accéder au tableau de bord'}
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <form className="space-y-6" onSubmit={handleResetPassword}>
                            {error && (
                                <div className="rounded-xl bg-red-50 p-4 border border-red-200">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
                                        </div>
                                        <div className={`${isRTL ? 'mr-3' : 'ml-3'}`}>
                                            <h3 className="text-sm font-semibold text-red-800">
                                                {isAr ? 'تعذر تغيير كلمة المرور' : 'Erreur de réinitialisation'}
                                            </h3>
                                            <div className="mt-1 text-sm text-red-700">
                                                <p>{error}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label htmlFor="password-reset" className="block text-sm font-medium text-neutral-700">
                                    {isAr ? 'كلمة المرور الجديدة' : 'Nouveau mot de passe'}
                                </label>
                                <div className="mt-1.5 relative rounded-xl shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                                    </div>
                                    <input
                                        id="password-reset"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full rounded-xl border-neutral-300 pl-10 pr-10 focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm py-2.5"
                                        placeholder={isAr ? '6 أحرف على الأقل' : 'Min. 6 caractères'}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="confirm-password-reset" className="block text-sm font-medium text-neutral-700">
                                    {isAr ? 'تأكيد كلمة المرور الجديدة' : 'Confirmer le mot de passe'}
                                </label>
                                <div className="mt-1.5 relative rounded-xl shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                                    </div>
                                    <input
                                        id="confirm-password-reset"
                                        name="confirmPassword"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="block w-full rounded-xl border-neutral-300 pl-10 pr-10 focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm py-2.5"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600"
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleBackToLogin}
                                    className="flex-1 rounded-xl border border-slate-300 bg-white py-2.5 px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition"
                                >
                                    {isAr ? 'إلغاء' : 'Annuler'}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1 flex justify-center items-center rounded-xl border border-transparent bg-emerald-600 py-2.5 px-4 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition disabled:bg-emerald-400 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <Loader2 className="animate-spin h-5 w-5" />
                                    ) : (
                                        <span>{isAr ? 'حفظ' : 'Enregistrer'}</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
