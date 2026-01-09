
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  title: string;
  content: string;
  children: React.ReactNode;
  subTitle?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ title, content, children, subTitle }) => {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left + rect.width / 2,
      });
    }
  };

  useEffect(() => {
    if (show) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [show]);

  return (
    <div 
      ref={triggerRef}
      className="inline-block w-full" 
      onMouseEnter={() => setShow(true)} 
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && createPortal(
        <div 
          className="fixed z-[9999] p-3 bg-[#0c0a09] border border-[#a16207] text-[10px] text-gray-400 shadow-[0_10px_40px_rgba(0,0,0,1)] animate-in fade-in zoom-in pointer-events-none border-t-2 border-t-emerald-900 w-64"
          style={{
            top: `${coords.top - 10}px`,
            left: `${coords.left}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="flex justify-between items-center border-b border-[#a16207]/20 mb-2 pb-1">
            <p className="font-cinzel text-[#a16207] font-bold uppercase tracking-widest">{title}</p>
            {subTitle && <span className="text-emerald-500 text-[8px] italic font-black uppercase">{subTitle}</span>}
          </div>
          <p className="italic leading-relaxed whitespace-pre-wrap font-medium">{content}</p>
          <div className="mt-2 flex justify-center opacity-30">
            <div className="text-[8px] text-[#a16207] tracking-[0.4em]">ᛟ ᚱ ᛞ ᛖ ᚱ</div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Tooltip;
