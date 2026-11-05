import React, { useEffect, useRef, useState } from 'react';

// "You earned a trophy!" -- shown for 5 full seconds on top of everything, whatever the child taps meanwhile (it never blocks a tap).
// Tutoring gives the trophy the moment a Smart Study / Dhammaschool / Abhidhamma lesson is finished and announces it with
// the 'ss-trophy-granted' event.
export default function TrophyToast() {
  const [amount, setAmount] = useState(0);
  const timer = useRef(null);
  useEffect(() => {
    const onGranted = (e) => {
      setAmount(a => (a > 0 && timer.current ? a : 0) + (e.detail?.amount || 1));
      clearTimeout(timer.current);
      timer.current = setTimeout(() => { setAmount(0); timer.current = null; }, 5000);
    };
    window.addEventListener('ss-trophy-granted', onGranted);
    return () => { window.removeEventListener('ss-trophy-granted', onGranted); clearTimeout(timer.current); };
  }, []);
  if (!amount) return null;
  return (
    <div className="fixed inset-x-0 top-6 z-[100000] flex justify-center px-4 pointer-events-none">
      <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white rounded-3xl shadow-2xl px-6 py-4 text-center font-extrabold text-lg" style={{ animation: 'trophyPop .4s ease-out' }}>
        🏆 You earned {amount > 1 ? `${amount} trophies` : 'a trophy'}! Well done!
      </div>
      <style>{'@keyframes trophyPop{0%{transform:scale(.6);opacity:0}100%{transform:scale(1);opacity:1}}'}</style>
    </div>
  );
}
