import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { FC } from 'react';

/**
 * ScrollToTop component that scrolls to the top of the page
 * when the route changes, with smooth scrolling behavior.
 */
export const ScrollToTop: FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top smoothly when route changes
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });
  }, [pathname]);

  return null;
};

