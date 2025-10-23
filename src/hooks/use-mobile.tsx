import * as React from "react";

const MOBILE_BREAKPOINT = 1200; // Temporariamente aumentado para teste com janela de 1189px

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const checkIsMobile = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      console.log('useIsMobile check:', { 
        windowWidth: window.innerWidth, 
        breakpoint: MOBILE_BREAKPOINT, 
        isMobile: mobile 
      });
      setIsMobile(mobile);
    };

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      checkIsMobile();
    };
    
    mql.addEventListener("change", onChange);
    checkIsMobile();
    
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
