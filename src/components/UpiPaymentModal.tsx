import React, { useState } from "react";
import {
  QrCode,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  Building2,
  Copy,
  Zap,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface UpiPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  itemName: string;
  onPaymentSuccess: () => void;
}

export const UpiPaymentModal: React.FC<UpiPaymentModalProps> = ({
  isOpen,
  onClose,
  amount,
  itemName,
  onPaymentSuccess,
}) => {
  const [paymentStep, setPaymentStep] = useState<"method" | "qr" | "success">("method");
  const [isVerifying, setIsVerifying] = useState(false);

  // Mock UPI ID for CropGuard
  const upiId = "cropguard.ai@upi";
  const payeeName = "CropGuard Agri-Services";

  const handleSimulatePayment = () => {
    setIsVerifying(true);
    // Simulate payment verification time
    setTimeout(() => {
      setIsVerifying(false);
      setPaymentStep("success");
      setTimeout(() => {
        onPaymentSuccess();
        onClose();
      }, 2000);
    }, 2500);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Visual feedback could be added here
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-stone-200 dark:border-zinc-800 shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="p-6 border-b border-stone-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-stone-900 dark:text-white text-lg">
                Payment for {itemName}
              </h3>
              <p className="text-xs text-stone-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
                Total Amount: ₹{amount}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {paymentStep === "method" && (
              <motion.div
                key="method"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <p className="text-sm text-stone-600 dark:text-zinc-300 font-medium">
                  Select your preferred payment method. We recommend UPI for instant activation.
                </p>

                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => setPaymentStep("qr")}
                    className="p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 flex items-center justify-between group hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-4 text-left">
                      <div className="p-3 rounded-2xl bg-emerald-600 text-white shadow-lg">
                        <QrCode className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-black text-stone-900 dark:text-white">UPI QR Scanner</p>
                        <p className="text-xs text-stone-500 dark:text-zinc-400">Pay using Google Pay, PhonePe, Paytm</p>
                      </div>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-white" />
                    </div>
                  </button>

                  <div className="p-4 rounded-2xl border-2 border-stone-200 dark:border-zinc-800 bg-stone-50/50 dark:bg-zinc-800/40 flex items-center justify-between opacity-60">
                    <div className="flex items-center gap-4 text-left">
                      <div className="p-3 rounded-2xl bg-stone-200 dark:bg-zinc-700 text-stone-600 dark:text-stone-300">
                        <CreditCard className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-stone-900 dark:text-white">Debit / Credit Card</p>
                        <p className="text-xs text-stone-500 dark:text-zinc-400">Mastercard, Visa, RuPay</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border-2 border-stone-200 dark:border-zinc-800 bg-stone-50/50 dark:bg-zinc-800/40 flex items-center justify-between opacity-60">
                    <div className="flex items-center gap-4 text-left">
                      <div className="p-3 rounded-2xl bg-stone-200 dark:bg-zinc-700 text-stone-600 dark:text-stone-300">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-stone-900 dark:text-white">Net Banking</p>
                        <p className="text-xs text-stone-500 dark:text-zinc-400">All major Indian banks</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {paymentStep === "qr" && (
              <motion.div
                key="qr"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="flex flex-col items-center text-center space-y-6"
              >
                <div className="space-y-1">
                  <h4 className="font-black text-stone-900 dark:text-white">Scan QR to Pay</h4>
                  <p className="text-xs text-stone-500 dark:text-zinc-400">Works with all UPI Apps</p>
                </div>

                {/* Simulated QR Code */}
                <div className="p-4 bg-white rounded-3xl shadow-xl border-4 border-emerald-500 relative group">
                  <div className="w-48 h-48 bg-stone-50 flex items-center justify-center rounded-2xl overflow-hidden">
                    {/* Placeholder for real QR - generating a styled mosaic */}
                    <div className="grid grid-cols-8 grid-rows-8 w-full h-full p-2">
                      {[...Array(64)].map((_, i) => (
                        <div 
                          key={i} 
                          className={`w-full h-full ${Math.random() > 0.4 ? 'bg-stone-900' : 'bg-white'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-xs rounded-2xl">
                    <button 
                      onClick={handleSimulatePayment}
                      className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg animate-bounce"
                    >
                      SIMULATE SCAN
                    </button>
                  </div>
                </div>

                <div className="w-full space-y-3">
                  <div className="flex items-center justify-center gap-4">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI_logo.png" alt="UPI" className="h-4 opacity-70 grayscale" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Google_Pay_Logo.svg/512px-Google_Pay_Logo.svg.png" alt="GPay" className="h-4 opacity-70 grayscale" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/PhonePe_Logo.svg/512px-PhonePe_Logo.svg.png" alt="PhonePe" className="h-4 opacity-70 grayscale" />
                  </div>

                  <div className="p-3 rounded-2xl bg-stone-50 dark:bg-zinc-800 border border-stone-100 dark:border-zinc-700 flex items-center justify-between">
                    <div className="text-left">
                      <p className="text-[10px] font-bold text-stone-400 uppercase">UPI ID</p>
                      <p className="text-xs font-mono font-bold text-stone-700 dark:text-stone-300">{upiId}</p>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(upiId)}
                      className="p-2 rounded-lg hover:bg-stone-200 dark:hover:bg-zinc-700 text-emerald-600 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2 w-full">
                  <button
                    disabled={isVerifying}
                    onClick={handleSimulatePayment}
                    className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying Payment...</span>
                      </>
                    ) : (
                      <>
                        <Smartphone className="w-4 h-4" />
                        <span>Confirm Payment of ₹{amount}</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setPaymentStep("method")}
                    className="text-xs font-bold text-stone-500 hover:text-stone-700 underline"
                  >
                    Change Method
                  </button>
                </div>
              </motion.div>
            )}

            {paymentStep === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center py-8 space-y-4"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-stone-900 dark:text-white text-xl">Payment Successful!</h4>
                  <p className="text-sm text-stone-500 dark:text-zinc-400">
                    Premium features have been unlocked for your account.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Note */}
        <div className="p-4 bg-stone-50 dark:bg-zinc-800/60 text-[10px] text-center text-stone-400 dark:text-zinc-500 font-medium">
          Secure payment processed by CropGuard Secure Gateway. 
          <br />
          Transaction ID: TXN_{Math.floor(Math.random() * 1000000)}
        </div>
      </div>
    </div>
  );
};
