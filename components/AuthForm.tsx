
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { ShirtIcon, ArrowLeftIcon } from './icons';
import { UserProfile } from '../types';

interface AuthFormProps {
  mode: 'signin' | 'signup';
  onToggleMode: () => void;
  onComplete: (profile?: UserProfile) => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ mode, onToggleMode, onComplete }) => {
  const [step, setStep] = useState(1); // 1: Credentials, 2: Details (Signup only)
  
  // Credentials State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // Details State
  const [gender, setGender] = useState('Female');
  const [shirtSize, setShirtSize] = useState('M');
  const [shoeSize, setShoeSize] = useState('');
  const [waistSize, setWaistSize] = useState('');
  const [cupSize, setCupSize] = useState('');
  
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // CASE 1: Sign In (Immediate)
    if (mode === 'signin') {
        setLoading(true);
        setTimeout(() => {
          setLoading(false);
          // Return default profile for existing user simulation
          onComplete({
              username: "Guest Stylist",
              email: email || "guest@boutiquepro.com",
              details: {
                  Gender: "Female",
                  "Shirt Size": "M",
                  "Shoe Size": "39",
                  "Waist Size": "28",
                  "Cup Size": "B"
              }
          });
        }, 1500);
        return;
    }

    // CASE 2: Sign Up - Step 1 (Credentials) -> Go to Step 2
    if (mode === 'signup' && step === 1) {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setStep(2);
        }, 800);
        return;
    }

    // CASE 3: Sign Up - Step 2 (Details) -> Complete
    if (mode === 'signup' && step === 2) {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            // Return new profile
            onComplete({
                username: name,
                email: email,
                details: {
                    Gender: gender,
                    "Shirt Size": shirtSize,
                    "Shoe Size": shoeSize,
                    "Waist Size": waistSize,
                    "Cup Size": cupSize
                }
            });
        }, 1500);
    }
  };

  const isStep2 = mode === 'signup' && step === 2;

  return (
    <div className="w-full flex flex-col items-center px-4 animate-fade-in relative">
       {/* Back button for Step 2 */}
       {isStep2 && (
         <button 
            type="button"
            onClick={() => setStep(1)}
            className="absolute top-0 left-0 p-2 text-gray-400 hover:text-gray-900 transition-colors"
         >
            <ArrowLeftIcon className="w-5 h-5" />
         </button>
       )}

       <div className="mb-6 flex flex-col items-center">
            <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center mb-4 shadow-lg transition-transform duration-500">
                <ShirtIcon className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-gray-900 tracking-wide text-center">
                {isStep2 ? 'Complete Your Profile' : (mode === 'signin' ? 'Welcome Back' : 'Join Boutique Pro')}
            </h2>
            <p className="text-sm text-gray-500 mt-2 text-center max-w-[260px]">
                {isStep2 
                    ? 'Help us personalize your virtual try-on experience.'
                    : (mode === 'signin' 
                        ? 'Sign in to access your wardrobe and saved looks.' 
                        : 'Create an account to save your vibes.')}
            </p>
       </div>

       <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
            
            {/* --- STEP 1: CREDENTIALS --- */}
            {!isStep2 && (
                <div className="space-y-4 animate-fade-in">
                    {mode === 'signup' && (
                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Full Name</label>
                            <input 
                                type="text" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-0 transition-colors text-sm bg-gray-50 focus:bg-white outline-none"
                                placeholder="Jane Doe"
                                required
                            />
                        </div>
                    )}
                    
                    <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Email Address</label>
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-0 transition-colors text-sm bg-gray-50 focus:bg-white outline-none"
                            placeholder="name@example.com"
                            required
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Password</label>
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-0 transition-colors text-sm bg-gray-50 focus:bg-white outline-none"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                </div>
            )}

            {/* --- STEP 2: MEASUREMENTS (Signup Only) --- */}
            {isStep2 && (
                <div className="space-y-4 animate-fade-in">
                    {/* Gender Selection */}
                    <div className="space-y-1">
                         <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Gender</label>
                         <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200">
                            {['Female', 'Male'].map((g) => (
                                <button
                                    key={g}
                                    type="button"
                                    onClick={() => setGender(g)}
                                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${gender === g ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    {g}
                                </button>
                            ))}
                         </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                         <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Shirt Size</label>
                            <select 
                                value={shirtSize}
                                onChange={(e) => setShirtSize(e.target.value)}
                                className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-0 transition-colors text-sm bg-gray-50 focus:bg-white outline-none appearance-none"
                            >
                                {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                         </div>
                         <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Shoe Size</label>
                            <input 
                                type="text"
                                value={shoeSize}
                                onChange={(e) => setShoeSize(e.target.value)}
                                placeholder="e.g. 39"
                                className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-0 transition-colors text-sm bg-gray-50 focus:bg-white outline-none"
                                required
                            />
                         </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Waist (Inches)</label>
                            <input 
                                type="text"
                                value={waistSize}
                                onChange={(e) => setWaistSize(e.target.value)}
                                placeholder="e.g. 28"
                                className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-0 transition-colors text-sm bg-gray-50 focus:bg-white outline-none"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Cup Size</label>
                            <input 
                                type="text"
                                value={cupSize}
                                onChange={(e) => setCupSize(e.target.value)}
                                placeholder="e.g. B"
                                className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-0 transition-colors text-sm bg-gray-50 focus:bg-white outline-none"
                            />
                        </div>
                    </div>
                </div>
            )}

            {mode === 'signin' && (
                <div className="flex justify-end pr-1">
                    <button type="button" className="text-xs text-gray-500 hover:text-gray-900 transition-colors">Forgot Password?</button>
                </div>
            )}

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gray-900 text-white font-semibold py-3.5 rounded-xl shadow-lg hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-6"
            >
                {loading ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                    </span>
                ) : (
                    mode === 'signin' 
                        ? 'Sign In' 
                        : (isStep2 ? 'Finish Profile' : 'Next Step')
                )}
            </button>
       </form>

       <div className="mt-8 pt-6 border-t border-gray-100 w-full max-w-sm text-center">
            <p className="text-xs text-gray-500">
                {mode === 'signin' ? "Don't have an account?" : "Already have an account?"}
                <button 
                    onClick={() => {
                        onToggleMode();
                        setStep(1); // Reset step if toggling
                    }}
                    className="ml-2 font-bold text-gray-900 hover:underline"
                >
                    {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                </button>
            </p>
       </div>
    </div>
  );
};

export default AuthForm;
